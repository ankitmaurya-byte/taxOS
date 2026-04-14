import type { PermissionKey } from 'shared'

export interface AccessUser {
  role: string
  status?: string
  permissions?: Record<string, boolean>
}

interface AccessRule {
  roles?: string[]
  permission?: PermissionKey
}

const ROUTE_RULES: Array<{ paths: string[]; rule: AccessRule }> = [
  { paths: ['/dashboard'], rule: { roles: ['admin', 'cpa', 'team_member'] } },
  { paths: ['/home'], rule: { roles: ['founder', 'team_member'] } },
  { paths: ['/profile'], rule: { roles: ['admin', 'founder', 'team_member', 'cpa'] } },
  { paths: ['/profile/create-account'], rule: { roles: ['admin', 'founder'] } },
  { paths: ['/admin/founder-applications', '/admin/tracking', '/admin/users/:id', '/admin/organizations', '/admin/organizations/:id', '/admin/entities', '/admin/filings'], rule: { roles: ['admin'] } },
  { paths: ['/filings', '/filings/:id', '/filings/room', '/filings/room/:id'], rule: { roles: ['founder', 'team_member', 'cpa'], permission: 'canViewFilings' } },
  { paths: ['/cpa/review'], rule: { roles: ['cpa'] } },
  { paths: ['/estimated-tax', '/deadlines', '/action-centre'], rule: { roles: ['founder', 'team_member'], permission: 'canViewFilings' } },
  { paths: ['/documents', '/documents/vault'], rule: { roles: ['founder', 'team_member', 'cpa'], permission: 'canViewDocuments' } },
  { paths: ['/approvals'], rule: { roles: ['founder', 'team_member', 'cpa'], permission: 'canApproveFilings' } },
  { paths: ['/audit'], rule: { roles: ['admin', 'founder', 'cpa'] } },
  { paths: ['/team'], rule: { roles: ['founder'], permission: 'canManageTeam' } },
  { paths: ['/entities', '/entities/overview', '/entities/address-book', '/entities/:entityId', '/registrations', '/rd-tax-credits', '/command-center', '/incorporation', '/dissolution'], rule: { roles: ['founder'] } },
  { paths: ['/advisor', '/chat', '/chat-hub'], rule: { roles: ['admin', 'founder', 'cpa', 'team_member'] } },
]

function normalizePattern(pattern: string) {
  return pattern.replace(/:[^/]+/g, '[^/]+')
}

function pathMatches(pattern: string, pathname: string) {
  if (pattern === pathname) return true
  const regex = new RegExp(`^${normalizePattern(pattern)}$`)
  return regex.test(pathname)
}

export function hasPermission(user: AccessUser | null | undefined, permission?: PermissionKey) {
  if (!permission) return true
  if (!user) return false
  return Boolean(user.permissions?.[permission])
}

export function canAccessPath(user: AccessUser | null | undefined, pathname: string) {
  if (!user) return false
  if (user.role === 'founder' && user.status && user.status !== 'active') {
    return pathname.startsWith('/onboarding') || pathname === '/verify-email'
  }
  const rule = ROUTE_RULES.find((entry) => entry.paths.some((pattern) => pathMatches(pattern, pathname)))?.rule
  if (!rule) return true
  if (rule.roles && !rule.roles.includes(user.role)) return false
  if (!hasPermission(user, rule.permission)) return false
  return true
}

export function getDefaultPathForRole(role?: string | null) {
  return role === 'admin' || role === 'cpa' || role === 'team_member' ? '/dashboard' : '/home'
}

export function getPostLoginPath(user: AccessUser | null | undefined) {
  if (!user) return '/login'
  if (user.role === 'founder' && user.status && user.status !== 'active') return '/onboarding'
  return getDefaultPathForRole(user.role)
}

export function getDeniedPathForUser(user: AccessUser | null | undefined) {
  if (user?.role === 'founder' && user.status && user.status !== 'active') return '/onboarding'
  return getDefaultPathForRole(user?.role)
}
