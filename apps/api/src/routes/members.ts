import { Router } from 'express'
import { createOrganizationTemplate, getRecommendation, inviteMember, listMemberTemplates, listMembers, updateMemberPermissions } from '../controllers/members.controller'
import { authMiddleware, requireActiveAccount, requirePermission, requireRole } from '../middleware/auth'

const router: Router = Router()

router.use(authMiddleware)
router.use(requireActiveAccount)

router.get('/', requirePermission('canManageTeam'), listMembers)
router.get('/templates', requireRole('founder'), listMemberTemplates)
router.post('/templates', requireRole('founder'), createOrganizationTemplate)
router.post('/invite', requireRole('founder'), requirePermission('canCreateAccounts'), inviteMember)
router.put('/:id/permissions', requireRole('founder'), requirePermission('canManageTeam'), updateMemberPermissions)
router.get('/recommendation', requireRole('founder'), getRecommendation)

export default router
