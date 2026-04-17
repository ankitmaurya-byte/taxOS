/**
 * Documents Routes
 *
 * Mounts at: /api/documents (see index.ts)
 * Controller: controllers/documents.controller.ts
 * Auth: all endpoints require authMiddleware (JWT)
 * Upload: POST /upload uses multer memory storage middleware (no disk writes).
 */

import { Router } from 'express'
import { authMiddleware, requireActiveAccount, requirePermission } from '../middleware/auth'
import { upload } from '../middleware/upload'
import {
  listDocuments,
  uploadDocument,
  getDocument,
  deleteDocument,
  getDocumentContext,
  retryUpload,
  retryExtract,
  downloadDocument,
} from '../controllers/documents.controller'
import { moveDocument } from '../controllers/vault.controller'

const router: Router = Router()
router.use(authMiddleware)
router.use(requireActiveAccount)

router.get('/', requirePermission('canViewDocuments'), listDocuments)
router.post('/upload', requirePermission('canEditDocuments'), upload.single('file'), uploadDocument)
router.post('/:id/retry-upload', requirePermission('canEditDocuments'), upload.single('file'), retryUpload)
router.post('/:id/retry-extract', requirePermission('canEditDocuments'), upload.single('file'), retryExtract)
router.get('/:id/download', requirePermission('canViewDocuments'), downloadDocument)
router.get('/:id/context', requirePermission('canViewDocuments'), getDocumentContext)
router.get('/:id', requirePermission('canViewDocuments'), getDocument)
router.delete('/:id', requirePermission('canEditDocuments'), deleteDocument)
router.put('/:id/move', requirePermission('canEditDocuments'), moveDocument)

export default router
