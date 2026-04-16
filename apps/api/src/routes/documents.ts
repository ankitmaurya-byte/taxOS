/**
 * Documents Routes
 *
 * Mounts at: /api/documents (see index.ts)
 * Controller: controllers/documents.controller.ts
 * Auth: all endpoints require authMiddleware (JWT)
 * Upload: POST /upload uses multer middleware from middleware/upload.ts
 */

import { Router } from 'express'
import { authMiddleware, requireActiveAccount, requirePermission } from '../middleware/auth'
import { upload } from '../middleware/upload'
import {
  listDocuments,
  uploadDocument,
  getDocument,
  deleteDocument,
  markAsReviewed,
  getDocumentContext,
} from '../controllers/documents.controller'
import { moveDocument } from '../controllers/vault.controller'

const router: Router = Router()
router.use(authMiddleware)
router.use(requireActiveAccount)

router.get('/', requirePermission('canViewDocuments'), listDocuments)
router.post('/upload', requirePermission('canEditDocuments'), upload.single('file'), uploadDocument)
router.get('/:id', requirePermission('canViewDocuments'), getDocument)
router.put('/:id/review', requirePermission('canEditDocuments'), markAsReviewed)
router.delete('/:id', requirePermission('canEditDocuments'), deleteDocument)
router.get('/:id/context', requirePermission('canViewDocuments'), getDocumentContext)
router.put('/:id/move', requirePermission('canEditDocuments'), moveDocument)

export default router
