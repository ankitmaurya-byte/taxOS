// Used in: API controllers (filings.controller.ts, approvals.controller.ts), FilingRoom.tsx, CommandCenter.tsx via shared/index.ts
import { z } from 'zod'

export const filingStatuses = ['intake', 'ai_prep', 'cpa_review', 'founder_approval', 'submitted', 'archived'] as const
export type FilingStatus = (typeof filingStatuses)[number]

export const createFilingSchema = z.object({
  entityId: z.string().uuid(),
  formType: z.string().min(1),
  formName: z.string().min(1),
  deadlineId: z.string().uuid().optional(),
  taxYear: z.number().int().min(2000).max(2100).optional(),
})

export const updateFilingStatusSchema = z.object({
  status: z.enum(filingStatuses),
})

export const filingSchema = createFilingSchema.extend({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  status: z.enum(filingStatuses),
  aiConfidenceScore: z.number().min(0).max(1).nullable(),
  cpaAssignedId: z.string().uuid().nullable(),
  filingData: z.record(z.unknown()).default({}),
  aiSummary: z.string().nullable(),
  aiReasoning: z.string().nullable(),
  founderApprovedAt: z.string().nullable(),
  submittedAt: z.string().nullable(),
  taxYear: z.number().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const STATUS_COLORS = {
  intake:            { bg: 'bg-gray-100',   text: 'text-gray-700',   label: 'Intake' },
  ai_prep:           { bg: 'bg-blue-100',   text: 'text-blue-700',   label: 'AI Prep' },
  cpa_review:        { bg: 'bg-amber-100',  text: 'text-amber-700',  label: 'CPA Review' },
  founder_approval:  { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Needs Approval' },
  submitted:         { bg: 'bg-green-100',  text: 'text-green-700',  label: 'Submitted' },
  archived:          { bg: 'bg-gray-100',   text: 'text-gray-500',   label: 'Archived' },
} as const

export type CreateFiling = z.infer<typeof createFilingSchema>
export type Filing = z.infer<typeof filingSchema>
