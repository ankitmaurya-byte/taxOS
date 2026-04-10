/**
 * Agents Routes
 *
 * Mounts at: /api/agents (see index.ts)
 * Controller: controllers/agents.controller.ts
 * Auth: all endpoints require authMiddleware (JWT)
 *
 * SSE endpoints (intake/message, tax-qa/ask) return Content-Type: text/event-stream
 */

import { Router } from 'express'
import { authMiddleware, requireActiveAccount, requirePermission } from '../middleware/auth'
import {
  startIntake,
  streamIntakeMsg,
  runDeadlines,
  extractDocument,
  runPrefill,
  runAuditRisk,
  streamTaxQa,
} from '../controllers/agents.controller'

const router: Router = Router()
router.use(authMiddleware)
router.use(requireActiveAccount)

router.post('/intake/start', requirePermission('canEditFilings'), startIntake)
router.post('/intake/message', requirePermission('canEditFilings'), streamIntakeMsg)
router.post('/deadline/run', requirePermission('canEditFilings'), runDeadlines)
router.post('/document/extract', requirePermission('canEditDocuments'), extractDocument)
router.post('/prefill/run', requirePermission('canEditFilings'), runPrefill)
router.post('/audit-risk/run', requirePermission('canEditFilings'), runAuditRisk)
router.post('/tax-qa/ask', streamTaxQa)           // POST /api/agents/tax-qa/ask      → agents.controller.streamTaxQa (SSE)

export default router
