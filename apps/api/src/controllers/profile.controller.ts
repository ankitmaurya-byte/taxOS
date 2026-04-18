import { eq } from 'drizzle-orm'
import { Request, Response } from 'express'
import { db } from '../db'
import { organizations, permissions, users } from '../db/schema'
import { EMPTY_PERMISSIONS, getEffectivePermissionsForUser } from '../lib/rbac'

export async function getProfile(req: Request, res: Response) {
  const user = (await db.select().from(users).where(eq(users.id, req.user!.userId)).limit(1))[0]
  if (!user) return res.status(404).json({ error: 'User not found' })

  const organization = user.orgId
    ? (await db.select().from(organizations).where(eq(organizations.id, user.orgId)).limit(1))[0] ?? null
    : null

  const permissionRecord = user.orgId
    ? (await db.select().from(permissions).where(eq(permissions.userId, user.id)).limit(1))[0] ?? null
    : null

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    organization,
    permissions: (await getEffectivePermissionsForUser(user.id)) || EMPTY_PERMISSIONS,
    permissionRecord,
    canCreateAccount: user.role === 'admin' || user.role === 'founder',
  })
}
