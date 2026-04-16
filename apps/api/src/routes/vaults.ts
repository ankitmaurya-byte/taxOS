import { Router } from 'express'
import { authMiddleware, requireActiveAccount } from '../middleware/auth'
import {
  listVaults,
  createVault,
  getVault,
  updateVault,
  deleteVault,
  createFolder,
  deleteFolder,
  listVaultDocuments,
  moveDocument,
} from '../controllers/vault.controller'

const router: Router = Router()
router.use(authMiddleware)
router.use(requireActiveAccount)

router.get('/', listVaults)
router.post('/', createVault)
router.get('/:id', getVault)
router.put('/:id', updateVault)
router.delete('/:id', deleteVault)

// Folders within vault
router.post('/:id/folders', createFolder)
router.delete('/:id/folders/:folderId', deleteFolder)

// Documents within vault
router.get('/:id/documents', listVaultDocuments)

export default router
