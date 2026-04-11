// Used in: API controllers (entities.controller.ts) via shared/index.ts. Defines entity validation schemas and types.
import { z } from 'zod'

export const entityTypes = ['C-Corp', 'LLC', 'S-Corp', 'Pvt-Ltd'] as const
export const entityStatuses = ['active', 'inactive', 'dissolved'] as const

const directorSchema = z.object({
  name: z.string(),
  dateAppointed: z.string().optional(),
  status: z.string().optional(),
})

const officerSchema = z.object({
  name: z.string(),
  role: z.string().optional(),
  dateAppointed: z.string().optional(),
  authorisedSignatory: z.boolean().optional(),
  status: z.string().optional(),
})

const shareholderSchema = z.object({
  name: z.string(),
  ownership: z.string().optional(),
  tin: z.string().optional(),
  country: z.string().optional(),
  address: z.string().optional(),
})

const capTableEntrySchema = z.object({
  date: z.string().optional(),
  note: z.string().optional(),
  fileName: z.string().optional(),
})

const sensitiveDataSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
})

export const createEntitySchema = z.object({
  legalName: z.string().min(1, 'Legal name is required'),
  entityType: z.enum(entityTypes),
  stateOfIncorporation: z.string().min(2, 'State is required'),
  ein: z.string().regex(/^\d{2}-\d{7}$/, 'EIN must be in XX-XXXXXXX format').optional(),
  majorBusinessActivity: z.string().nullable().optional(),
  fiscalYearEnd: z.string().regex(/^\d{2}-\d{2}$/, 'Must be MM-DD format').default('12-31'),
  foreignSubsidiaries: z.array(z.string()).default([]),
  country: z.string().default('US'),
  directors: z.array(directorSchema).default([]),
  officers: z.array(officerSchema).default([]),
  shareholders: z.array(shareholderSchema).default([]),
  capTable: z.array(capTableEntrySchema).default([]),
  sensitiveData: z.array(sensitiveDataSchema).default([]),
})

export const updateEntitySchema = createEntitySchema.partial().extend({
  status: z.enum(entityStatuses).optional(),
})

export const entitySchema = createEntitySchema.extend({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  status: z.enum(entityStatuses),
  createdAt: z.string(),
})

export type CreateEntity = z.infer<typeof createEntitySchema>
export type UpdateEntity = z.infer<typeof updateEntitySchema>
export type Entity = z.infer<typeof entitySchema>
