/**
 * Chat Routes — mounts at /api/chat
 *
 * Org-level:      GET/POST /api/chat/org/:orgId
 * All-founders:   GET/POST /api/chat/founders
 * CPA-only:       GET/POST /api/chat/cpas
 */

import { Router } from 'express'
import { authMiddleware, requireActiveAccount } from '../middleware/auth'
import {
  getCpaMessages,
  getFounderMessages,
  getOrgMessages,
  postCpaMessage,
  postFounderMessage,
  postOrgMessage,
} from '../controllers/chat.controller'

const router: Router = Router()

router.use(authMiddleware)
router.use(requireActiveAccount)

// Organization chat
router.get('/org/:orgId', getOrgMessages)
router.post('/org/:orgId', postOrgMessage)

// All-founder cross-org chat
router.get('/founders', getFounderMessages)
router.post('/founders', postFounderMessage)

// CPA-only chat
router.get('/cpas', getCpaMessages)
router.post('/cpas', postCpaMessage)

export default router
