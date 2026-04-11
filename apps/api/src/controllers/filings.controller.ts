/**
 * Filings Controller
 *
 * Manages the full filing lifecycle: creation, status transitions, approval,
 * rejection, pausing, and CPA escalation. Enforces HITL (Human-in-the-Loop) gates.
 *
 * Declared in : controllers/filings.controller.ts
 * Used in     : routes/filings.ts
 * API Prefix  : /api/filings
 *
 * Functions:
 *   listFilings       → GET    /api/filings              (list with optional filters)
 *                        Frontend: api.getFilings() → pages/Home.tsx, pages/Filings.tsx, pages/CommandCenter.tsx, pages/FilingRoom.tsx
 *   createFiling      → POST   /api/filings              (create new filing, status=intake)
 *                        Frontend: api.createFiling() → (available, not currently called by a page)
 *   getFiling         → GET    /api/filings/:id          (filing + conversations, docs, approvals)
 *                        Frontend: api.getFiling() → pages/FilingDetail.tsx, pages/FilingRoom.tsx
 *   updateFilingStatus→ PUT    /api/filings/:id/status   (validated status transitions)
 *                        Frontend: api.updateFilingStatus() → (available, not currently called by a page)
 *   approveFiling     → POST   /api/filings/:id/approve  (founder approves → submitted)
 *                        Frontend: api.approveFiling() → pages/FilingRoom.tsx (approve mutation)
 *   rejectFiling      → POST   /api/filings/:id/reject   (founder rejects → cpa_review)
 *                        Frontend: api.rejectFiling() → pages/FilingRoom.tsx (reject mutation)
 *   pauseFiling       → POST   /api/filings/:id/pause    (pause AI workflow)
 *                        Frontend: (no api function wired yet)
 *   escalateToCpa     → POST   /api/filings/:id/escalate-cpa (escalate to CPA takeover)
 *                        Frontend: (no api function wired yet)
 *
 * Status workflow: intake → ai_prep → cpa_review → founder_approval → submitted → archived
 *
 * Connected tables:
 *   - filings              → main target
 *   - approvalQueue        → resolved on approve/reject, created on escalate
 *   - agentConversations   → returned in getFiling
 *   - documents            → returned in getFiling
 *   - auditLog (via auditLogger) → logs every state change
 *
 * Dependencies:
 *   - createFilingSchema, updateFilingStatusSchema → from shared (Zod)
 *   - auditLogger.log()  → from lib/auditLog.ts
 *   - ALLOWED_TRANSITIONS → state machine for valid status changes
 */

import { Request, Response, NextFunction } from 'express'
import { eq, and, desc } from 'drizzle-orm'
import { db } from '../db'
import { filings, approvalQueue, agentConversations, documents, filingReviewLocks, users } from '../db/schema'
import { createFilingSchema, updateFilingStatusSchema, type FilingStatus } from 'shared'
import { auditLogger } from '../lib/auditLog'
import { ensureCpaHasOrgAccess } from '../lib/rbac'
import { AppError, withContext } from '../lib/errors'

// Valid status transitions (state machine).
// Key = current status, value = array of allowed next statuses.
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  intake:           ['ai_prep'],
  ai_prep:          ['cpa_review', 'intake'],
  cpa_review:       ['founder_approval', 'ai_prep'],
  founder_approval: ['submitted', 'cpa_review'],
  submitted:        ['archived'],
  archived:         [],
}

function getActiveLock(filingId: string) {
  return db.select().from(filingReviewLocks)
    .where(and(eq(filingReviewLocks.filingId, filingId), eq(filingReviewLocks.status, 'active')))
    .get()
}

function getReviewerName(userId: string) {
  return db.select({ name: users.name }).from(users).where(eq(users.id, userId)).get()?.name || 'Another CPA'
}

function ensureCpaReviewAccess(req: Request, filingId: string, orgId: string) {
  if (req.user!.role !== 'cpa') return null
  if (!ensureCpaHasOrgAccess(req.user!.userId, orgId)) {
    return 'CPA is not assigned to this organization'
  }

  const existingLock = getActiveLock(filingId)
  if (existingLock && existingLock.cpaUserId !== req.user!.userId) {
    return `This filing is already being handled by ${getReviewerName(existingLock.cpaUserId)}.`
  }

  const completedLock = db.select().from(filingReviewLocks)
    .where(and(eq(filingReviewLocks.filingId, filingId), eq(filingReviewLocks.status, 'completed')))
    .get()
  if (completedLock && completedLock.cpaUserId !== req.user!.userId) {
    return 'This filing was already approved by another CPA.'
  }

  return null
}

