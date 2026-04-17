/**
 * Filings Controller
 *
 * Manages the full filing lifecycle: creation, status transitions, approval,
 * rejection, pausing, CPA escalation, and CPA rejection.
 *
 * Declared in : controllers/filings.controller.ts
 * Used in     : routes/filings.ts
 * API Prefix  : /api/filings
 *
 * Functions:
 *   listFilings       → GET    /api/filings
 *   createFiling      → POST   /api/filings
 *   getFiling         → GET    /api/filings/:id
 *   updateFilingStatus→ PUT    /api/filings/:id/status
 *   approveFiling     → POST   /api/filings/:id/approve     (founder)
 *   rejectFiling      → POST   /api/filings/:id/reject      (founder)
 *   cpaApproveFiling  → POST   /api/filings/:id/cpa-approve (CPA)
 *   cpaRejectFiling   → POST   /api/filings/:id/cpa-reject  (CPA — triggers top-match logic on "understanding issue")
 *   pauseFiling       → POST   /api/filings/:id/pause
 *   escalateToCpa     → POST   /api/filings/:id/escalate-cpa (round-robin CPA selection)
 *   claimFilingReview → POST   /api/filings/:id/claim-review
 *   releaseFilingReview→ POST  /api/filings/:id/release-review
 *
 * Status workflow: intake → ai_prep → cpa_review → founder_approval → submitted → archived
 *
 * Connected tables:
 *   - filings, approvalQueue, agentConversations, documents, auditLog
 *   - cpaNotifications   → round-robin escalation tracking
 *   - cpaRejections      → CPA rejection history (for top-match stat)
 *   - filingReviewLocks  → CPA review concurrency control
 *   - cpaAssignments     → CPA org access control
 */

import { Request, Response, NextFunction } from 'express'
import { and, desc, eq, inArray, ne } from 'drizzle-orm'
import { db } from '../db'
import {
  agentConversations,
  approvalQueue,
  cpaAssignments,
  cpaNotifications,
  cpaRejections,
  documents,
  entities,
  filingDocumentRequirements,
  filingReviewLocks,
  filings,
  users,
} from '../db/schema'
import { getRequirementsForFormType } from '../lib/documentRequirements'
import { createFilingSchema, updateFilingStatusSchema, type FilingStatus } from 'shared'
import { auditLogger } from '../lib/auditLog'
import { ensureCpaHasOrgAccess } from '../lib/rbac'
import { AppError, withContext } from '../lib/errors'
import { sendToUser, sendToUsers } from '../services/sse.service'
import { escalateFilingToCpa, getCpaFilingStats } from '../lib/cpaEscalation'

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  intake:           ['ai_prep', 'cpa_review'],
  ai_prep:          ['cpa_review', 'intake'],
  cpa_review:       ['founder_approval', 'ai_prep'],
  founder_approval: ['submitted', 'cpa_review', 'ai_prep'],
  submitted:        ['archived'],
  archived:         [],
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getActiveLock(filingId: string) {
  return db.select().from(filingReviewLocks)
    .where(and(eq(filingReviewLocks.filingId, filingId), eq(filingReviewLocks.status, 'active')))
    .get()
}

function getReviewerName(userId: string) {
  return db.select({ name: users.name }).from(users).where(eq(users.id, userId)).get()?.name || 'Another CPA'
}

