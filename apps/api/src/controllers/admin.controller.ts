import { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcrypt'
import { and, desc, eq, sql } from 'drizzle-orm'
import { assignCpaOrgSchema, createCpaSchema, founderApplicationReviewSchema, updateEntitySchema, updateFilingStatusSchema } from 'shared'
import { db } from '../db'
import { agentConversations, cpaAssignments, documents, entities, filings, founderApplications, invites, organizations, users } from '../db/schema'
import { sendFounderApprovedEmail, sendFounderRejectedEmail, sendInviteEmail } from '../lib/mailer'
import { generateAppToken, getFutureIso } from '../lib/tokens'
import { AppError, withContext } from '../lib/errors'

export async function listFounderApplications(_req: Request, res: Response) {
  const items = await db.select().from(founderApplications).orderBy(desc(founderApplications.createdAt))
  res.json(items)
}

export async function reviewFounderApplication(req: Request, res: Response, next: NextFunction) {
  try {
    const data = founderApplicationReviewSchema.parse(req.body)
    const application = (await db.select().from(founderApplications).where(eq(founderApplications.id, req.params.id as string)).limit(1))[0]
    if (!application) throw new AppError('Founder application not found', 404)
    if (application.status !== 'pending') throw new AppError('Founder application already reviewed', 400)
    if (!application.emailVerifiedAt || !application.onboardingCompletedAt) {
      throw new AppError('Founder must complete email verification and onboarding before admin review', 400)
    }

    const reviewedAt = new Date().toISOString()

    if (data.decision === 'rejected') {
      await db.update(founderApplications).set({
        status: 'rejected',
        reviewNotes: data.reviewNotes || null,
        reviewedByUserId: req.user!.userId,
        reviewedAt,
      }).where(eq(founderApplications.id, application.id))
      await sendFounderRejectedEmail(application.email, data.reviewNotes)
      return res.json({ message: 'Founder application rejected' })
    }

    await db.update(users).set({
      status: 'active',
      approvedByUserId: req.user!.userId,
      approvalReviewedAt: reviewedAt,
    }).where(eq(users.id, application.userId))

    await db.update(founderApplications).set({
      status: 'approved',
      reviewNotes: data.reviewNotes || null,
      reviewedByUserId: req.user!.userId,
      reviewedAt,
      approvedUserId: application.userId,
    }).where(eq(founderApplications.id, application.id))
    await sendFounderApprovedEmail(application.email)

    res.json({ message: 'Founder application approved', organizationId: application.organizationId, userId: application.userId })
  } catch (err) { next(withContext(err as Error, 'reviewFounderApplication')) }
}

export async function createCpa(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createCpaSchema.parse(req.body)
    const existing = (await db.select().from(users).where(eq(users.email, data.email)).limit(1))[0]
    if (existing) throw new AppError('A user already exists for this email', 409)

    // Check for already-pending invite for this email
    const existingInvite = (await db.select().from(invites)
      .where(and(eq(invites.email, data.email), eq(invites.status, 'pending'))))
      .find(i => i.role === 'cpa')
    if (existingInvite) throw new AppError('A pending CPA invite already exists for this email', 409)

    // Admin org is the invoker's own org
    const adminOrgId = req.user!.orgId!

    const inviteToken = generateAppToken()
    const [invite] = await db.insert(invites).values({
      email: data.email,
      role: 'cpa',
      organizationId: adminOrgId,
      invitedByUserId: req.user!.userId,
      templateId: null,
      permissions: {},
      token: inviteToken,
      expiresAt: getFutureIso(24), // 24-hour window
    }).returning()

    await sendInviteEmail(data.email, inviteToken, 'TaxOS Admin')
    res.status(201).json({ message: 'CPA invite sent', inviteId: invite.id })
  } catch (err) { next(withContext(err as Error, 'createCpa')) }
}

export async function assignCpaOrganization(req: Request, res: Response, next: NextFunction) {
  try {
    const { organizationId } = assignCpaOrgSchema.parse(req.body)
    const user = (await db.select().from(users).where(eq(users.id, req.params.id as string)).limit(1))[0]
    if (!user || user.role !== 'cpa') throw new AppError('CPA not found', 404)
    const org = (await db.select().from(organizations).where(eq(organizations.id, organizationId)).limit(1))[0]
    if (!org) throw new AppError('Organization not found', 404)

    const existing = (await db.select().from(cpaAssignments)
      .where(and(eq(cpaAssignments.userId, user.id), eq(cpaAssignments.organizationId, organizationId)))
      .limit(1))[0]
    if (existing) throw new AppError('CPA already assigned to this organization', 409)

    await db.insert(cpaAssignments).values({
      userId: user.id,
      organizationId,
      createdByUserId: req.user!.userId,
    })

    // CPAs keep their home orgId (admin org). Access to client orgs is tracked
    // exclusively in cpaAssignments — we never reassign users.orgId for CPAs.

    res.json({ message: 'CPA assigned to organization' })
  } catch (err) { next(withContext(err as Error, 'assignCpaOrganization')) }
}

