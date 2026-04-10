import { z } from 'zod'
import { permissionsSchema } from './rbac'

export const loginResponseSchema = z.object({
  token: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string().email(),
    name: z.string(),
    role: z.string(),
    orgId: z.string().nullable(),
    status: z.string(),
    isVerified: z.boolean(),
    permissions: permissionsSchema,
    onboardingCompleted: z.boolean().optional(),
    onboardingStep: z.string().optional(),
  }),
})

export const verifyEmailResponseSchema = z.object({
  message: z.string(),
  token: z.string().optional(),
  user: z.object({
    id: z.string(),
    email: z.string().email(),
    name: z.string(),
    role: z.string(),
    orgId: z.string().nullable(),
    status: z.string(),
    isVerified: z.boolean(),
    permissions: permissionsSchema,
  }).optional(),
})

export const resendVerificationResponseSchema = z.object({
  message: z.string(),
})

export const inviteResponseSchema = z.object({
  email: z.string().email(),
  role: z.string(),
  organizationName: z.string(),
})

export const apiOnboardingStatusSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.string().email(),
    name: z.string(),
    role: z.string(),
    orgId: z.string().nullable(),
    status: z.string(),
    isVerified: z.boolean(),
    permissions: permissionsSchema,
  }),
  application: z.object({
    id: z.string(),
    userId: z.string(),
    organizationId: z.string(),
    email: z.string(),
    name: z.string().nullable(),
    organizationName: z.string().nullable(),
    legalCompanyName: z.string().nullable(),
    brandName: z.string().nullable(),
    entityType: z.string().nullable(),
    country: z.string().nullable(),
    stateOrJurisdiction: z.string().nullable(),
    registrationNumber: z.string().nullable(),
    incorporationDate: z.string().nullable(),
    certificateFileName: z.string().nullable(),
    certificateStorageUrl: z.string().nullable(),
    parsedCertificateData: z.record(z.unknown()).nullable(),
    status: z.string(),
    onboardingCompletedAt: z.string().nullable(),
    emailVerifiedAt: z.string().nullable(),
    createdAt: z.string(),
  }).nullable(),
  organization: z.object({
    id: z.string(),
    name: z.string(),
    legalName: z.string().nullable(),
    registrationNumber: z.string().nullable(),
    incorporationCountry: z.string().nullable(),
    incorporationState: z.string().nullable(),
    incorporationDate: z.string().nullable(),
  }).nullable(),
})

export const apiFounderApplicationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  organizationId: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  organizationName: z.string(),
  legalCompanyName: z.string().nullable(),
  brandName: z.string().nullable(),
  entityType: z.string().nullable(),
  country: z.string().nullable(),
  stateOrJurisdiction: z.string().nullable(),
  registrationNumber: z.string().nullable(),
  incorporationDate: z.string().nullable(),
  certificateFileName: z.string().nullable(),
  certificateStorageUrl: z.string().nullable(),
  parsedCertificateData: z.record(z.unknown()).nullable(),
  status: z.enum(['pending', 'approved', 'rejected']),
  reviewNotes: z.string().nullable(),
  reviewedByUserId: z.string().nullable(),
  reviewedAt: z.string().nullable(),
  approvedUserId: z.string().nullable(),
  onboardingCompletedAt: z.string().nullable(),
  emailVerifiedAt: z.string().nullable(),
  createdAt: z.string(),
})

export const apiProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  role: z.string(),
  status: z.string(),
  organization: z.object({
    id: z.string(),
    name: z.string(),
    legalName: z.string().nullable(),
  }).nullable(),
  permissions: z.record(z.boolean()),
  permissionRecord: z.object({
    id: z.string(),
    userId: z.string(),
    templateId: z.string().nullable(),
    permissions: z.record(z.boolean()),
  }).nullable(),
  canCreateAccount: z.boolean(),
})

export const apiMemberSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: z.string(),
  orgId: z.string().nullable(),
  status: z.string(),
  isVerified: z.boolean(),
  permissionRecord: z.object({
    id: z.string(),
    userId: z.string(),
    templateId: z.string().nullable(),
    permissions: z.record(z.boolean()),
  }).nullable(),
})

export const apiTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  scope: z.enum(['global', 'organization']),
  organizationId: z.string().nullable(),
  createdByUserId: z.string(),
  permissions: z.record(z.boolean()),
  isSystemTemplate: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const apiEntitySchema = z.object({
  id: z.string(),
  orgId: z.string(),
  legalName: z.string(),
  entityType: z.string(),
  stateOfIncorporation: z.string(),
  ein: z.string().nullable(),
  fiscalYearEnd: z.string(),
  foreignSubsidiaries: z.array(z.string()),
  country: z.string(),
  status: z.enum(['active', 'inactive', 'dissolved']),
  createdAt: z.string(),
})

