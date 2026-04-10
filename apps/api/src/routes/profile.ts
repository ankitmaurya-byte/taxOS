import { Router } from 'express'
import { getProfile } from '../controllers/profile.controller'
import { authMiddleware, requireActiveAccount } from '../middleware/auth'

const router: Router = Router()

router.use(authMiddleware)
router.get('/', requireActiveAccount, getProfile)

export default router
