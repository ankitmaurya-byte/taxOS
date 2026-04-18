/**
 * Approvals Controller
 *
 * Manages the HITL (Human-in-the-Loop) approval queue.
 * Items are created automatically by AI agents when confidence is low,
 * or when filings reach the founder_approval stage.
 *
 * Declared in : controllers/approvals.controller.ts
 * Used in     : routes/approvals.ts
 * API Prefix  : /api/approvals
 *
 * Functions:
 *   listApprovals    → GET   /api/approvals              (role-filtered list)
 *                      Frontend: api.getApprovals() → pages/Home.tsx, pages/CommandCenter.tsx, pages/ActionCentre.tsx, pages/ApprovalQueue.tsx
 *   resolveApproval  → POST  /api/approvals/:id/resolve  (approve or reject)
 *                      Frontend: api.resolveApproval() → pages/ApprovalQueue.tsx (approve/reject mutation)
 *   escalateApproval → POST  /api/approvals/:id/escalate (send to CPA)
 *                      Frontend: api.escalateApproval() → pages/ApprovalQueue.tsx (escalate mutation)
 *
 * Connected tables:
 *   - approvalQueue (db/schema.ts) → main target
 *   - filings (db/schema.ts)       → updated on approve/reject
 *   - auditLog (via auditLogger)   → logs approval_approved, approval_rejected, approval_escalated
 *
 * Role-based filtering:
 *   - founder role → sees only queueType='founder' items
 *   - cpa role     → sees only queueType='cpa' items
 *   - admin/other  → sees all items
 *
 * Dependencies:
 *   - resolveApprovalSchema → from shared (Zod), validates { status, reason? }
 *   - auditLogger.log()    → from lib/auditLog.ts
 */

import { Request, Response, NextFunction } from 'express'
import { eq, and, desc } from 'drizzle-orm'
import { db } from '../db'
import { approvalQueue, filingReviewLocks, filings, users } from '../db/schema'
import { resolveApprovalSchema } from 'shared'
import { auditLogger } from '../lib/auditLog'
import { AppError, withContext } from '../lib/errors'

async function getActiveLock(filingId: string) {
  return (await db.select().from(filingReviewLocks)
    .where(and(eq(filingReviewLocks.filingId, filingId), eq(filingReviewLocks.status, 'active')))
    .limit(1))[0]
}

async function getReviewerName(userId: string) {
  const row = (await db.select({ name: users.name }).from(users).where(eq(users.id, userId)).limit(1))[0]
  return row?.name || 'Another CPA'
}

// ─── GET /api/approvals ──────────────────────────────
// Frontend caller: api.getApprovals() → pages/Home.tsx, CommandCenter.tsx, ActionCentre.tsx, ApprovalQueue.tsx
// Lists approval items filtered by the user's role:
//   founder → only sees queueType='founder' items (their approvals)
//   cpa     → only sees queueType='cpa' items (CPA reviews)
//   admin   → sees all items
// Connected fields: req.user.orgId → approvalQueue.orgId, req.user.role → filter logic
export async function listApprovals(req: Request, res: Response) {
  const allRows = await db
    .select()
    .from(approvalQueue)
    .orderBy(desc(approvalQueue.createdAt))
  const results = allRows.filter(a => {
    if (req.user!.role === 'founder') return a.queueType === 'founder' && a.orgId === req.user!.orgId
    if (req.user!.role === 'cpa') return a.queueType === 'cpa' && a.orgId === req.user!.orgId
    return true
  })

  res.json(results)
}

