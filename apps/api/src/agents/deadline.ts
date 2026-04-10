import { BaseAgent } from './base'
import { db } from '../db'
import { deadlines, entities } from '../db/schema'
import { eq } from 'drizzle-orm'
import { getApplicableDeadlines, calculateUrgencyScore } from '../lib/deadlineEngine'

export class DeadlineAgent extends BaseAgent {
  async calculateDeadlines(entityId: string, orgId: string): Promise<void> {
    const entity = db.select().from(entities).where(eq(entities.id, entityId)).get()
    if (!entity) throw new Error('Entity not found')

    const taxYear = new Date().getFullYear() - 1
    const applicable = getApplicableDeadlines(entity.entityType, taxYear, entity.stateOfIncorporation)

    // Check for complex cases needing AI
    const hasForeignSubs = entity.foreignSubsidiaries &&
      (typeof entity.foreignSubsidiaries === 'string'
        ? JSON.parse(entity.foreignSubsidiaries as string)
        : entity.foreignSubsidiaries
      ).length > 0

    if (hasForeignSubs) {
      // Add Form 5471 if not already included
      const has5471 = applicable.some(d => d.formType === '5471')
      if (!has5471) {
        const dueDate = `${taxYear + 1}-04-15`
        applicable.push({
          formType: '5471',
          formName: 'Information Return — Foreign Corporations',
          dueDate,
          description: 'Required for foreign subsidiary reporting',
        })
      }
    }

    // Upsert deadlines
    for (const dl of applicable) {
      const existing = db.select().from(deadlines)
        .where(eq(deadlines.entityId, entityId))
        .all()
        .find(d => d.formType === dl.formType)

      if (existing) {
        db.update(deadlines).set({
          dueDate: dl.dueDate,
          urgencyScore: calculateUrgencyScore(dl.dueDate),
          status: calculateUrgencyScore(dl.dueDate) === 100 ? 'overdue' : 'upcoming',
        }).where(eq(deadlines.id, existing.id)).run()
      } else {
        db.insert(deadlines).values({
          entityId,
          formType: dl.formType,
          formName: dl.formName,
          dueDate: dl.dueDate,
          urgencyScore: calculateUrgencyScore(dl.dueDate),
          status: calculateUrgencyScore(dl.dueDate) === 100 ? 'overdue' : 'upcoming',
          description: dl.description,
          aiPredicted: true,
        }).run()
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