// ─── GET /api/filings ────────────────────────────────
// Frontend caller: api.getFilings() → pages/Home.tsx, Filings.tsx, CommandCenter.tsx, FilingRoom.tsx
// Lists all filings for the user's org. Supports optional query filters:
//   ?status=cpa_review   → filter by filing status
//   ?entityId=ent_123    → filter by entity
//   ?year=2025           → filter by tax year
// Connected fields: req.user.orgId → filings.orgId
export function listFilings(req: Request, res: Response) {
  const { status, entityId, year } = req.query

  const results = db.select().from(filings)
    .where(eq(filings.orgId, req.user!.orgId))
    .orderBy(desc(filings.updatedAt))
    .all()
    .filter(f => {
      if (status && f.status !== status) return false
      if (entityId && f.entityId !== entityId) return false
      if (year && f.taxYear !== Number(year)) return false
      return true
    })

  const locks = db.select().from(filingReviewLocks).all()
  res.json(results.map((item) => ({
    ...item,
    reviewLock: locks.find((lock) => lock.filingId === item.id && lock.status === 'active') || null,
  })))
}

// ─── POST /api/filings ──────────────────────────────
// Creates a new filing with status='intake'.
// Validates body with createFilingSchema (shared/schemas/filing.ts).
// Connected fields:
//   filings.entityId  ← req.body.entityId (must match an existing entity)
//   filings.orgId     ← req.user.orgId (from JWT)
//   auditLog.filingId ← newly created filing.id
export async function createFiling(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createFilingSchema.parse(req.body)
    const filing = db.insert(filings).values({
      ...data,
      orgId: req.user!.orgId,
      status: 'intake',
    }).returning().get()

    auditLogger.log({
      orgId: req.user!.orgId,
      filingId: filing.id,
      actorType: 'system',
      actorId: req.user!.userId,
      action: 'filing_created',
      reasoning: `Filing created for ${data.formType} - ${data.formName}`,
    })

    res.status(201).json(filing)
  } catch (err) { next(withContext(err as Error, 'createFiling')) }
}

// ─── GET /api/filings/:id ───────────────────────────
// Frontend caller: api.getFiling(id) → pages/FilingDetail.tsx, FilingRoom.tsx
// Returns a filing with all related data: conversations, documents, approvals.
// Connected fields:
//   agentConversations.filingId → filing.id
//   documents.filingId          → filing.id
//   approvalQueue.filingId      → filing.id
export function getFiling(req: Request, res: Response) {
  const filing = db.select().from(filings)
    .where(and(eq(filings.id, req.params.id as string), eq(filings.orgId, req.user!.orgId)))
    .get()
  if (!filing) return res.status(404).json({ error: 'Filing not found' })

  const conversations = db.select().from(agentConversations)
    .where(eq(agentConversations.filingId, req.params.id as string))
    .all()
  const docs = db.select().from(documents)
    .where(eq(documents.filingId, req.params.id as string))
    .all()
  const approvals = db.select().from(approvalQueue)
    .where(eq(approvalQueue.filingId, req.params.id as string))
    .all()
  const reviewLock = getActiveLock(req.params.id as string)

  res.json({ ...filing, conversations, documents: docs, approvals, reviewLock })
}