// ─── POST /api/approvals/:id/resolve ─────────────────
// Frontend caller: api.resolveApproval() → pages/ApprovalQueue.tsx (approve/reject mutation)
// Resolves a pending approval item (approve or reject).
// Validates body with resolveApprovalSchema: { status: 'approved'|'rejected', reason?: string }
//
// Side effects on filings table:
//   - If founder approves → filings.status='submitted', founderApprovedAt=now, submittedAt=now
//   - If founder rejects  → filings.status='cpa_review' (sent back for revision)
//
// Connected fields:
//   approvalQueue.resolvedById ← req.user.userId
//   approvalQueue.resolvedAt   ← now
//   filings.status             ← updated based on approval decision
//   filings.founderApprovedAt  ← set when founder approves
export async function resolveApproval(req: Request, res: Response, next: NextFunction) {
  try {
    const data = resolveApprovalSchema.parse(req.body)
    const approval = (await db.select().from(approvalQueue)
      .where(and(eq(approvalQueue.id, req.params.id as string), eq(approvalQueue.orgId, req.user!.orgId)))
      .limit(1))[0]
    if (!approval) throw new AppError('Approval not found', 404)
    if (approval.status !== 'pending') throw new AppError('Approval already resolved', 400)

    if (req.user!.role === 'cpa') {
      const lock = await getActiveLock(approval.filingId)
      if (lock && lock.cpaUserId !== req.user!.userId) {
        throw new AppError(`This filing is already being handled by ${await getReviewerName(lock.cpaUserId)}.`, 409)
      }
      const completed = (await db.select().from(filingReviewLocks)
        .where(and(eq(filingReviewLocks.filingId, approval.filingId), eq(filingReviewLocks.status, 'completed')))
        .limit(1))[0]
      if (completed && completed.cpaUserId !== req.user!.userId) {
        throw new AppError('This filing was already approved by another CPA.', 409)
      }
    }

    const now = new Date().toISOString()
    await db.update(approvalQueue).set({
      status: data.status,
      rejectionReason: data.status === 'rejected' ? data.reason : null,
      resolvedAt: now,
      resolvedById: req.user!.userId,
    }).where(eq(approvalQueue.id, req.params.id as string))

    // If founder approves → advance filing to submitted
    if (data.status === 'approved' && approval.queueType === 'founder') {
      await db.update(filings).set({
        founderApprovedAt: now,
        status: 'submitted',
        submittedAt: now,
        updatedAt: now,
      }).where(eq(filings.id, approval.filingId))
    }

    // If founder rejects → send filing back to CPA review
    if (data.status === 'rejected' && approval.queueType === 'founder') {
      await db.update(filings).set({
        status: 'cpa_review',
        updatedAt: now,
      }).where(eq(filings.id, approval.filingId))
    }

    auditLogger.log({
      orgId: req.user!.orgId,
      filingId: approval.filingId,
      actorType: req.user!.role === 'cpa' ? 'cpa' : 'founder',
      actorId: req.user!.userId,
      action: `approval_${data.status}`,
      reasoning: data.reason || `${approval.queueType} ${data.status} the filing`,
    })

    if (req.user!.role === 'cpa') {
      const lock = await getActiveLock(approval.filingId)
      if (lock) {
        await db.update(filingReviewLocks).set({
          status: data.status === 'approved' ? 'completed' : 'released',
          releasedAt: now,
        }).where(eq(filingReviewLocks.id, lock.id))
      }
    }

    res.json({ message: `Approval ${data.status}` })
  } catch (err) { next(withContext(err as Error, 'resolveApproval')) }
}

// ─── POST /api/approvals/:id/escalate ────────────────
// Frontend caller: api.escalateApproval() → pages/ApprovalQueue.tsx (escalate mutation)
// Escalates a founder approval item to CPA.
// Marks the current item as 'escalated' and creates a new CPA queue item.
//
// Connected fields:
//   approvalQueue.status   ← 'escalated' (original item)
//   new approvalQueue row  ← queueType='cpa', filingId from original item
//   auditLog.action        ← 'approval_escalated'
export async function escalateApproval(req: Request, res: Response) {
  const approval = (await db.select().from(approvalQueue)
    .where(and(eq(approvalQueue.id, req.params.id as string), eq(approvalQueue.orgId, req.user!.orgId)))
    .limit(1))[0]
  if (!approval) return res.status(404).json({ error: 'Approval not found' })

  // Mark original as escalated
  await db.update(approvalQueue).set({ status: 'escalated' })
    .where(eq(approvalQueue.id, req.params.id as string))

  // Create new CPA queue item with context from original
  await db.insert(approvalQueue).values({
    orgId: req.user!.orgId,
    filingId: approval.filingId,
    queueType: 'cpa',
    status: 'pending',
    summary: `Escalated from founder review: ${approval.summary}`,
    aiRecommendation: approval.aiRecommendation,
  })

  auditLogger.log({
    orgId: req.user!.orgId,
    filingId: approval.filingId,
    actorType: 'founder',
    actorId: req.user!.userId,
    action: 'approval_escalated',
    reasoning: 'Founder escalated approval to CPA for additional review',
  })

  res.json({ message: 'Escalated to CPA' })
}
