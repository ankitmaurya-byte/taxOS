/**
 * Deadlines Routes
 *
 * Mounts at: /api/deadlines (see index.ts)
 * Controller: controllers/deadlines.controller.ts
 * Auth: all endpoints require authMiddleware (JWT)
 */

import { Router } from 'express'
import { authMiddleware, requireActiveAccount, requirePermission } from '../middleware/auth'
import { listDeadlines, getDeadline } from '../controllers/deadlines.controller'

const router: Router = Router()
router.use(authMiddleware)
router.use(requireActiveAccount)

router.get('/', requirePermission('canViewFilings'), listDeadlines)
router.get('/:id', requirePermission('canViewFilings'), getDeadline)

export default router
