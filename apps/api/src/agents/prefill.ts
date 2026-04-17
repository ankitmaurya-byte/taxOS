import { BaseAgent } from './base'
import { db } from '../db'
import { filings, entities, documents, agentConversations } from '../db/schema'
import { eq } from 'drizzle-orm'
import { AgentOutputError } from './lib/json'
import { PrefillResult, PrefillSchema } from './lib/schemas'
import { escalateFilingToCpa } from '../lib/cpaEscalation'

const PREFILL_ACTOR_ID = 'system:prefill-agent'

const PREFILL_PROMPT = `
You are a US tax form preparation specialist.

Given the entity information, intake responses, and extracted documents below,
prefill the form fields.

Return a JSON object:
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

const CONFIDENCE_GATE = 0.8

export interface PrefillOutcome extends PrefillResult {
  queuedForCpa: boolean
  statusTransitionedTo: string | null
}

export class PrefillAgent extends BaseAgent {
  async prefillForm(filingId: string, orgId: string): Promise<PrefillOutcome> {
    const filing = db.select().from(filings).where(eq(filings.id, filingId)).get()
    if (!filing) throw new Error('Filing not found')

    const entity = db.select().from(entities).where(eq(entities.id, filing.entityId)).get()
    const docs = db.select().from(documents).where(eq(documents.filingId, filingId)).all()
    const conversations = db.select().from(agentConversations)
      .where(eq(agentConversations.filingId, filingId)).all()
    const intakeTurns = conversations
      .filter(c => c.agentType === 'intake')
      .flatMap(c => (c.messages as any[]) || [])
      .map(m => ({ role: m.role, content: m.content }))

    const prompt = `${PREFILL_PROMPT}

Form type: ${filing.formType} (${filing.formName})
Entity data: ${JSON.stringify(entity)}
Intake data: ${JSON.stringify(intakeTurns)}
Extracted documents: ${JSON.stringify(docs.map(d => ({ name: d.fileName, data: d.extractedData })))}
Filing data so far: ${JSON.stringify(filing.filingData)}
`

    let result: PrefillResult
    try {
      result = await this.generateJson(prompt, PrefillSchema)
    } catch (err) {
      if (err instanceof AgentOutputError) {
        await this.log({
          orgId,
          filingId,
          action: 'prefill_parse_failed',
          reasoning: err.message,
          outputs: { rawOutput: err.rawText.slice(0, 500) },
        })
        throw new Error('AI prefill produced an invalid response. Please retry or enter fields manually.')
      }
      throw err
    }

    const fields = stringifyFieldValues(result.fields)
    const now = new Date().toISOString()

    const queuedForCpa = result.overallConfidence < CONFIDENCE_GATE
    const canTransitionFromPrefill = filing.status === 'intake' || filing.status === 'ai_prep'
    // Both confidence paths land in cpa_review. High confidence additionally flips the
    // cpaReviewSkipped flag so the UI can surface a manual "Escalate to founder" shortcut.
    const nextStatus: typeof filing.status = canTransitionFromPrefill ? 'cpa_review' : filing.status

    db.update(filings).set({
      filingData: { ...(filing.filingData || {}), ...fields } as any,
      aiConfidenceScore: result.overallConfidence,
      aiSummary: result.summary,
      aiReasoning: result.reasoning,
      cpaReviewSkipped: canTransitionFromPrefill && !queuedForCpa,
      ...(canTransitionFromPrefill ? { status: nextStatus } : {}),
      updatedAt: now,
    }).where(eq(filings.id, filingId)).run()

    // HITL: low-confidence → full CPA round-robin escalation (notify 5 CPAs, queue entry, SSE).
    if (queuedForCpa) {
      escalateFilingToCpa({
        filingId,
        orgId,
        formType: filing.formType,
        formName: filing.formName,
        summary: `AI prefill confidence ${(result.overallConfidence * 100).toFixed(0)}% is below ${CONFIDENCE_GATE * 100}% threshold. CPA review required.`,
        aiRecommendation: result.summary,
        actor: { type: 'ai', id: PREFILL_ACTOR_ID },
        auditReasoning: `Prefill auto-escalated: confidence ${(result.overallConfidence * 100).toFixed(0)}% < ${CONFIDENCE_GATE * 100}%.`,
      })
    }

    await this.log({
      orgId,
      filingId,
      action: 'form_prefilled',
      reasoning: result.reasoning,
      confidenceScore: result.overallConfidence,
      outputs: {
        fieldCount: Object.keys(fields).length,
        queuedForCpa,
        cpaReviewSkipped: canTransitionFromPrefill && !queuedForCpa,
        statusTransitionedTo: canTransitionFromPrefill ? nextStatus : null,
      },
    })

    return {
      ...result,
      fields,
      queuedForCpa,
      statusTransitionedTo: canTransitionFromPrefill ? nextStatus : null,
    }
  }
}

function stringifyFieldValues(fields: PrefillResult['fields']): PrefillResult['fields'] {
  const out: PrefillResult['fields'] = {}
  for (const [key, field] of Object.entries(fields)) {
    out[key] = {
      ...field,
      value: field.value == null ? '' : String(field.value),
    }
  }
  return out
}
