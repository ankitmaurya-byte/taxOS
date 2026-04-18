import { Request, Response, NextFunction } from 'express'
import { eq, and, desc } from 'drizzle-orm'
import { db } from '../db'
import { documents, documentContexts } from '../db/schema'
import { AppError, withContext } from '../lib/errors'
import { DocumentAgent, ExtractionSource } from '../agents/document'
import {
  CLOUDINARY_SIZE_LIMIT,
  buildDownloadUrl,
  cloudinaryConfigured,
  deleteFromCloudinary,
  fetchFromCloudinary,
  uploadBufferToCloudinary,
} from '../lib/cloudinary'

const documentAgent = new DocumentAgent()

/**
 * Run Cloudinary upload + agent extraction in parallel. Either side failing
 * does NOT block the other. Statuses are persisted incrementally so the UI
 * can poll and show per-stage progress (uploading / extracting / done / failed).
 */
async function processDocument(
  documentId: string,
  orgId: string,
  source: ExtractionSource,
  opts: { runUpload: boolean; runExtract: boolean; vaultId?: string | null },
) {
  const uploadTask = opts.runUpload
    ? runUpload(documentId, source).catch((err) => {
        console.error(`[documents] upload failed for ${documentId}:`, err)
      })
    : Promise.resolve()

  const extractTask = opts.runExtract
    ? runExtract(documentId, orgId, source, opts.vaultId ?? null).catch((err) => {
        console.error(`[documents] extraction failed for ${documentId}:`, err)
      })
    : Promise.resolve()

  await Promise.allSettled([uploadTask, extractTask])
}

async function runUpload(documentId: string, source: ExtractionSource) {
  if (source.buffer.length > CLOUDINARY_SIZE_LIMIT) {
    await db.update(documents).set({
      uploadStatus: 'skipped',
      uploadError: null,
      storageUrl: null,
    }).where(eq(documents.id, documentId))
    return
  }

  if (!cloudinaryConfigured) {
    await db.update(documents).set({
      uploadStatus: 'failed',
      uploadError: 'Cloudinary is not configured on the server',
    }).where(eq(documents.id, documentId))
    return
  }

  await db.update(documents).set({ uploadStatus: 'uploading', uploadError: null })
    .where(eq(documents.id, documentId))

  try {
    const result = await uploadBufferToCloudinary(source.buffer, source.fileName, source.mimeType)
    await db.update(documents).set({
      uploadStatus: 'uploaded',
      storageUrl: result.secureUrl,
      cloudinaryPublicId: result.publicId,
      cloudinaryResourceType: result.resourceType,
      uploadError: null,
    }).where(eq(documents.id, documentId))
  } catch (err: any) {
    await db.update(documents).set({
      uploadStatus: 'failed',
      uploadError: err?.message?.slice(0, 500) || 'Upload failed',
    }).where(eq(documents.id, documentId))
    throw err
  }
}

async function runExtract(
  documentId: string,
  orgId: string,
  source: ExtractionSource,
  vaultId: string | null,
) {
  await db.update(documents).set({ extractionStatus: 'extracting', extractionError: null })
    .where(eq(documents.id, documentId))

  try {
    await documentAgent.extractContext(documentId, orgId, source, vaultId)
    await db.update(documents).set({ extractionStatus: 'processing' })
      .where(eq(documents.id, documentId))
    await documentAgent.extract(documentId, orgId, source)
    await db.update(documents).set({ extractionStatus: 'done', extractionError: null })
      .where(eq(documents.id, documentId))
  } catch (err: any) {
    await db.update(documents).set({
      extractionStatus: 'failed',
      extractionError: err?.message?.slice(0, 500) || 'Extraction failed',
    }).where(eq(documents.id, documentId))
    throw err
  }
}

// ─── GET /api/documents ──────────────────────────────
export async function listDocuments(req: Request, res: Response) {
  const { filingId } = req.query
  const results = (await db.select().from(documents)
    .where(eq(documents.orgId, req.user!.orgId))
    .orderBy(desc(documents.createdAt)))
    .filter(d => {
      if (filingId && d.filingId !== filingId) return false
      return true
    })
  res.json(results)
}

// ─── POST /api/documents/upload ──────────────────────
export async function uploadDocument(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) throw new AppError('No file uploaded', 400)

    const buffer = req.file.buffer
    const isLarge = buffer.length > CLOUDINARY_SIZE_LIMIT

    const [doc] = await db.insert(documents).values({
      filingId: req.body.filingId || null,
      orgId: req.user!.orgId,
      vaultId: req.body.vaultId || null,
      folderId: req.body.folderId || null,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      fileSize: buffer.length,
      uploadStatus: isLarge ? 'skipped' : 'uploading',
      extractionStatus: 'extracting',
      uploadedById: req.user!.userId,
    }).returning()

    res.status(201).json(doc)

    setImmediate(() => {
      processDocument(doc.id, req.user!.orgId, {
        buffer,
        mimeType: req.file!.mimetype,
        fileName: req.file!.originalname,
      }, { runUpload: true, runExtract: true, vaultId: req.body.vaultId || null })
    })
  } catch (err) { next(withContext(err as Error, 'uploadDocument')) }
}

