import { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcrypt'
import { and, eq } from 'drizzle-orm'
import { assignCpaOrgSchema, createCpaSchema, founderApplicationReviewSchema } from 'shared'
import { db } from '../db'
import { cpaAssignments, founderApplications, organizations, users } from '../db/schema'
import { sendFounderApprovedEmail, sendFounderRejectedEmail } from '../lib/mailer'
import { AppError, withContext } from '../lib/errors'

export function listFounderApplications(_req: Request, res: Response) {
  const items = db.select().from(founderApplications).all()
  res.json(items)
}

export async function reviewFounderApplication(req: Request, res: Response, next: NextFunction) {
  try {
    const data = founderApplicationReviewSchema.parse(req.body)
    const application = db.select().from(founderApplications).where(eq(founderApplications.id, req.params.id as string)).get()
    if (!application) throw new AppError('Founder application not found', 404)
    if (application.status !== 'pending') throw new AppError('Founder application already reviewed', 400)
    if (!application.emailVerifiedAt || !application.onboardingCompletedAt) {
      throw new AppError('Founder must complete email verification and onboarding before admin review', 400)
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
  } catch (err) { next(withContext(err as Error, 'reviewFounderApplication')) }
}

export async function createCpa(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createCpaSchema.parse(req.body)
    const existing = db.select().from(users).where(eq(users.email, data.email)).get()
    if (existing) throw new AppError('Email already registered', 409)

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
  } catch (err) { next(withContext(err as Error, 'createCpa')) }
}

export async function assignCpaOrganization(req: Request, res: Response, next: NextFunction) {
  try {
    const { organizationId } = assignCpaOrgSchema.parse(req.body)
    const user = db.select().from(users).where(eq(users.id, req.params.id as string)).get()
    if (!user || user.role !== 'cpa') throw new AppError('CPA not found', 404)
    const org = db.select().from(organizations).where(eq(organizations.id, organizationId)).get()
    if (!org) throw new AppError('Organization not found', 404)

    const existing = db.select().from(cpaAssignments)
      .where(and(eq(cpaAssignments.userId, user.id), eq(cpaAssignments.organizationId, organizationId)))
      .get()
    if (existing) throw new AppError('CPA already assigned to this organization', 409)

    db.insert(cpaAssignments).values({
      userId: user.id,
      organizationId,
      createdByUserId: req.user!.userId,
    }).run()

    db.update(users).set({ orgId: organizationId }).where(eq(users.id, user.id)).run()

    res.json({ message: 'CPA assigned to organization' })
  } catch (err) { next(withContext(err as Error, 'assignCpaOrganization')) }
}

export function listCpas(_req: Request, res: Response) {
  const cpas = db.select().from(users).where(eq(users.role, 'cpa')).all()
  const assignments = db.select().from(cpaAssignments).all()
  res.json(cpas.map((cpa) => ({
    ...cpa,
    assignments: assignments.filter((assignment) => assignment.userId === cpa.id),
  })))
}

export function listOrganizationOverview(_req: Request, res: Response) {
  const allOrganizations = db.select().from(organizations).all()
  const allUsers = db.select().from(users).all()
  const assignments = db.select().from(cpaAssignments).all()

  const overview = allOrganizations.map((organization) => {
    const organizationUsers = allUsers.filter((user) => user.orgId === organization.id)
    const founders = organizationUsers.filter((user) => user.role === 'founder')
    const teamMembers = organizationUsers.filter((user) => user.role === 'team_member')
    const assignedCpas = assignments.filter((assignment) => assignment.organizationId === organization.id)

    return {
      id: organization.id,
      name: organization.name,
      legalName: organization.legalName,
      founderCount: founders.length,
      teamMemberCount: teamMembers.length,
      assignedCpaCount: assignedCpas.length,
      founderNames: founders.map((founder) => founder.name),
      createdAt: organization.createdAt,
    }
  })

  res.json(overview)
}
