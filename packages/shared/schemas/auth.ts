import { z } from 'zod'
import { permissionsSchema } from './rbac'

export const founderRegistrationSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  organizationName: z.string().min(1),
})

export const founderOnboardingSchema = z.object({
  entityType: z.string().min(1),
  brandName: z.string().min(1),
  organizationName: z.string().min(1),
  legalCompanyName: z.string().optional(),
  registrationNumber: z.string().optional(),
  country: z.string().optional(),
  stateOrJurisdiction: z.string().optional(),
  incorporationDate: z.string().optional(),
})

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const verifyEmailSchema = z.object({
  token: z.string().min(1),
})

export const resendVerificationSchema = z.object({
  email: z.string().email(),
})

export const founderApplicationReviewSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  reviewNotes: z.string().optional(),
})

export const acceptInviteSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(6),
  name: z.string().min(1),
})

export const authUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: z.string(),
  orgId: z.string().nullable(),
  status: z.string(),
  isVerified: z.boolean(),
  permissions: permissionsSchema.optional(),
})
