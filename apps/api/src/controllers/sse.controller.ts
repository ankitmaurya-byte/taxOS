/**
 * SSE Controller
 *
 * Endpoint: GET /api/sse/notifications
 *
 * Establishes a long-lived SSE stream for the authenticated user.
 * Sends events for:
 *   - connected             → on open
 *   - heartbeat             → every 30 s
 *   - filing_assigned       → when a filing is escalated to this CPA
 *   - filing_status_changed → when a filing's status changes
 *   - chat_message          → new chat message in a channel the user belongs to
 *   - cpa_approved          → when another CPA approves a filing this CPA was notified about
 */

import { Request, Response } from 'express'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import { cpaAssignments } from '../db/schema'
import { addConnection, removeConnection } from '../services/sse.service'

export function sseNotifications(req: Request, res: Response): void {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  const { userId, role, orgId } = req.user!

  // Determine which org IDs this user can receive org-scoped events for
  let orgIds: string[] = []
  if (role === 'cpa') {
    orgIds = db.select({ orgId: cpaAssignments.organizationId })
      .from(cpaAssignments)
      .where(eq(cpaAssignments.userId, userId))
      .all()
      .map(a => a.orgId)
  } else if (orgId) {
    orgIds = [orgId]   
  }

  addConnection({ userId, role, orgIds, response: res, connectedAt: new Date().toISOString() })

  // Initial confirmation
  res.write(`data: ${JSON.stringify({ type: 'connected', data: { userId, timestamp: new Date().toISOString() } })}\n\n`)

  // Keep-alive heartbeat
  const heartbeat = setInterval(() => {
    try {
      res.write(`data: ${JSON.stringify({ type: 'heartbeat', data: { timestamp: new Date().toISOString() } })}\n\n`)
    } catch {
      clearInterval(heartbeat)
    }
  }, 30_000)

  req.on('close', () => {
    clearInterval(heartbeat)
    removeConnection(userId, res)
  })
}
