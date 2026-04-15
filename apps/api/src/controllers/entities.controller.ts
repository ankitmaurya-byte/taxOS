/**
 * Entities Controller
 *
 * CRUD operations for business entities (C-Corp, LLC, S-Corp, Pvt-Ltd).
 * Auto-calculates tax deadlines on entity creation.
 *
 * Declared in : controllers/entities.controller.ts
 * Used in     : routes/entities.ts
 * API Prefix  : /api/entities
 *
 * Functions:
 *   listEntities   → GET    /api/entities        (list all org entities)
 *                     Frontend: api.getEntities() → pages/EntitiesOverview.tsx, pages/Entities.tsx
 *   createEntity   → POST   /api/entities        (create + auto-calc deadlines)
 *                     Frontend: api.createEntity() → pages/Entities.tsx (form submit)
 *   getEntity      → GET    /api/entities/:id    (single entity by ID)
 *                     Frontend: api.getEntity() → (available, not currently called by a page)
 *   updateEntity   → PUT    /api/entities/:id    (partial update)
 *                     Frontend: api.updateEntity() → (available, not currently called by a page)
 *   deleteEntity   → DELETE /api/entities/:id    (soft delete → status='dissolved')
 *                     Frontend: (no api function wired yet)
 *
 * All endpoints require auth (authMiddleware applied at router level).
 *
 * Connected tables:
 *   - entities (db/schema.ts)       → main CRUD target
 *   - deadlines (db/schema.ts)      → auto-created via deadlineEngine on POST
 *   - auditLog (via auditLogger)    → logs entity_created action
 *
 * Dependencies:
 *   - createEntitySchema, updateEntitySchema → from shared package (Zod validation)
 *   - getApplicableDeadlines()              → from lib/deadlineEngine.ts
 *   - calculateUrgencyScore()               → from lib/deadlineEngine.ts
 *   - auditLogger.log()                     → from lib/auditLog.ts
 */

import { Request, Response, NextFunction } from 'express'
import { eq, and, desc } from 'drizzle-orm'
import { db } from '../db'
import { entities, deadlines, filings } from '../db/schema'
import { createEntitySchema, updateEntitySchema, estimatedTaxProjectionSchema } from 'shared'
import { getApplicableDeadlines, calculateUrgencyScore } from '../lib/deadlineEngine'
import { auditLogger } from '../lib/auditLog'
import { AppError, withContext } from '../lib/errors'

const ENTITY_TAX_RATES: Record<string, number> = {
  'C-Corp': 0.21,
  'LLC': 0.24,
  'S-Corp': 0.24,
  'Pvt-Ltd': 0.25,
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100
}

function getQuarterDueDates(taxYear: number) {
  return [
    { quarter: 'Q1', dueDate: `${taxYear}-04-15` },
    { quarter: 'Q2', dueDate: `${taxYear}-06-15` },
    { quarter: 'Q3', dueDate: `${taxYear}-09-15` },
    { quarter: 'Q4', dueDate: `${taxYear + 1}-01-15` },
  ]
}

function getQuarterStatus(dueDate: string) {
  const today = new Date().toISOString().slice(0, 10)
  if (dueDate < today) return 'overdue' as const
  return 'upcoming' as const
}

// ─── GET /api/entities ───────────────────────────────
// Returns all entities belonging to the authenticated user's organization.
// Scoped by: req.user.orgId → entities.orgId
// Frontend caller: api.getEntities() in lib/api.ts → pages/EntitiesOverview.tsx, pages/Entities.tsx
export function listEntities(req: Request, res: Response) {
  const result = db.select().from(entities)
    .where(eq(entities.orgId, req.user!.orgId))
    .orderBy(desc(entities.createdAt))
    .all()
  res.json(result)
}

