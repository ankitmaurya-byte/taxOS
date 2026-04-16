/**
 * Agents Controller
 *
 * Orchestrates AI agent interactions: intake conversations, deadline calculation,
 * document extraction, form prefilling, audit risk scoring, and tax Q&A.
 *
 * Declared in : controllers/agents.controller.ts
 * Used in     : routes/agents.ts
 * API Prefix  : /api/agents
 *
 * Functions:
 *   startIntake       → POST /api/agents/intake/start      (begin intake interview)
 *                        Frontend: api.startIntake() → (available, not currently called by a page)
 *   streamIntakeMsg   → POST /api/agents/intake/message     (SSE stream response)
 *                        Frontend: api.streamIntakeMessage() → pages/FilingDetail.tsx, pages/FilingRoom.tsx (chat input)
 *   runDeadlines      → POST /api/agents/deadline/run       (recalculate deadlines)
 *                        Frontend: api.runDeadlines() → (available, not currently called by a page)
 *   extractDocument   → POST /api/agents/document/extract   (AI extract from doc)
 *                        Frontend: api.extractDocument() → pages/DocumentVault.tsx (extract mutation)
 *   runPrefill        → POST /api/agents/prefill/run        (AI prefill form fields)
 *                        Frontend: api.runPrefill() → (available, not currently called by a page)
 *   runAuditRisk      → POST /api/agents/audit-risk/run     (score filing risk)
 *                        Frontend: api.runAuditRisk() → (available, not currently called by a page)
 *   streamTaxQa       → POST /api/agents/tax-qa/ask         (SSE stream answer)
 *                        Frontend: api.streamTaxQa() → pages/Chat.tsx, pages/AIAdvisor.tsx (chat input)
 *
 * Agent classes (declared in agents/ folder, each extends BaseAgent from agents/base.ts):
 *   - IntakeAgent     (agents/intake.ts)    → conversational intake, uses Gemini chat
 *   - DeadlineAgent   (agents/deadline.ts)  → deadline calculation engine (no AI call)
 *   - DocumentAgent   (agents/document.ts)  → vision-based extraction via Gemini
 *   - PrefillAgent    (agents/prefill.ts)   → form field prefill via Gemini
 *   - AuditRiskAgent  (agents/auditRisk.ts) → risk scoring via Gemini
 *   - TaxQaAgent      (agents/taxQa.ts)     → streaming Q&A via Gemini
 *
 * Streaming endpoints use Server-Sent Events (SSE):
 *   Content-Type: text/event-stream
 *   Format: data: {"text":"chunk"}\n\n ... data: [DONE]\n\n
 *
 * Connected tables:
 *   - filings              → looked up by filingId for intake/prefill/risk
 *   - entities             → looked up for intake context
 *   - agentConversations   → created/updated by IntakeAgent
 *   - documents            → read by DocumentAgent for extraction
 *   - approvalQueue        → created by PrefillAgent/AuditRiskAgent when confidence is low
 *   - auditLog             → logged by each agent via BaseAgent.log()
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
import { AppError, withContext } from '../lib/errors'

// ─── Helpers ─────────────────────────────────────────
// Validates that a filing is in an appropriate status for agent operations.
// Agents should not run on submitted or archived filings.
function assertAgentAllowed(filing: { status: string }, agentName: string, allowedStatuses: string[]) {
  if (!allowedStatuses.includes(filing.status)) {
    throw new AppError(
      `Cannot run ${agentName} on a filing in '${filing.status}' status. Allowed: ${allowedStatuses.join(', ')}`,
      400,
    )
  }
}

// ─── Agent Singletons ────────────────────────────────
// Instantiated once at module load. Each extends BaseAgent (agents/base.ts)
// which holds the GoogleGenerativeAI client and model version (gemini-2.0-flash).
const intakeAgent = new IntakeAgent()
const deadlineAgent = new DeadlineAgent()
const documentAgent = new DocumentAgent()
const prefillAgent = new PrefillAgent()
const auditRiskAgent = new AuditRiskAgent()
const taxQaAgent = new TaxQaAgent()

// ─── POST /api/agents/intake/start ───────────────────
// Starts a new intake conversation for a filing.
// Uses IntakeAgent.startConversation() which:
//   1. Sends initial prompt to Gemini with entity context + required fields
//   2. Creates an agentConversations row (status='active', agentType='intake')
//   3. Updates filing status to 'ai_prep'
//   4. Logs 'intake_started' to auditLog
//
// Connected fields:
//   req.body.filingId → filings.id → entities.id (for context)
//   New agentConversations row ← filingId, orgId
export async function startIntake(req: Request, res: Response, next: NextFunction) {
  try {
    const { filingId } = req.body
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
// Frontend caller: api.streamIntakeMessage() → pages/FilingDetail.tsx, FilingRoom.tsx (chat send)
// Streams an AI response to a user message in an intake conversation.
// Uses IntakeAgent.streamMessage() which is an AsyncGenerator yielding text chunks.
// Response format: Server-Sent Events (SSE).
//
// Connected fields:
//   req.body.filingId → agentConversations.filingId (finds active conversation)
//   req.body.message  → appended to conversation messages[]
//   If response contains 'INTAKE_COMPLETE:' → conversation.status='completed'
export async function streamIntakeMsg(req: Request, res: Response, next: NextFunction) {
  try {
    const { filingId, message } = req.body
    if (!filingId || !message) {
      return res.status(400).json({ error: 'filingId and message are required' })
    }

    const filing = db.select().from(filings).where(eq(filings.id, filingId)).get()
    if (!filing) {
      return res.status(404).json({ error: 'Filing not found' })
    }

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    try {
      for await (const chunk of intakeAgent.streamMessage(filingId, message, req.user!.orgId)) {
        res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`)
      }
      res.write('data: [DONE]\n\n')
    } catch (streamErr) {
      const errMsg = streamErr instanceof Error ? streamErr.message : 'Unknown streaming error'
      res.write(`data: ${JSON.stringify({ error: errMsg })}\n\n`)
      res.write('data: [DONE]\n\n')
    }
    res.end()
  } catch (err) { next(withContext(err as Error, 'streamIntakeMsg')) }
}

// ─── POST /api/agents/deadline/run ───────────────────
// Recalculates deadlines for an entity using DeadlineAgent.calculateDeadlines().
// Note: DeadlineAgent does NOT call Gemini — it uses the deadlineEngine library.
//
// Connected fields:
//   req.body.entityId → entities.id → deadlines are recalculated for this entity
export async function runDeadlines(req: Request, res: Response, next: NextFunction) {
  try {
    const { entityId } = req.body
    await deadlineAgent.calculateDeadlines(entityId, req.user!.orgId)
    res.json({ message: 'Deadlines recalculated' })
  } catch (err) { next(withContext(err as Error, 'runDeadlines')) }
}

// ─── POST /api/agents/document/extract ───────────────
// Frontend caller: api.extractDocument() → pages/DocumentVault.tsx (extract mutation)
// Extracts structured data from a document using DocumentAgent.extract().
// Uses Gemini vision API for PDFs and images (base64-encoded).
//
// Connected fields:
//   req.body.documentId → documents.id
//   documents.extractedData ← AI-extracted JSON
//   documents.aiTags        ← document type tags
//   documents.confidenceScore ← extraction confidence
//   If confidence < 0.75 → controller creates approvalQueue item (queueType='cpa')
export async function extractDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const { documentId } = req.body
    const result = await documentAgent.extract(documentId, req.user!.orgId)

    // Low confidence → flag for CPA review (controller decides, not agent)
    if (result.overallConfidence < 0.75) {
      const doc = db.select().from(documents).where(eq(documents.id, documentId)).get()
      if (doc?.filingId) {
        db.insert(approvalQueue).values({
          orgId: req.user!.orgId,
          filingId: doc.filingId,
          queueType: 'cpa',
          status: 'pending',
          summary: `Document "${doc.fileName}" extracted with low confidence (${Math.round(result.overallConfidence * 100)}%). CPA review required.`,
          aiRecommendation: `Flagged issues: ${(result.flaggedIssues || []).join(', ')}`,
        }).run()
      }
    }

    res.json(result)
  } catch (err) { next(withContext(err as Error, 'extractDocument')) }
}

// ─── POST /api/agents/prefill/run ────────────────────
// AI-prefills form fields using PrefillAgent.prefillForm().
// Gathers data from entity, intake conversations, and extracted documents,
// then asks Gemini to fill in form fields with confidence scores.
//
// Connected fields:
//   req.body.filingId → filings.id
//   filings.filingData         ← prefilled field values
//   filings.aiConfidenceScore  ← overall confidence
//   filings.aiSummary          ← 3-sentence summary
//   filings.aiReasoning        ← approach explanation
//   filings.status             ← set to 'cpa_review'
//   If confidence < 0.8 → creates approvalQueue item (queueType='cpa')
export async function runPrefill(req: Request, res: Response, next: NextFunction) {
  try {
    const { filingId } = req.body
    const filing = db.select().from(filings).where(eq(filings.id, filingId)).get()
    if (!filing) throw new AppError('Filing not found', 404)
    assertAgentAllowed(filing, 'prefill agent', ['intake', 'ai_prep'])

    const result = await prefillAgent.prefillForm(filingId, req.user!.orgId)
    res.json(result)
  } catch (err) { next(withContext(err as Error, 'runPrefill')) }
}

// ─── POST /api/agents/audit-risk/run ─────────────────
// Scores a filing's audit risk using AuditRiskAgent.scoreRisk().
// Returns a 0–100 risk score with flagged items.
//
// Connected fields:
//   req.body.filingId → filings.id → entities.id (for entity profile)
//   If riskScore > 60 → creates MANDATORY approvalQueue item (queueType='cpa')
export async function runAuditRisk(req: Request, res: Response, next: NextFunction) {
  try {
    const { filingId } = req.body
    const filing = db.select().from(filings).where(eq(filings.id, filingId)).get()
    if (!filing) throw new AppError('Filing not found', 404)
    assertAgentAllowed(filing, 'audit risk agent', ['intake', 'ai_prep', 'cpa_review', 'founder_approval'])

    const result = await auditRiskAgent.scoreRisk(filingId, req.user!.orgId)
    res.json(result)
  } catch (err) { next(withContext(err as Error, 'runAuditRisk')) }
}

// ─── POST /api/agents/tax-qa/ask ─────────────────────
// Frontend caller: api.streamTaxQa() → pages/Chat.tsx, AIAdvisor.tsx (chat send)
// Streams an AI answer to a tax question using TaxQaAgent.streamAnswer().
// Response format: Server-Sent Events (SSE).
// The AI provides confidence levels (HIGH/MEDIUM/LOW) and IRS source citations.
//
// Connected fields:
//   req.body.question → sent to Gemini with org's entity + filing context
//   If requiresCpaReview=true in response → front-end shows escalation option
export async function streamTaxQa(req: Request, res: Response, next: NextFunction) {
  try {
    const { question } = req.body

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    for await (const chunk of taxQaAgent.streamAnswer(req.user!.orgId, question)) {
      res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`)
    }
    res.write('data: [DONE]\n\n')
    res.end()
  } catch (err) { next(withContext(err as Error, 'streamTaxQa')) }
}
