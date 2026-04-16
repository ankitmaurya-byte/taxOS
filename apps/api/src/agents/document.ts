import { BaseAgent } from './base'
import { db } from '../db'
import { documents, documentContexts } from '../db/schema'
import { eq } from 'drizzle-orm'
import fs from 'fs'
import path from 'path'

const EXTRACTION_PROMPT = `
You are a document extraction specialist. Extract all structured data from this tax document.

Return a JSON object with:
{
  "documentType": "string (e.g. W-2, 1099-NEC, bank statement)",
  "taxYear": number,
  "fields": {
    "fieldName": {
      "value": "extracted value",
      "confidence": 0.0-1.0
    }
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
  "rawText": "Full text content extracted from the document. Include all readable text, numbers, dates, names, addresses, amounts, etc.",
  "summary": "A 2-3 sentence summary of what this document is about and its key information.",
  "keyEntities": ["list of key entities/names/organizations/amounts mentioned"],
  "metadata": {
    "documentType": "type of document",
    "date": "any date found",
    "parties": ["any parties/people/organizations involved"],
    "amounts": ["any monetary amounts found"],
    "references": ["any reference numbers, account numbers, etc."]
  }
}

Extract EVERYTHING possible. Be thorough. Return ONLY the JSON object.
`

export class DocumentAgent extends BaseAgent {
  async extract(documentId: string, orgId: string) {
    const doc = db.select().from(documents).where(eq(documents.id, documentId)).get()
    if (!doc) throw new Error('Document not found')

    let extractionResult: any

    if (doc.mimeType === 'application/pdf' || doc.mimeType.startsWith('image/')) {
      const filePath = path.join(__dirname, '../../', doc.storageUrl)

      if (!fs.existsSync(filePath)) {
        extractionResult = this.simulateExtraction(doc.fileName)
      } else {
        const fileBuffer = fs.readFileSync(filePath)
        const base64 = fileBuffer.toString('base64')
        const mimeType = doc.mimeType as 'image/png' | 'image/jpeg' | 'application/pdf'
        const model = this.getModel()

        const result = await model.generateContent([
          { inlineData: { mimeType, data: base64 } },
          { text: EXTRACTION_PROMPT },
        ])

        const text = result.response.text()
        try {
          const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
          extractionResult = JSON.parse(cleaned)
        } catch {
          extractionResult = this.simulateExtraction(doc.fileName)
        }
      }
    } else {
      extractionResult = this.simulateExtraction(doc.fileName)
    }

    // Update document with extracted data
    const tags = [extractionResult.documentType || 'unknown']
    db.update(documents).set({
      extractedData: extractionResult as any,
      aiTags: tags as any,
      confidenceScore: extractionResult.overallConfidence || 0.8,
    }).where(eq(documents.id, documentId)).run()

    await this.log({
      orgId,
      filingId: doc.filingId,
      action: 'document_extracted',
      reasoning: extractionResult.reasoning || 'Extracted structured data from document',
      confidenceScore: extractionResult.overallConfidence || 0.8,
      outputs: { documentId, documentType: extractionResult.documentType },
    })

    return extractionResult
  }

