import { BaseAgent } from './base'
import { db } from '../db'
import { filings, entities, approvalQueue } from '../db/schema'
import { and, eq } from 'drizzle-orm'
import { AgentOutputError } from './lib/json'
import { AuditRiskResult, AuditRiskSchema } from './lib/schemas'

const AUDIT_RISK_PROMPT = `
You are a US tax audit risk specialist.

Analyze this filing for audit risk factors and return ONLY a JSON object:

{
  "overallRiskScore": 0-100,
  "riskLevel": "low|medium|high|critical",
  "flaggedItems": [
    {
      "lineItem": "field/line reference",
      "issue": "description of concern",
      "severity": "low|medium|high",
      "recommendation": "what to do"
    }
  ],
  "reasoning": "overall assessment"
}

Risk score guide: 0-30=low, 31-60=medium, 61-85=high, 86-100=critical.
If riskScore > 60, mandatory CPA review is required.
`

const MANDATORY_CPA_RISK = 60

export interface AuditRiskOutcome {
  riskScore: number
  riskLevel: AuditRiskResult['riskLevel']
  flaggedItems: AuditRiskResult['flaggedItems']
  summary: string
  queuedForCpa: boolean
  statusTransitionedTo: string | null
}

export class AuditRiskAgent extends BaseAgent {
  async scoreRisk(filingId: string, orgId: string): Promise<AuditRiskOutcome> {
    const filing = (await db.select().from(filings).where(eq(filings.id, filingId)).limit(1))[0]
    if (!filing) throw new Error('Filing not found')

    const entity = (await db.select().from(entities).where(eq(entities.id, filing.entityId)).limit(1))[0]

    const prompt = `${AUDIT_RISK_PROMPT}

Form type: ${filing.formType}
Filing data: ${JSON.stringify(filing.filingData)}
Entity profile: ${JSON.stringify(entity)}
AI confidence: ${filing.aiConfidenceScore ?? 'unknown'}
`

    let result: AuditRiskResult
    try {
      result = await this.generateJson(prompt, AuditRiskSchema)
    } catch (err) {
      if (err instanceof AgentOutputError) {
        await this.log({
          orgId,
          filingId,
          action: 'audit_risk_parse_failed',
          reasoning: err.message,
          outputs: { rawOutput: err.rawText.slice(0, 500) },
        })
        // Conservative default when AI output unparsable: treat as medium risk, still flag CPA.
        result = {
          overallRiskScore: 65,
          riskLevel: 'high',
          flaggedItems: [{
            lineItem: 'overall',
            issue: 'AI audit-risk model returned unparseable output; defaulting to high-risk for safety.',
            severity: 'high',
            recommendation: 'Manual CPA review.',
          }],
          reasoning: 'Unparseable AI response; conservative fallback.',
        }
      } else {
        throw err
      }
    }

    const queuedForCpa = result.overallRiskScore > MANDATORY_CPA_RISK

    // Halt filing at CPA review if risk crosses the mandatory gate (and filing hasn't moved past it).
    const blockingStatuses: Array<typeof filings.$inferSelect.status> = ['intake', 'ai_prep', 'cpa_review']
    const shouldHalt = queuedForCpa && blockingStatuses.includes(filing.status)
    const nextStatus = shouldHalt ? 'cpa_review' : filing.status
    if (shouldHalt && filing.status !== 'cpa_review') {
      await db.update(filings).set({
        status: 'cpa_review',
        updatedAt: new Date().toISOString(),
      }).where(eq(filings.id, filingId))
    }

    if (queuedForCpa) {
      const existing = (await db.select().from(approvalQueue)
        .where(and(
          eq(approvalQueue.filingId, filingId),
          eq(approvalQueue.queueType, 'cpa'),
          eq(approvalQueue.status, 'pending'),
        ))
        .limit(1))[0]
      if (!existing) {
        await db.insert(approvalQueue).values({
          orgId,
          filingId,
          queueType: 'cpa',
          status: 'pending',
          summary: `Audit risk score ${result.overallRiskScore}/100 (${result.riskLevel}) — mandatory CPA review.`,
          aiRecommendation: result.reasoning,
        })
      }
    }

    await this.log({
      orgId,
      filingId,
      action: 'audit_risk_scored',
      reasoning: result.reasoning,
      confidenceScore: 1 - result.overallRiskScore / 100,
      outputs: {
        riskScore: result.overallRiskScore,
        riskLevel: result.riskLevel,
        flaggedCount: result.flaggedItems.length,
        queuedForCpa,
        statusTransitionedTo: shouldHalt ? nextStatus : null,
      },
    })

    return {
      riskScore: result.overallRiskScore,
      riskLevel: result.riskLevel,
      flaggedItems: result.flaggedItems,
      summary: result.reasoning,
      queuedForCpa,
      statusTransitionedTo: shouldHalt ? nextStatus : null,
    }
  }
}
