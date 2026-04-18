/**
 * Shared CPA escalation + selection helpers.
 *
 * Consumed by:
 *   - filings.controller.ts (escalateToCpa endpoint, cpaRejectFiling top-match logic)
 *   - agents/prefill.ts     (auto-escalate on low AI confidence)
 */

import { and, eq } from 'drizzle-orm'
import { db } from '../db'
import {
  approvalQueue,
  cpaNotifications,
  cpaRejections,
  filingReviewLocks,
  filings,
  users,
} from '../db/schema'
import { auditLogger } from './auditLog'
import { sendToUsers } from '../services/sse.service'

export async function getCpaFilingStats(cpaId: string) {
  const approvedRows = await db.select().from(filingReviewLocks)
    .where(and(eq(filingReviewLocks.cpaUserId, cpaId), eq(filingReviewLocks.status, 'completed')))
  const rejectedRows = await db.select().from(cpaRejections)
    .where(eq(cpaRejections.cpaUserId, cpaId))

  const approvedCount = approvedRows.length
  const rejectedCount = rejectedRows.length
  const totalFilings = approvedCount + rejectedCount
  const approvalRate = totalFilings > 0 ? approvedCount / totalFilings : 0

  return { approvedCount, rejectedCount, totalFilings, approvalRate }
}

export async function selectCpasForEscalation(limit = 5): Promise<string[]> {
  const allCpas = await db.select().from(users).where(eq(users.role, 'cpa'))

  const activeCpas = allCpas
    .filter(u => u.status === 'active')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  if (activeCpas.length >= limit) {
    return activeCpas.slice(0, limit).map(u => u.id)
  }

  const nonActiveCpas = allCpas.filter(u => u.status !== 'active')
  const ranked = await Promise.all(
    nonActiveCpas.map(async (u) => ({ ...u, stats: await getCpaFilingStats(u.id) })),
  )
  ranked.sort((a, b) => {
    const aZeroRej = a.stats.rejectedCount === 0 ? 1 : 0
    const bZeroRej = b.stats.rejectedCount === 0 ? 1 : 0
    if (bZeroRej !== aZeroRej) return bZeroRej - aZeroRej
    if (b.stats.approvedCount !== a.stats.approvedCount) return b.stats.approvedCount - a.stats.approvedCount
    return a.createdAt.localeCompare(b.createdAt)
  })

  const needed = limit - activeCpas.length
  return [
    ...activeCpas.map(u => u.id),
    ...ranked.slice(0, needed).map(u => u.id),
  ]
}

export interface EscalateFilingParams {
  filingId: string
  orgId: string
  formType: string
  formName: string
  summary: string
  aiRecommendation?: string | null
  actor: { type: 'ai' | 'cpa' | 'founder' | 'system'; id: string }
  auditReasoning: string
  limit?: number
}

export async function escalateFilingToCpa(params: EscalateFilingParams): Promise<{ notifiedCpaIds: string[] }> {
  const { filingId, orgId, formType, formName, summary, aiRecommendation, actor, auditReasoning } = params

  await db.update(filings).set({
    status: 'cpa_review',
    updatedAt: new Date().toISOString(),
  }).where(eq(filings.id, filingId))

  const existing = (await db.select().from(approvalQueue)
    .where(and(
      eq(approvalQueue.filingId, filingId),
      eq(approvalQueue.queueType, 'cpa'),
      eq(approvalQueue.status, 'pending'),
    )).limit(1))[0]
  if (!existing) {
    await db.insert(approvalQueue).values({
      orgId,
      filingId,
      queueType: 'cpa',
      status: 'pending',
      summary,
      aiRecommendation: aiRecommendation ?? null,
    })
  }

  const selectedCpaIds = await selectCpasForEscalation(params.limit ?? 5)
  for (const cpaId of selectedCpaIds) {
    const already = (await db.select().from(cpaNotifications)
      .where(and(
        eq(cpaNotifications.filingId, filingId),
        eq(cpaNotifications.cpaUserId, cpaId),
      )).limit(1))[0]
    if (!already) {
      await db.insert(cpaNotifications).values({
        filingId,
        cpaUserId: cpaId,
        status: 'pending',
      })
    }
  }

  if (selectedCpaIds.length > 0) {
    sendToUsers(selectedCpaIds, {
      type: 'filing_assigned',
      data: {
        filingId,
        formType,
        formName,
        orgId,
        message: `A new filing (${formType}) has been escalated to CPA review.`,
      },
    })
  }

  await auditLogger.log({
    orgId,
    filingId,
    actorType: actor.type,
    actorId: actor.id,
    action: 'escalated_to_cpa',
    reasoning: auditReasoning,
  })

  return { notifiedCpaIds: selectedCpaIds }
}
