// Used in: API controllers via shared/index.ts. Defines agent, approval, and audit log schemas.
import { z } from 'zod'

export const agentTypes = ['intake', 'deadline', 'document', 'prefill', 'auditRisk', 'taxQa'] as const

export const agentMessageSchema = z.object({
  filingId: z.string().uuid().optional(),
  message: z.string().min(1),
})

export const deadlineRunSchema = z.object({
  entityId: z.string().uuid(),
})

export const documentExtractSchema = z.object({
  documentId: z.string().uuid(),
})

export const prefillRunSchema = z.object({
  filingId: z.string().uuid(),
})

export const auditRiskRunSchema = z.object({
  filingId: z.string().uuid(),
})

export const taxQaSchema = z.object({
  question: z.string().min(1),
})

export const approvalStatuses = ['pending', 'approved', 'rejected', 'escalated'] as const

export const resolveApprovalSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  reason: z.string().optional(),
})

export const auditLogSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  filingId: z.string().uuid().nullable(),
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

export type AgentMessage = z.infer<typeof agentMessageSchema>
export type AuditLogEntry = z.infer<typeof auditLogSchema>
