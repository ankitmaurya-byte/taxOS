import { Router } from 'express'
import {
  assignCpaOrganization,
  createCpa,
  listCpas,
  listFounderApplications,
  listOrganizationOverview,
  reviewFounderApplication,
} from '../controllers/admin.controller'
import { authMiddleware, requireActiveAccount, requireRole } from '../middleware/auth'

const router: Router = Router()

router.use(authMiddleware)
router.use(requireActiveAccount)
router.use(requireRole('admin'))

router.get('/founder-applications', listFounderApplications)
router.post('/founder-applications/:id/review', reviewFounderApplication)
router.post('/cpas', createCpa)
router.get('/cpas', listCpas)
router.get('/organizations-overview', listOrganizationOverview)
router.post('/cpas/:id/assign-org', assignCpaOrganization)

export default router
