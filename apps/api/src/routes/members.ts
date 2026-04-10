import { Router } from 'express'
import { createOrganizationTemplate, getRecommendation, inviteMember, listMemberTemplates, listMembers, updateMemberPermissions } from '../controllers/members.controller'
import { authMiddleware, requireActiveAccount, requirePermission, requireRole } from '../middleware/auth'

const router: Router = Router()

router.use(authMiddleware)
router.use(requireActiveAccount)

router.get('/', requirePermission('canManageTeam'), listMembers)
router.get('/templates', requireRole('founder', 'admin'), listMemberTemplates)
router.post('/templates', requireRole('founder', 'admin'), createOrganizationTemplate)
router.post('/invite', requireRole('founder', 'admin'), requirePermission('canCreateAccounts'), inviteMember)
router.put('/:id/permissions', requireRole('founder', 'admin'), requirePermission('canManageTeam'), updateMemberPermissions)
router.get('/recommendation', requireRole('founder', 'admin'), getRecommendation)

export default router