// ─── POST /api/entities ──────────────────────────────
// Creates a new entity and auto-calculates applicable tax deadlines.
//
// Flow:
//   1. Validate body with createEntitySchema (shared/schemas/entity.ts)
//   2. Insert into entities table with orgId from auth context
//   3. Call getApplicableDeadlines() (lib/deadlineEngine.ts) based on entityType + state
//   4. Insert each deadline into deadlines table linked via entityId
//   5. Log 'entity_created' to auditLog via auditLogger (lib/auditLog.ts)
//
// Connected fields:
//   entities.orgId       ← req.user.orgId (from JWT)
//   deadlines.entityId   ← newly created entity.id
//   auditLog.actorId     ← req.user.userId
// Frontend caller: api.createEntity() in lib/api.ts → pages/Entities.tsx (form submit mutation)
export async function createEntity(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createEntitySchema.parse(req.body)
    const majorBusinessActivity = data.majorBusinessActivity ?? undefined
    const entity = db.insert(entities).values({
      ...data,
      orgId: req.user!.orgId,
      majorBusinessActivity,
      foreignSubsidiaries: data.foreignSubsidiaries as any,
    }).returning().get()

    // Auto-calculate deadlines based on entity type and state
    const applicableDeadlines = getApplicableDeadlines(
      entity.entityType,
      new Date().getFullYear(),
      entity.stateOfIncorporation,
    )

    for (const dl of applicableDeadlines) {
      db.insert(deadlines).values({
        entityId: entity.id,
        formType: dl.formType,
        formName: dl.formName,
        dueDate: dl.dueDate,
        urgencyScore: calculateUrgencyScore(dl.dueDate),
        description: dl.description,
        aiPredicted: true,
      }).run()
    }

    auditLogger.log({
      orgId: req.user!.orgId,
      actorType: 'system',
      actorId: req.user!.userId,
      action: 'entity_created',
      reasoning: `Entity "${entity.legalName}" created with ${applicableDeadlines.length} auto-calculated deadlines`,
      outputs: { entityId: entity.id, deadlineCount: applicableDeadlines.length },
    })

    res.status(201).json(entity)
  } catch (err) { next(withContext(err as Error, 'createEntity')) }
}

// ─── GET /api/entities/:id ───────────────────────────
// Returns a single entity by ID, scoped to the user's org (admin bypasses scope).
export function getEntity(req: Request, res: Response) {
  const entity = req.user!.role === 'admin'
    ? db.select().from(entities).where(eq(entities.id, req.params.id as string)).get()
    : db.select().from(entities).where(and(eq(entities.id, req.params.id as string), eq(entities.orgId, req.user!.orgId))).get()
  if (!entity) return res.status(404).json({ error: 'Entity not found' })
  res.json(entity)
}

