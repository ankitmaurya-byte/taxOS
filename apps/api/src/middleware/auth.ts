import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import type { PermissionKey, Permissions } from 'shared'
import { db } from '../db'
import { users } from '../db/schema'
import { eq } from 'drizzle-orm'
import { EMPTY_PERMISSIONS, ensureCpaHasOrgAccess, getEffectivePermissionsForUser } from '../lib/rbac'

export interface AuthUser {
  userId: string
  orgId: string
  role: 'founder' | 'team_member' | 'cpa' | 'admin'
  status?: string
  permissions?: Permissions
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production-min-32'

export function generateToken(user: AuthUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '7d' })
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' })
  }

  try {
    const token = header.slice(7)
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser
    const dbUser = db.select().from(users).where(eq(users.id, decoded.userId)).get()
    if (!dbUser || !dbUser.isVerified || dbUser.status === 'pending_email_verification' || dbUser.status === 'rejected' || dbUser.status === 'suspended') {
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
      permissions: getEffectivePermissionsForUser(dbUser.id) || EMPTY_PERMISSIONS,
    }
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

export function requireActiveAccount(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' })
  if (req.user.status !== 'active') {
    return res.status(403).json({ error: 'Complete onboarding and wait for admin approval before accessing the application' })
  }
  next()
}

export function requireRole(...roles: AuthUser['role'][]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' })
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }
    next()
  }
}

export function blockRoles(...roles: AuthUser['role'][]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' })
    if (roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'This role cannot access this resource' })
    }
    next()
  }
}

export function requirePermission(permission: PermissionKey) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' })
    // Admins bypass all granular permission checks — they have platform-wide access
    if (req.user.role === 'admin') return next()
    if (!req.user.permissions?.[permission]) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }
    next()
  }
}

export function requireAssignedCpaOrg() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' })
    if (req.user.role !== 'cpa') return next()
    if (!ensureCpaHasOrgAccess(req.user.userId, req.user.orgId)) {
      return res.status(403).json({ error: 'CPA is not assigned to this organization' })
    }
    next()
  }
}
