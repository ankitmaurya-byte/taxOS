import { Request, Response, NextFunction } from 'express'
import { eq, and, desc, isNull } from 'drizzle-orm'
import { db } from '../db'
import { vaults, folders, documents, documentContexts } from '../db/schema'
import { AppError, withContext } from '../lib/errors'

// ─── GET /api/vaults ────────────────────────────────
export async function listVaults(req: Request, res: Response) {
  const results = await db.select().from(vaults)
    .where(eq(vaults.orgId, req.user!.orgId))
    .orderBy(desc(vaults.createdAt))
  res.json(results)
}

// ─── POST /api/vaults ───────────────────────────────
export async function createVault(req: Request, res: Response, next: NextFunction) {
  try {
    if (req.user!.role !== 'founder' && req.user!.role !== 'admin') {
      throw new AppError('Only founders can create vaults', 403)
    }
    const { name, description } = req.body
    if (!name) throw new AppError('Vault name is required', 400)

    const [vault] = await db.insert(vaults).values({
      orgId: req.user!.orgId,
      name,
      description: description || null,
      createdById: req.user!.userId,
    }).returning()

    res.status(201).json(vault)
  } catch (err) { next(withContext(err as Error, 'createVault')) }
}

// ─── GET /api/vaults/:id ────────────────────────────
export async function getVault(req: Request, res: Response) {
  const vault = (await db.select().from(vaults)
    .where(and(eq(vaults.id, req.params.id as string), eq(vaults.orgId, req.user!.orgId)))
    .limit(1))[0]
  if (!vault) return res.status(404).json({ error: 'Vault not found' })

  const vaultFolders = await db.select().from(folders)
    .where(eq(folders.vaultId, vault.id))
    .orderBy(folders.name)

  const vaultDocs = await db.select().from(documents)
    .where(and(eq(documents.vaultId, vault.id), eq(documents.orgId, req.user!.orgId)))
    .orderBy(desc(documents.createdAt))

  res.json({ ...vault, folders: vaultFolders, documents: vaultDocs })
}

// ─── PUT /api/vaults/:id ────────────────────────────
export async function updateVault(req: Request, res: Response, next: NextFunction) {
  try {
    if (req.user!.role !== 'founder' && req.user!.role !== 'admin') {
      throw new AppError('Only founders can update vaults', 403)
    }
    const vault = (await db.select().from(vaults)
      .where(and(eq(vaults.id, req.params.id as string), eq(vaults.orgId, req.user!.orgId)))
      .limit(1))[0]
    if (!vault) return res.status(404).json({ error: 'Vault not found' })

    const { name, description } = req.body
    await db.update(vaults).set({
      ...(name ? { name } : {}),
      ...(description !== undefined ? { description } : {}),
      updatedAt: new Date().toISOString(),
    }).where(eq(vaults.id, req.params.id as string))

    res.json({ message: 'Vault updated' })
  } catch (err) { next(withContext(err as Error, 'updateVault')) }
}

// ─── DELETE /api/vaults/:id ─────────────────────────
export async function deleteVault(req: Request, res: Response, next: NextFunction) {
  try {
    if (req.user!.role !== 'founder' && req.user!.role !== 'admin') {
      throw new AppError('Only founders can delete vaults', 403)
    }
    const vault = (await db.select().from(vaults)
      .where(and(eq(vaults.id, req.params.id as string), eq(vaults.orgId, req.user!.orgId)))
      .limit(1))[0]
    if (!vault) return res.status(404).json({ error: 'Vault not found' })

    // Remove document context, unlink docs, remove folders, then vault
    await db.delete(documentContexts).where(eq(documentContexts.vaultId, vault.id))
    await db.update(documents).set({ vaultId: null, folderId: null })
      .where(eq(documents.vaultId, vault.id))
    await db.delete(folders).where(eq(folders.vaultId, vault.id))
    await db.delete(vaults).where(eq(vaults.id, vault.id))

    res.json({ message: 'Vault deleted' })
  } catch (err) { next(withContext(err as Error, 'deleteVault')) }
}

// ─── POST /api/vaults/:id/folders ───────────────────
export async function createFolder(req: Request, res: Response, next: NextFunction) {
  try {
    const vault = (await db.select().from(vaults)
      .where(and(eq(vaults.id, req.params.id as string), eq(vaults.orgId, req.user!.orgId)))
      .limit(1))[0]
    if (!vault) throw new AppError('Vault not found', 404)

    const { name, parentId } = req.body
    if (!name) throw new AppError('Folder name is required', 400)

    if (parentId) {
      const parent = (await db.select().from(folders)
        .where(and(eq(folders.id, parentId), eq(folders.vaultId, vault.id)))
        .limit(1))[0]
      if (!parent) throw new AppError('Parent folder not found', 404)
    }

    const [folder] = await db.insert(folders).values({
      vaultId: vault.id,
      parentId: parentId || null,
      name,
      createdById: req.user!.userId,
    }).returning()

    res.status(201).json(folder)
  } catch (err) { next(withContext(err as Error, 'createFolder')) }
}

// ─── DELETE /api/vaults/:vaultId/folders/:folderId ──
export async function deleteFolder(req: Request, res: Response, next: NextFunction) {
  try {
    const folder = (await db.select().from(folders)
      .where(and(eq(folders.id, req.params.folderId as string), eq(folders.vaultId, req.params.id as string)))
      .limit(1))[0]
    if (!folder) return res.status(404).json({ error: 'Folder not found' })

    // Move docs in this folder to vault root
    await db.update(documents).set({ folderId: null })
      .where(eq(documents.folderId, folder.id))
    // Remove child folders
    await db.delete(folders).where(eq(folders.parentId, folder.id))
    await db.delete(folders).where(eq(folders.id, folder.id))

    res.json({ message: 'Folder deleted' })
  } catch (err) { next(withContext(err as Error, 'deleteFolder')) }
}

// ─── GET /api/vaults/:id/documents ──────────────────
export async function listVaultDocuments(req: Request, res: Response) {
  const { folderId } = req.query
  let results
  if (folderId) {
    results = await db.select().from(documents)
      .where(and(
        eq(documents.vaultId, req.params.id as string),
        eq(documents.orgId, req.user!.orgId),
        eq(documents.folderId, folderId as string),
      ))
      .orderBy(desc(documents.createdAt))
  } else {
    results = await db.select().from(documents)
      .where(and(
        eq(documents.vaultId, req.params.id as string),
        eq(documents.orgId, req.user!.orgId),
      ))
      .orderBy(desc(documents.createdAt))
  }
  res.json(results)
}

// ─── PUT /api/documents/:id/move ────────────────────
export async function moveDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const doc = (await db.select().from(documents)
      .where(and(eq(documents.id, req.params.id as string), eq(documents.orgId, req.user!.orgId)))
      .limit(1))[0]
    if (!doc) return res.status(404).json({ error: 'Document not found' })

    const { vaultId, folderId } = req.body

    if (vaultId) {
      const vault = (await db.select().from(vaults)
        .where(and(eq(vaults.id, vaultId), eq(vaults.orgId, req.user!.orgId)))
        .limit(1))[0]
      if (!vault) throw new AppError('Target vault not found', 404)
    }

    await db.update(documents).set({
      vaultId: vaultId !== undefined ? vaultId : doc.vaultId,
      folderId: folderId !== undefined ? folderId : doc.folderId,
    }).where(eq(documents.id, req.params.id as string))

    res.json({ message: 'Document moved' })
  } catch (err) { next(withContext(err as Error, 'moveDocument')) }
}
