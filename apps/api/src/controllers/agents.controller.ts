/**
 * Agents Controller
 *
 * Thin orchestration layer over the agents in src/agents/.
 * HITL gating lives inside the agents themselves (prefill, auditRisk, document)
 * — this controller only validates input, routes to the agent, and pipes output.
 *
 * Streaming endpoints use the shared `pumpSSE` helper from agents/lib/sse.ts,
 * which expects an AsyncGenerator<SsePayload> ({type:'text'|'metadata'|'error'}).
 */

import { Request, Response, NextFunction } from 'express'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import { filings, entities, documents, approvalQueue } from '../db/schema'
import { IntakeAgent } from '../agents/intake'
import { DeadlineAgent } from '../agents/deadline'
import { DocumentAgent } from '../agents/document'
import { PrefillAgent } from '../agents/prefill'
import { AuditRiskAgent } from '../agents/auditRisk'
import { TaxQaAgent } from '../agents/taxQa'
import { pumpSSE } from '../agents/lib/sse'
import { AppError, withContext } from '../lib/errors'

// ─── Helpers ─────────────────────────────────────────
function assertAgentAllowed(filing: { status: string }, agentName: string, allowedStatuses: string[]) {
  if (!allowedStatuses.includes(filing.status)) {
    throw new AppError(
      `Cannot run ${agentName} on a filing in '${filing.status}' status. Allowed: ${allowedStatuses.join(', ')}`,
      400,
    )
  }
}

function requireBody<T extends string>(req: Request, keys: T[]): Record<T, string> {
  const out = {} as Record<T, string>
  for (const key of keys) {
    const value = req.body?.[key]
    if (typeof value !== 'string' || value.length === 0) {
      throw new AppError(`${key} is required`, 400)
    }
    out[key] = value
  }
  return out
}

// ─── Agent singletons ────────────────────────────────
const intakeAgent = new IntakeAgent()
const deadlineAgent = new DeadlineAgent()
const documentAgent = new DocumentAgent()
const prefillAgent = new PrefillAgent()
const auditRiskAgent = new AuditRiskAgent()
const taxQaAgent = new TaxQaAgent()

// ─── POST /api/agents/intake/start ───────────────────
export async function startIntake(req: Request, res: Response, next: NextFunction) {
  try {
    const { filingId } = requireBody(req, ['filingId'])
    const filing = db.select().from(filings).where(eq(filings.id, filingId)).get()
    if (!filing) throw new AppError('Filing not found', 404)
    assertAgentAllowed(filing, 'intake agent', ['intake', 'ai_prep'])

    const entity = db.select().from(entities).where(eq(entities.id, filing.entityId)).get()

    const result = await intakeAgent.startConversation(
      filingId,
      filing.formType,
      entity || {},
      req.user!.orgId,
    )
    res.json(result)
  } catch (err) { next(withContext(err as Error, 'startIntake')) }
}

// ─── POST /api/agents/intake/message ─────────────────
export async function streamIntakeMsg(req: Request, res: Response, next: NextFunction) {
  try {
    const { filingId, message } = requireBody(req, ['filingId', 'message'])

    const filing = db.select().from(filings).where(eq(filings.id, filingId)).get()
    if (!filing) return res.status(404).json({ error: 'Filing not found' })

    await pumpSSE(res, intakeAgent.streamMessage(filingId, message, req.user!.orgId))
  } catch (err) { next(withContext(err as Error, 'streamIntakeMsg')) }
}

// ─── POST /api/agents/deadline/run ───────────────────
export async function runDeadlines(req: Request, res: Response, next: NextFunction) {
  try {
    const { entityId } = requireBody(req, ['entityId'])
    await deadlineAgent.calculateDeadlines(entityId, req.user!.orgId)
    res.json({ message: 'Deadlines recalculated' })
  } catch (err) { next(withContext(err as Error, 'runDeadlines')) }
}

// ─── POST /api/agents/document/extract ───────────────
// HITL: if confidence < 0.75, create a CPA queue item pointing at the filing (if any).
export async function extractDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const { documentId } = requireBody(req, ['documentId'])
    const doc = db.select().from(documents).where(eq(documents.id, documentId)).get()
    if (!doc) throw new AppError('Document not found', 404)
    if (!doc.storageUrl || doc.uploadStatus !== 'uploaded') {
      throw new AppError(
        'Original file is not available on the server. Upload it again to run extraction.',
        409,
      )
    }

    const { fetchFromCloudinary } = await import('../lib/cloudinary')
    const buffer = await fetchFromCloudinary(doc.storageUrl)
    const result = await documentAgent.extract(documentId, req.user!.orgId, {
      buffer,
      mimeType: doc.mimeType,
      fileName: doc.fileName,
    })

    if (result.overallConfidence < 0.75) {
      const doc = db.select().from(documents).where(eq(documents.id, documentId)).get()
      if (doc?.filingId) {
        const existing = db.select().from(approvalQueue)
          .where(eq(approvalQueue.filingId, doc.filingId))
          .all()
          .find(q => q.queueType === 'cpa' && q.status === 'pending')
        if (!existing) {
          db.insert(approvalQueue).values({
            orgId: req.user!.orgId,
            filingId: doc.filingId,
            queueType: 'cpa',
            status: 'pending',
            summary: `Document "${doc.fileName}" extracted at ${(result.overallConfidence * 100).toFixed(0)}% confidence. CPA review required.`,
            aiRecommendation: result.flaggedIssues.join('; ') || null,
          }).run()
        }
      }
    }

    res.json(result)
  } catch (err) { next(withContext(err as Error, 'extractDocument')) }
}

// ─── POST /api/agents/prefill/run ────────────────────
// HITL gating (low-confidence → CPA queue) lives inside the agent.
export async function runPrefill(req: Request, res: Response, next: NextFunction) {
  try {
    const { filingId } = requireBody(req, ['filingId'])
    const filing = db.select().from(filings).where(eq(filings.id, filingId)).get()
    if (!filing) throw new AppError('Filing not found', 404)
    assertAgentAllowed(filing, 'prefill agent', ['intake', 'ai_prep'])

    const result = await prefillAgent.prefillForm(filingId, req.user!.orgId)
    res.json(result)
  } catch (err) { next(withContext(err as Error, 'runPrefill')) }
}

// ─── POST /api/agents/audit-risk/run ─────────────────
// HITL gating (risk>60 → mandatory CPA queue + status halt) lives inside the agent.
export async function runAuditRisk(req: Request, res: Response, next: NextFunction) {
  try {
    const { filingId } = requireBody(req, ['filingId'])
    const filing = db.select().from(filings).where(eq(filings.id, filingId)).get()
    if (!filing) throw new AppError('Filing not found', 404)
    assertAgentAllowed(filing, 'audit risk agent', ['intake', 'ai_prep', 'cpa_review', 'founder_approval'])

    const result = await auditRiskAgent.scoreRisk(filingId, req.user!.orgId)
    res.json(result)
  } catch (err) { next(withContext(err as Error, 'runAuditRisk')) }
}

// ─── POST /api/agents/tax-qa/ask ─────────────────────
export async function streamTaxQa(req: Request, res: Response, next: NextFunction) {
  try {
    const { question } = requireBody(req, ['question'])
    await pumpSSE(res, taxQaAgent.streamAnswer(req.user!.orgId, question))
  } catch (err) { next(withContext(err as Error, 'streamTaxQa')) }
}
