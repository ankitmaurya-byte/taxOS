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
import { auditLog } from '../db/schema'

// ─── GET /api/audit ──────────────────────────────────
// Frontend caller: api.getAuditLog() → pages/AuditTrail.tsx, CommandCenter.tsx
// Lists audit log entries for the user's org, sorted newest-first.
// Optional query filters:
//   ?filingId=fil_123    → filter by filing
//   ?actorType=ai        → filter by actor type (ai, cpa, founder, system)
//   ?from=2025-01-01     → entries created on or after this date
//   ?to=2025-12-31       → entries created on or before this date
// Connected fields: req.user.orgId → auditLog.orgId
export function listAuditLogs(req: Request, res: Response) {
  const { filingId, actorType, from, to } = req.query

  const baseQuery = db.select().from(auditLog).orderBy(desc(auditLog.createdAt))
  const results = (req.user!.role === 'admin'
    ? baseQuery
    : baseQuery.where(eq(auditLog.orgId, req.user!.orgId))
  ).all().filter(entry => {
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
  const { filingId } = req.query

  const baseExportQuery = db.select().from(auditLog).orderBy(desc(auditLog.createdAt))
  const results = (req.user!.role === 'admin'
    ? baseExportQuery
    : baseExportQuery.where(eq(auditLog.orgId, req.user!.orgId))
  ).all().filter(entry => !filingId || entry.filingId === filingId)

  const headers = 'Timestamp,Actor Type,Actor ID,Action,Reasoning,Confidence,Model Version'
  const rows = results.map(r =>
    `"${r.createdAt}","${r.actorType}","${r.actorId || ''}","${r.action}","${(r.reasoning || '').replace(/"/g, '""')}",${r.confidenceScore ?? ''},"${r.modelVersion || ''}"`
  )

  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', 'attachment; filename=audit-trail.csv')
  res.send([headers, ...rows].join('\n'))
}
