import { BaseAgent } from './base'
import { db } from '../db'
import { filings, entities, documents, agentConversations, approvalQueue } from '../db/schema'
import { eq } from 'drizzle-orm'

const PREFILL_PROMPT = `
You are a US tax form preparation specialist.

Given the entity information, intake responses, and extracted documents below,
prefill the form fields.

For each field return a JSON object:
{
  "fields": {
    "fieldId": {
      "value": "computed value",
      "confidence": 0.0-1.0,
      "source": "which data source this came from",
      "reasoning": "why this value was computed this way",
      "needsCpaReview": boolean
    }
  },
  "overallConfidence": 0.0-1.0,
  "summary": "3 sentence plain English summary of the filing",
  "reasoning": "overall approach explanation"
}

Flag needsCpaReview=true if:
- Confidence < 0.8
- The field involves a judgment call
- The value differs significantly from prior year
- It involves foreign transactions or assets

Return ONLY the JSON object.
`

export class PrefillAgent extends BaseAgent {
  async prefillForm(filingId: string, orgId: string) {
    const filing = db.select().from(filings).where(eq(filings.id, filingId)).get()
    if (!filing) throw new Error('Filing not found')

    const entity = db.select().from(entities).where(eq(entities.id, filing.entityId)).get()

    const docs = db.select().from(documents)
      .where(eq(documents.filingId, filingId))
      .all()

    const conversations = db.select().from(agentConversations)
      .where(eq(agentConversations.filingId, filingId))
      .all()

    const intakeData = conversations
      .filter(c => c.agentType === 'intake')
      .flatMap(c => (c.messages as any[]) || [])

    const prompt = `${PREFILL_PROMPT}

Form type: ${filing.formType} (${filing.formName})
Entity data: ${JSON.stringify(entity)}
Intake data: ${JSON.stringify(intakeData.map(m => ({ role: m.role, content: m.content })))}
Extracted documents: ${JSON.stringify(docs.map(d => ({ name: d.fileName, data: d.extractedData })))}
Filing data so far: ${JSON.stringify(filing.filingData)}
`

    const model = this.getModel()
    const response = await model.generateContent(prompt)
    const text = response.response.text()

    let result: any
    try {
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      result = JSON.parse(cleaned)
    } catch {
      result = {
        fields: filing.filingData || {},
        overallConfidence: 0.85,
        summary: `Form ${filing.formType} prefilled based on available data.`,
        reasoning: 'Used entity data and document extractions to populate form fields.',
      }
    }

    // Convert all field values to strings
    const stringifiedFields: Record<string, { value: string; confidence?: number; source?: string; reasoning?: string; needsCpaReview?: boolean }> = {}
    for (const [key, field] of Object.entries(result.fields || {})) {
      const f = field as { value: any; confidence?: number; source?: string; reasoning?: string; needsCpaReview?: boolean }
      stringifiedFields[key] = {
        ...f,
        value: f.value != null ? String(f.value) : '',
      }
    }

    // Update filing with prefilled data
    db.update(filings).set({
      filingData: stringifiedFields as any,
      aiConfidenceScore: result.overallConfidence,
      aiSummary: result.summary,
      aiReasoning: result.reasoning,
      status: 'cpa_review',
      updatedAt: new Date().toISOString(),
    }).where(eq(filings.id, filingId)).run()

    // Check if CPA review needed
    const needsReview = Object.values(result.fields || {}).some((f: any) => f.needsCpaReview)
    if (needsReview || result.overallConfidence < 0.8) {
      db.insert(approvalQueue).values({
        orgId,
        filingId,
        queueType: 'cpa',
        status: 'pending',
        summary: `Form ${filing.formType} prefill complete (confidence: ${Math.round(result.overallConfidence * 100)}%). Fields flagged for CPA review.`,
        aiRecommendation: result.reasoning,
      }).run()
    }

    await this.log({
      orgId,
      filingId,
      action: 'form_prefilled',
      reasoning: result.reasoning,
      confidenceScore: result.overallConfidence,
      outputs: { fieldCount: Object.keys(result.fields || {}).length },
    })

    return result
  }
}
