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
  sendInviteEmail,
  sendVerificationEmail,
} from '../lib/mailer'
import { generateAppToken, getFutureIso, isExpired } from '../lib/tokens'
import { parseCertificateOfIncorporation } from '../lib/certificateParser'

function getFounderApplicationByUserId(userId: string) {
  return db.select().from(founderApplications).where(eq(founderApplications.userId, userId)).get()
}

function serializeUser(user: typeof users.$inferSelect) {
  const founderApplication = user.role === 'founder' ? getFounderApplicationByUserId(user.id) : null
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    orgId: user.orgId,
    status: user.status,
    isVerified: user.isVerified,
    permissions: getEffectivePermissionsForUser(user.id) || EMPTY_PERMISSIONS,
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
    console.log(req.body)
    const data = founderRegistrationSchema.parse(req.body)
    
    const existingUser = db.select().from(users).where(eq(users.email, data.email)).get()
    if (existingUser) return res.status(409).json({ error: 'Email already registered' })

    const existingApplication = db.select().from(founderApplications).where(eq(founderApplications.email, data.email)).get()
    if (existingApplication) return res.status(409).json({ error: 'A founder registration already exists for this email' })

    const passwordHash = await bcrypt.hash(data.password, 10)
    const organization = db.insert(organizations).values({
      name: data.organizationName,
      legalName: data.organizationName,
    }).returning().get()

    const user = db.insert(users).values({
      orgId: organization.id,
      email: data.email,
      passwordHash,
      name: data.name,
      role: 'founder',
      status: 'pending_email_verification',
      isVerified: false,
    }).returning().get()

    db.insert(founderApplications).values({
      userId: user.id,
      organizationId: organization.id,
      email: data.email,
      passwordHash,
      name: data.name,
      organizationName: data.organizationName,
      legalCompanyName: data.organizationName,
      status: 'pending',
    }).run()

    const token = generateAppToken()
    db.insert(emailVerificationTokens).values({
      userId: user.id,
      token,
      expiresAt: getFutureIso(24),
    }).run()

    await sendVerificationEmail(user.email, token)
    await sendFounderApplicationReceivedEmail(user.email, user.name)
    res.status(201).json({ message: 'Verification email sent', email: user.email })
  } catch (err) { next(err) }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const data = loginSchema.parse(req.body)
    const user = db.select().from(users).where(eq(users.email, data.email)).get()
    if (!user) return res.status(401).json({ error: 'Invalid credentials' })

    const valid = await bcrypt.compare(data.password, user.passwordHash)
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' })

    if (!user.isVerified || user.status === 'pending_email_verification') {
      return res.status(403).json({ error: 'Please verify your email before signing in' })
    }
    if (user.status === 'rejected' || user.status === 'suspended') {
      return res.status(403).json({ error: 'Your account is not active' })
    }
    if (!user.orgId) {
      return res.status(403).json({ error: 'Account is not assigned to an organization' })
    }

    db.update(users).set({ lastLoginAt: new Date().toISOString() }).where(eq(users.id, user.id)).run()
    const token = generateToken({ userId: user.id, orgId: user.orgId, role: user.role as any, status: user.status })
    res.json({ token, user: serializeUser(user) })
  } catch (err) { next(err) }
}

export function getMe(req: Request, res: Response) {
  const user = db.select().from(users).where(eq(users.id, req.user!.userId)).get()
  if (!user) return res.status(404).json({ error: 'User not found' })
  res.json(serializeUser(user))
}

