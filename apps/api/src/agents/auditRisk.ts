import { BaseAgent } from './base'
import { db } from '../db'
import { filings, entities, approvalQueue } from '../db/schema'
import { eq } from 'drizzle-orm'

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

Risk score guide: 0-30=low, 31-60=medium, 61-85=high, 86-100=critical
If riskScore > 60, mandatory CPA review is required.
`

export class AuditRiskAgent extends BaseAgent {
  async scoreRisk(filingId: string, orgId: string) {
    const filing = db.select().from(filings).where(eq(filings.id, filingId)).get()
    if (!filing) throw new Error('Filing not found')

    const entity = db.select().from(entities).where(eq(entities.id, filing.entityId)).get()

    const prompt = `${AUDIT_RISK_PROMPT}

Form type: ${filing.formType}
Filing data: ${JSON.stringify(filing.filingData)}
Entity profile: ${JSON.stringify(entity)}
AI confidence: ${filing.aiConfidenceScore}
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
        overallRiskScore: 35,
        riskLevel: 'medium',
        flaggedItems: [],
        reasoning: 'Unable to fully assess risk. CPA review recommended.',
      }
    }

    // If high risk, block submission and create mandatory CPA queue item
    if (result.overallRiskScore > 60) {
      db.insert(approvalQueue).values({
        orgId,
        filingId,
        queueType: 'cpa',
        status: 'pending',
        summary: `MANDATORY CPA REVIEW: Audit risk score ${result.overallRiskScore}/100 (${result.riskLevel}). ${result.flaggedItems?.length || 0} items flagged.`,
        aiRecommendation: result.reasoning,
      }).run()
    }

    await this.log({
      orgId,
      filingId,
      action: 'risk_scored',
      reasoning: `Audit risk score: ${result.overallRiskScore}/100 (${result.riskLevel}). ${result.reasoning}`,
      confidenceScore: (100 - result.overallRiskScore) / 100,
      outputs: result,
    })

    return result
  }
}
