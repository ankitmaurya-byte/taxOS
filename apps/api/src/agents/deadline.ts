import { BaseAgent } from './base'
import { db } from '../db'
import { deadlines, entities } from '../db/schema'
import { eq } from 'drizzle-orm'
import { getApplicableDeadlines, calculateUrgencyScore } from '../lib/deadlineEngine'
import { safeJsonParse } from './lib/json'

export class DeadlineAgent extends BaseAgent {
  async calculateDeadlines(entityId: string, orgId: string): Promise<void> {
    const entity = (await db.select().from(entities).where(eq(entities.id, entityId)).limit(1))[0]
    if (!entity) throw new Error('Entity not found')

    const taxYear = new Date().getFullYear() - 1
    const applicable = getApplicableDeadlines(entity.entityType, taxYear, entity.stateOfIncorporation)

    const foreignSubs = safeJsonParse<string[]>(entity.foreignSubsidiaries as unknown, [])
    if (Array.isArray(foreignSubs) && foreignSubs.length > 0) {
      const has5471 = applicable.some(d => d.formType === '5471')
      if (!has5471) {
        applicable.push({
          formType: '5471',
          formName: 'Information Return — Foreign Corporations',
          dueDate: `${taxYear + 1}-04-15`,
          description: 'Required for foreign subsidiary reporting',
        })
      }
    }

    for (const dl of applicable) {
      const urgency = calculateUrgencyScore(dl.dueDate)
      const status = urgency === 100 ? 'overdue' : 'upcoming'
      const existingRows = await db.select().from(deadlines)
        .where(eq(deadlines.entityId, entityId))
      const existing = existingRows.find(d => d.formType === dl.formType)

      if (existing) {
        await db.update(deadlines).set({
          dueDate: dl.dueDate,
          urgencyScore: urgency,
          status,
        }).where(eq(deadlines.id, existing.id))
      } else {
        await db.insert(deadlines).values({
          entityId,
          formType: dl.formType,
          formName: dl.formName,
          dueDate: dl.dueDate,
          urgencyScore: urgency,
          status,
          description: dl.description,
          aiPredicted: true,
        })
      }
    }

    await this.log({
      orgId,
      action: 'deadlines_calculated',
      reasoning: `Calculated ${applicable.length} deadlines for ${entity.legalName} (${entity.entityType}, ${entity.stateOfIncorporation})`,
      confidenceScore: 0.94,
      outputs: { deadlineCount: applicable.length, entityId },
    })
  }
}