export async function listCpas(_req: Request, res: Response) {
  const cpas = await db.select().from(users).where(eq(users.role, 'cpa')).orderBy(desc(users.createdAt))
  const assignments = await db.select().from(cpaAssignments)
  res.json(cpas.map((cpa) => ({
    ...cpa,
    assignments: assignments.filter((assignment) => assignment.userId === cpa.id),
  })))
}

export async function listOrganizationOverview(_req: Request, res: Response) {
  const allOrganizations = await db.select().from(organizations).orderBy(desc(organizations.createdAt))
  const allUsers = await db.select().from(users)
  const assignments = await db.select().from(cpaAssignments)

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

export async function listSystemUsers(_req: Request, res: Response) {
  const allUsers = await db.select().from(users).orderBy(desc(users.createdAt))
  const allOrganizations = await db.select().from(organizations)

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

export async function createOrganization(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, legalName, plan } = req.body
    if (!name) throw new AppError('Organization name is required', 400)
    const [org] = await db.insert(organizations).values({ name, legalName, plan: plan || 'free' }).returning()
    res.status(201).json(org)
  } catch (err) { next(withContext(err as Error, 'createOrganization')) }
}

export async function getOrganizationDetails(req: Request, res: Response, next: NextFunction) {
  try {
    const org = (await db.select().from(organizations).where(eq(organizations.id, req.params.id as string)).limit(1))[0]
    if (!org) throw new AppError('Organization not found', 404)

    const orgUsers = await db.select().from(users).where(eq(users.orgId, org.id)).orderBy(desc(users.createdAt))
    const orgEntities = await db.select().from(entities).where(eq(entities.orgId, org.id)).orderBy(desc(entities.createdAt))
    const assignedCpasIds = (await db.select().from(cpaAssignments).where(eq(cpaAssignments.organizationId, org.id))).map(a => a.userId)
    const assignedCpas = assignedCpasIds.length ? await db.select().from(users).where(sql`${users.id} IN ${assignedCpasIds}`) : []
    const orgFilings = await db.select().from(filings).where(eq(filings.orgId, org.id)).orderBy(desc(filings.updatedAt))

    res.json({ ...org, users: orgUsers, entities: orgEntities, cpas: assignedCpas, filings: orgFilings })
  } catch (err) { next(withContext(err as Error, 'getOrganizationDetails')) }
}

export async function updateOrganization(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, legalName, plan } = req.body
    const [org] = await db.update(organizations).set({ name, legalName, plan }).where(eq(organizations.id, req.params.id as string)).returning()
    res.json(org)
  } catch (err) { next(withContext(err as Error, 'updateOrganization')) }
}

// Note: Soft delete (effectively rename/mark, but org has no status, so we append [SUSPENDED] to name for now, or just leave it)
export async function toggleSuspendOrganization(req: Request, res: Response, next: NextFunction) {
  try {
    const org = (await db.select().from(organizations).where(eq(organizations.id, req.params.id as string)).limit(1))[0]
    if (!org) throw new AppError('Organization not found', 404)

    const newName = org.name.startsWith('[SUSPENDED]') ? org.name.replace('[SUSPENDED] ', '') : `[SUSPENDED] ${org.name}`
    await db.update(organizations).set({ name: newName }).where(eq(organizations.id, org.id))

    // Auto cascade suspend users
    if (newName.startsWith('[SUSPENDED]')) {
      await db.update(users).set({ status: 'suspended' }).where(eq(users.orgId, org.id))
    }
    res.json({ message: 'Organization suspend status toggled', newName })
  } catch (err) { next(withContext(err as Error, 'toggleSuspendOrganization')) }
}

// ---- ADVANCED USER MANAGEMENT ----