export async function verifyEmail(req: Request, res: Response, next: NextFunction) {
  try {
    const { token } = verifyEmailSchema.parse(req.body)
    const record = db.select().from(emailVerificationTokens).where(eq(emailVerificationTokens.token, token)).get()
    if (!record) return res.status(404).json({ error: 'Verification link not found' })
    if (record.usedAt) return res.status(400).json({ error: 'Verification link already used' })
    if (isExpired(record.expiresAt)) return res.status(400).json({ error: 'Verification link has expired' })
    if (!record.userId) return res.status(400).json({ error: 'Verification link is invalid' })

    const user = db.select().from(users).where(eq(users.id, record.userId)).get()
    if (!user) return res.status(404).json({ error: 'User not found' })

    const nextStatus = user.role === 'founder' ? 'pending_onboarding' : 'active'
    const now = new Date().toISOString()

    db.update(emailVerificationTokens).set({ usedAt: now }).where(eq(emailVerificationTokens.id, record.id)).run()
    db.update(users).set({ isVerified: true, status: nextStatus }).where(eq(users.id, record.userId)).run()

    if (user.role === 'founder') {
      db.update(founderApplications).set({ emailVerifiedAt: now }).where(eq(founderApplications.userId, user.id)).run()
    }

    const updatedUser = db.select().from(users).where(eq(users.id, user.id)).get()!
    const authToken = generateToken({ userId: updatedUser.id, orgId: updatedUser.orgId!, role: updatedUser.role as any, status: updatedUser.status })
    res.json({ message: 'Email verified successfully', token: authToken, user: serializeUser(updatedUser) })
  } catch (err) { next(err) }
}

export async function resendVerification(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = resendVerificationSchema.parse(req.body)
    const user = db.select().from(users).where(eq(users.email, email)).get()
    if (!user) return res.status(404).json({ error: 'User not found' })
    if (user.isVerified) return res.status(400).json({ error: 'Email is already verified' })

    const token = generateAppToken()
    db.insert(emailVerificationTokens).values({ userId: user.id, token, expiresAt: getFutureIso(24) }).run()
    await sendVerificationEmail(user.email, token)
    res.json({ message: 'Verification email sent' })
  } catch (err) { next(err) }
}

export function getOnboardingStatus(req: Request, res: Response) {
  const user = db.select().from(users).where(eq(users.id, req.user!.userId)).get()
  if (!user || user.role !== 'founder') return res.status(404).json({ error: 'Founder not found' })
  const application = getFounderApplicationByUserId(user.id)
  const organization = user.orgId ? db.select().from(organizations).where(eq(organizations.id, user.orgId)).get() : null
  res.json({ user: serializeUser(user), application, organization })
}

export async function completeFounderOnboarding(req: Request, res: Response, next: NextFunction) {
  try {
    const user = db.select().from(users).where(eq(users.id, req.user!.userId)).get()
    if (!user || user.role !== 'founder') return res.status(404).json({ error: 'Founder not found' })
    if (!user.orgId) return res.status(400).json({ error: 'Organization not found' })
    if (!user.isVerified) return res.status(403).json({ error: 'Email verification is required first' })

    const application = getFounderApplicationByUserId(user.id)
    if (!application) return res.status(404).json({ error: 'Founder application not found' })

    const data = founderOnboardingSchema.parse(req.body)
    const parsedCertificate = req.file ? await parseCertificateOfIncorporation(req.file.path, req.file.originalname) : null

    const legalCompanyName = (parsedCertificate?.legalCompanyName as string | undefined) || data.legalCompanyName || application.legalCompanyName || data.organizationName
    const country = (parsedCertificate?.country as string | undefined) || data.country || application.country || 'US'
    const stateOrJurisdiction = (parsedCertificate?.stateOrJurisdiction as string | undefined) || data.stateOrJurisdiction || application.stateOrJurisdiction || 'Delaware'
    const registrationNumber = (parsedCertificate?.registrationNumber as string | undefined) || data.registrationNumber || application.registrationNumber || 'Pending verification'
    const incorporationDate = (parsedCertificate?.incorporationDate as string | undefined) || data.incorporationDate || application.incorporationDate || new Date().toISOString().slice(0, 10)
    const entityType = (parsedCertificate?.entityType as string | undefined) || data.entityType

    db.update(organizations).set({
      name: data.organizationName,
      legalName: legalCompanyName,
      registrationNumber,
      incorporationCountry: country,
      incorporationState: stateOrJurisdiction,
      incorporationDate,
    }).where(eq(organizations.id, user.orgId)).run()

    db.update(founderApplications).set({
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
    }).where(eq(founderApplications.id, application.id)).run()

    db.update(users).set({ status: 'pending_admin_review' }).where(eq(users.id, user.id)).run()
    res.json({ message: 'Onboarding completed. Your account is now pending admin verification.' })
  } catch (err) { next(err) }
}

