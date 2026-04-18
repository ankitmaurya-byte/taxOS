import { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcrypt'
import { and, eq } from 'drizzle-orm'
import {
  acceptInviteSchema,
  founderOnboardingSchema,
  founderRegistrationSchema,
  loginSchema,
  resendVerificationSchema,
  verifyEmailSchema,
} from 'shared'
import { db } from '../db'
import {
  emailVerificationTokens,
  entities,
  founderApplications,
  invites,
  organizations,
  permissions,
  roleTemplates,
  users,
} from '../db/schema'
import { generateToken } from '../middleware/auth'
import { EMPTY_PERMISSIONS, FOUNDER_PERMISSIONS, getEffectivePermissionsForUser } from '../lib/rbac'
import {
  sendFounderApplicationReceivedEmail,
  sendFounderApprovedEmail,
  sendVerificationEmail,
} from '../lib/mailer'
import { generateAppToken, getFutureIso, isExpired } from '../lib/tokens'
import { parseCertificateOfIncorporation } from '../lib/certificateParser'
import { AppError, withContext } from '../lib/errors'

async function getFounderApplicationByUserId(userId: string) {
  return (await db.select().from(founderApplications).where(eq(founderApplications.userId, userId)).limit(1))[0]
}

async function serializeUser(user: typeof users.$inferSelect) {
  const founderApplication = user.role === 'founder' ? await getFounderApplicationByUserId(user.id) : null
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    orgId: user.orgId,
    status: user.status,
    isVerified: user.isVerified,
    permissions: (await getEffectivePermissionsForUser(user.id)) || EMPTY_PERMISSIONS,
    onboardingCompleted: Boolean(founderApplication?.onboardingCompletedAt),
    onboardingStep: !user.isVerified
      ? 'email_verification'
      : user.status === 'pending_onboarding'
        ? 'entity_setup'
        : user.status === 'pending_admin_review'
          ? 'pending_admin_review'
          : 'completed',
  }
}

export async function registerFounder(req: Request, res: Response, next: NextFunction) {
  try {
    const data = founderRegistrationSchema.parse(req.body)

    const existingUser = (await db.select().from(users).where(eq(users.email, data.email)).limit(1))[0]
    if (existingUser) throw new AppError('Email already registered', 409)

    const existingApplication = (await db.select().from(founderApplications).where(eq(founderApplications.email, data.email)).limit(1))[0]
    if (existingApplication) throw new AppError('A founder registration already exists for this email', 409)

    const passwordHash = await bcrypt.hash(data.password, 10)
    const [organization] = await db.insert(organizations).values({
      name: data.organizationName,
      legalName: data.organizationName,
    }).returning()

    const [user] = await db.insert(users).values({
      orgId: organization.id,
      email: data.email,
      passwordHash,
      name: data.name,
      role: 'founder',
      status: 'pending_email_verification',
      isVerified: false,
    }).returning()

    await db.insert(founderApplications).values({
      userId: user.id,
      organizationId: organization.id,
      email: data.email,
      passwordHash,
      name: data.name,
      organizationName: data.organizationName,
      legalCompanyName: data.organizationName,
      status: 'pending',
    })

    const token = generateAppToken()
    await db.insert(emailVerificationTokens).values({
      userId: user.id,
      token,
      expiresAt: getFutureIso(24),
    })

    await sendVerificationEmail(user.email, token)
    await sendFounderApplicationReceivedEmail(user.email, user.name)
    res.status(201).json({ message: 'Verification email sent', email: user.email })
  } catch (err) { next(withContext(err as Error, 'registerFounder')) }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const data = loginSchema.parse(req.body)
    const user = (await db.select().from(users).where(eq(users.email, data.email)).limit(1))[0]
    if (!user) throw new AppError('Invalid credentials', 401)

    const valid = await bcrypt.compare(data.password, user.passwordHash)
    if (!valid) throw new AppError('Invalid credentials', 401)

    if (!user.isVerified || user.status === 'pending_email_verification') {
      throw new AppError('Please verify your email before signing in', 403)
    }
    if (user.status === 'rejected' || user.status === 'suspended') {
      throw new AppError('Your account is not active', 403)
    }
    if (!user.orgId) {
      throw new AppError('Account is not assigned to an organization', 403)
    }

    await db.update(users).set({ lastLoginAt: new Date().toISOString() }).where(eq(users.id, user.id))
    const token = generateToken({ userId: user.id, orgId: user.orgId, role: user.role as any, status: user.status })
    res.json({ token, user: await serializeUser(user) })
  } catch (err) { next(withContext(err as Error, 'login')) }
}

export async function getMe(req: Request, res: Response) {
  const user = (await db.select().from(users).where(eq(users.id, req.user!.userId)).limit(1))[0]
  if (!user) return res.status(404).json({ error: 'User not found' })
  res.json(await serializeUser(user))
}

