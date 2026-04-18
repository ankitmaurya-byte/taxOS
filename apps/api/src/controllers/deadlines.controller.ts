/**
 * Deadlines Controller
 *
 * Read + action endpoints for tax filing deadlines.
 */

import { Request, Response, NextFunction } from 'express'
import { and, eq, inArray } from 'drizzle-orm'
import { db } from '../db'
import { deadlines, entities } from '../db/schema'
import { AppError, withContext } from '../lib/errors'
import { auditLogger } from '../lib/auditLog'

async function orgEntityIds(orgId: string): Promise<string[]> {
  const rows = await db.select({ id: entities.id }).from(entities)
    .where(eq(entities.orgId, orgId))
  return rows.map(e => e.id)
}

async function loadDeadline(req: Request) {
  const row = (await db.select().from(deadlines).where(eq(deadlines.id, req.params.id as string)).limit(1))[0]
  if (!row) throw new AppError('Deadline not found', 404)
  if (!(await orgEntityIds(req.user!.orgId)).includes(row.entityId)) {
    throw new AppError('Deadline not found', 404)
  }
  return row
}

function logAction(deadlineId: string, orgId: string, actorId: string, action: string, reasoning: string) {
  auditLogger.log({
    orgId,
    actorType: 'founder',
    actorId,
    action,
    reasoning: `[deadline ${deadlineId.slice(0, 8)}] ${reasoning}`,
  })
}

// ─── GET /api/deadlines ──────────────────────────────
export async function listDeadlines(req: Request, res: Response) {
  const { entityId } = req.query
  const ids = await orgEntityIds(req.user!.orgId)
  if (ids.length === 0) return res.json([])

  const rows = await db.select().from(deadlines)
    .where(inArray(deadlines.entityId, ids))
    .orderBy(deadlines.dueDate)
  const results = rows.filter(d => (entityId ? d.entityId === entityId : true))

  res.json(results)
}

// ─── GET /api/deadlines/:id ──────────────────────────
export async function getDeadline(req: Request, res: Response, next: NextFunction) {
  try {
    const d = await loadDeadline(req)
    res.json(d)
  } catch (err) { next(withContext(err as Error, 'getDeadline')) }
}

// ─── POST /api/deadlines/:id/complete ────────────────
// Mark as filed — captures note (optional), completedAt, completedById.
export async function markDeadlineComplete(req: Request, res: Response, next: NextFunction) {
  try {
    const d = await loadDeadline(req)
    const { note } = req.body as { note?: string }
    const now = new Date().toISOString()
    await db.update(deadlines).set({
      status: 'filed',
      completedAt: now,
      completedById: req.user!.userId,
      note: (note ?? null) || d.note,
      skipReason: null,
      snoozedUntil: null,
    }).where(eq(deadlines.id, d.id))
    logAction(d.id, req.user!.orgId, req.user!.userId, 'deadline_completed', `Marked ${d.formType} filed${note ? `: ${note}` : ''}`)
    res.json({ ok: true })
  } catch (err) { next(withContext(err as Error, 'markDeadlineComplete')) }
}

// ─── POST /api/deadlines/:id/skip ────────────────────
// Skip with required remark. Keeps data around for auditors.
export async function skipDeadline(req: Request, res: Response, next: NextFunction) {
  try {
    const { reason } = req.body as { reason?: string }
    const trimmed = (reason ?? '').trim()
    if (!trimmed) throw new AppError('A remark is required to skip a deadline.', 400)

    const d = await loadDeadline(req)
    await db.update(deadlines).set({
      status: 'skipped',
      skipReason: trimmed,
      completedAt: null,
      completedById: null,
      snoozedUntil: null,
    }).where(eq(deadlines.id, d.id))
    logAction(d.id, req.user!.orgId, req.user!.userId, 'deadline_skipped', `Skipped ${d.formType}: ${trimmed}`)
    res.json({ ok: true })
  } catch (err) { next(withContext(err as Error, 'skipDeadline')) }
}

// ─── POST /api/deadlines/:id/extend ──────────────────
// Mark extended. Optional `newDueDate` (ISO-ish) and optional `note`.
export async function extendDeadline(req: Request, res: Response, next: NextFunction) {
  try {
    const { newDueDate, note } = req.body as { newDueDate?: string; note?: string }
    const d = await loadDeadline(req)
    const patch: Record<string, unknown> = {
      status: 'extended',
      snoozedUntil: (typeof newDueDate === 'string' && newDueDate.trim()) ? newDueDate.trim() : null,
      note: (note ?? null) || d.note,
      skipReason: null,
    }
    if (typeof newDueDate === 'string' && newDueDate.trim()) {
      patch.dueDate = newDueDate.trim()
    }
    await db.update(deadlines).set(patch).where(eq(deadlines.id, d.id))
    logAction(d.id, req.user!.orgId, req.user!.userId, 'deadline_extended', `Extended ${d.formType}${newDueDate ? ` to ${newDueDate}` : ''}${note ? ` — ${note}` : ''}`)
    res.json({ ok: true })
  } catch (err) { next(withContext(err as Error, 'extendDeadline')) }
}

// ─── POST /api/deadlines/:id/snooze ──────────────────
// Stay upcoming, but remember a nudge date for the UI to show.
export async function snoozeDeadline(req: Request, res: Response, next: NextFunction) {
  try {
    const { until } = req.body as { until?: string }
    if (!until || typeof until !== 'string') throw new AppError('`until` (ISO date) is required', 400)
    const d = await loadDeadline(req)
    await db.update(deadlines).set({ snoozedUntil: until }).where(eq(deadlines.id, d.id))
    logAction(d.id, req.user!.orgId, req.user!.userId, 'deadline_snoozed', `Snoozed ${d.formType} until ${until}`)
    res.json({ ok: true })
  } catch (err) { next(withContext(err as Error, 'snoozeDeadline')) }
}

// ─── POST /api/deadlines/:id/reopen ──────────────────
// Return to upcoming and clear completion/skip markers.
export async function reopenDeadline(req: Request, res: Response, next: NextFunction) {
  try {
    const d = await loadDeadline(req)
    await db.update(deadlines).set({
      status: 'upcoming',
      completedAt: null,
      completedById: null,
      skipReason: null,
      snoozedUntil: null,
    }).where(eq(deadlines.id, d.id))
    logAction(d.id, req.user!.orgId, req.user!.userId, 'deadline_reopened', `Reopened ${d.formType}`)
    res.json({ ok: true })
  } catch (err) { next(withContext(err as Error, 'reopenDeadline')) }
}
