/**
 * Approvals Routes
 *
 * Mounts at: /api/approvals (see index.ts)
 * Controller: controllers/approvals.controller.ts
 * Auth: all endpoints require authMiddleware (JWT)
 */

import { Router } from 'express'
import { authMiddleware, requireActiveAccount, requirePermission, requireRole } from '../middleware/auth'
import {
  listApprovals,
  resolveApproval,
  escalateApproval,
} from '../controllers/approvals.controller'

const router: Router = Router()
router.use(authMiddleware)
router.use(requireActiveAccount)

router.get('/', requirePermission('canApproveFilings'), listApprovals)
router.post('/:id/resolve', requirePermission('canApproveFilings'), resolveApproval)
router.post('/:id/escalate', requireRole('admin', 'founder'), requirePermission('canApproveFilings'), escalateApproval)

export default router
