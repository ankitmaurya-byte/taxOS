/**
 * Audit Routes
 *
 * Mounts at: /api/audit (see index.ts)
 * Controller: controllers/audit.controller.ts
 * Auth: all endpoints require authMiddleware (JWT)
 */

import { Router } from 'express'
import { authMiddleware, requireActiveAccount, requireRole } from '../middleware/auth'
import { listAuditLogs, exportAuditCsv } from '../controllers/audit.controller'

const router: Router = Router()
router.use(authMiddleware)
router.use(requireActiveAccount)
router.use(requireRole('admin', 'founder', 'cpa'))

router.get('/', listAuditLogs)       // GET /api/audit        → audit.controller.listAuditLogs
router.get('/export', exportAuditCsv) // GET /api/audit/export → audit.controller.exportAuditCsv

export default router
