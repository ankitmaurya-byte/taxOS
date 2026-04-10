/**
 * Auth Routes
 *
 * Mounts at: /api/auth (see index.ts)
 * Controller: controllers/auth.controller.ts
 */

import { Router } from 'express'
import { authMiddleware } from '../middleware/auth'
import { upload } from '../middleware/upload'
import {
  acceptInvite,
  completeFounderOnboarding,
  getInvite,
  getMe,
  getOnboardingStatus,
  login,
  registerFounder,
  resendVerification,
  verifyEmail,
} from '../controllers/auth.controller'

const router: Router = Router()

router.post('/register-founder', registerFounder)
router.post('/login', login)
router.get('/me', authMiddleware, getMe)
router.post('/verify-email', verifyEmail)
router.post('/resend-verification', resendVerification)
router.get('/onboarding-status', authMiddleware, getOnboardingStatus)
router.post('/complete-founder-onboarding', authMiddleware, upload.single('certificate'), completeFounderOnboarding)
router.get('/invite/:token', getInvite)
router.post('/accept-invite', acceptInvite)

export default router