export const apiFilingSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  entityId: z.string(),
  formType: z.string(),
  formName: z.string(),
  status: z.enum(['intake', 'ai_prep', 'cpa_review', 'founder_approval', 'submitted', 'archived']),
  aiConfidenceScore: z.number().nullable(),
  cpaAssignedId: z.string().nullable(),
  filingData: z.record(z.unknown()),
  aiSummary: z.string().nullable(),
  aiReasoning: z.string().nullable(),
  founderApprovedAt: z.string().nullable(),
  submittedAt: z.string().nullable(),
  taxYear: z.number().nullable(),
  deadlineId: z.string().nullable(),
  reviewLock: z.object({
    id: z.string(),
    filingId: z.string(),
    cpaUserId: z.string(),
    status: z.enum(['active', 'completed', 'released']),
    releasedAt: z.string().nullable(),
  }).nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const apiFilingDetailSchema = apiFilingSchema.extend({
  conversations: z.array(z.object({
    id: z.string(),
    filingId: z.string(),
    role: z.enum(['user', 'assistant']),
    message: z.string(),
    createdAt: z.string(),
  })),
  documents: z.array(z.object({
    id: z.string(),
    filingId: z.string().nullable(),
    orgId: z.string(),
    fileName: z.string(),
    storageUrl: z.string(),
    mimeType: z.string(),
    extractedData: z.record(z.unknown()).nullable(),
    aiTags: z.array(z.string()),
    confidenceScore: z.number().nullable(),
    reviewedByHuman: z.boolean(),
    uploadedById: z.string(),
    createdAt: z.string(),
  })),
  approvals: z.array(z.object({
    id: z.string(),
    filingId: z.string(),
    orgId: z.string(),
    queueType: z.enum(['founder', 'cpa']),
    status: z.enum(['pending', 'approved', 'rejected', 'escalated']),
    summary: z.string(),
    aiRecommendation: z.string().nullable(),
    rejectionReason: z.string().nullable(),
    resolvedAt: z.string().nullable(),
    resolvedById: z.string().nullable(),
    createdAt: z.string(),
  })),
})

export const apiDocumentSchema = z.object({
  id: z.string(),
  filingId: z.string().nullable(),
  orgId: z.string(),
  fileName: z.string(),
  storageUrl: z.string(),
  mimeType: z.string(),
  extractedData: z.record(z.unknown()).nullable(),
  aiTags: z.array(z.string()),
  confidenceScore: z.number().nullable(),
  reviewedByHuman: z.boolean(),
  uploadedById: z.string(),
  createdAt: z.string(),
})

export const apiApprovalSchema = z.object({
  id: z.string(),
  filingId: z.string(),
  orgId: z.string(),
  queueType: z.enum(['founder', 'cpa']),
  status: z.enum(['pending', 'approved', 'rejected', 'escalated']),
  summary: z.string(),
  aiRecommendation: z.string().nullable(),
  rejectionReason: z.string().nullable(),
  resolvedAt: z.string().nullable(),
  resolvedById: z.string().nullable(),
  createdAt: z.string(),
})

export const apiAuditLogSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  filingId: z.string().nullable(),
  actorType: z.enum(['ai', 'cpa', 'founder', 'system']),
  actorId: z.string().nullable(),
  action: z.string(),
  reasoning: z.string().nullable(),
  inputs: z.record(z.unknown()).nullable(),
  outputs: z.record(z.unknown()).nullable(),
  modelVersion: z.string().nullable(),
  confidenceScore: z.number().nullable(),
  createdAt: z.string(),
})

export const apiCpaSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: z.string(),
  orgId: z.string().nullable(),
  status: z.string(),
  isVerified: z.boolean(),
  assignments: z.array(z.object({
    id: z.string(),
    userId: z.string(),
    organizationId: z.string(),
    createdByUserId: z.string(),
  })),
})

export const apiInviteSchema = z.object({
  id: z.string(),
  email: z.string(),
  role: z.string(),
  organizationId: z.string(),
  invitedByUserId: z.string(),
  templateId: z.string().nullable(),
  permissions: z.record(z.boolean()).nullable(),
  token: z.string(),
  status: z.enum(['pending', 'accepted', 'expired']),
  expiresAt: z.string(),
  acceptedAt: z.string().nullable(),
  createdAt: z.string(),
})

export const apiMessageSchema = z.object({
  message: z.string(),
})

export const apiTemplateRecommendationSchema = z.object({
  recommendedName: z.string(),
  template: apiTemplateSchema.nullable(),
})

