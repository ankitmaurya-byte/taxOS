import { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcrypt'
import { and, eq } from 'drizzle-orm'
import { assignCpaOrgSchema, createCpaSchema, createRoleTemplateSchema, founderApplicationReviewSchema, updateRoleTemplateSchema } from 'shared'
import { db } from '../db'
import { cpaAssignments, founderApplications, organizations, roleTemplates, users } from '../db/schema'
import { sendFounderApprovedEmail, sendFounderRejectedEmail } from '../lib/mailer'
import { listVisibleTemplates } from '../lib/rbac'

export function listFounderApplications(_req: Request, res: Response) {
  const items = db.select().from(founderApplications).all()
  res.json(items)
}

export async function reviewFounderApplication(req: Request, res: Response, next: NextFunction) {
  try {
    const data = founderApplicationReviewSchema.parse(req.body)
    const application = db.select().from(founderApplications).where(eq(founderApplications.id, req.params.id as string)).get()
    if (!application) return res.status(404).json({ error: 'Founder application not found' })
    if (application.status !== 'pending') return res.status(400).json({ error: 'Founder application already reviewed' })
    if (!application.emailVerifiedAt || !application.onboardingCompletedAt) {
      return res.status(400).json({ error: 'Founder must complete email verification and onboarding before admin review' })
    }

    const reviewedAt = new Date().toISOString()

    if (data.decision === 'rejected') {
      db.update(founderApplications).set({
        status: 'rejected',
        reviewNotes: data.reviewNotes || null,
        reviewedByUserId: req.user!.userId,
        reviewedAt,
      }).where(eq(founderApplications.id, application.id)).run()
      await sendFounderRejectedEmail(application.email, data.reviewNotes)
      return res.json({ message: 'Founder application rejected' })
    }

    db.update(users).set({
      status: 'active',
      approvedByUserId: req.user!.userId,
      approvalReviewedAt: reviewedAt,
    }).where(eq(users.id, application.userId)).run()

    db.update(founderApplications).set({
      status: 'approved',
      reviewNotes: data.reviewNotes || null,
      reviewedByUserId: req.user!.userId,
      reviewedAt,
      approvedUserId: application.userId,
    }).where(eq(founderApplications.id, application.id)).run()
    await sendFounderApprovedEmail(application.email)

    res.json({ message: 'Founder application approved', organizationId: application.organizationId, userId: application.userId })
  } catch (err) { next(err) }
}

export async function createCpa(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createCpaSchema.parse(req.body)
    const existing = db.select().from(users).where(eq(users.email, data.email)).get()
    if (existing) return res.status(409).json({ error: 'Email already registered' })

    const passwordHash = await bcrypt.hash(data.password, 10)
    const user = db.insert(users).values({
      orgId: null,
      email: data.email,
      passwordHash,
      name: data.name,
      role: 'cpa',
      status: 'active',
      isVerified: true,
      approvedByUserId: req.user!.userId,
      approvalReviewedAt: new Date().toISOString(),
    }).returning().get()

    res.status(201).json(user)
  } catch (err) { next(err) }
}

export async function assignCpaOrganization(req: Request, res: Response, next: NextFunction) {
  try {
    const { organizationId } = assignCpaOrgSchema.parse(req.body)
    const user = db.select().from(users).where(eq(users.id, req.params.id as string)).get()
    if (!user || user.role !== 'cpa') return res.status(404).json({ error: 'CPA not found' })
    const org = db.select().from(organizations).where(eq(organizations.id, organizationId)).get()
    if (!org) return res.status(404).json({ error: 'Organization not found' })

    const existing = db.select().from(cpaAssignments)
      .where(and(eq(cpaAssignments.userId, user.id), eq(cpaAssignments.organizationId, organizationId)))
      .get()
    if (existing) return res.status(409).json({ error: 'CPA already assigned to this organization' })

    db.insert(cpaAssignments).values({
      userId: user.id,
      organizationId,
      createdByUserId: req.user!.userId,
    }).run()

    db.update(users).set({ orgId: organizationId }).where(eq(users.id, user.id)).run()

    res.json({ message: 'CPA assigned to organization' })
  } catch (err) { next(err) }
}

export function listCpas(_req: Request, res: Response) {
  const cpas = db.select().from(users).where(eq(users.role, 'cpa')).all()
  const assignments = db.select().from(cpaAssignments).all()
  res.json(cpas.map((cpa) => ({
    ...cpa,
    assignments: assignments.filter((assignment) => assignment.userId === cpa.id),
  })))
}

export function listTemplates(req: Request, res: Response) {
  res.json(listVisibleTemplates(req.user!.role, req.user!.orgId))
}

export async function createTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createRoleTemplateSchema.parse(req.body)
    if (req.user!.role === 'founder' && data.scope === 'global') {
      return res.status(403).json({ error: 'Founders can only create organization templates' })
    }

    const template = db.insert(roleTemplates).values({
      name: data.name,
      scope: data.scope,
      organizationId: data.scope === 'organization' ? req.user!.orgId : null,
      createdByUserId: req.user!.userId,
      permissions: data.permissions,
      isSystemTemplate: false,
    }).returning().get()
    res.status(201).json(template)
  } catch (err) { next(err) }
}

export async function updateTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const data = updateRoleTemplateSchema.parse(req.body)
    const template = db.select().from(roleTemplates).where(eq(roleTemplates.id, req.params.id as string)).get()
    if (!template) return res.status(404).json({ error: 'Template not found' })
    if (template.isSystemTemplate && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can update system templates' })
    }
    if (template.scope === 'organization' && req.user!.role !== 'admin' && template.organizationId !== req.user!.orgId) {
      return res.status(403).json({ error: 'Cannot update another organization template' })
    }

    db.update(roleTemplates).set({
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.scope !== undefined ? { scope: data.scope } : {}),
      ...(data.permissions !== undefined ? { permissions: data.permissions } : {}),
      updatedAt: new Date().toISOString(),
    }).where(eq(roleTemplates.id, template.id)).run()

    res.json({ message: 'Template updated' })
  } catch (err) { next(err) }
}
