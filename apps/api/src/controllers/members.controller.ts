import { Request, Response, NextFunction } from 'express'
import { and, eq, desc } from 'drizzle-orm'
import { assignPermissionsSchema, createInviteSchema, createRoleTemplateSchema } from 'shared'
import { db } from '../db'
import { invites, organizations, permissions, roleTemplates, users } from '../db/schema'
import { getRecommendedTemplateName, listVisibleTemplates, sanitizeAssignablePermissions } from '../lib/rbac'
import { sendInviteEmail } from '../lib/mailer'
import { generateAppToken, getFutureIso, isExpired } from '../lib/tokens'
import { AppError, withContext } from '../lib/errors'

export async function listMembers(req: Request, res: Response) {
  const members = await db.select().from(users)
    .where(eq(users.orgId, req.user!.orgId!))
    .orderBy(desc(users.createdAt))
  const permissionRecords = await db.select().from(permissions)
    .where(eq(permissions.organizationId, req.user!.orgId!))
  res.json(members.map((member) => ({
    ...member,
    permissionRecord: permissionRecords.find((record) => record.userId === member.id) || null,
  })))
}

export async function inviteMember(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createInviteSchema.parse(req.body)
    const isAdmin = req.user!.role === 'admin'
    const isFounder = req.user!.role === 'founder'
    if (!isAdmin && !isFounder) {
      throw new AppError('Only founders or admins can invite members', 403)
    }
    // Founders can only invite team_members, not CPAs
    if (isFounder && data.role !== 'team_member') {
      throw new AppError('Founders can only invite team members', 403)
    }

    const existingUser = (await db.select().from(users).where(eq(users.email, data.email)).limit(1))[0]
    if (existingUser) throw new AppError('A user already exists for this email', 409)

    const activeInviteRows = await db.select().from(invites)
      .where(and(eq(invites.email, data.email), eq(invites.organizationId, req.user!.orgId!)))
    const activeInvite = activeInviteRows.find((invite) => invite.status === 'pending' && !isExpired(invite.expiresAt))
    if (activeInvite) throw new AppError('An active invite already exists for this email', 409)

    let templateId = data.templateId
    let permissionSet = data.permissions

    if (!templateId && !permissionSet && data.useCase) {
      const recommendedName = getRecommendedTemplateName(data.useCase)
      const template = (await listVisibleTemplates(req.user!.role, req.user!.orgId)).find((item) => item.name === recommendedName)
      if (template) {
        templateId = template.id
        permissionSet = template.permissions as any
      }
    }

    if (templateId) {
      const template = (await db.select().from(roleTemplates).where(eq(roleTemplates.id, templateId)).limit(1))[0]
      if (!template) throw new AppError('Template not found', 404)
      if (template.scope === 'organization' && template.organizationId !== req.user!.orgId) {
        throw new AppError('Template does not belong to this organization', 403)
      }
      permissionSet = template.permissions as any
    }

    const inviteToken = generateAppToken()
    const [invite] = await db.insert(invites).values({
      email: data.email,
      role: data.role,
      organizationId: req.user!.orgId!,
      invitedByUserId: req.user!.userId,
      templateId: templateId || null,
      permissions: sanitizeAssignablePermissions(permissionSet || {}, data.role),
      token: inviteToken,
      expiresAt: getFutureIso(24), // 24-hour expiry
    }).returning()

    const org = (await db.select().from(organizations).where(eq(organizations.id, req.user!.orgId!)).limit(1))[0]
    await sendInviteEmail(data.email, invite.token, org?.name || 'your organization')
    res.status(201).json(invite)
  } catch (err) { next(withContext(err as Error, 'inviteMember')) }
}

export async function updateMemberPermissions(req: Request, res: Response, next: NextFunction) {
  try {
    const data = assignPermissionsSchema.parse(req.body)
    const user = (await db.select().from(users)
      .where(and(eq(users.id, req.params.id as string), eq(users.orgId, req.user!.orgId!)))
      .limit(1))[0]
    if (!user) throw new AppError('Member not found', 404)
    if (user.role !== 'team_member') throw new AppError('Only team members can receive custom permissions', 400)

    let permissionSet = data.permissions || undefined
    if (data.templateId) {
      const template = (await db.select().from(roleTemplates).where(eq(roleTemplates.id, data.templateId)).limit(1))[0]
      if (!template) throw new AppError('Template not found', 404)
      if (template.scope === 'organization' && template.organizationId !== req.user!.orgId) {
        throw new AppError('Template does not belong to this organization', 403)
      }
      permissionSet = template.permissions as any
    }

    const existing = (await db.select().from(permissions)
      .where(and(eq(permissions.userId, user.id), eq(permissions.organizationId, req.user!.orgId!)))
      .limit(1))[0]

    if (existing) {
      await db.update(permissions).set({
        templateId: data.templateId || null,
        permissions: sanitizeAssignablePermissions(permissionSet || {}, user.role),
        updatedAt: new Date().toISOString(),
      }).where(eq(permissions.id, existing.id))
    } else {
      await db.insert(permissions).values({
        userId: user.id,
        organizationId: req.user!.orgId!,
        templateId: data.templateId || null,
        permissions: sanitizeAssignablePermissions(permissionSet || {}, user.role),
        createdByUserId: req.user!.userId,
      })
    }

    res.json({ message: 'Member permissions updated' })
  } catch (err) { next(withContext(err as Error, 'updateMemberPermissions')) }
}

export async function getRecommendation(req: Request, res: Response) {
  const useCase = typeof req.query.useCase === 'string' ? req.query.useCase : ''
  const recommendedName = getRecommendedTemplateName(useCase)
  const template = (await listVisibleTemplates(req.user!.role, req.user!.orgId)).find((item) => item.name === recommendedName) || null
  res.json({ recommendedName, template })
}

export async function listMemberTemplates(req: Request, res: Response) {
  res.json(await listVisibleTemplates(req.user!.role, req.user!.orgId))
}

export async function createOrganizationTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createRoleTemplateSchema.parse(req.body)
    if (req.user!.role === 'founder' && data.scope !== 'organization') {
      throw new AppError('Founders can only create organization templates', 403)
    }
    const [template] = await db.insert(roleTemplates).values({
      name: data.name,
      scope: req.user!.role === 'founder' ? 'organization' : data.scope,
      organizationId: req.user!.role === 'founder' ? req.user!.orgId : data.scope === 'organization' ? req.user!.orgId : null,
      createdByUserId: req.user!.userId,
      permissions: data.permissions,
      isSystemTemplate: false,
    }).returning()
    res.status(201).json(template)
  } catch (err) { next(withContext(err as Error, 'createOrganizationTemplate')) }
}
