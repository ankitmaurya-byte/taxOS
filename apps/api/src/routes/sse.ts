import { Request, Response, NextFunction, Router } from 'express'
import jwt from 'jsonwebtoken'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import { users } from '../db/schema'
import { requireActiveAccount } from '../middleware/auth'
import type { AuthUser } from '../middleware/auth'
import { getEffectivePermissionsForUser, EMPTY_PERMISSIONS } from '../lib/rbac'
import { sseNotifications } from '../controllers/sse.controller'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production-min-32'

/**
 * SSE-compatible auth middleware: accepts token from either the
 * Authorization header (Bearer <token>) OR the `?token=<token>` query param.
 * EventSource in browsers cannot set custom headers, so query-param fallback
 * is required for SSE streams.
 */
function sseAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  const queryToken = req.query.token as string | undefined

  const rawToken = header?.startsWith('Bearer ')
    ? header.slice(7)
    : queryToken

  if (!rawToken) {
    return res.status(401).json({ error: 'Missing authorization token' })
  }

  try {
    const decoded = jwt.verify(rawToken, JWT_SECRET) as AuthUser
    const dbUser = db.select().from(users).where(eq(users.id, decoded.userId)).get()
    if (
      !dbUser ||
      !dbUser.isVerified ||
      dbUser.status === 'pending_email_verification' ||
      dbUser.status === 'rejected' ||
      dbUser.status === 'suspended'
    ) {
      return res.status(401).json({ error: 'Account is not active' })
    }
    if (!dbUser.orgId) {
      return res.status(403).json({ error: 'Account is not assigned to an organization' })
    }
    req.user = {
      userId: dbUser.id,
      orgId: dbUser.orgId,
      role: dbUser.role as AuthUser['role'],
      status: dbUser.status,
      permissions: getEffectivePermissionsForUser(dbUser.id) ?? EMPTY_PERMISSIONS,
    }
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

const router: Router = Router()

router.use(sseAuthMiddleware)
router.use(requireActiveAccount)

// GET /api/sse/notifications — SSE stream for real-time events
router.get('/notifications', sseNotifications)

export default router
