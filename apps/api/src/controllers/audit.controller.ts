/**
 * Audit Controller
 *
 * Provides read-only access to the immutable audit trail.
 * Every significant action (AI, CPA, founder, system) is logged here.
 *
 * Declared in : controllers/audit.controller.ts
 * Used in     : routes/audit.ts
 * API Prefix  : /api/audit
 *
 * Functions:
 *   listAuditLogs   → GET  /api/audit         (filterable list, sorted desc)
 *                     Frontend: api.getAuditLog() → pages/AuditTrail.tsx, pages/CommandCenter.tsx
 *   exportAuditCsv  → GET  /api/audit/export  (CSV download)
 *                     Frontend: api.exportAuditCsv() → pages/AuditTrail.tsx (export button)
 *
 * Connected tables:
 *   - auditLog (db/schema.ts) → query target (insert-only, never updated/deleted)
 *
 * Note: The auditLog table is written to by auditLogger.log() (lib/auditLog.ts)
 * from controllers and AI agents. This controller only READS from it.
 */

import { Request, Response } from 'express'
import { eq, desc } from 'drizzle-orm'
import { db } from '../db'
import { auditLog, filings } from '../db/schema'

// ─── GET /api/audit ──────────────────────────────────
// Frontend caller: api.getAuditLog() → pages/AuditTrail.tsx, CommandCenter.tsx
// Lists audit log entries scoped by role:
//   admin       → all entries across all orgs
//   founder     → all entries for own org (own + team + CPA actions on org filings + AI)
//   cpa         → only own CPA actions (actorId === userId)
//   team_member → only own actions (actorId === userId)
// Optional query filters:
//   ?filingId=fil_123    → filter by filing
//   ?actorType=ai        → filter by actor type (ai, cpa, founder, system)
//   ?from=2025-01-01     → entries created on or after this date
//   ?to=2025-12-31       → entries created on or before this date
export function listAuditLogs(req: Request, res: Response) {
  const { filingId, actorType, from, to } = req.query
  const role = req.user!.role
  const userId = req.user!.userId
  const orgId = req.user!.orgId

  // Build filing ID set for CPA — filings assigned to this CPA
  const cpaFilingIdSet = role === 'cpa'
    ? new Set(db.select({ id: filings.id }).from(filings)
        .where(eq(filings.cpaAssignedId, userId)).all().map(f => f.id))
    : null

  // Fetch org-scoped entries (admin gets all)
  const allEntries = role === 'admin'
    ? db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).all()
    : db.select().from(auditLog).where(eq(auditLog.orgId, orgId)).orderBy(desc(auditLog.createdAt)).all()

  // Role-based filtering
  const results = allEntries.filter(entry => {
    // Role scoping
    if (role === 'cpa') {
      // CPA: own actions OR ai/system actions on their assigned filings
      const isOwnAction = entry.actorId === userId
      const isOnAssignedFiling = entry.filingId && cpaFilingIdSet!.has(entry.filingId)
      if (!isOwnAction && !isOnAssignedFiling) return false
    } else if (role === 'team_member') {
      // Team member: only own actions (actorId matches) or ai/system actions where actorId matches
      if (entry.actorId !== userId) return false
    }
    // founder: sees all org entries (no extra filter)
    // admin: sees everything (no extra filter)

    // Query filters
    if (filingId && entry.filingId !== filingId) return false
    if (actorType && entry.actorType !== actorType) return false
    if (from && entry.createdAt < (from as string)) return false
    if (to && entry.createdAt > (to as string)) return false
    return true
  })

  res.json(results)
}

// ─── GET /api/audit/export ───────────────────────────
// Frontend caller: api.exportAuditCsv() → pages/AuditTrail.tsx (export button)
// Exports audit log as a CSV file download.
// Optional query: ?filingId=fil_123 to export only one filing's trail.
//
// CSV columns: Timestamp, Actor Type, Actor ID, Action, Reasoning, Confidence, Model Version
// Special handling: double-quotes in reasoning field are escaped as ""
export function exportAuditCsv(req: Request, res: Response) {
  const { filingId: exportFilingId } = req.query
  const role = req.user!.role
  const userId = req.user!.userId
  const orgId = req.user!.orgId

  const exportCpaFilingIdSet = role === 'cpa'
    ? new Set(db.select({ id: filings.id }).from(filings)
        .where(eq(filings.cpaAssignedId, userId)).all().map(f => f.id))
    : null

  const allExportEntries = role === 'admin'
    ? db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).all()
    : db.select().from(auditLog).where(eq(auditLog.orgId, orgId)).orderBy(desc(auditLog.createdAt)).all()

  const results = allExportEntries.filter(entry => {
    if (role === 'cpa') {
      if (entry.actorId !== userId && !(entry.filingId && exportCpaFilingIdSet!.has(entry.filingId))) return false
    } else if (role === 'team_member') {
      if (entry.actorId !== userId) return false
    }
    if (exportFilingId && entry.filingId !== exportFilingId) return false
    return true
  })

  const headers = 'Timestamp,Actor Type,Actor ID,Action,Reasoning,Confidence,Model Version'
  const rows = results.map(r =>
    `"${r.createdAt}","${r.actorType}","${r.actorId || ''}","${r.action}","${(r.reasoning || '').replace(/"/g, '""')}",${r.confidenceScore ?? ''},"${r.modelVersion || ''}"`
  )

  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', 'attachment; filename=audit-trail.csv')
  res.send([headers, ...rows].join('\n'))
}
