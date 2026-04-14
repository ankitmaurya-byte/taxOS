import { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcrypt'
import { and, eq, sql } from 'drizzle-orm'
import { assignCpaOrgSchema, createCpaSchema, founderApplicationReviewSchema } from 'shared'
import { db } from '../db'
import { cpaAssignments, entities, filings, founderApplications, invites, organizations, users } from '../db/schema'
import { sendFounderApprovedEmail, sendFounderRejectedEmail, sendInviteEmail } from '../lib/mailer'
import { generateAppToken, getFutureIso } from '../lib/tokens'
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
    if (existing) throw new AppError('A user already exists for this email', 409)

    // Check for already-pending invite for this email
    const existingInvite = db.select().from(invites)
      .where(and(eq(invites.email, data.email), eq(invites.status, 'pending')))
      .all()
      .find(i => i.role === 'cpa')
    if (existingInvite) throw new AppError('A pending CPA invite already exists for this email', 409)

    // Admin org is the invoker's own org
    const adminOrgId = req.user!.orgId!

    const inviteToken = generateAppToken()
    const invite = db.insert(invites).values({
      email: data.email,
      role: 'cpa',
      organizationId: adminOrgId,
      invitedByUserId: req.user!.userId,
      templateId: null,
      permissions: {},
      token: inviteToken,
      expiresAt: getFutureIso(1), // 1-hour window
    }).returning().get()

    await sendInviteEmail(data.email, inviteToken, 'TaxOS Admin')
    res.status(201).json({ message: 'CPA invite sent', inviteId: invite.id })
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

    // CPAs keep their home orgId (admin org). Access to client orgs is tracked
    // exclusively in cpaAssignments — we never reassign users.orgId for CPAs.

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

export function listSystemUsers(_req: Request, res: Response) {
  const allUsers = db.select().from(users).all()
  const allOrganizations = db.select().from(organizations).all()

  const orgDict = Object.fromEntries(allOrganizations.map(o => [o.id, o]))

  const result = allUsers.map(user => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    orgId: user.orgId,
    orgName: user.orgId && orgDict[user.orgId] ? orgDict[user.orgId].name : null,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
  }))

  res.json(result)
}

// ---- ADVANCED ORG MANAGEMENT ----

export function createOrganization(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, legalName, plan } = req.body
    if (!name) throw new AppError('Organization name is required', 400)
    const org = db.insert(organizations).values({ name, legalName, plan: plan || 'free' }).returning().get()
    res.status(201).json(org)
  } catch (err) { next(withContext(err as Error, 'createOrganization')) }
}

export function getOrganizationDetails(req: Request, res: Response, next: NextFunction) {
  try {
    const org = db.select().from(organizations).where(eq(organizations.id, req.params.id as string)).get()
    if (!org) throw new AppError('Organization not found', 404)
    
    const orgUsers = db.select().from(users).where(eq(users.orgId, org.id)).all()
    const orgEntities = db.select().from(entities).where(eq(entities.orgId, org.id)).all()
    const assignedCpasIds = db.select().from(cpaAssignments).where(eq(cpaAssignments.organizationId, org.id)).all().map(a => a.userId)
    const assignedCpas = assignedCpasIds.length ? db.select().from(users).where(sql`${users.id} IN ${assignedCpasIds}`).all() : []
    const orgFilings = db.select().from(filings).where(eq(filings.orgId, org.id)).all()

    res.json({ ...org, users: orgUsers, entities: orgEntities, cpas: assignedCpas, filings: orgFilings })
  } catch (err) { next(withContext(err as Error, 'getOrganizationDetails')) }
}

export function updateOrganization(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, legalName, plan } = req.body
    const org = db.update(organizations).set({ name, legalName, plan }).where(eq(organizations.id, req.params.id as string)).returning().get()
    res.json(org)
  } catch (err) { next(withContext(err as Error, 'updateOrganization')) }
}

// Note: Soft delete (effectively rename/mark, but org has no status, so we append [SUSPENDED] to name for now, or just leave it)
export function toggleSuspendOrganization(req: Request, res: Response, next: NextFunction) {
  try {
    const org = db.select().from(organizations).where(eq(organizations.id, req.params.id as string)).get()
    if (!org) throw new AppError('Organization not found', 404)
    
    const newName = org.name.startsWith('[SUSPENDED]') ? org.name.replace('[SUSPENDED] ', '') : `[SUSPENDED] ${org.name}`
    db.update(organizations).set({ name: newName }).where(eq(organizations.id, org.id)).run()
    
    // Auto cascade suspend users
    if (newName.startsWith('[SUSPENDED]')) {
      db.update(users).set({ status: 'suspended' }).where(eq(users.orgId, org.id)).run()
    }
    res.json({ message: 'Organization suspend status toggled', newName })
  } catch (err) { next(withContext(err as Error, 'toggleSuspendOrganization')) }
}