export async function createAnyUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password, name, role, orgId, status } = req.body
    const existing = (await db.select().from(users).where(eq(users.email, email)).limit(1))[0]
    if (existing) throw new AppError('Email already registered', 409)
    const passwordHash = await bcrypt.hash(password, 10)
    const [user] = await db.insert(users).values({
      email, passwordHash, name, role, orgId, status: status || 'active',
      isVerified: true, approvedByUserId: req.user!.userId, approvalReviewedAt: new Date().toISOString()
    }).returning()
    res.status(201).json(user)
  } catch (err) { next(withContext(err as Error, 'createAnyUser')) }
}

export async function getUserDetails(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (await db.select().from(users).where(eq(users.id, req.params.id as string)).limit(1))[0]
    if (!user) throw new AppError('User not found', 404)
    let org = null
    let cpaOrgs: typeof organizations.$inferSelect[] = []
    let assignedFilings: typeof filings.$inferSelect[] = []
    if (user.orgId) {
      org = (await db.select().from(organizations).where(eq(organizations.id, user.orgId)).limit(1))[0]
    }
    if (user.role === 'cpa') {
       const assignments = await db.select().from(cpaAssignments).where(eq(cpaAssignments.userId, user.id))
       if (assignments.length) {
         cpaOrgs = await db.select().from(organizations).where(sql`${organizations.id} IN ${assignments.map(a => a.organizationId)}`)
       }
       assignedFilings = await db.select().from(filings).where(eq(filings.cpaAssignedId, user.id)).orderBy(desc(filings.updatedAt))
    }
    res.json({ ...user, organization: org, cpaOrganizations: cpaOrgs, assignedFilings })
  } catch (err) { next(withContext(err as Error, 'getUserDetails')) }
}

export async function updateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const existing = (await db.select().from(users).where(eq(users.id, req.params.id as string)).limit(1))[0]
    if (!existing) throw new AppError('User not found', 404)
    const { name, email, role, status, orgId } = req.body
    // Only update fields that were explicitly provided — never overwrite orgId with undefined
    const patch: Record<string, unknown> = {}
    if (name !== undefined) patch.name = name
    if (email !== undefined) patch.email = email
    if (role !== undefined) patch.role = role
    if (status !== undefined) patch.status = status
    if (orgId !== undefined) patch.orgId = orgId
    const [user] = await db.update(users).set(patch as any).where(eq(users.id, req.params.id as string)).returning()
    res.json(user)
  } catch (err) { next(withContext(err as Error, 'updateUser')) }
}

export async function deleteUser(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (await db.select().from(users).where(eq(users.id, req.params.id as string)).limit(1))[0]
    if (!user) throw new AppError('User not found', 404)
    await db.update(users).set({ status: 'suspended' }).where(eq(users.id, user.id))
    res.json({ message: 'User suspended' })
  } catch (err) { next(withContext(err as Error, 'deleteUser')) }
}

// ---- ENTITY & FILING MANAGEMENT (admin cross-org) ----

export async function updateAnyEntity(req: Request, res: Response, next: NextFunction) {
  try {
    const data = updateEntitySchema.parse(req.body)
    const existing = (await db.select().from(entities).where(eq(entities.id, req.params.id as string)).limit(1))[0]
    if (!existing) throw new AppError('Entity not found', 404)
    const { majorBusinessActivity: mba, ...rest } = data
    const [updated] = await db.update(entities)
      .set({ ...rest, majorBusinessActivity: mba ?? undefined, foreignSubsidiaries: data.foreignSubsidiaries as any })
      .where(eq(entities.id, req.params.id as string))
      .returning()
    res.json(updated)
  } catch (err) { next(withContext(err as Error, 'updateAnyEntity')) }
}

export async function dissolveAnyEntity(req: Request, res: Response, next: NextFunction) {
  try {
    const existing = (await db.select().from(entities).where(eq(entities.id, req.params.id as string)).limit(1))[0]
    if (!existing) throw new AppError('Entity not found', 404)
    await db.update(entities).set({ status: 'dissolved' }).where(eq(entities.id, req.params.id as string))
    res.json({ message: 'Entity dissolved' })
  } catch (err) { next(withContext(err as Error, 'dissolveAnyEntity')) }
}

export async function updateAnyFilingStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { status } = updateFilingStatusSchema.parse(req.body)
    const filing = (await db.select().from(filings).where(eq(filings.id, req.params.id as string)).limit(1))[0]
    if (!filing) throw new AppError('Filing not found', 404)
    const [updated] = await db.update(filings).set({ status, updatedAt: new Date().toISOString() })
      .where(eq(filings.id, filing.id)).returning()
    res.json(updated)
  } catch (err) { next(withContext(err as Error, 'updateAnyFilingStatus')) }
}

