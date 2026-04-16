import { BaseAgent } from './base'
import { db } from '../db'
import { entities, filings, documentContexts, documents } from '../db/schema'
import { eq } from 'drizzle-orm'

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

At the END of your response (after the plain English answer), output a JSON block on a new line starting with "METADATA:" followed by:
{
  "confidence": "HIGH|MEDIUM|LOW",
  "requiresCpaReview": boolean,
  "cpaEscalationReason": "if requiresCpaReview is true, why",
  "sources": ["IRS Pub 535", "IRC §162", etc.]
}
`

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

    const contextParts = contexts.map(ctx => {
      const parts: string[] = []
      parts.push(`--- Document: ${ctx.fileName} ---`)
      if (ctx.summary) parts.push(`Summary: ${ctx.summary}`)
      if (ctx.keyEntities && (ctx.keyEntities as string[]).length > 0) {
        parts.push(`Key entities: ${(ctx.keyEntities as string[]).join(', ')}`)
      }
      if (ctx.rawText) {
        // Limit each document's raw text to avoid token overflow
        parts.push(`Content: ${ctx.rawText.substring(0, 3000)}`)
      }
      return parts.join('\n')
    })

    // Cap total context size
    let totalContext = ''
    for (const part of contextParts) {
      if (totalContext.length + part.length > 30000) break
      totalContext += part + '\n\n'
    }

    return totalContext
  }

  async *streamAnswer(orgId: string, question: string): AsyncGenerator<string> {
    const orgEntities = db.select().from(entities).where(eq(entities.orgId, orgId)).all()
    const activeFilings = db.select().from(filings)
      .where(eq(filings.orgId, orgId))
      .all()
      .filter(f => f.status !== 'archived')

    const docContext = this.getDocumentContext(orgId)

    const systemPrompt = `${TAX_QA_SYSTEM_PROMPT}

Entity context: ${JSON.stringify(orgEntities.map(e => ({ name: e.legalName, type: e.entityType, state: e.stateOfIncorporation, ein: e.ein })))}
Active filings: ${JSON.stringify(activeFilings.map(f => ({ form: f.formType, status: f.status, taxYear: f.taxYear })))}
${docContext ? `\n--- DOCUMENT VAULT CONTEXT ---\nThe following is extracted content from documents in the organization's vault. Use this data to provide specific, informed answers:\n\n${docContext}` : ''}
`

    const model = this.getModel(systemPrompt)
    const result = await model.generateContentStream(question)

    let fullResponse = ''
    for await (const chunk of result.stream) {
      const text = chunk.text()
      if (text) {
        fullResponse += text
        yield text
      }
    }

    await this.log({
      orgId,
      action: 'tax_qa_answered',
      reasoning: `Answered tax question: "${question.substring(0, 100)}..."`,
      inputs: { question, documentContextUsed: docContext.length > 0 },
      outputs: { responseLength: fullResponse.length },
    })
  }
}