function getReviewerEmail(userId: string) {
  return db.select({ email: users.email }).from(users).where(eq(users.id, userId)).get()?.email || ''
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

/**
 * Resolve the list of org IDs visible to the current user.
 * - Non-CPAs: only their own org.
 * - CPAs: all orgs they are assigned to via cpaAssignments.
 */
function getVisibleOrgIds(req: Request): string[] {
  if (req.user!.role === 'cpa') {
    return db.select({ orgId: cpaAssignments.organizationId })
      .from(cpaAssignments)
      .where(eq(cpaAssignments.userId, req.user!.userId))
      .all()
      .map(a => a.orgId)
  }
  return [req.user!.orgId]
}

// ─── CPA stat helpers (for round-robin and top-match) ────────────────────────

/**
 * Returns { approvedCount, totalFilings } for a CPA user.
 * - approvedCount  = filingReviewLocks with status='completed' for this CPA
 * - rejectedCount  = cpaRejections rows for this CPA
 * - totalFilings   = approvedCount + rejectedCount
 */

/**
 * Select top-performing CPAs for rejection top-match logic:
 *   - approval rate >= 80%
 *   - at least 5 filings handled
 *   - order by approval rate DESC, then approvedCount DESC
 */
function selectTopPerformingCpas(limit = 5, excludeId?: string): string[] {
  const allCpas = db.select().from(users).where(eq(users.role, 'cpa')).all()

  return allCpas
    .filter(u => u.id !== excludeId)
    .map(u => ({ ...u, stats: getCpaFilingStats(u.id) }))
    .filter(u => u.stats.totalFilings >= 5 && u.stats.approvalRate >= 0.8)
    .sort((a, b) => {
      if (b.stats.approvalRate !== a.stats.approvalRate) return b.stats.approvalRate - a.stats.approvalRate
      return b.stats.approvedCount - a.stats.approvedCount
    })
    .slice(0, limit)
    .map(u => u.id)
}

// ─── GET /api/filings ─────────────────────────────────────────────────────────

export function listFilings(req: Request, res: Response) {
  const { status, entityId, year } = req.query

  const orgIds = getVisibleOrgIds(req)
  if (orgIds.length === 0) return res.json([])

  const query = orgIds.length === 1
    ? db.select().from(filings).where(eq(filings.orgId, orgIds[0]))
    : db.select().from(filings).where(inArray(filings.orgId, orgIds))

  const results = query
    .orderBy(desc(filings.updatedAt))
    .all()
    .filter(f => {
      if (status && f.status !== status) return false
      if (entityId && f.entityId !== entityId) return false
      if (year && f.taxYear !== Number(year)) return false
      return true
    })

  const locks = db.select().from(filingReviewLocks).all()
  res.json(results.map(item => ({
    ...item,
    reviewLock: locks.find(lock => lock.filingId === item.id && lock.status === 'active') || null,
  })))
}

// ─── POST /api/filings ────────────────────────────────────────────────────────

export async function createFiling(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createFilingSchema.parse(req.body)
    const filing = db.insert(filings).values({
      ...data,
      orgId: req.user!.orgId,
      status: 'intake',
    }).returning().get()

    // Seed per-form document requirement checklist
    const templates = getRequirementsForFormType(filing.formType)
    for (let i = 0; i < templates.length; i++) {
      const t = templates[i]
      db.insert(filingDocumentRequirements).values({
        filingId: filing.id,
        slotKey: t.slot,
        label: t.label,
        description: t.description ?? null,
        required: t.required,
        sortOrder: i,
      }).run()
    }

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

// ─── GET /api/filings/:id ─────────────────────────────────────────────────────

export function getFiling(req: Request, res: Response) {
  const filingId = req.params.id as string

  let filing
  if (req.user!.role === 'cpa') {
    // CPAs may access filings from any of their assigned orgs
    filing = db.select().from(filings).where(eq(filings.id, filingId)).get()
    if (filing && !ensureCpaHasOrgAccess(req.user!.userId, filing.orgId)) {
      return res.status(403).json({ error: 'CPA not authorized for this organization' })
    }
  } else {
    filing = db.select().from(filings)
      .where(and(eq(filings.id, filingId), eq(filings.orgId, req.user!.orgId)))
      .get()
  }

  if (!filing) return res.status(404).json({ error: 'Filing not found' })

  const conversations = db.select().from(agentConversations)
    .where(eq(agentConversations.filingId, filingId)).all()
  const docs = db.select().from(documents)
    .where(eq(documents.filingId, filingId)).all()
  const approvals = db.select().from(approvalQueue)
    .where(eq(approvalQueue.filingId, filingId)).all()
  const reviewLock = getActiveLock(filingId)
  const reviewLockWithName = reviewLock
    ? { ...reviewLock, cpaName: getReviewerName(reviewLock.cpaUserId), cpaEmail: getReviewerEmail(reviewLock.cpaUserId) }
    : null

  // Include pending CPA notification for this user (if any)
  const myNotification = db.select().from(cpaNotifications)
    .where(and(
      eq(cpaNotifications.filingId, filingId),
      eq(cpaNotifications.cpaUserId, req.user!.userId),
      eq(cpaNotifications.status, 'pending'),
    )).get() || null

  // Gather rejection remarks from approvalQueue and cpaRejections
  const rejectionRemarks = [
    ...approvals
      .filter((a: any) => a.rejectionReason)
      .map((a: any) => ({ source: a.queueType === 'founder' ? 'Founder' : 'CPA', reason: a.rejectionReason, date: a.resolvedAt })),
    ...db.select().from(cpaRejections)
      .where(eq(cpaRejections.filingId, filingId))
      .all()
      .map((r: any) => ({ source: 'CPA', reason: r.reason, date: r.createdAt })),
  ].sort((a, b) => (b.date || '').localeCompare(a.date || ''))

  // CPAs who received claim notification for this filing
  const notifiedCpas = db.select().from(cpaNotifications)
    .where(eq(cpaNotifications.filingId, filingId))
    .all()
    .map((n: any) => ({
      cpaUserId: n.cpaUserId,
      cpaName: getReviewerName(n.cpaUserId),
      cpaEmail: getReviewerEmail(n.cpaUserId),
      status: n.status,
      notifiedAt: n.notifiedAt || n.createdAt,
    }))

  // Founder who approved (if any)
  const founderApproval = approvals.find((a: any) => a.queueType === 'founder' && a.status === 'approved' && a.resolvedById)
  const approvedBy = founderApproval?.resolvedById
    ? { name: getReviewerName(founderApproval.resolvedById), email: getReviewerEmail(founderApproval.resolvedById) }
    : null

  const entity = filing.entityId
    ? db.select().from(entities).where(eq(entities.id, filing.entityId)).get() ?? null
    : null

  // Lazy-backfill requirements for filings that pre-date this feature.
  const existingCount = db.select({ id: filingDocumentRequirements.id })
    .from(filingDocumentRequirements)
    .where(eq(filingDocumentRequirements.filingId, filingId))
    .all().length
  if (existingCount === 0) {
    const templates = getRequirementsForFormType(filing.formType)
    for (let i = 0; i < templates.length; i++) {
      const t = templates[i]
      db.insert(filingDocumentRequirements).values({
        filingId,
        slotKey: t.slot,
        label: t.label,
        description: t.description ?? null,
        required: t.required,
        sortOrder: i,
      }).run()
    }
  }

  // Requirements + linked docs
  const reqRows = db.select().from(filingDocumentRequirements)
    .where(eq(filingDocumentRequirements.filingId, filingId))
    .orderBy(filingDocumentRequirements.sortOrder)
    .all()

  const requirements = reqRows.map((r: any) => {
    const doc = r.documentId ? docs.find((d: any) => d.id === r.documentId) : null
    return {
      id: r.id,
      slotKey: r.slotKey,
      label: r.label,
      description: r.description,
      required: Boolean(r.required),
      sortOrder: r.sortOrder,
      skipped: Boolean(r.skipped),
      skipReason: r.skipReason,
      viewedByCpa: Boolean(r.viewedByCpa),
      viewedAt: r.viewedAt,
      viewedByUserId: r.viewedByUserId,
      document: doc || null,
      updatedAt: r.updatedAt,
    }
  })

  const requiredReqs = requirements.filter((r: any) => r.required)
  const optionalReqsWithDoc = requirements.filter((r: any) => !r.required && r.document)
  const reqSatisfied = (r: any) => r.skipped || Boolean(r.document)
  const allRequiredSatisfied = requiredReqs.every(reqSatisfied)
  const reviewableReqs = [...requiredReqs, ...optionalReqsWithDoc]
  const allViewedByCpa = reviewableReqs.length > 0
    && reviewableReqs.every((r: any) => r.skipped || r.viewedByCpa)

  res.json({
    ...filing,
    entity,
    conversations,
    documents: docs,
    approvals,
    reviewLock: reviewLockWithName,
    myNotification,
    rejectionRemarks,
    notifiedCpas,
    approvedBy,
    requirements,
    allRequiredSatisfied,
    allViewedByCpa,
  })
}

// ─── PUT /api/filings/:id/status ──────────────────────────────────────────────

export async function updateFilingStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { status: newStatus } = updateFilingStatusSchema.parse(req.body)
    const orgIds = getVisibleOrgIds(req)

    let filing
    if (orgIds.length === 0) throw new AppError('No assigned organizations', 403)
    if (req.user!.role === 'cpa') {
      filing = db.select().from(filings).where(eq(filings.id, req.params.id as string)).get()
      if (filing && !ensureCpaHasOrgAccess(req.user!.userId, filing.orgId)) {
        throw new AppError('CPA not authorized for this organization', 403)
      }
    } else {
      filing = db.select().from(filings)
        .where(and(eq(filings.id, req.params.id as string), eq(filings.orgId, req.user!.orgId)))
        .get()
    }

    if (!filing) throw new AppError('Filing not found', 404)

    const cpaReviewError = ensureCpaReviewAccess(req, filing.id, filing.orgId)
    if (cpaReviewError) throw new AppError(cpaReviewError, 409)

    const allowed = ALLOWED_TRANSITIONS[filing.status] || []
    if (!allowed.includes(newStatus)) {
      throw new AppError(`Cannot transition from ${filing.status} to ${newStatus}`, 400)
    }

    if (newStatus === 'submitted' && !filing.founderApprovedAt) {
      throw new AppError('HITL_GATE: Cannot submit without founder approval', 403)
    }
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
        db.update(filingReviewLocks)
          .set({ status: 'completed', releasedAt: now })
          .where(eq(filingReviewLocks.id, lock.id)).run()
      }
    }

    auditLogger.log({
      orgId: filing.orgId,
      filingId: filing.id,
      actorType: req.user!.role === 'cpa' ? 'cpa' : 'founder',
      actorId: req.user!.userId,
      action: 'status_changed',
      reasoning: `Filing status changed from ${filing.status} to ${newStatus}`,
    })

    res.json({ message: `Status updated to ${newStatus}` })
  } catch (err) { next(withContext(err as Error, 'updateFilingStatus')) }
}

