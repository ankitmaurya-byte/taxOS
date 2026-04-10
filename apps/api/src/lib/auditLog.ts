import { db } from '../db'
import { auditLog } from '../db/schema'

interface AuditLogParams {
  orgId: string
  filingId?: string | null
  actorType: 'ai' | 'cpa' | 'founder' | 'system'
  actorId: string
  action: string
  reasoning?: string
  inputs?: Record<string, unknown>
  outputs?: Record<string, unknown>
  modelVersion?: string
  confidenceScore?: number
}

export const auditLogger = {
  log(params: AuditLogParams) {
    return db.insert(auditLog).values({
      orgId: params.orgId,
      filingId: params.filingId ?? null,
      actorType: params.actorType,
      actorId: params.actorId,
      action: params.action,
      reasoning: params.reasoning ?? null,
      inputs: params.inputs ?? null,
      outputs: params.outputs ?? null,
      modelVersion: params.modelVersion ?? null,
      confidenceScore: params.confidenceScore ?? null,
    }).run()
  },
}
