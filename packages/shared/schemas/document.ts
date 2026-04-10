// Used in: API controllers via shared/index.ts. Defines document upload and metadata schemas.
import { z } from 'zod'

export const uploadDocumentSchema = z.object({
  filingId: z.string().uuid().optional(),
})

export const documentSchema = z.object({
  id: z.string().uuid(),
  filingId: z.string().uuid().nullable(),
  orgId: z.string().uuid(),
  fileName: z.string(),
  storageUrl: z.string(),
  mimeType: z.string(),
  extractedData: z.record(z.unknown()).nullable(),
  aiTags: z.array(z.string()),
  confidenceScore: z.number().min(0).max(1).nullable(),
  reviewedByHuman: z.boolean(),
  uploadedById: z.string().uuid(),
  createdAt: z.string(),
})

export type Document = z.infer<typeof documentSchema>