// ─── POST /api/filings/:id/approve (founder) ─────────────────────────────────

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

// ─── POST /api/filings/:id/reject (founder) ──────────────────────────────────

export async function rejectFiling(req: Request, res: Response, next: NextFunction) {
  try {
    const { reason } = req.body
    if (!reason) throw new AppError('Rejection reason is required', 400)

    const filing = db.select().from(filings)
      .where(and(eq(filings.id, req.params.id as string), eq(filings.orgId, req.user!.orgId)))
      .get()
    if (!filing) throw new AppError('Filing not found', 404)

    const now = new Date().toISOString()

    db.update(filings).set({
      status: 'ai_prep',
      cpaAssignedId: null,
      updatedAt: now,
    }).where(eq(filings.id, req.params.id as string)).run()

    // Release any active CPA lock
    const lock = getActiveLock(req.params.id as string)
    if (lock) {
      db.update(filingReviewLocks)
        .set({ status: 'released', releasedAt: now })
        .where(eq(filingReviewLocks.id, lock.id)).run()
    }

    const pending = db.select().from(approvalQueue)
      .where(and(
        eq(approvalQueue.filingId, req.params.id as string),
        eq(approvalQueue.status, 'pending'),
      )).all()

    for (const item of pending) {
      db.update(approvalQueue).set({
        status: 'rejected',
        rejectionReason: reason,
        resolvedAt: now,
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

    // Notify via SSE about rejection with remarks
    sendToUser(filing.orgId, {
      type: 'filing_status_changed',
      data: {
        filingId: filing.id,
        newStatus: 'ai_prep',
        reason,
        message: `Filing ${filing.formType} rejected by founder. Reason: ${reason}`,
      },
    })

    res.json({ message: 'Filing rejected and sent back to AI Prep', remarks: reason })
  } catch (err) { next(withContext(err as Error, 'rejectFiling')) }
}

// ─── POST /api/filings/:id/cpa-approve ───────────────────────────────────────
// CPA approves the filing → moves to founder_approval.
// Marks pending CPA notifications as dismissed (for other CPAs).

export async function cpaApproveFiling(req: Request, res: Response, next: NextFunction) {
  try {
    const filingId = req.params.id as string
    const filing = db.select().from(filings).where(eq(filings.id, filingId)).get()
    if (!filing) throw new AppError('Filing not found', 404)
    if (!ensureCpaHasOrgAccess(req.user!.userId, filing.orgId)) {
      throw new AppError('CPA not assigned to this organization', 403)
    }
    if (filing.status !== 'cpa_review') {
      throw new AppError('Filing is not in cpa_review stage', 400)
    }

    // Enforce: every required + every uploaded optional requirement must be
    // marked viewed by the CPA before approval.
    const reqRows = db.select().from(filingDocumentRequirements)
      .where(eq(filingDocumentRequirements.filingId, filingId))
      .all()
    const reviewable = reqRows.filter((r: any) => r.required || r.documentId)
    const unseen = reviewable.filter((r: any) => !r.skipped && !r.viewedByCpa)
    if (unseen.length > 0) {
      throw new AppError(
        `Mark all document requirements as viewed before approving (${unseen.length} remaining).`,
        400,
      )
    }

    const now = new Date().toISOString()

    // Advance the filing
    db.update(filings).set({
      status: 'founder_approval',
      cpaAssignedId: req.user!.userId,
      updatedAt: now,
    }).where(eq(filings.id, filingId)).run()

    // Close the active review lock
    const lock = getActiveLock(filingId)
    if (lock) {
      db.update(filingReviewLocks)
        .set({ status: 'completed', releasedAt: now })
        .where(eq(filingReviewLocks.id, lock.id)).run()
    }

    // Mark this CPA's notification as approved
    db.update(cpaNotifications).set({ status: 'approved', respondedAt: now })
      .where(and(
        eq(cpaNotifications.filingId, filingId),
        eq(cpaNotifications.cpaUserId, req.user!.userId),
      )).run()

    // Dismiss all other pending notifications for this filing and notify those CPAs
    const otherPending = db.select().from(cpaNotifications)
      .where(and(
        eq(cpaNotifications.filingId, filingId),
        eq(cpaNotifications.status, 'pending'),
        ne(cpaNotifications.cpaUserId, req.user!.userId),
      )).all()

    for (const n of otherPending) {
      db.update(cpaNotifications).set({ status: 'dismissed', respondedAt: now })
        .where(eq(cpaNotifications.id, n.id)).run()
    }

    // Push real-time event to other notified CPAs: filing already approved
    const approverName = db.select({ name: users.name }).from(users)
      .where(eq(users.id, req.user!.userId)).get()?.name ?? 'A CPA'

    sendToUsers(
      otherPending.map(n => n.cpaUserId),
      {
        type: 'cpa_approved',
        data: {
          filingId,
          approvedByName: approverName,
          message: `Already approved by ${approverName}`,
        },
      },
    )

    auditLogger.log({
      orgId: filing.orgId,
      filingId,
      actorType: 'cpa',
      actorId: req.user!.userId,
      action: 'cpa_approved',
      reasoning: 'CPA reviewed and approved the filing, moved to founder approval',
    })

    res.json({ message: 'Filing approved and moved to founder approval stage' })
  } catch (err) { next(withContext(err as Error, 'cpaApproveFiling')) }
}

// ─── POST /api/filings/:id/cpa-reject ────────────────────────────────────────
// CPA rejects a filing with a reason.
// If reason is "understanding issue", find top-performing CPAs and notify them.

export async function cpaRejectFiling(req: Request, res: Response, next: NextFunction) {
  try {
    const filingId = req.params.id as string
    const { reason } = req.body as { reason?: string }
    if (!reason?.trim()) throw new AppError('Rejection reason is required', 400)

    const filing = db.select().from(filings).where(eq(filings.id, filingId)).get()
    if (!filing) throw new AppError('Filing not found', 404)
    if (!ensureCpaHasOrgAccess(req.user!.userId, filing.orgId)) {
      throw new AppError('CPA not assigned to this organization', 403)
    }
    if (filing.status !== 'cpa_review') {
      throw new AppError('Filing is not in cpa_review stage', 400)
    }

    const now = new Date().toISOString()

    // Record the rejection
    db.insert(cpaRejections).values({
      filingId,
      cpaUserId: req.user!.userId,
      reason: reason.trim(),
    }).run()

    // Release any active review lock
    const lock = getActiveLock(filingId)
    if (lock && lock.cpaUserId === req.user!.userId) {
      db.update(filingReviewLocks)
        .set({ status: 'released', releasedAt: now })
        .where(eq(filingReviewLocks.id, lock.id)).run()
    }

    // Set status back to ai_prep and unassign CPA
    db.update(filings).set({
      status: 'ai_prep',
      cpaAssignedId: null,
      updatedAt: now,
    }).where(eq(filings.id, filingId)).run()

    auditLogger.log({
      orgId: filing.orgId,
      filingId,
      actorType: 'cpa',
      actorId: req.user!.userId,
      action: 'cpa_rejected',
      reasoning: `CPA rejected filing. Reason: ${reason}`,
    })

    // Notify org about CPA rejection with remarks
    sendToUser(filing.orgId, {
      type: 'filing_status_changed',
      data: {
        filingId,
        newStatus: 'ai_prep',
        reason: reason.trim(),
        message: `CPA rejected filing ${filing.formType}. Reason: ${reason.trim()}`,
      },
    })

    let topCpaIds: string[] = []

    if (reason.trim().toLowerCase() === 'understanding issue') {
      // Select top-performing CPAs, excluding the rejecting CPA
      topCpaIds = selectTopPerformingCpas(5, req.user!.userId)

      // Create cpaNotification records for each top CPA
      for (const cpaId of topCpaIds) {
        db.insert(cpaNotifications).values({
          filingId,
          cpaUserId: cpaId,
          status: 'pending',
        }).run()
      }

      // Push SSE notifications
      sendToUsers(topCpaIds, {
        type: 'filing_rejection_override',
        data: {
          filingId,
          formType: filing.formType,
          formName: filing.formName,
          rejectionReason: reason,
          message: `A CPA rejected a filing (${filing.formType}) citing an understanding issue. You can review and override.`,
        },
      })
    }

    res.json({
      message: 'Filing rejection recorded',
      notifiedCpaCount: topCpaIds.length,
    })
  } catch (err) { next(withContext(err as Error, 'cpaRejectFiling')) }
}

// ─── POST /api/filings/:id/pause ─────────────────────────────────────────────

export function pauseFiling(req: Request, res: Response) {
  const filing = db.select().from(filings)
    .where(and(eq(filings.id, req.params.id as string), eq(filings.orgId, req.user!.orgId)))
    .get()
  if (!filing) return res.status(404).json({ error: 'Filing not found' })
  if (filing.stopped) return res.status(409).json({ error: 'Filing is stopped' })

  db.update(filings)
    .set({ paused: true, updatedAt: new Date().toISOString() })
    .where(eq(filings.id, filing.id)).run()

  auditLogger.log({
    orgId: req.user!.orgId,
    filingId: filing.id,
    actorType: 'founder',
    actorId: req.user!.userId,
    action: 'workflow_paused',
    reasoning: 'Founder requested workflow pause',
  })

  // Notify claimed CPA — lock stays, but CPA sees filing is paused
  if (filing.status === 'cpa_review') {
    const lock = getActiveLock(filing.id)
    if (lock) {
      sendToUsers([lock.cpaUserId], {
        type: 'filing_status_changed',
        data: {
          filingId: filing.id,
          message: `Workflow paused for filing ${filing.formType}. Review is locked until resumed.`,
          action: 'workflow_paused',
        },
      })
    }
  }

  res.json({ message: 'Workflow paused' })
}

// ─── POST /api/filings/:id/stop ──────────────────────────────────────────────
// Permanent stop. Releases any active CPA lock. Voids any pending approval
// queue entries for this filing. Not reversible via /resume.

export function stopFiling(req: Request, res: Response) {
  const filing = db.select().from(filings)
    .where(and(eq(filings.id, req.params.id as string), eq(filings.orgId, req.user!.orgId)))
    .get()
  if (!filing) return res.status(404).json({ error: 'Filing not found' })

  db.update(filings)
    .set({ stopped: true, paused: false, updatedAt: new Date().toISOString() })
    .where(eq(filings.id, filing.id)).run()

  // Release any active CPA review lock
  const lock = getActiveLock(filing.id)
  if (lock) {
    db.update(filingReviewLocks)
      .set({ status: 'released', releasedAt: new Date().toISOString() })
      .where(eq(filingReviewLocks.id, lock.id)).run()

    sendToUsers([lock.cpaUserId], {
      type: 'filing_status_changed',
      data: {
        filingId: filing.id,
        message: `Workflow stopped for filing ${filing.formType}. Your review has been released.`,
        action: 'workflow_stopped',
      },
    })
  }

  // Void pending approval queue entries for this filing — mark rejected with reason
  db.update(approvalQueue)
    .set({
      status: 'rejected',
      resolvedAt: new Date().toISOString(),
      resolvedById: req.user!.userId,
      rejectionReason: 'Workflow stopped by founder',
    })
    .where(and(eq(approvalQueue.filingId, filing.id), eq(approvalQueue.status, 'pending')))
    .run()

  auditLogger.log({
    orgId: req.user!.orgId,
    filingId: filing.id,
    actorType: 'founder',
    actorId: req.user!.userId,
    action: 'workflow_stopped',
    reasoning: 'Founder stopped workflow — lock released and approvals voided',
  })

  res.json({ message: 'Workflow stopped' })
}

// ─── POST /api/filings/:id/resume ────────────────────────────────────────────

export function resumeFiling(req: Request, res: Response) {
  const filing = db.select().from(filings)
    .where(and(eq(filings.id, req.params.id as string), eq(filings.orgId, req.user!.orgId)))
    .get()
  if (!filing) return res.status(404).json({ error: 'Filing not found' })
  if (filing.stopped) return res.status(409).json({ error: 'Stopped workflows cannot be resumed' })

  db.update(filings)
    .set({ paused: false, updatedAt: new Date().toISOString() })
    .where(eq(filings.id, filing.id)).run()

  auditLogger.log({
    orgId: req.user!.orgId,
    filingId: filing.id,
    actorType: req.user!.role === 'cpa' ? 'cpa' : 'founder',
    actorId: req.user!.userId,
    action: 'workflow_resumed',
    reasoning: 'User resumed workflow',
  })

  res.json({ message: 'Workflow resumed' })
}

// ─── POST /api/filings/:id/escalate-cpa ──────────────────────────────────────
// Round-robin CPA escalation:
//   1. Try to pick 5 active CPAs (status='active').
//   2. If fewer than 5 active CPAs, fill from non-active CPAs ranked by performance.
//   3. Create cpaNotification records and send SSE to selected CPAs.

export function escalateToCpa(req: Request, res: Response) {
  const filing = db.select().from(filings)
    .where(and(eq(filings.id, req.params.id as string), eq(filings.orgId, req.user!.orgId)))
    .get()
  if (!filing) return res.status(404).json({ error: 'Filing not found' })

  // Gate: every required requirement must be satisfied (uploaded OR skipped)
  const reqRows = db.select().from(filingDocumentRequirements)
    .where(eq(filingDocumentRequirements.filingId, filing.id))
    .all()
  const required = reqRows.filter((r: any) => r.required)
  const unmet = required.filter((r: any) => !r.skipped && !r.documentId)
  if (unmet.length > 0) {
    return res.status(400).json({
      error: `Upload or skip every required document before escalating to CPA (${unmet.length} remaining).`,
      unmetSlots: unmet.map((r: any) => r.slotKey),
    })
  }

  const { notifiedCpaIds } = escalateFilingToCpa({
    filingId: filing.id,
    orgId: req.user!.orgId,
    formType: filing.formType,
    formName: filing.formName,
    summary: `Founder escalated ${filing.formType} for CPA takeover.`,
    aiRecommendation: 'Founder requested manual CPA review.',
    actor: { type: 'founder', id: req.user!.userId },
    auditReasoning: `Founder requested CPA takeover.`,
  })

  res.json({ message: 'Filing escalated to CPA', notifiedCpaCount: notifiedCpaIds.length })
}

// ─── POST /api/filings/:id/escalate-founder ─────────────────────────────────
// CPA pushes a filing back to the founder: transitions cpa_review → founder_approval,
// closes any active review lock, creates a founder-queue approval row, notifies founder.

export function escalateToFounder(req: Request, res: Response) {
  const filingId = req.params.id as string
  const filing = db.select().from(filings).where(eq(filings.id, filingId)).get()
  if (!filing) return res.status(404).json({ error: 'Filing not found' })

  const role = req.user!.role
  const hasAccess = role === 'cpa'
    ? ensureCpaHasOrgAccess(req.user!.userId, filing.orgId)
    : req.user!.orgId === filing.orgId
  if (!hasAccess) {
    return res.status(403).json({ error: 'Not authorized for this organization' })
  }
  if (filing.status !== 'cpa_review') {
    return res.status(400).json({ error: 'Filing is not in cpa_review stage' })
  }

  const now = new Date().toISOString()
  const { reason } = (req.body ?? {}) as { reason?: string }
  const trimmedReason = typeof reason === 'string' ? reason.trim().slice(0, 500) : ''

  db.update(filings).set({
    status: 'founder_approval',
    ...(role === 'cpa' ? { cpaAssignedId: req.user!.userId } : {}),
    updatedAt: now,
  }).where(eq(filings.id, filingId)).run()

  const lock = getActiveLock(filingId)
  if (lock && (role === 'cpa' ? lock.cpaUserId === req.user!.userId : true)) {
    db.update(filingReviewLocks)
      .set({ status: 'completed', releasedAt: now })
      .where(eq(filingReviewLocks.id, lock.id)).run()
  }

  // Founder queue entry so founder sees the action item
  db.insert(approvalQueue).values({
    orgId: filing.orgId,
    filingId: filing.id,
    queueType: 'founder',
    status: 'pending',
    summary: trimmedReason
      ? `CPA escalated ${filing.formType} back to founder: ${trimmedReason}`
      : `CPA escalated ${filing.formType} back to founder for review.`,
    aiRecommendation: null,
  }).run()

  // Dismiss any other pending CPA notifications for this filing
  db.update(cpaNotifications).set({ status: 'dismissed', respondedAt: now })
    .where(and(
      eq(cpaNotifications.filingId, filingId),
      eq(cpaNotifications.status, 'pending'),
    )).run()

  // Notify all founders/team members of the org
  const orgMembers = db.select({ id: users.id }).from(users)
    .where(eq(users.orgId, filing.orgId)).all()
  if (orgMembers.length > 0) {
    sendToUsers(orgMembers.map(u => u.id), {
      type: 'filing_needs_founder',
      data: {
        filingId: filing.id,
        formType: filing.formType,
        formName: filing.formName,
        reason: trimmedReason,
        message: `CPA escalated ${filing.formType} back for your review.`,
      },
    })
  }

  auditLogger.log({
    orgId: filing.orgId,
    filingId,
    actorType: role === 'cpa' ? 'cpa' : 'founder',
    actorId: req.user!.userId,
    action: 'escalated_to_founder',
    reasoning: trimmedReason || `${role} pushed filing to founder approval`,
  })

  res.json({ message: 'Filing escalated to founder', reason: trimmedReason })
}

// ─── POST /api/filings/:id/claim-review ──────────────────────────────────────

export function claimFilingReview(req: Request, res: Response) {
  const filingId = req.params.id as string
  let filing
  if (req.user!.role === 'cpa') {
    filing = db.select().from(filings).where(eq(filings.id, filingId)).get()
    if (filing && !ensureCpaHasOrgAccess(req.user!.userId, filing.orgId)) {
      return res.status(403).json({ error: 'CPA not assigned to this organization' })
    }
  } else {
    filing = db.select().from(filings)
      .where(and(eq(filings.id, filingId), eq(filings.orgId, req.user!.orgId))).get()
  }

  if (!filing) return res.status(404).json({ error: 'Filing not found' })
  if (req.user!.role !== 'cpa') return res.status(403).json({ error: 'Only CPAs can claim filings' })

  const conflict = ensureCpaReviewAccess(req, filing.id, filing.orgId)
  if (conflict) return res.status(409).json({ error: conflict })

  const lock = getActiveLock(filing.id)
  if (lock) return res.json(lock)

  // Assign CPA to filing
  db.update(filings).set({
    cpaAssignedId: req.user!.userId,
    updatedAt: new Date().toISOString(),
  }).where(eq(filings.id, filing.id)).run()

  const created = db.insert(filingReviewLocks).values({
    filingId: filing.id,
    cpaUserId: req.user!.userId,
    status: 'active',
  }).returning().get()

  // Dismiss all other CPA notifications for this filing (someone claimed it)
  db.update(cpaNotifications)
    .set({ status: 'dismissed', respondedAt: new Date().toISOString() })
    .where(and(
      eq(cpaNotifications.filingId, filing.id),
      ne(cpaNotifications.cpaUserId, req.user!.userId),
      eq(cpaNotifications.status, 'pending'),
    )).run()

  // Notify other CPAs that this filing was claimed
  const dismissedCpas = db.select({ cpaUserId: cpaNotifications.cpaUserId })
    .from(cpaNotifications)
    .where(and(
      eq(cpaNotifications.filingId, filing.id),
      ne(cpaNotifications.cpaUserId, req.user!.userId),
      eq(cpaNotifications.status, 'dismissed'),
    )).all()

  if (dismissedCpas.length > 0) {
    sendToUsers(dismissedCpas.map(c => c.cpaUserId), {
      type: 'filing_claimed',
      data: {
        filingId: filing.id,
        message: `Filing ${filing.formType} has been claimed by another CPA.`,
      },
    })
  }

  res.status(201).json(created)
}

// ─── POST /api/filings/:id/release-review ────────────────────────────────────

export function releaseFilingReview(req: Request, res: Response) {
  const lock = getActiveLock(req.params.id as string)
  if (!lock) return res.json({ message: 'No active review lock' })
  if (lock.cpaUserId !== req.user!.userId) {
    return res.status(403).json({ error: 'Only the assigned CPA can release this lock' })
  }
  db.update(filingReviewLocks)
    .set({ status: 'released', releasedAt: new Date().toISOString() })
    .where(eq(filingReviewLocks.id, lock.id)).run()
  res.json({ message: 'Review lock released' })
}

// ─── PUT /api/filings/:id/data ────────────────────────────────────────────────
/**
 * Manually update filingData fields or add new ones.
 * Body: { fields: Record<string, string|number|null> }
 * Merges incoming fields into the existing filingData JSON object.
 * Roles: founder (own org), CPA (assigned org), admin.
 */
export function updateFilingData(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params as { id: string }
    const { fields } = req.body as { fields?: Record<string, unknown> }
    if (!fields || typeof fields !== 'object' || Array.isArray(fields)) {
      return res.status(400).json({ error: 'fields must be a plain object' })
    }

    const row = db.select().from(filings).where(eq(filings.id, id)).get()
    if (!row) return res.status(404).json({ error: 'Filing not found' })

    // Access check
    if (req.user!.role === 'cpa') {
      if (!ensureCpaHasOrgAccess(req.user!.userId, row.orgId)) {
        return res.status(403).json({ error: 'CPA not assigned to this organization' })
      }
    } else if (req.user!.role !== 'admin' && req.user!.orgId !== row.orgId) {
      return res.status(403).json({ error: 'Access denied' })
    }

    const current = (row.filingData as Record<string, unknown>) ?? {}
    const merged = { ...current, ...fields }

    db.update(filings)
      .set({ filingData: merged, updatedAt: new Date().toISOString() })
      .where(eq(filings.id, id))
      .run()

    res.json({ message: 'Filing data updated', filingData: merged })
  } catch (err) { next(withContext(err as Error, 'updateFilingData')) }
}
