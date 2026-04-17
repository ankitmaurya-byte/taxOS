/**
 * AI Chat Routes — mounts at /api/ai-chats
 * Per-user persistence for the Inkle AI panel conversations.
 */

import { Router } from 'express'
import { authMiddleware, requireActiveAccount } from '../middleware/auth'
import {
  listAiChats,
  createAiChat,
  getAiChat,
  updateAiChat,
  deleteAiChat,
} from '../controllers/aiChat.controller'

const router: Router = Router()
router.use(authMiddleware)
router.use(requireActiveAccount)

router.get('/', listAiChats)
router.post('/', createAiChat)
router.get('/:id', getAiChat)
router.patch('/:id', updateAiChat)
router.delete('/:id', deleteAiChat)

export default router
