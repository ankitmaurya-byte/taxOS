/**
 * Deadlines Controller
 *
 * Read-only endpoints for tax filing deadlines.
 * Deadlines are auto-created when entities are created (see entities.controller.ts).
 *
 * Declared in : controllers/deadlines.controller.ts
 * Used in     : routes/deadlines.ts
 * API Prefix  : /api/deadlines
 *
 * Functions:
 *   listDeadlines  → GET  /api/deadlines      (list deadlines, optional entityId filter)
 *                    Frontend: api.getDeadlines() → pages/Deadlines.tsx, pages/CommandCenter.tsx, pages/ActionCentre.tsx
 *   getDeadline    → GET  /api/deadlines/:id   (single deadline by ID)
 *                    Frontend: (available, not currently called by a page)
 *
 * Connected tables:
 *   - deadlines (db/schema.ts)  → main query target
 *   - entities (db/schema.ts)   → used to scope deadlines to the user's org
 *
 * Note: Deadlines are org-scoped indirectly — we first fetch all entity IDs
 * belonging to the org, then filter deadlines by those entity IDs.
 */

import { Request, Response } from 'express'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import { deadlines, entities } from '../db/schema'

// ─── GET /api/deadlines ──────────────────────────────
// Frontend caller: api.getDeadlines() → pages/Deadlines.tsx, CommandCenter.tsx, ActionCentre.tsx
// Lists all deadlines for entities owned by the user's org.
// Optional query: ?entityId=ent_123 to filter by a specific entity.
// Connected fields:
//   entities.orgId       ← req.user.orgId (org scope)
//   deadlines.entityId   ← entities.id (indirect scope)
export function listDeadlines(req: Request, res: Response) {
  const { entityId } = req.query

  // First get all entity IDs for this org (deadlines don't have orgId directly)
  const orgEntities = db.select({ id: entities.id }).from(entities)
    .where(eq(entities.orgId, req.user!.orgId))
    .all()
  const entityIds = orgEntities.map(e => e.id)

  const results = db.select().from(deadlines)
    .orderBy(deadlines.dueDate)
    .all()
    .filter(d => {
      if (!entityIds.includes(d.entityId)) return false
      if (entityId && d.entityId !== entityId) return false
      return true
    })

  res.json(results)
}

// ─── GET /api/deadlines/:id ──────────────────────────
// Returns a single deadline by ID.
// Connected fields: req.params.id as string → deadlines.id
export function getDeadline(req: Request, res: Response) {
  const deadline = db.select().from(deadlines)
    .where(eq(deadlines.id, req.params.id as string))
    .get()
  if (!deadline) return res.status(404).json({ error: 'Deadline not found' })
  res.json(deadline)
}
