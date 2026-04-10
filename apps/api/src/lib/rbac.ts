import { and, eq, isNull, or } from 'drizzle-orm'
import type { Permissions } from 'shared'
import { db } from '../db'
import { cpaAssignments, permissions, roleTemplates, users } from '../db/schema'

export const EMPTY_PERMISSIONS: Permissions = {
  canViewDashboard: false,
  canViewFilings: false,
  canEditFilings: false,
  canApproveFilings: false,
  canViewDocuments: false,
  canEditDocuments: false,
  canManageTeam: false,
  canCreateAccounts: false,
  canManageTemplates: false,
  canManageOrganization: false,
}

export const FOUNDER_PERMISSIONS: Permissions = {
  canViewDashboard: true,
  canViewFilings: true,
  canEditFilings: true,
  canApproveFilings: true,
  canViewDocuments: true,
  canEditDocuments: true,
  canManageTeam: true,
  canCreateAccounts: true,
  canManageTemplates: true,
  canManageOrganization: true,
}

export const ADMIN_PERMISSIONS: Permissions = { ...FOUNDER_PERMISSIONS }

export const CPA_PERMISSIONS: Permissions = {
  canViewDashboard: true,
  canViewFilings: true,
  canEditFilings: true,
  canApproveFilings: true,
  canViewDocuments: true,
  canEditDocuments: true,
  canManageTeam: false,
  canCreateAccounts: false,
  canManageTemplates: false,
  canManageOrganization: false,
}

export const SYSTEM_ROLE_TEMPLATES: Array<{ name: string; permissions: Permissions }> = [
  {
    name: 'Manager',
    permissions: {
      canViewDashboard: true,
      canViewFilings: true,
      canEditFilings: true,
      canApproveFilings: false,
      canViewDocuments: true,
      canEditDocuments: true,
      canManageTeam: true,
      canCreateAccounts: false,
      canManageTemplates: true,
      canManageOrganization: false,
    },
  },
  {
    name: 'Accountant',
    permissions: {
      canViewDashboard: true,
      canViewFilings: true,
      canEditFilings: true,
      canApproveFilings: true,
      canViewDocuments: true,
      canEditDocuments: true,
      canManageTeam: false,
      canCreateAccounts: false,
      canManageTemplates: false,
      canManageOrganization: false,
    },
  },
  {
    name: 'Viewer',
    permissions: {
      canViewDashboard: true,
      canViewFilings: true,
      canEditFilings: false,
      canApproveFilings: false,
      canViewDocuments: true,
      canEditDocuments: false,
      canManageTeam: false,
      canCreateAccounts: false,
      canManageTemplates: false,
      canManageOrganization: false,
    },
  },
]

export function getRecommendedTemplateName(useCase?: string) {
  const value = (useCase || '').toLowerCase()
  if (value.includes('finance') || value.includes('account')) return 'Accountant'
  if (value.includes('ops') || value.includes('operation') || value.includes('manage')) return 'Manager'
  return 'Viewer'
}

export function getRoleDefaultPermissions(role: string): Permissions {
  if (role === 'admin') return ADMIN_PERMISSIONS
  if (role === 'founder') return FOUNDER_PERMISSIONS
  if (role === 'cpa') return CPA_PERMISSIONS
  return EMPTY_PERMISSIONS
}

export function sanitizeAssignablePermissions(input: Partial<Permissions>, role: string): Permissions {
  const base = { ...EMPTY_PERMISSIONS }
  for (const key of Object.keys(base) as Array<keyof Permissions>) {
    if (typeof input[key] === 'boolean') base[key] = input[key] as boolean
  }

  if (role === 'team_member') {
    base.canCreateAccounts = false
    base.canManageOrganization = false
  }

  return base
}

export function canAssignRole(actorRole: string, targetRole: string) {
  if (actorRole === 'admin') return true
  if (actorRole === 'founder') return targetRole === 'team_member'
  return false
}

export function canManageTemplateScope(actorRole: string, scope: string) {
  if (actorRole === 'admin') return true
  return actorRole === 'founder' && scope === 'organization'
}

export function getEffectivePermissionsForUser(userId: string) {
  const user = db.select().from(users).where(eq(users.id, userId)).get()
  if (!user) return null
  if (user.role === 'admin' || user.role === 'founder' || user.role === 'cpa') {
    return getRoleDefaultPermissions(user.role)
  }
  if (!user.orgId) return EMPTY_PERMISSIONS
  const record = db.select().from(permissions)
    .where(and(eq(permissions.userId, userId), eq(permissions.organizationId, user.orgId)))
    .get()
  return { ...EMPTY_PERMISSIONS, ...(record?.permissions || {}) }
}

export function ensureCpaHasOrgAccess(userId: string, orgId: string) {
  const assignment = db.select().from(cpaAssignments)
    .where(and(eq(cpaAssignments.userId, userId), eq(cpaAssignments.organizationId, orgId)))
    .get()
  return Boolean(assignment)
}

export function listVisibleTemplates(actorRole: string, actorOrgId: string | null) {
  if (actorRole === 'admin') return db.select().from(roleTemplates).all()
  if (!actorOrgId) return []
  return db.select().from(roleTemplates)
    .where(or(eq(roleTemplates.organizationId, actorOrgId), and(eq(roleTemplates.scope, 'global'), isNull(roleTemplates.organizationId))))
    .all()
}
