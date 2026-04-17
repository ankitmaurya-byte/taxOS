import { z } from 'zod'

const confidence = z.number().min(0).max(1)
const riskScore = z.number().int().min(0).max(100)

const optionalString = (fallback = '') =>
  z.string().optional().transform((v) => v ?? fallback)

const optionalArray = <T extends z.ZodTypeAny>(schema: T) =>
  z.array(schema).optional().transform((v) => v ?? [])

const optionalRecord = <V extends z.ZodTypeAny>(value: V) =>
  z.record(value).optional().transform((v) => v ?? {})

// ─── Document extraction ─────────────────────────────
export const DocumentFieldSchema = z.object({
  value: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
  confidence: confidence.optional(),
})

export const DocumentExtractionSchema = z.object({
  documentType: z.string(),
  taxYear: z.number().optional(),
  fields: optionalRecord(DocumentFieldSchema),
  overallConfidence: confidence,
  flaggedIssues: optionalArray(z.string()),
  reasoning: optionalString(),
})
export type DocumentExtraction = z.output<typeof DocumentExtractionSchema>

// ─── Document context ────────────────────────────────
export const DocumentContextSchema = z.object({
  rawText: optionalString(),
  summary: optionalString(),
  keyEntities: optionalArray(z.string()),
  metadata: z.record(z.unknown()).optional().transform((v) => v ?? {}),
})
export type DocumentContext = z.output<typeof DocumentContextSchema>

// ─── Prefill ─────────────────────────────────────────
export const PrefillFieldSchema = z.object({
  value: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
  confidence: confidence.optional(),
  source: z.string().optional(),
  reasoning: z.string().optional(),
  needsCpaReview: z.boolean().optional(),
})

export const PrefillSchema = z.object({
  fields: optionalRecord(PrefillFieldSchema),
  overallConfidence: confidence,
  summary: optionalString(),
  reasoning: optionalString(),
})
export type PrefillResult = z.output<typeof PrefillSchema>

// ─── Audit risk ──────────────────────────────────────
export const AuditRiskSchema = z.object({
  overallRiskScore: riskScore,
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']),
  flaggedItems: optionalArray(
    z.object({
      lineItem: z.string(),
      issue: z.string(),
      severity: z.enum(['low', 'medium', 'high']),
      recommendation: z.string(),
    }),
  ),
  reasoning: optionalString(),
})
export type AuditRiskResult = z.output<typeof AuditRiskSchema>

// ─── Tax Q&A metadata ────────────────────────────────
export const TaxQaMetadataSchema = z.object({
  confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']).optional().transform((v) => v ?? 'MEDIUM'),
  requiresCpaReview: z.boolean().optional().transform((v) => v ?? false),
  cpaEscalationReason: z.string().optional(),
  sources: optionalArray(z.string()),
})
export type TaxQaMetadata = z.output<typeof TaxQaMetadataSchema>
