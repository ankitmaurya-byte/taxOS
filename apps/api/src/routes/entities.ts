/**
 * Entities Routes
 *
 * Mounts at: /api/entities (see index.ts)
 * Controller: controllers/entities.controller.ts
 * Auth: all endpoints require authMiddleware (JWT)
 */

import { Router } from 'express'
import { authMiddleware, requireActiveAccount, requireRole, requirePermission } from '../middleware/auth'
import {
  listEntities,
  createEntity,
  getEntity,
  getEstimatedTaxProjection,
  updateEntity,
  deleteEntity,
} from '../controllers/entities.controller'

const router: Router = Router()
router.use(authMiddleware)
router.use(requireActiveAccount)

// Read routes — accessible to founder, team_member, and CPA with canViewFilings
router.get('/', requirePermission('canViewFilings'), listEntities)
router.get('/:id', requirePermission('canViewFilings'), getEntity)
router.get('/:id/estimated-tax', requirePermission('canViewFilings'), getEstimatedTaxProjection)

// Write routes — founder or admin
router.post('/', requireRole('founder', 'admin'), createEntity)
router.put('/:id', requireRole('founder', 'admin'), updateEntity)
router.delete('/:id', requireRole('founder', 'admin'), deleteEntity)

export default router