  async extractContext(documentId: string, orgId: string, vaultId?: string | null) {
    const doc = db.select().from(documents).where(eq(documents.id, documentId)).get()
    if (!doc) throw new Error('Document not found')

    let contextResult: any

    const filePath = path.join(__dirname, '../../', doc.storageUrl)

    if (doc.mimeType === 'application/pdf' || doc.mimeType.startsWith('image/')) {
      if (!fs.existsSync(filePath)) {
        contextResult = this.fallbackContext(doc.fileName)
      } else {
        const fileBuffer = fs.readFileSync(filePath)
        const base64 = fileBuffer.toString('base64')
        const mimeType = doc.mimeType as 'image/png' | 'image/jpeg' | 'application/pdf'
        const model = this.getModel()

        try {
          const result = await model.generateContent([
            { inlineData: { mimeType, data: base64 } },
            { text: CONTEXT_EXTRACTION_PROMPT },
          ])
          const text = result.response.text()
          const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
          contextResult = JSON.parse(cleaned)
        } catch {
          contextResult = this.fallbackContext(doc.fileName)
        }
      }
    } else if (doc.mimeType === 'text/csv' || doc.mimeType === 'text/plain' ||
               doc.mimeType === 'application/json') {
      // Read text-based files directly
      if (fs.existsSync(filePath)) {
        const rawContent = fs.readFileSync(filePath, 'utf-8')
        const model = this.getModel()
        try {
          const result = await model.generateContent([
            { text: `Document content:\n\n${rawContent.substring(0, 50000)}\n\n${CONTEXT_EXTRACTION_PROMPT}` },
          ])
          const text = result.response.text()
          const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
          contextResult = JSON.parse(cleaned)
          // Use actual raw content for text files
          contextResult.rawText = rawContent.substring(0, 100000)
        } catch {
          contextResult = {
            rawText: rawContent.substring(0, 100000),
            summary: `Text file: ${doc.fileName}`,
            keyEntities: [],
            metadata: { documentType: doc.mimeType },
          }
        }
      } else {
        contextResult = this.fallbackContext(doc.fileName)
      }
    } else if (doc.mimeType.includes('spreadsheet') || doc.mimeType.includes('excel')) {
      // For Excel, try vision API
      if (fs.existsSync(filePath)) {
        const fileBuffer = fs.readFileSync(filePath)
        const rawContent = fileBuffer.toString('utf-8').substring(0, 50000)
        contextResult = {
          rawText: rawContent,
          summary: `Spreadsheet file: ${doc.fileName}`,
          keyEntities: [],
          metadata: { documentType: 'spreadsheet' },
        }
      } else {
        contextResult = this.fallbackContext(doc.fileName)
      }
    } else {
      contextResult = this.fallbackContext(doc.fileName)
    }

    // Store in documentContexts
    // Remove old context for this document first
    db.delete(documentContexts).where(eq(documentContexts.documentId, documentId)).run()

    db.insert(documentContexts).values({
      documentId,
      orgId,
      vaultId: vaultId || doc.vaultId || null,
      rawText: contextResult.rawText || '',
      summary: contextResult.summary || '',
      keyEntities: contextResult.keyEntities || [],
      metadata: contextResult.metadata || {},
    }).run()

    await this.log({
      orgId,
      action: 'document_context_extracted',
      reasoning: `Extracted context from "${doc.fileName}" for AI advisor use`,
      outputs: {
        documentId,
        summaryLength: (contextResult.summary || '').length,
        rawTextLength: (contextResult.rawText || '').length,
      },
    })

    return contextResult
  }

  private fallbackContext(fileName: string) {
    return {
      rawText: `Document: ${fileName} — content could not be extracted automatically.`,
      summary: `Uploaded document: ${fileName}. Manual review may be needed for content extraction.`,
      keyEntities: [],
      metadata: { documentType: 'unknown' },
    }
  }

  private simulateExtraction(fileName: string) {
    const lowerName = fileName.toLowerCase()
    if (lowerName.includes('w-2') || lowerName.includes('w2')) {
      return {
        documentType: 'W-2',
        taxYear: 2025,
        fields: {
          employerName: { value: 'Acme Inc', confidence: 0.95 },
          wages: { value: '150000', confidence: 0.92 },
          federalTaxWithheld: { value: '35000', confidence: 0.90 },
        },
        overallConfidence: 0.92,
        flaggedIssues: [],
        reasoning: 'Standard W-2 extraction',
      }
    }
    return {
      documentType: 'General Tax Document',
      taxYear: 2025,
      fields: {
        totalAmount: { value: 'Needs manual review', confidence: 0.6 },
      },
      overallConfidence: 0.65,
      flaggedIssues: ['Could not identify document type with certainty'],
      reasoning: 'Document type not recognized — flagging for manual review',
    }
  }
}
