import { z } from 'zod'

export const userRoles = ['admin', 'founder', 'team_member', 'cpa'] as const
export const userStatuses = ['pending_admin_review', 'pending_email_verification', 'active', 'rejected', 'suspended'] as const

export const permissionKeys = [
  'canViewDashboard',
  'canViewFilings',
  'canEditFilings',
  'canApproveFilings',
  'canViewDocuments',
  'canEditDocuments',
  'canManageTeam',
  'canCreateAccounts',
  'canManageTemplates',
  'canManageOrganization',
] as const

export type PermissionKey = (typeof permissionKeys)[number]

export const permissionsSchema = z.object(
  Object.fromEntries(permissionKeys.map((key) => [key, z.boolean().default(false)])) as Record<PermissionKey, z.ZodDefault<z.ZodBoolean>>,
)

export const templateScopes = ['global', 'organization'] as const

export const roleTemplateSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  scope: z.enum(templateScopes),
  organizationId: z.string().nullable(),
  createdByUserId: z.string(),
  permissions: permissionsSchema,
  isSystemTemplate: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const createRoleTemplateSchema = z.object({
  name: z.string().min(1),
  scope: z.enum(templateScopes),
  permissions: permissionsSchema,
})

export const updateRoleTemplateSchema = createRoleTemplateSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  'At least one template field is required',
)

export const assignPermissionsSchema = z.object({
  templateId: z.string().optional(),
  permissions: permissionsSchema.optional(),
})

export const createInviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['team_member', 'cpa']),
  templateId: z.string().optional(),
  permissions: permissionsSchema.optional(),
  useCase: z.string().optional(),
})

export const createCpaSchema = z.object({
  email: z.string().email(),
})

export const assignCpaOrgSchema = z.object({
  organizationId: z.string(),
})

export const recommendationRequestSchema = z.object({
  useCase: z.string().min(1),
})

export type Permissions = z.infer<typeof permissionsSchema>