// ─── PUT /api/filings/:id/status ────────────────────
// Updates filing status with validation against ALLOWED_TRANSITIONS.
//
// HITL Gates enforced here:
//   1. Cannot transition to 'submitted' without founderApprovedAt being set
//   2. Only CPA role can advance to 'founder_approval' (founders cannot self-advance)
//
// Connected fields:
//   req.body.status → validated against ALLOWED_TRANSITIONS[currentStatus]
//   req.user.role   → checked for HITL gate on founder_approval transition
export async function updateFilingStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { status: newStatus } = updateFilingStatusSchema.parse(req.body)
    const filing = db.select().from(filings)
      .where(and(eq(filings.id, req.params.id as string), eq(filings.orgId, req.user!.orgId)))
      .get()
    if (!filing) throw new AppError('Filing not found', 404)

    const cpaReviewError = ensureCpaReviewAccess(req, filing.id, filing.orgId)
    if (cpaReviewError) throw new AppError(cpaReviewError, 409)

    const allowed = ALLOWED_TRANSITIONS[filing.status] || []
    if (!allowed.includes(newStatus)) {
      throw new AppError(`Cannot transition from ${filing.status} to ${newStatus}`, 400)
    }

    // HITL gate: submitted requires founder approval
    if (newStatus === 'submitted') {
      if (!filing.founderApprovedAt) {
        throw new AppError('HITL_GATE: Cannot submit without founder approval', 403)
      }
    }

    // HITL gate: only CPA can advance to founder_approval
    if (newStatus === 'founder_approval' && req.user!.role === 'founder') {
      throw new AppError('HITL_GATE: CPA must advance filing to founder approval stage', 403)
    }

    const now = new Date().toISOString()
    db.update(filings).set({
      status: newStatus as FilingStatus,
      updatedAt: now,
      ...(newStatus === 'submitted' ? { submittedAt: now } : {}),
    }).where(eq(filings.id, req.params.id as string)).run()

    if (req.user!.role === 'cpa' && newStatus === 'founder_approval') {
      const lock = getActiveLock(filing.id)
      if (lock) {
        db.update(filingReviewLocks).set({ status: 'completed', releasedAt: now }).where(eq(filingReviewLocks.id, lock.id)).run()
      }
    }

    auditLogger.log({
      orgId: req.user!.orgId,
      filingId: filing.id,
      actorType: req.user!.role === 'cpa' ? 'cpa' : 'founder',
      actorId: req.user!.userId,
      action: 'status_changed',
      reasoning: `Filing status changed from ${filing.status} to ${newStatus}`,
    })

    res.json({ message: `Status updated to ${newStatus}` })
  } catch (err) { next(withContext(err as Error, 'updateFilingStatus')) }
}

// ─── POST /api/filings/:id/approve ──────────────────
// Frontend caller: api.approveFiling(id) → pages/FilingRoom.tsx (approve mutation)
// Founder approves the filing → sets founderApprovedAt, status='submitted'.
// Also resolves any pending founder approval queue items.
//
// Pre-condition: filing.status must be 'founder_approval'
// Connected fields:
//   filings.founderApprovedAt ← set to now
//   filings.submittedAt       ← set to now
//   approvalQueue.status      ← 'approved' (pending founder items)
//   approvalQueue.resolvedById← req.user.userId
export async function approveFiling(req: Request, res: Response, next: NextFunction) {
  try {
    const filing = db.select().from(filings)
      .where(and(eq(filings.id, req.params.id as string), eq(filings.orgId, req.user!.orgId)))
      .get()
    if (!filing) throw new AppError('Filing not found', 404)

    if (filing.status !== 'founder_approval') {
      throw new AppError('Filing is not in founder_approval stage', 400)
    }

    const now = new Date().toISOString()
    db.update(filings).set({
      founderApprovedAt: now,
      status: 'submitted',
      submittedAt: now,
      updatedAt: now,
    }).where(eq(filings.id, req.params.id as string)).run()

    // Resolve pending founder approval queue items for this filing
    const pending = db.select().from(approvalQueue)
      .where(and(
        eq(approvalQueue.filingId, req.params.id as string),
        eq(approvalQueue.status, 'pending'),
        eq(approvalQueue.queueType, 'founder'),
      )).all()

    for (const item of pending) {
      db.update(approvalQueue).set({
        status: 'approved',
        resolvedAt: now,
        resolvedById: req.user!.userId,
      }).where(eq(approvalQueue.id, item.id)).run()
    }

    auditLogger.log({
      orgId: req.user!.orgId,
      filingId: filing.id,
      actorType: 'founder',
      actorId: req.user!.userId,
      action: 'founder_approved',
      reasoning: 'Founder reviewed and approved the filing for submission',
    })

    res.json({ message: 'Filing approved and submitted' })
  } catch (err) { next(withContext(err as Error, 'approveFiling')) }
}

