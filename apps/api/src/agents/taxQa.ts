import { BaseAgent } from './base'
import { db } from '../db'
import { entities, filings, documentContexts, documents } from '../db/schema'
import { eq } from 'drizzle-orm'
import type { SsePayload } from './lib/sse'
import { stripCodeFences } from './lib/json'
import { TaxQaMetadata, TaxQaMetadataSchema } from './lib/schemas'

const TAX_QA_SYSTEM_PROMPT = `
You are TaxOS AI Advisor — a knowledgeable US tax assistant for startup founders.

Always:
1. Answer in plain English — no unexplained jargon
2. Cite your source (IRS publication, IRC section, state code)
3. Provide a confidence level: HIGH/MEDIUM/LOW
4. If the question involves penalty exposure, amended returns, or significant financial risk,
   set requiresCpaReview=true
5. Never give a definitive answer on complex planning questions — recommend CPA consultation
6. Use the document context provided to give specific, data-informed answers when relevant

At the END of your response (after the plain English answer), output a JSON block on a new line starting with "METADATA:" followed by the JSON object:
METADATA:
{
  "confidence": "HIGH|MEDIUM|LOW",
  "requiresCpaReview": boolean,
  "cpaEscalationReason": "if requiresCpaReview is true, why",
  "sources": ["IRS Pub 535", "IRC §162"]
}
`

const METADATA_TAG = 'METADATA:'
const DOC_CONTEXT_PER_DOC_CHARS = 3_000
const DOC_CONTEXT_TOTAL_CHARS = 30_000

export class TaxQaAgent extends BaseAgent {
  private getDocumentContext(orgId: string): string {
    const contexts = db.select({
      rawText: documentContexts.rawText,
      summary: documentContexts.summary,
      keyEntities: documentContexts.keyEntities,
      fileName: documents.fileName,
    })
      .from(documentContexts)
      .innerJoin(documents, eq(documents.id, documentContexts.documentId))
      .where(eq(documentContexts.orgId, orgId))
      .all()

    if (contexts.length === 0) return ''

    const parts = contexts.map(ctx => {
      const lines = [`--- Document: ${ctx.fileName} ---`]
      if (ctx.summary) lines.push(`Summary: ${ctx.summary}`)
      const keyEntities = ctx.keyEntities as string[] | null
      if (keyEntities && keyEntities.length > 0) lines.push(`Key entities: ${keyEntities.join(', ')}`)
      if (ctx.rawText) lines.push(`Content: ${ctx.rawText.slice(0, DOC_CONTEXT_PER_DOC_CHARS)}`)
      return lines.join('\n')
    })

    let total = ''
    for (const part of parts) {
      if (total.length + part.length > DOC_CONTEXT_TOTAL_CHARS) break
      total += part + '\n\n'
    }
    return total
  }

  async *streamAnswer(orgId: string, question: string): AsyncGenerator<SsePayload> {
    const orgEntities = db.select().from(entities).where(eq(entities.orgId, orgId)).all()
    const activeFilings = db.select().from(filings)
      .where(eq(filings.orgId, orgId))
      .all()
      .filter(f => f.status !== 'archived')

    const docContext = this.getDocumentContext(orgId)

    const systemPrompt = `${TAX_QA_SYSTEM_PROMPT}

Entity context: ${JSON.stringify(orgEntities.map(e => ({ name: e.legalName, type: e.entityType, state: e.stateOfIncorporation, ein: e.ein })))}
Active filings: ${JSON.stringify(activeFilings.map(f => ({ form: f.formType, status: f.status, taxYear: f.taxYear })))}
${docContext ? `\n--- DOCUMENT VAULT CONTEXT ---\n${docContext}` : ''}
`

    const model = this.getModel(systemPrompt)
    const result = await model.generateContentStream(question)

    const stripper = new StreamingMetadataStripper()
    let fullResponse = ''
    for await (const chunk of result.stream) {
      const text = chunk.text()
      if (!text) continue
      fullResponse += text
      const visible = stripper.push(text)
      if (visible) yield { type: 'text', text: visible }
    }
    const tail = stripper.flush()
    if (tail) yield { type: 'text', text: tail }

    const metadata = extractMetadata(fullResponse)
    if (metadata) yield { type: 'metadata', metadata: metadata as unknown as Record<string, unknown> }

    await this.log({
      orgId,
      action: 'tax_qa_answered',
      reasoning: `Answered tax question: "${question.slice(0, 100)}"`,
      inputs: { question, documentContextUsed: docContext.length > 0 },
      outputs: {
        responseLength: fullResponse.length,
        confidence: metadata?.confidence ?? null,
        requiresCpaReview: metadata?.requiresCpaReview ?? null,
      },
      confidenceScore: confidenceToScore(metadata?.confidence),
    })
  }
}

function confidenceToScore(level: TaxQaMetadata['confidence'] | undefined): number | undefined {
  if (!level) return undefined
  if (level === 'HIGH') return 0.9
  if (level === 'MEDIUM') return 0.7
  return 0.4
}

function extractMetadata(full: string): TaxQaMetadata | null {
  const idx = full.lastIndexOf(METADATA_TAG)
  if (idx === -1) return null
  const candidate = stripCodeFences(full.slice(idx + METADATA_TAG.length))
  const jsonStart = candidate.indexOf('{')
  if (jsonStart === -1) return null
  try {
    const parsed = JSON.parse(candidate.slice(jsonStart))
    const validated = TaxQaMetadataSchema.safeParse(parsed)
    return validated.success ? validated.data : null
  } catch {
    return null
  }
}

/**
 * Streams text while hiding anything from the `METADATA:` tag onward.
 * Buffers a tail long enough to safely detect the 9-char tag across chunk boundaries.
 */
class StreamingMetadataStripper {
  private buffer = ''
  private sealed = false

  push(chunk: string): string {
    if (this.sealed) return ''
    this.buffer += chunk
    const idx = this.buffer.indexOf(METADATA_TAG)
    if (idx !== -1) {
      const out = this.buffer.slice(0, idx)
      this.buffer = ''
      this.sealed = true
      return out
    }
    // Keep last (METADATA_TAG.length - 1) chars in buffer in case tag straddles boundary.
    const safe = Math.max(0, this.buffer.length - (METADATA_TAG.length - 1))
    const out = this.buffer.slice(0, safe)
    this.buffer = this.buffer.slice(safe)
    return out
  }

  flush(): string {
    if (this.sealed) return ''
    const out = this.buffer
    this.buffer = ''
    return out
  }
}
