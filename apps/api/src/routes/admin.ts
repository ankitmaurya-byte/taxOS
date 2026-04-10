import { Router } from 'express'
import {
  assignCpaOrganization,
  createCpa,
  createTemplate,
  listCpas,
  listFounderApplications,
  listTemplates,
  reviewFounderApplication,
  updateTemplate,
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
router.post('/cpas/:id/assign-org', assignCpaOrganization)
router.get('/role-templates', listTemplates)
router.post('/role-templates', createTemplate)
router.put('/role-templates/:id', updateTemplate)

export default router