// ─── POST /api/documents/:id/retry-upload ────────────
// Requires a new file buffer. Re-runs the upload side only.
export async function retryUpload(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) throw new AppError('No file provided for retry', 400)
    const doc = (await db.select().from(documents)
      .where(and(eq(documents.id, req.params.id as string), eq(documents.orgId, req.user!.orgId)))
      .limit(1))[0]
    if (!doc) return res.status(404).json({ error: 'Document not found' })

    const buffer = req.file.buffer
    await db.update(documents).set({
      uploadStatus: 'uploading',
      uploadError: null,
      fileSize: buffer.length,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
    }).where(eq(documents.id, doc.id))

    res.json({ message: 'Upload retry started', document: { ...doc, uploadStatus: 'uploading' } })

    setImmediate(() => {
      runUpload(doc.id, {
        buffer,
        mimeType: req.file!.mimetype,
        fileName: req.file!.originalname,
      }).catch((err) => console.error(`[documents] retry upload failed:`, err))
    })
  } catch (err) { next(withContext(err as Error, 'retryUpload')) }
}

// ─── POST /api/documents/:id/retry-extract ───────────
// If the document already lives in Cloudinary we fetch the buffer from there.
// Otherwise the client must send a fresh file (multipart) so we can re-extract.
export async function retryExtract(req: Request, res: Response, next: NextFunction) {
  try {
    const doc = (await db.select().from(documents)
      .where(and(eq(documents.id, req.params.id as string), eq(documents.orgId, req.user!.orgId)))
      .limit(1))[0]
    if (!doc) return res.status(404).json({ error: 'Document not found' })

    let buffer: Buffer | null = null
    let fileName = doc.fileName
    let mimeType = doc.mimeType

    if (req.file) {
      buffer = req.file.buffer
      fileName = req.file.originalname
      mimeType = req.file.mimetype
    } else if (doc.storageUrl && doc.uploadStatus === 'uploaded') {
      try {
        buffer = await fetchFromCloudinary(doc.storageUrl)
      } catch (err: any) {
        return res.status(502).json({ error: `Failed to fetch asset from Cloudinary: ${err.message}` })
      }
    } else {
      return res.status(400).json({
        error: 'No source available for extraction. Please re-upload the file.',
      })
    }

    await db.update(documents).set({ extractionStatus: 'extracting', extractionError: null })
      .where(eq(documents.id, doc.id))

    res.json({ message: 'Extraction retry started' })

    setImmediate(() => {
      runExtract(doc.id, req.user!.orgId, { buffer: buffer!, mimeType, fileName }, doc.vaultId)
        .catch((err) => console.error(`[documents] retry extract failed:`, err))
    })
  } catch (err) { next(withContext(err as Error, 'retryExtract')) }
}

// ─── GET /api/documents/:id/download ─────────────────
// Returns a forced-download Cloudinary URL; client opens it in a new tab or
// triggers an anchor click. The URL itself is public (Cloudinary) but
// generating it still requires the caller to be authenticated.
export async function downloadDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const doc = (await db.select().from(documents)
      .where(and(eq(documents.id, req.params.id as string), eq(documents.orgId, req.user!.orgId)))
      .limit(1))[0]
    if (!doc) return res.status(404).json({ error: 'Document not found' })
    if (!doc.storageUrl || doc.uploadStatus !== 'uploaded') {
      return res.status(409).json({
        error: 'This file is not available for download. Large files (> 1 MB) are only stored as extracted context.',
      })
    }
    const url = buildDownloadUrl(doc.storageUrl, doc.fileName)
    res.json({ url, fileName: doc.fileName })
  } catch (err) { next(withContext(err as Error, 'downloadDocument')) }
}

// ─── GET /api/documents/:id ──────────────────────────
export async function getDocument(req: Request, res: Response) {
  const doc = (await db.select().from(documents)
    .where(and(eq(documents.id, req.params.id as string), eq(documents.orgId, req.user!.orgId)))
    .limit(1))[0]
  if (!doc) return res.status(404).json({ error: 'Document not found' })
  res.json(doc)
}

// ─── DELETE /api/documents/:id ───────────────────────
export async function deleteDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const doc = (await db.select().from(documents)
      .where(and(eq(documents.id, req.params.id as string), eq(documents.orgId, req.user!.orgId)))
      .limit(1))[0]
    if (!doc) return res.status(404).json({ error: 'Document not found' })

    // Best-effort Cloudinary cleanup.
    if (doc.cloudinaryPublicId) {
      try {
        await deleteFromCloudinary(doc.cloudinaryPublicId, (doc.cloudinaryResourceType as any) ?? 'raw')
      } catch (err) {
        console.warn(`[documents] Cloudinary delete failed for ${doc.id}:`, err)
      }
    }

    await db.delete(documentContexts).where(eq(documentContexts.documentId, doc.id))
    await db.delete(documents).where(eq(documents.id, doc.id))
    res.json({ message: 'Document deleted' })
  } catch (err) { next(withContext(err as Error, 'deleteDocument')) }
}

// ─── GET /api/documents/:id/context ──────────────────
export async function getDocumentContext(req: Request, res: Response) {
  const doc = (await db.select().from(documents)
    .where(and(eq(documents.id, req.params.id as string), eq(documents.orgId, req.user!.orgId)))
    .limit(1))[0]
  if (!doc) return res.status(404).json({ error: 'Document not found' })

  const context = await db.select().from(documentContexts)
    .where(eq(documentContexts.documentId, doc.id))

  res.json(context)
}