// ---- ADVANCED USER MANAGEMENT ----

export async function createAnyUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password, name, role, orgId, status } = req.body
    const existing = db.select().from(users).where(eq(users.email, email)).get()
    if (existing) throw new AppError('Email already registered', 409)
    const passwordHash = await bcrypt.hash(password, 10)
    const user = db.insert(users).values({
      email, passwordHash, name, role, orgId, status: status || 'active',
      isVerified: true, approvedByUserId: req.user!.userId, approvalReviewedAt: new Date().toISOString()
    }).returning().get()
    res.status(201).json(user)
  } catch (err) { next(withContext(err as Error, 'createAnyUser')) }
}

export function getUserDetails(req: Request, res: Response, next: NextFunction) {
  try {
    const user = db.select().from(users).where(eq(users.id, req.params.id as string)).get()
    if (!user) throw new AppError('User not found', 404)
    let org = null
    let cpaOrgs: typeof organizations.$inferSelect[] = []
    let assignedFilings: typeof filings.$inferSelect[] = []
    if (user.orgId) {
      org = db.select().from(organizations).where(eq(organizations.id, user.orgId)).get()
    }
    if (user.role === 'cpa') {
       const assignments = db.select().from(cpaAssignments).where(eq(cpaAssignments.userId, user.id)).all()
       if (assignments.length) {
         cpaOrgs = db.select().from(organizations).where(sql`${organizations.id} IN ${assignments.map(a => a.organizationId)}`).all()
       }
       assignedFilings = db.select().from(filings).where(eq(filings.cpaAssignedId, user.id)).all()
    }
    res.json({ ...user, organization: org, cpaOrganizations: cpaOrgs, assignedFilings })
  } catch (err) { next(withContext(err as Error, 'getUserDetails')) }
}

export function updateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, email, role, status, orgId } = req.body
    const user = db.update(users).set({ name, email, role, status, orgId }).where(eq(users.id, req.params.id as string)).returning().get()
    res.json(user)
  } catch (err) { next(withContext(err as Error, 'updateUser')) }
}

export function deleteUser(req: Request, res: Response, next: NextFunction) {
  try {
    const user = db.select().from(users).where(eq(users.id, req.params.id as string)).get()
    if (!user) throw new AppError('User not found', 404)
    db.update(users).set({ status: 'suspended' }).where(eq(users.id, user.id)).run()
    res.json({ message: 'User suspended' })
  } catch (err) { next(withContext(err as Error, 'deleteUser')) }
}

// ---- GLOBAL DISCOVERY ----

export function listAllEntities(_req: Request, res: Response, next: NextFunction) {
  try {
    const allEntities = db.select().from(entities).all()
    const allOrganizations = db.select().from(organizations).all()
    const orgDict = Object.fromEntries(allOrganizations.map(o => [o.id, o]))
    
    res.json(allEntities.map(e => ({
      ...e,
      orgName: orgDict[e.orgId]?.name || 'Unknown'
    })))
  } catch (err) { next(withContext(err as Error, 'listAllEntities')) }
}

export function listAllFilings(_req: Request, res: Response, next: NextFunction) {
  try {
    const allFilings = db.select().from(filings).all()
    const allOrganizations = db.select().from(organizations).all()
    const allEntities = db.select().from(entities).all()
    const allUsers = db.select().from(users).all()
    
    const orgDict = Object.fromEntries(allOrganizations.map(o => [o.id, o]))
    const entDict = Object.fromEntries(allEntities.map(e => [e.id, e]))
    const cpaDict = Object.fromEntries(allUsers.filter(u => u.role === 'cpa').map(u => [u.id, u]))
    
    res.json(allFilings.map(f => ({
      ...f,
      orgName: orgDict[f.orgId]?.name || 'Unknown',
      legalName: entDict[f.entityId]?.legalName || 'Unknown',
      cpaName: f.cpaAssignedId ? (cpaDict[f.cpaAssignedId]?.name || 'Unknown CPA') : 'Unassigned'
    })))
  } catch (err) { next(withContext(err as Error, 'listAllFilings')) }
}

