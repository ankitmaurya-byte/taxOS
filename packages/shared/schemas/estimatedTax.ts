import { z } from 'zod'

export const estimatedTaxQuarterSchema = z.object({
  quarter: z.string(),
  dueDate: z.string(),
  amount: z.number(),
  status: z.enum(['paid', 'upcoming', 'overdue']),
})

export const estimatedTaxProjectionSchema = z.object({
  entityId: z.string().uuid(),
  taxYear: z.number().int(),
  annualProjectedTax: z.number(),
  taxableIncome: z.number().nullable(),
  effectiveTaxRate: z.number(),
  basis: z.enum(['1120_total_tax', '7004_estimated_tax', 'taxable_income_formula', 'default_formula']),
  supportingFilingId: z.string().uuid().nullable(),
  quarterlyPayments: z.array(estimatedTaxQuarterSchema),
})

export type EstimatedTaxQuarter = z.infer<typeof estimatedTaxQuarterSchema>
export type EstimatedTaxProjection = z.infer<typeof estimatedTaxProjectionSchema>