export function getInvite(req: Request, res: Response) {
  const invite = db.select().from(invites).where(eq(invites.token, req.params.token as string)).get()
  if (!invite) return res.status(404).json({ error: 'Invite not found' })
  if (invite.status !== 'pending') return res.status(400).json({ error: 'Invite is no longer active' })
  if (isExpired(invite.expiresAt)) return res.status(400).json({ error: 'Invite has expired' })

  const org = db.select().from(organizations).where(eq(organizations.id, invite.organizationId)).get()
  res.json({ email: invite.email, role: invite.role, organizationName: org?.name || 'Organization' })
}

export async function acceptInvite(req: Request, res: Response, next: NextFunction) {
  try {
    const data = acceptInviteSchema.parse(req.body)
    const invite = db.select().from(invites).where(eq(invites.token, data.token)).get()
    if (!invite) return res.status(404).json({ error: 'Invite not found' })
    if (invite.status !== 'pending') return res.status(400).json({ error: 'Invite is no longer active' })
    if (isExpired(invite.expiresAt)) {
      db.update(invites).set({ status: 'expired' }).where(eq(invites.id, invite.id)).run()
      return res.status(400).json({ error: 'Invite has expired' })
    }

    const existing = db.select().from(users).where(eq(users.email, invite.email)).get()
    if (existing) return res.status(409).json({ error: 'An account already exists for this email' })

    const passwordHash = await bcrypt.hash(data.password, 10)
    const user = db.insert(users).values({
      orgId: invite.organizationId,
      email: invite.email,
      passwordHash,
      name: data.name,
      role: invite.role,
      status: 'pending_email_verification',
      isVerified: false,
      invitedByUserId: invite.invitedByUserId,
    }).returning().get()

    db.insert(permissions).values({
      userId: user.id,
      organizationId: invite.organizationId,
      templateId: invite.templateId || null,
      permissions: invite.permissions || EMPTY_PERMISSIONS,
      createdByUserId: invite.invitedByUserId,
    }).run()

    db.update(invites).set({ status: 'accepted', acceptedAt: new Date().toISOString() }).where(eq(invites.id, invite.id)).run()

    const verificationToken = generateAppToken()
    db.insert(emailVerificationTokens).values({
      userId: user.id,
      inviteId: invite.id,
      token: verificationToken,
      expiresAt: getFutureIso(24),
    }).run()

    await sendInviteEmail(user.email, verificationToken, db.select().from(organizations).where(eq(organizations.id, invite.organizationId)).get()?.name || 'your organization')
    await sendVerificationEmail(user.email, verificationToken)
    res.status(201).json({ message: 'Invite accepted. Please verify your email to activate your account.' })
  } catch (err) { next(err) }
}

export function bootstrapAdminProfile() {
  const existingAdmin = db.select().from(users).where(eq(users.role, 'admin')).get()
  if (existingAdmin) return existingAdmin

  const adminOrg = db.insert(organizations).values({ name: 'TaxOS Admin', legalName: 'TaxOS Admin' }).returning().get()
  const admin = db.insert(users).values({
    orgId: adminOrg.id,
    email: 'admin@taxos.ai',
    passwordHash: bcrypt.hashSync('admin1234', 10),
    name: 'System Admin',
    role: 'admin',
    status: 'active',
    isVerified: true,
  }).returning().get()

  db.insert(roleTemplates).values([
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
  ]).run()

  return admin
}
