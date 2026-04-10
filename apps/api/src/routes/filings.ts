/**
 * Filings Routes
 *
 * Mounts at: /api/filings (see index.ts)
 * Controller: controllers/filings.controller.ts
 * Auth: all endpoints require authMiddleware (JWT)
 */

import { Router } from 'express'
import { authMiddleware, requireActiveAccount, requirePermission, requireRole } from '../middleware/auth'
import {
  listFilings,
  createFiling,
  getFiling,
  updateFilingStatus,
  approveFiling,
  claimFilingReview,
  rejectFiling,
  releaseFilingReview,
  pauseFiling,
  escalateToCpa,
} from '../controllers/filings.controller'

const router: Router = Router()
router.use(authMiddleware)
router.use(requireActiveAccount)

router.get('/', requirePermission('canViewFilings'), listFilings)
router.post('/', requirePermission('canEditFilings'), createFiling)
router.get('/:id', requirePermission('canViewFilings'), getFiling)
router.post('/:id/claim-review', requireRole('cpa'), claimFilingReview)
router.post('/:id/release-review', requireRole('cpa'), releaseFilingReview)
router.put('/:id/status', requirePermission('canEditFilings'), updateFilingStatus)
router.post('/:id/approve', requireRole('admin', 'founder'), requirePermission('canApproveFilings'), approveFiling)
router.post('/:id/reject', requireRole('admin', 'founder'), requirePermission('canEditFilings'), rejectFiling)
router.post('/:id/pause', requireRole('admin', 'founder'), requirePermission('canEditFilings'), pauseFiling)
router.post('/:id/escalate-cpa', requireRole('admin', 'founder'), requirePermission('canEditFilings'), escalateToCpa)

export default router