// ─── GET /api/entities/:id/estimated-tax ─────────────────
// Returns a projected annual tax amount and quarterly schedule for one entity.
// Data source priority:
//   1. Form 1120 filingData.totalTax
//   2. Form 7004 filingData.estimatedTax
//   3. filingData.taxableIncome × entity tax rate
//   4. fallback formula from open filing count × entity tax rate
export function getEstimatedTaxProjection(req: Request, res: Response) {
  const entity = db.select().from(entities)
    .where(and(eq(entities.id, req.params.id as string), eq(entities.orgId, req.user!.orgId)))
    .get()

  if (!entity) return res.status(404).json({ error: 'Entity not found' })

  const requestedTaxYear = Number(req.query.taxYear)
  const taxYear = Number.isFinite(requestedTaxYear) && requestedTaxYear > 2000
    ? requestedTaxYear
    : new Date().getFullYear()

  const entityFilings = db.select().from(filings)
    .where(and(eq(filings.entityId, entity.id), eq(filings.orgId, req.user!.orgId)))
    .all()
    .filter((filing) => filing.taxYear == null || filing.taxYear === taxYear)

  const filing1120 = entityFilings.find((filing) => filing.formType === '1120')
  const filing7004 = entityFilings.find((filing) => filing.formType === '7004')
  const filingData1120 = (filing1120?.filingData || {}) as Record<string, unknown>
  const filingData7004 = (filing7004?.filingData || {}) as Record<string, unknown>
  const taxableIncome = typeof filingData1120.taxableIncome === 'number' ? filingData1120.taxableIncome : null
  const totalTax = typeof filingData1120.totalTax === 'number' ? filingData1120.totalTax : null
  const estimatedTax = typeof filingData7004.estimatedTax === 'number' ? filingData7004.estimatedTax : null
  const effectiveTaxRate = ENTITY_TAX_RATES[entity.entityType] || 0.21

  let annualProjectedTax = 0
  let basis: '1120_total_tax' | '7004_estimated_tax' | 'taxable_income_formula' | 'default_formula' = 'default_formula'
  let supportingFilingId: string | null = null

  if (typeof totalTax === 'number' && totalTax > 0) {
    annualProjectedTax = totalTax
    basis = '1120_total_tax'
    supportingFilingId = filing1120?.id || null
  } else if (typeof estimatedTax === 'number' && estimatedTax > 0) {
    annualProjectedTax = estimatedTax
    basis = '7004_estimated_tax'
    supportingFilingId = filing7004?.id || null
  } else if (typeof taxableIncome === 'number' && taxableIncome > 0) {
    annualProjectedTax = taxableIncome * effectiveTaxRate
    basis = 'taxable_income_formula'
    supportingFilingId = filing1120?.id || null
  } else {
    const openFilingCount = entityFilings.filter((filing) => !['submitted', 'archived'].includes(filing.status)).length
    annualProjectedTax = Math.max(openFilingCount, 1) * 12000 * effectiveTaxRate
  }

  const roundedAnnualProjectedTax = roundCurrency(annualProjectedTax)
  const quarterlyAmount = roundCurrency(roundedAnnualProjectedTax / 4)
  const quarterlyPayments = getQuarterDueDates(taxYear).map(({ quarter, dueDate }, index) => {
    const amount = index === 3
      ? roundCurrency(roundedAnnualProjectedTax - quarterlyAmount * 3)
      : quarterlyAmount

    return {
      quarter,
      dueDate,
      amount,
      status: getQuarterStatus(dueDate),
    }
  })

  const projection = estimatedTaxProjectionSchema.parse({
    entityId: entity.id,
    taxYear,
    annualProjectedTax: roundedAnnualProjectedTax,
    taxableIncome,
    effectiveTaxRate: roundCurrency(effectiveTaxRate),
    basis,
    supportingFilingId,
    quarterlyPayments,
  })

  res.json(projection)
}

// ─── PUT /api/entities/:id ───────────────────────────
// Partial update of an existing entity.
// Validates body with updateEntitySchema (shared/schemas/entity.ts).
// Connected fields: req.params.id as string → entities.id
export async function updateEntity(req: Request, res: Response, next: NextFunction) {
  try {
    const data = updateEntitySchema.parse(req.body)
    const existing = req.user!.role === 'admin'
      ? db.select().from(entities).where(eq(entities.id, req.params.id as string)).get()
      : db.select().from(entities).where(and(eq(entities.id, req.params.id as string), eq(entities.orgId, req.user!.orgId))).get()
    if (!existing) return res.status(404).json({ error: 'Entity not found' })

    const majorBusinessActivity = data.majorBusinessActivity ?? undefined
    const updated = db.update(entities)
      .set({ ...data, majorBusinessActivity, foreignSubsidiaries: data.foreignSubsidiaries as any })
      .where(eq(entities.id, req.params.id as string))
      .returning().get()
    res.json(updated)
  } catch (err) { next(withContext(err as Error, 'updateEntity')) }
}

// ─── DELETE /api/entities/:id ────────────────────────
// Soft delete: sets entities.status = 'dissolved' (does NOT remove the row).
// Connected fields: req.params.id as string → entities.id
export function deleteEntity(req: Request, res: Response) {
  const existing = req.user!.role === 'admin'
    ? db.select().from(entities).where(eq(entities.id, req.params.id as string)).get()
    : db.select().from(entities).where(and(eq(entities.id, req.params.id as string), eq(entities.orgId, req.user!.orgId))).get()
  if (!existing) return res.status(404).json({ error: 'Entity not found' })

  db.update(entities).set({ status: 'dissolved' }).where(eq(entities.id, req.params.id as string)).run()
  res.json({ message: 'Entity dissolved' })
}
