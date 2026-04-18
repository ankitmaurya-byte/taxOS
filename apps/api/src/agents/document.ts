import { BaseAgent } from './base'
import { db } from '../db'
import { documents, documentContexts } from '../db/schema'
import { eq } from 'drizzle-orm'
import { AgentOutputError } from './lib/json'
import {
  DocumentContext,
  DocumentContextSchema,
  DocumentExtraction,
  DocumentExtractionSchema,
} from './lib/schemas'

const EXTRACTION_PROMPT = `
You are a document extraction specialist. Extract all structured data from this tax document.

Return a JSON object with:
{
  "documentType": "string (e.g. W-2, 1099-NEC, bank statement)",
  "taxYear": number,
  "fields": {
    "fieldName": { "value": "extracted value", "confidence": 0.0-1.0 }
  },
  "overallConfidence": 0.0-1.0,
  "flaggedIssues": ["any anomalies or unclear data"],
  "reasoning": "brief explanation of extraction approach"
}

Mark confidence < 0.75 for any field that is unclear, partially visible, or ambiguous.
Return ONLY the JSON object, no other text.
`

const CONTEXT_EXTRACTION_PROMPT = `
You are a document content extractor. Extract ALL text content, data, and meaningful information from this document.
Your goal is to create a comprehensive text representation that can be used as context for an AI assistant.

Return a JSON object with:
{
  "rawText": "Full text content extracted from the document.",
  "summary": "A 2-3 sentence summary.",
  "keyEntities": ["list of key entities/names/organizations/amounts mentioned"],
  "metadata": {
    "documentType": "type of document",
    "date": "any date found",
    "parties": ["any parties involved"],
    "amounts": ["any monetary amounts found"],
    "references": ["any reference numbers"]
  }
}

Extract EVERYTHING possible. Return ONLY the JSON object.
`

const VISION_MIME = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/webp'])
const TEXT_MIME = new Set(['text/csv', 'text/plain', 'application/json'])
const MAX_TEXT_CHARS = 50_000
const CONTEXT_RAW_CAP = 100_000

export interface ExtractionSource {
  buffer: Buffer
  mimeType: string
  fileName: string
}

export class DocumentAgent extends BaseAgent {
  /**
   * Extract structured data from an in-memory buffer and persist the result
   * onto the `documents` row.
   */
  async extract(documentId: string, orgId: string, source: ExtractionSource): Promise<DocumentExtraction> {
    const doc = (await db.select().from(documents).where(eq(documents.id, documentId)).limit(1))[0]
    if (!doc) throw new Error('Document not found')

    if (!isVisionMime(source.mimeType)) {
      const placeholder = buildLowConfidenceExtraction(source.fileName, source.mimeType)
      await this.persistExtraction(documentId, placeholder, orgId, doc.filingId)
      return placeholder
    }

    const base64 = source.buffer.toString('base64')

    let extraction: DocumentExtraction
    try {
      extraction = await this.generateJson(
        [
          { inlineData: { mimeType: source.mimeType, data: base64 } },
          { text: EXTRACTION_PROMPT },
        ],
        DocumentExtractionSchema,
      )
    } catch (err) {
      if (err instanceof AgentOutputError) {
        await this.log({
          orgId,
          filingId: doc.filingId,
          action: 'document_extraction_failed',
          reasoning: `Gemini output parsing failed for "${source.fileName}": ${err.message}`,
          outputs: { documentId, rawOutput: err.rawText.slice(0, 500) },
          confidenceScore: 0,
        })
        const placeholder = buildLowConfidenceExtraction(source.fileName, 'parse-failed')
        await this.persistExtraction(documentId, placeholder, orgId, doc.filingId)
        return placeholder
      }
      throw err
    }

    await this.persistExtraction(documentId, extraction, orgId, doc.filingId)
    return extraction
  }