export async function verifyEmail(req: Request, res: Response, next: NextFunction) {
  try {
    const { token } = verifyEmailSchema.parse(req.body)
    const record = (await db.select().from(emailVerificationTokens).where(eq(emailVerificationTokens.token, token)).limit(1))[0]
    if (!record) throw new AppError('Verification link not found', 404)
    if (record.usedAt) throw new AppError('Verification link already used', 400)
    if (isExpired(record.expiresAt)) throw new AppError('Verification link has expired', 400)
    if (!record.userId) throw new AppError('Verification link is invalid', 400)

    const user = (await db.select().from(users).where(eq(users.id, record.userId)).limit(1))[0]
    if (!user) throw new AppError('User not found', 404)

    const nextStatus = user.role === 'founder' ? 'pending_onboarding' : 'active'
    const now = new Date().toISOString()

    await db.update(emailVerificationTokens).set({ usedAt: now }).where(eq(emailVerificationTokens.id, record.id))
    await db.update(users).set({ isVerified: true, status: nextStatus }).where(eq(users.id, record.userId))

    if (user.role === 'founder') {
      await db.update(founderApplications).set({ emailVerifiedAt: now }).where(eq(founderApplications.userId, user.id))
    }

    const updatedUser = (await db.select().from(users).where(eq(users.id, user.id)).limit(1))[0]!
    const authToken = generateToken({ userId: updatedUser.id, orgId: updatedUser.orgId!, role: updatedUser.role as any, status: updatedUser.status })
    res.json({ message: 'Email verified successfully', token: authToken, user: await serializeUser(updatedUser) })
  } catch (err) { next(withContext(err as Error, 'verifyEmail')) }
}

export async function resendVerification(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = resendVerificationSchema.parse(req.body)
    const user = (await db.select().from(users).where(eq(users.email, email)).limit(1))[0]
    if (!user) throw new AppError('User not found', 404)
    if (user.isVerified) throw new AppError('Email is already verified', 400)

    const token = generateAppToken()
    await db.insert(emailVerificationTokens).values({ userId: user.id, token, expiresAt: getFutureIso(24) })
    await sendVerificationEmail(user.email, token)
    res.json({ message: 'Verification email sent' })
  } catch (err) { next(withContext(err as Error, 'resendVerification')) }
}

export async function getOnboardingStatus(req: Request, res: Response) {
  const user = (await db.select().from(users).where(eq(users.id, req.user!.userId)).limit(1))[0]
  if (!user || user.role !== 'founder') return res.status(404).json({ error: 'Founder not found' })
  const application = await getFounderApplicationByUserId(user.id)
  const organization = user.orgId ? (await db.select().from(organizations).where(eq(organizations.id, user.orgId)).limit(1))[0] : null
  res.json({ user: await serializeUser(user), application, organization })
}

export async function completeFounderOnboarding(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (await db.select().from(users).where(eq(users.id, req.user!.userId)).limit(1))[0]
    if (!user || user.role !== 'founder') throw new AppError('Founder not found', 404)
    if (!user.orgId) throw new AppError('Organization not found', 400)
    if (!user.isVerified) throw new AppError('Email verification is required first', 403)

    const application = await getFounderApplicationByUserId(user.id)
    if (!application) throw new AppError('Founder application not found', 404)

    const data = founderOnboardingSchema.parse(req.body)
    const parsedCertificate = req.file ? await parseCertificateOfIncorporation(req.file.path, req.file.originalname) : null

    const legalCompanyName = (parsedCertificate?.legalCompanyName as string | undefined) || data.legalCompanyName || application.legalCompanyName || data.organizationName
    const country = (parsedCertificate?.country as string | undefined) || data.country || application.country || 'US'
    const stateOrJurisdiction = (parsedCertificate?.stateOrJurisdiction as string | undefined) || data.stateOrJurisdiction || application.stateOrJurisdiction || 'Delaware'
    const registrationNumber = (parsedCertificate?.registrationNumber as string | undefined) || data.registrationNumber || application.registrationNumber || 'Pending verification'
    const incorporationDate = (parsedCertificate?.incorporationDate as string | undefined) || data.incorporationDate || application.incorporationDate || new Date().toISOString().slice(0, 10)
    const entityType = (parsedCertificate?.entityType as string | undefined) || data.entityType

    await db.update(organizations).set({
      name: data.organizationName,
      legalName: legalCompanyName,
      registrationNumber,
      incorporationCountry: country,
      incorporationState: stateOrJurisdiction,
      incorporationDate,
    }).where(eq(organizations.id, user.orgId))

    await db.update(founderApplications).set({
      organizationName: data.organizationName,
      brandName: data.brandName,
      entityType,
      legalCompanyName,
      registrationNumber,
      country,
      stateOrJurisdiction,
      incorporationDate,
      certificateFileName: req.file?.originalname || application.certificateFileName,
      certificateStorageUrl: req.file ? `/uploads/${req.file.filename}` : application.certificateStorageUrl,
      parsedCertificateData: parsedCertificate,
      onboardingCompletedAt: new Date().toISOString(),
    }).where(eq(founderApplications.id, application.id))

    await db.update(users).set({ status: 'pending_admin_review' }).where(eq(users.id, user.id))

    // Automatically instantiate the primary mapped entity based on the onboarding inputs
    const mappedType = (entityType === 'LLC' || entityType === 'S-Corp' || entityType === 'Pvt-Ltd') ? entityType : 'C-Corp'
    await db.insert(entities).values({
      orgId: user.orgId,
      legalName: legalCompanyName,
      entityType: mappedType,
      stateOfIncorporation: stateOrJurisdiction,
      country: country,
    })

    res.json({ message: 'Onboarding completed. Your account is now pending admin verification.' })
  } catch (err) { next(withContext(err as Error, 'completeFounderOnboarding')) }
}

