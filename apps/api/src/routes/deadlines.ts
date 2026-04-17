/**
 * Deadlines Routes — mounts at /api/deadlines
 */

import { Router } from 'express'
import { authMiddleware, requireActiveAccount, requirePermission } from '../middleware/auth'
import {
  listDeadlines,
  getDeadline,
  markDeadlineComplete,
  skipDeadline,
  extendDeadline,
  snoozeDeadline,
  reopenDeadline,
} from '../controllers/deadlines.controller'

const router: Router = Router()
router.use(authMiddleware)
router.use(requireActiveAccount)

router.get('/', requirePermission('canViewFilings'), listDeadlines)
router.get('/:id', requirePermission('canViewFilings'), getDeadline)

router.post('/:id/complete', requirePermission('canEditFilings'), markDeadlineComplete)
router.post('/:id/skip', requirePermission('canEditFilings'), skipDeadline)
router.post('/:id/extend', requirePermission('canEditFilings'), extendDeadline)
router.post('/:id/snooze', requirePermission('canEditFilings'), snoozeDeadline)
router.post('/:id/reopen', requirePermission('canEditFilings'), reopenDeadline)

export default router
