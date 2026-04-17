/**
 * Filings Routes
 *
 * Mounts at: /api/filings (see index.ts)
 * Controller: controllers/filings.controller.ts
 * Auth: all endpoints require authMiddleware (JWT)
 */

import { Router } from 'express'
import { authMiddleware, requireActiveAccount, requirePermission, requireRole } from '../middleware/auth'
import { upload } from '../middleware/upload'
import {
  listRequirements,
  uploadRequirement,
  importRequirementFromVault,
  skipRequirement,
  unskipRequirement,
  retryRequirementUpload,
  retryRequirementExtract,
  markRequirementViewed,
  markAllRequirementsViewed,
} from '../controllers/filingRequirements.controller'
import {
  listFilings,
  createFiling,
  getFiling,
  updateFilingStatus,
  updateFilingData,
  approveFiling,
  cpaApproveFiling,
  cpaRejectFiling,
  claimFilingReview,
  rejectFiling,
  releaseFilingReview,
  pauseFiling,
  resumeFiling,
  stopFiling,
  escalateToCpa,
  escalateToFounder,
} from '../controllers/filings.controller'

const router: Router = Router()
router.use(authMiddleware)
router.use(requireActiveAccount)

router.get('/', requirePermission('canViewFilings'), listFilings)
router.post('/', requirePermission('canEditFilings'), createFiling)
router.get('/:id', requirePermission('canViewFilings'), getFiling)
router.post('/:id/claim-review', requireRole('cpa'), claimFilingReview)
router.post('/:id/release-review', requireRole('cpa'), releaseFilingReview)
router.post('/:id/cpa-approve', requireRole('cpa'), cpaApproveFiling)
router.post('/:id/cpa-reject', requireRole('cpa'), cpaRejectFiling)
router.put('/:id/status', requirePermission('canEditFilings'), updateFilingStatus)
router.put('/:id/data', requirePermission('canEditFilings'), updateFilingData)
router.post('/:id/approve', requireRole('founder'), requirePermission('canApproveFilings'), approveFiling)
router.post('/:id/reject', requireRole('founder'), requirePermission('canEditFilings'), rejectFiling)
router.post('/:id/pause', requireRole('founder', 'team_member'), requirePermission('canEditFilings'), pauseFiling)
router.post('/:id/resume', requireRole('founder', 'team_member'), requirePermission('canEditFilings'), resumeFiling)
router.post('/:id/stop', requireRole('founder'), requirePermission('canEditFilings'), stopFiling)
router.post('/:id/escalate-cpa', requireRole('founder'), requirePermission('canEditFilings'), escalateToCpa)
router.post('/:id/escalate-founder', requireRole('founder', 'team_member', 'cpa'), requirePermission('canEditFilings'), escalateToFounder)

// ─── Document requirement checklist ───────────────────────────────────────────
router.get('/:id/requirements', requirePermission('canViewFilings'), listRequirements)
router.post('/:id/requirements/mark-all-viewed', requireRole('cpa'), markAllRequirementsViewed)
router.post('/:id/requirements/:slot/upload',
  requireRole('founder', 'team_member'),
  requirePermission('canEditFilings'),
  upload.single('file'),
  uploadRequirement,
)
router.post('/:id/requirements/:slot/import-from-vault',
  requireRole('founder', 'team_member'),
  requirePermission('canEditFilings'),
  importRequirementFromVault,
)
router.post('/:id/requirements/:slot/skip',
  requireRole('founder', 'team_member'),
  requirePermission('canEditFilings'),
  skipRequirement,
)
router.post('/:id/requirements/:slot/unskip',
  requireRole('founder', 'team_member'),
  requirePermission('canEditFilings'),
  unskipRequirement,
)
router.post('/:id/requirements/:slot/retry-upload',
  requireRole('founder', 'team_member'),
  requirePermission('canEditFilings'),
  upload.single('file'),
  retryRequirementUpload,
)
router.post('/:id/requirements/:slot/retry-extract',
  requireRole('founder', 'team_member'),
  requirePermission('canEditFilings'),
  upload.single('file'),
  retryRequirementExtract,
)
router.post('/:id/requirements/:slot/view', requireRole('cpa'), markRequirementViewed)

export default router