export async function getInvite(req: Request, res: Response) {
  const invite = (await db.select().from(invites).where(eq(invites.token, req.params.token as string)).limit(1))[0]
  if (!invite) return res.status(404).json({ error: 'Invite not found' })
  if (invite.status !== 'pending') return res.status(400).json({ error: 'Invite is no longer active' })
  if (isExpired(invite.expiresAt)) return res.status(400).json({ error: 'Invite has expired' })

  const org = (await db.select().from(organizations).where(eq(organizations.id, invite.organizationId)).limit(1))[0]
  res.json({ email: invite.email, role: invite.role, organizationName: org?.name || 'Organization' })
}

export async function acceptInvite(req: Request, res: Response, next: NextFunction) {
  try {
    const data = acceptInviteSchema.parse(req.body)
    const invite = (await db.select().from(invites).where(eq(invites.token, data.token)).limit(1))[0]
    if (!invite) throw new AppError('Invite not found', 404)
    if (invite.status !== 'pending') throw new AppError('Invite is no longer active', 400)
    if (isExpired(invite.expiresAt)) {
      await db.update(invites).set({ status: 'expired' }).where(eq(invites.id, invite.id))
      throw new AppError('Invite has expired', 400)
    }

    const existing = (await db.select().from(users).where(eq(users.email, invite.email)).limit(1))[0]
    if (existing) throw new AppError('An account already exists for this email', 409)

    const passwordHash = await bcrypt.hash(data.password, 10)
    const [user] = await db.insert(users).values({
      orgId: invite.organizationId,
      email: invite.email,
      passwordHash,
      name: data.name,
      role: invite.role,
      status: 'active',
      isVerified: true,
      invitedByUserId: invite.invitedByUserId,
    }).returning()

    // Only team members get granular permissions; CPAs use system-level access
    if (invite.role === 'team_member') {
      await db.insert(permissions).values({
        userId: user.id,
        organizationId: invite.organizationId,
        templateId: invite.templateId || null,
        permissions: invite.permissions || EMPTY_PERMISSIONS,
        createdByUserId: invite.invitedByUserId,
      })
    }

    await db.update(invites).set({ status: 'accepted', acceptedAt: new Date().toISOString() }).where(eq(invites.id, invite.id))

    // Generate auth token so the user is logged in immediately after setup
    const authToken = generateToken({ userId: user.id, orgId: user.orgId!, role: user.role as any, status: user.status })
    res.status(201).json({ message: 'Invite accepted. Your account is active.', token: authToken, user: await serializeUser(user) })
  } catch (err) { next(withContext(err as Error, 'acceptInvite')) }
}

export async function bootstrapAdminProfile() {
  const existingAdmin = (await db.select().from(users).where(eq(users.role, 'admin')).limit(1))[0]
  if (existingAdmin) return existingAdmin

  const [adminOrg] = await db.insert(organizations).values({ name: 'TaxOS Admin', legalName: 'TaxOS Admin' }).returning()
  const [admin] = await db.insert(users).values({
    orgId: adminOrg.id,
    email: 'admin@taxos.ai',
    passwordHash: bcrypt.hashSync('admin1234', 10),
    name: 'System Admin',
    role: 'admin',
    status: 'active',
    isVerified: true,
  }).returning()

  await db.insert(roleTemplates).values([
    {
      name: 'Manager',
      scope: 'global',
      organizationId: null,
      createdByUserId: admin.id,
      permissions: { ...FOUNDER_PERMISSIONS, canCreateAccounts: false, canManageOrganization: false, canApproveFilings: false },
      isSystemTemplate: true,
    },
    {
      name: 'Accountant',
      scope: 'global',
      organizationId: null,
      createdByUserId: admin.id,
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
      isSystemTemplate: true,
    },
    {
      name: 'Viewer',
      scope: 'global',
      organizationId: null,
      createdByUserId: admin.id,
      permissions: EMPTY_PERMISSIONS,
      isSystemTemplate: true,
    },
  ])

  return admin
}
