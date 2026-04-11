/**
 * Entities Routes
 *
 * Mounts at: /api/entities (see index.ts)
 * Controller: controllers/entities.controller.ts
 * Auth: all endpoints require authMiddleware (JWT)
 */

import { Router } from 'express'
import { authMiddleware, requireActiveAccount, requireRole } from '../middleware/auth'
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
router.use(requireRole('founder'))

router.get('/', listEntities)       // GET    /api/entities      → entities.controller.listEntities
router.post('/', createEntity)      // POST   /api/entities      → entities.controller.createEntity
router.get('/:id', getEntity)       // GET    /api/entities/:id  → entities.controller.getEntity
router.get('/:id/estimated-tax', getEstimatedTaxProjection) // GET /api/entities/:id/estimated-tax → entities.controller.getEstimatedTaxProjection
router.put('/:id', updateEntity)    // PUT    /api/entities/:id  → entities.controller.updateEntity
router.delete('/:id', deleteEntity) // DELETE /api/entities/:id  → entities.controller.deleteEntity

export default router