// ─── POST /api/filings/:id/reject ───────────────────
// Frontend caller: api.rejectFiling(id, reason) → pages/FilingRoom.tsx (reject mutation)
// Founder rejects the filing → status reverts to 'cpa_review'.
// Requires { reason: string } in body.
// Connected fields:
//   filings.status              ← 'cpa_review'
//   approvalQueue.status        ← 'rejected'
//   approvalQueue.rejectionReason ← req.body.reason
export async function rejectFiling(req: Request, res: Response, next: NextFunction) {
  try {
    const { reason } = req.body
    if (!reason) throw new AppError('Rejection reason is required', 400)

    const filing = db.select().from(filings)
      .where(and(eq(filings.id, req.params.id as string), eq(filings.orgId, req.user!.orgId)))
      .get()
    if (!filing) throw new AppError('Filing not found', 404)

    db.update(filings).set({
      status: 'cpa_review',
      updatedAt: new Date().toISOString(),
    }).where(eq(filings.id, req.params.id as string)).run()

    // Reject all pending approval items for this filing
    const pending = db.select().from(approvalQueue)
      .where(and(
        eq(approvalQueue.filingId, req.params.id as string),
        eq(approvalQueue.status, 'pending'),
      )).all()

    for (const item of pending) {
      db.update(approvalQueue).set({
        status: 'rejected',
        rejectionReason: reason,
        resolvedAt: new Date().toISOString(),
        resolvedById: req.user!.userId,
      }).where(eq(approvalQueue.id, item.id)).run()
    }

    auditLogger.log({
      orgId: req.user!.orgId,
      filingId: filing.id,
      actorType: 'founder',
      actorId: req.user!.userId,
      action: 'founder_rejected',
      reasoning: `Founder rejected filing. Reason: ${reason}`,
    })

    res.json({ message: 'Filing rejected and sent back to CPA review' })
  } catch (err) { next(withContext(err as Error, 'rejectFiling')) }
}

// ─── POST /api/filings/:id/pause ────────────────────
// Pauses the AI workflow for this filing. Logs the action but does not change status.
// Connected fields: auditLog.filingId ← filing.id
export function pauseFiling(req: Request, res: Response) {
  const filing = db.select().from(filings)
    .where(and(eq(filings.id, req.params.id as string), eq(filings.orgId, req.user!.orgId)))
    .get()
  if (!filing) return res.status(404).json({ error: 'Filing not found' })

  auditLogger.log({
    orgId: req.user!.orgId,
    filingId: filing.id,
    actorType: 'founder',
    actorId: req.user!.userId,
    action: 'workflow_paused',
    reasoning: 'Founder requested pause on AI workflow',
  })

  res.json({ message: 'AI workflow paused' })
}

// ─── POST /api/filings/:id/escalate-cpa ─────────────
// Creates a CPA approval queue item so a CPA can take over the filing.
// Connected fields:
//   approvalQueue.filingId  ← filing.id
//   approvalQueue.queueType ← 'cpa'
//   auditLog.action         ← 'escalated_to_cpa'
export function escalateToCpa(req: Request, res: Response) {
  const filing = db.select().from(filings)
    .where(and(eq(filings.id, req.params.id as string), eq(filings.orgId, req.user!.orgId)))
    .get()
  if (!filing) return res.status(404).json({ error: 'Filing not found' })

  db.insert(approvalQueue).values({
    orgId: req.user!.orgId,
    filingId: filing.id,
    queueType: 'cpa',
    status: 'pending',
    summary: `Founder escalated ${filing.formType} for CPA takeover.`,
    aiRecommendation: 'Founder requested manual CPA review.',
  }).run()

  auditLogger.log({
    orgId: req.user!.orgId,
    filingId: filing.id,
    actorType: 'founder',
    actorId: req.user!.userId,
    action: 'escalated_to_cpa',
    reasoning: 'Founder requested CPA takeover of this filing',
  })

  res.json({ message: 'Filing escalated to CPA' })
}

export function claimFilingReview(req: Request, res: Response) {
  const filing = db.select().from(filings)
    .where(and(eq(filings.id, req.params.id as string), eq(filings.orgId, req.user!.orgId)))
    .get()
  if (!filing) return res.status(404).json({ error: 'Filing not found' })
  if (req.user!.role !== 'cpa') return res.status(403).json({ error: 'Only CPAs can claim filings' })

  const conflict = ensureCpaReviewAccess(req, filing.id, filing.orgId)
  if (conflict) return res.status(409).json({ error: conflict })

  const lock = getActiveLock(filing.id)
  if (lock) return res.json(lock)

  const created = db.insert(filingReviewLocks).values({
    filingId: filing.id,
    cpaUserId: req.user!.userId,
    status: 'active',
  }).returning().get()
  res.status(201).json(created)
}

export function releaseFilingReview(req: Request, res: Response) {
  const lock = getActiveLock(req.params.id as string)
  if (!lock) return res.json({ message: 'No active review lock' })
  if (lock.cpaUserId !== req.user!.userId) {
    return res.status(403).json({ error: 'Only the assigned CPA can release this lock' })
  }
  db.update(filingReviewLocks).set({ status: 'released', releasedAt: new Date().toISOString() }).where(eq(filingReviewLocks.id, lock.id)).run()
  res.json({ message: 'Review lock released' })
}
