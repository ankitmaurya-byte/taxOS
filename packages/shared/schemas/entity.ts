// Used in: API controllers (entities.controller.ts) via shared/index.ts. Defines entity validation schemas and types.
import { z } from 'zod'

export const entityTypes = ['C-Corp', 'LLC', 'S-Corp', 'Pvt-Ltd'] as const
export const entityStatuses = ['active', 'inactive', 'dissolved'] as const

export const createEntitySchema = z.object({
  legalName: z.string().min(1, 'Legal name is required'),
  entityType: z.enum(entityTypes),
  stateOfIncorporation: z.string().min(2, 'State is required'),
  ein: z.string().regex(/^\d{2}-\d{7}$/, 'EIN must be in XX-XXXXXXX format').optional(),
  fiscalYearEnd: z.string().regex(/^\d{2}-\d{2}$/, 'Must be MM-DD format').default('12-31'),
  foreignSubsidiaries: z.array(z.string()).default([]),
  country: z.string().default('US'),
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