// ---- FILING DETAILS & DATA (admin cross-org) ----

export async function getFilingDetails(req: Request, res: Response, next: NextFunction) {
  try {
    const filing = (await db.select().from(filings).where(eq(filings.id, req.params.id as string)).limit(1))[0]
    if (!filing) throw new AppError('Filing not found', 404)
    const org = filing.orgId ? (await db.select().from(organizations).where(eq(organizations.id, filing.orgId)).limit(1))[0] : null
    const entity = filing.entityId ? (await db.select().from(entities).where(eq(entities.id, filing.entityId)).limit(1))[0] : null
    const cpa = filing.cpaAssignedId ? (await db.select().from(users).where(eq(users.id, filing.cpaAssignedId)).limit(1))[0] : null
    const docs = await db.select().from(documents).where(eq(documents.filingId, filing.id)).orderBy(desc(documents.createdAt))
    const conversations = await db.select().from(agentConversations).where(eq(agentConversations.filingId, filing.id)).orderBy(desc(agentConversations.createdAt))
    res.json({ ...filing, org, entity, cpa, documents: docs, conversations })
  } catch (err) { next(withContext(err as Error, 'getFilingDetails')) }
}

export async function updateAnyFilingData(req: Request, res: Response, next: NextFunction) {
  try {
    const filing = (await db.select().from(filings).where(eq(filings.id, req.params.id as string)).limit(1))[0]
    if (!filing) throw new AppError('Filing not found', 404)
    const { fields } = req.body as { fields: Record<string, unknown> }
    const merged = { ...(filing.filingData || {}), ...fields }
    const [updated] = await db.update(filings)
      .set({ filingData: merged, updatedAt: new Date().toISOString() })
      .where(eq(filings.id, filing.id)).returning()
    res.json({ message: 'Filing data updated', filingData: updated.filingData })
  } catch (err) { next(withContext(err as Error, 'updateAnyFilingData')) }
}

// ---- AGENT CONVERSATIONS (admin) ----

export async function listAllAgentConversations(req: Request, res: Response, next: NextFunction) {
  try {
    const { orgId, userId, limit: limitStr, offset: offsetStr } = req.query as { orgId?: string; userId?: string; limit?: string; offset?: string }
    const limit = Math.min(Number(limitStr) || 20, 100)
    const offset = Number(offsetStr) || 0

    let convos = await db.select().from(agentConversations).orderBy(desc(agentConversations.updatedAt))
    if (orgId) convos = convos.filter(c => c.orgId === orgId)

    const allFilings = await db.select().from(filings)
    const allOrgs = await db.select().from(organizations)
    const orgDict = Object.fromEntries(allOrgs.map(o => [o.id, o]))
    const filingDict = Object.fromEntries(allFilings.map(f => [f.id, f]))

    let result = convos.map(c => ({
      ...c,
      orgName: orgDict[c.orgId]?.name || 'Unknown',
      filingForm: c.filingId ? filingDict[c.filingId]?.formName || 'Unknown' : null,
      filingStatus: c.filingId ? filingDict[c.filingId]?.status || null : null,
    }))

    if (userId) {
      const targetUser = (await db.select().from(users).where(eq(users.id, userId)).limit(1))[0]
      if (targetUser?.orgId) {
        result = result.filter(c => c.orgId === targetUser.orgId)
      }
    }

    const total = result.length
    const paged = result.slice(offset, offset + limit)
    res.json({ conversations: paged, total, limit, offset })
  } catch (err) { next(withContext(err as Error, 'listAllAgentConversations')) }
}

// ---- GLOBAL DISCOVERY ----

export async function listAllEntities(_req: Request, res: Response, next: NextFunction) {
  try {
    const allEntities = await db.select().from(entities).orderBy(desc(entities.createdAt))
    const allOrganizations = await db.select().from(organizations)
    const orgDict = Object.fromEntries(allOrganizations.map(o => [o.id, o]))

    res.json(allEntities.map(e => ({
      ...e,
      orgName: orgDict[e.orgId]?.name || 'Unknown'
    })))
  } catch (err) { next(withContext(err as Error, 'listAllEntities')) }
}

export async function listAllFilings(_req: Request, res: Response, next: NextFunction) {
  try {
    const allFilings = await db.select().from(filings).orderBy(desc(filings.updatedAt))
    const allOrganizations = await db.select().from(organizations)
    const allEntities = await db.select().from(entities)
    const allUsers = await db.select().from(users)

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