export type ApiFounderApplication = {
  id: string
  userId: string
  organizationId: string
  email: string
  name: string | null
  organizationName: string
  legalCompanyName: string | null
  brandName: string | null
  entityType: string | null
  country: string | null
  stateOrJurisdiction: string | null
  registrationNumber: string | null
  incorporationDate: string | null
  certificateFileName: string | null
  certificateStorageUrl: string | null
  parsedCertificateData: Record<string, unknown> | null
  status: 'pending' | 'approved' | 'rejected'
  reviewNotes: string | null
  reviewedByUserId: string | null
  reviewedAt: string | null
  approvedUserId: string | null
  onboardingCompletedAt: string | null
  emailVerifiedAt: string | null
  createdAt: string
}

export type ApiCpa = {
  id: string
  email: string
  name: string
  role: string
  orgId: string | null
  status: string
  isVerified: boolean
  assignments: Array<{
    id: string
    userId: string
    organizationId: string
    createdByUserId: string
  }>
}

export type ApiMember = {
  id: string
  email: string
  name: string
  role: string
  orgId: string | null
  status: string
  isVerified: boolean
  permissionRecord: {
    id: string
    userId: string
    templateId: string | null
    permissions: Record<string, boolean>
  } | null
}

export type ApiTemplate = {
  id: string
  name: string
  scope: 'global' | 'organization'
  organizationId: string | null
  createdByUserId: string
  permissions: Record<string, boolean>
  isSystemTemplate: boolean
  createdAt: string
  updatedAt: string
}

export type ApiFiling = {
  id: string
  orgId: string
  entityId: string
  formType: string
  formName: string
  status: 'intake' | 'ai_prep' | 'cpa_review' | 'founder_approval' | 'submitted' | 'archived'
  aiConfidenceScore: number | null
  cpaAssignedId: string | null
  filingData: Record<string, unknown>
  aiSummary: string | null
  aiReasoning: string | null
  founderApprovedAt: string | null
  submittedAt: string | null
  taxYear: number | null
  deadlineId: string | null
  reviewLock: {
    id: string
    filingId: string
    cpaUserId: string
    status: 'active' | 'completed' | 'released'
    releasedAt: string | null
  } | null
  createdAt: string
  updatedAt: string
}

export type ApiEntity = {
  id: string
  orgId: string
  legalName: string
  entityType: string
  stateOfIncorporation: string
  ein: string | null
  fiscalYearEnd: string
  foreignSubsidiaries: string[]
  country: string
  status: 'active' | 'inactive' | 'dissolved'
  createdAt: string
}

export type ApiDocument = {
  id: string
  filingId: string | null
  orgId: string
  fileName: string
  storageUrl: string
  mimeType: string
  extractedData: Record<string, unknown> | null
  aiTags: string[]
  confidenceScore: number | null
  reviewedByHuman: boolean
  uploadedById: string
  createdAt: string
}

export type ApiApproval = {
  id: string
  filingId: string
  orgId: string
  queueType: 'founder' | 'cpa'
  status: 'pending' | 'approved' | 'rejected' | 'escalated'
  summary: string
  aiRecommendation: string | null
  rejectionReason: string | null
  resolvedAt: string | null
  resolvedById: string | null
  createdAt: string
}

export type ApiAuditLogEntry = {
  id: string
  orgId: string
  filingId: string | null
  actorType: 'ai' | 'cpa' | 'founder' | 'system'
  actorId: string | null
  action: string
  reasoning: string | null
  inputs: Record<string, unknown> | null
  outputs: Record<string, unknown> | null
  modelVersion: string | null
  confidenceScore: number | null
  createdAt: string
}

export type ApiOnboardingStatus = {
  user: {
    id: string
    email: string
    name: string
    role: string
    orgId: string | null
    status: string
    isVerified: boolean
    permissions: Record<string, boolean>
  }
  application: ApiFounderApplication | null
  organization: {
    id: string
    name: string
    legalName: string | null
    registrationNumber: string | null
    incorporationCountry: string | null
    incorporationState: string | null
    incorporationDate: string | null
  } | null
}

export type ApiProfile = {
  id: string
  name: string
  email: string
  role: string
  status: string
  organization: { id: string; name: string; legalName: string | null } | null
  permissions: Record<string, boolean>
  permissionRecord: {
    id: string
    userId: string
    templateId: string | null
    permissions: Record<string, boolean>
  } | null
  canCreateAccount: boolean
}

export type ApiLoginResponse = {
  token: string
  user: {
    id: string
    email: string
    name: string
    role: string
    orgId: string | null
    status: string
    isVerified: boolean
    permissions: Record<string, boolean>
    onboardingCompleted?: boolean
    onboardingStep?: string
  }
}