  /**
   * Extract a richer textual context (used by the AI advisor) from a buffer.
   */
  async extractContext(
    documentId: string,
    orgId: string,
    source: ExtractionSource,
    vaultId?: string | null,
  ): Promise<DocumentContext> {
    const doc = (await db.select().from(documents).where(eq(documents.id, documentId)).limit(1))[0]
    if (!doc) throw new Error('Document not found')

    let context: DocumentContext

    if (isVisionMime(source.mimeType)) {
      const base64 = source.buffer.toString('base64')
      context = await this.safeContextJson(
        [
          { inlineData: { mimeType: source.mimeType, data: base64 } },
          { text: CONTEXT_EXTRACTION_PROMPT },
        ],
        source.fileName,
      )
    } else if (TEXT_MIME.has(source.mimeType)) {
      const rawContent = source.buffer.toString('utf-8')
      context = await this.safeContextJson(
        [{ text: `Document content:\n\n${rawContent.slice(0, MAX_TEXT_CHARS)}\n\n${CONTEXT_EXTRACTION_PROMPT}` }],
        source.fileName,
      )
      context.rawText = rawContent.slice(0, CONTEXT_RAW_CAP)
    } else if (source.mimeType.includes('spreadsheet') || source.mimeType.includes('excel')) {
      const rawContent = source.buffer.toString('utf-8').slice(0, MAX_TEXT_CHARS)
      context = {
        rawText: rawContent,
        summary: `Spreadsheet file: ${source.fileName}`,
        keyEntities: [],
        metadata: { documentType: 'spreadsheet' },
      }
    } else {
      context = buildFallbackContext(source.fileName)
    }

    await db.delete(documentContexts).where(eq(documentContexts.documentId, documentId))
    await db.insert(documentContexts).values({
      documentId,
      orgId,
      vaultId: vaultId || doc.vaultId || null,
      rawText: context.rawText,
      summary: context.summary,
      keyEntities: context.keyEntities,
      metadata: context.metadata,
    })

    await this.log({
      orgId,
      action: 'document_context_extracted',
      reasoning: `Extracted context from "${source.fileName}" for AI advisor use`,
      outputs: {
        documentId,
        summaryLength: context.summary.length,
        rawTextLength: context.rawText.length,
      },
    })
    return context
  }

  private async safeContextJson(content: any, fileName: string): Promise<DocumentContext> {
    try {
      return await this.generateJson(content, DocumentContextSchema)
    } catch (err) {
      if (err instanceof AgentOutputError) return buildFallbackContext(fileName)
      throw err
    }
  }

  private async persistExtraction(
    documentId: string,
    extraction: DocumentExtraction,
    orgId: string,
    filingId: string | null | undefined,
    overrides: Partial<{ reasoning: string }> = {},
  ) {
    const tags = [extraction.documentType || 'unknown']
    await db.update(documents).set({
      extractedData: extraction as any,
      aiTags: tags as any,
      confidenceScore: extraction.overallConfidence,
    }).where(eq(documents.id, documentId))

    await this.log({
      orgId,
      filingId: filingId || null,
      action: 'document_extracted',
      reasoning: overrides.reasoning || extraction.reasoning || 'Extracted structured data from document',
      confidenceScore: extraction.overallConfidence,
      outputs: { documentId, documentType: extraction.documentType },
    })
  }
}

function isVisionMime(mime: string): boolean {
  if (VISION_MIME.has(mime)) return true
  return mime.startsWith('image/')
}

function buildLowConfidenceExtraction(fileName: string, reason: string): DocumentExtraction {
  return {
    documentType: 'Unrecognized',
    taxYear: new Date().getFullYear(),
    fields: {},
    overallConfidence: 0.3,
    flaggedIssues: [`Automatic extraction unavailable (${reason}) for "${fileName}"`],
    reasoning: `Extraction did not produce a confident structured result for this file type (${reason}). CPA review recommended.`,
  }
}

function buildFallbackContext(fileName: string): DocumentContext {
  return {
    rawText: `Document: ${fileName} — content could not be extracted automatically.`,
    summary: `Uploaded document: ${fileName}. Manual review may be needed for content extraction.`,
    keyEntities: [],
    metadata: { documentType: 'unknown' },
  }
}
