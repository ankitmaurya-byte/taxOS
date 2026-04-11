import { Router } from 'express'
import {
  assignCpaOrganization,
  createCpa,
  listCpas,
  listOrganizationOverview,
  reviewFounderApplication,
  listSystemUsers,
  createOrganization,
  getOrganizationDetails,
  updateOrganization,
  toggleSuspendOrganization,
  createAnyUser,
  getUserDetails,
  updateUser,
  deleteUser,
  listAllEntities,
  listAllFilings,
  listFounderApplications,
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

// System Users
router.get('/system-users', listSystemUsers)
router.post('/users', createAnyUser)
router.get('/users/:id', getUserDetails)
router.put('/users/:id', updateUser)
router.delete('/users/:id', deleteUser)

// Enhanced Organizations
router.post('/organizations', createOrganization)
router.get('/organizations/:id', getOrganizationDetails)
router.put('/organizations/:id', updateOrganization)
router.delete('/organizations/:id', toggleSuspendOrganization)

// Global Discovery
router.get('/global-entities', listAllEntities)
router.get('/global-filings', listAllFilings)

export default router
