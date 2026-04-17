/**
 * Shared CPA escalation + selection helpers.
 *
 * Consumed by:
 *   - filings.controller.ts (escalateToCpa endpoint, cpaRejectFiling top-match logic)
 *   - agents/prefill.ts     (auto-escalate on low AI confidence)
 *
 * escalateFilingToCpa() performs the full side-effect bundle:
 *   - status → cpa_review
 *   - approvalQueue row (queueType='cpa', status='pending')
 *   - round-robin notify N CPAs via cpaNotifications + SSE 'filing_assigned'
 *   - audit log entry
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

export function getCpaFilingStats(cpaId: string) {
  const approvedCount = db.select().from(filingReviewLocks)
    .where(and(eq(filingReviewLocks.cpaUserId, cpaId), eq(filingReviewLocks.status, 'completed')))
    .all().length

  const rejectedCount = db.select().from(cpaRejections)
    .where(eq(cpaRejections.cpaUserId, cpaId))
    .all().length

  const totalFilings = approvedCount + rejectedCount
  const approvalRate = totalFilings > 0 ? approvedCount / totalFilings : 0

  return { approvedCount, rejectedCount, totalFilings, approvalRate }
}

export function selectCpasForEscalation(limit = 5): string[] {
  const allCpas = db.select().from(users).where(eq(users.role, 'cpa')).all()

  const activeCpas = allCpas
    .filter(u => u.status === 'active')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  if (activeCpas.length >= limit) {
    return activeCpas.slice(0, limit).map(u => u.id)
  }

  const nonActiveCpas = allCpas.filter(u => u.status !== 'active')
  const ranked = nonActiveCpas
    .map(u => ({ ...u, stats: getCpaFilingStats(u.id) }))
    .sort((a, b) => {
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

export function escalateFilingToCpa(params: EscalateFilingParams): { notifiedCpaIds: string[] } {
  const { filingId, orgId, formType, formName, summary, aiRecommendation, actor, auditReasoning } = params

  // Transition to cpa_review
  db.update(filings).set({
    status: 'cpa_review',
    updatedAt: new Date().toISOString(),
  }).where(eq(filings.id, filingId)).run()

  // Create approval queue row (skip if one already pending for CPA on this filing)
  const existing = db.select().from(approvalQueue)
    .where(and(
      eq(approvalQueue.filingId, filingId),
      eq(approvalQueue.queueType, 'cpa'),
      eq(approvalQueue.status, 'pending'),
    )).get()
  if (!existing) {
    db.insert(approvalQueue).values({
      orgId,
      filingId,
      queueType: 'cpa',
      status: 'pending',
      summary,
      aiRecommendation: aiRecommendation ?? null,
    }).run()
  }

  // Round-robin notify CPAs
  const selectedCpaIds = selectCpasForEscalation(params.limit ?? 5)
  for (const cpaId of selectedCpaIds) {
    const already = db.select().from(cpaNotifications)
      .where(and(
        eq(cpaNotifications.filingId, filingId),
        eq(cpaNotifications.cpaUserId, cpaId),
      )).get()
    if (!already) {
      db.insert(cpaNotifications).values({
        filingId,
        cpaUserId: cpaId,
        status: 'pending',
      }).run()
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

  auditLogger.log({
    orgId,
    filingId,
    actorType: actor.type,
    actorId: actor.id,
    action: 'escalated_to_cpa',
    reasoning: auditReasoning,
  })

  return { notifiedCpaIds: selectedCpaIds }
}
