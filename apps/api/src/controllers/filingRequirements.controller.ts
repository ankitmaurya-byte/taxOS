import { Request, Response, NextFunction } from 'express'
import { and, eq } from 'drizzle-orm'
import { db } from '../db'
import {
  documentContexts,
  documents,
  filingDocumentRequirements,
  filings,
} from '../db/schema'
import { AppError, withContext } from '../lib/errors'
import { auditLogger } from '../lib/auditLog'
import { ensureCpaHasOrgAccess } from '../lib/rbac'
import {
  CLOUDINARY_SIZE_LIMIT,
  cloudinaryConfigured,
  deleteFromCloudinary,
  fetchFromCloudinary,
  uploadBufferToCloudinary,
} from '../lib/cloudinary'
import { DocumentAgent, ExtractionSource } from '../agents/document'

const documentAgent = new DocumentAgent()

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function loadRequirement(req: Request) {
  // CPAs are members of the admin org but are assigned to client orgs, so we
  // can\'t filter by req.user.orgId for them — fall back to an org-access check.
  const filingId = req.params.id as string
  const filing = req.user!.role === 'cpa'
    ? (await db.select().from(filings).where(eq(filings.id, filingId)).limit(1))[0]
    : (await db.select().from(filings)
        .where(and(eq(filings.id, filingId), eq(filings.orgId, req.user!.orgId)))
        .limit(1))[0]
  if (!filing) throw new AppError('Filing not found', 404)
  if (req.user!.role === 'cpa' && !(await ensureCpaHasOrgAccess(req.user!.userId, filing.orgId))) {
    throw new AppError('CPA not authorised for this organisation', 403)
  }

  const requirement = (await db.select().from(filingDocumentRequirements)
    .where(and(
      eq(filingDocumentRequirements.filingId, filing.id),
      eq(filingDocumentRequirements.slotKey, req.params.slot as string),
    ))
    .limit(1))[0]
  if (!requirement) throw new AppError('Requirement slot not found', 404)

  return { filing, requirement }
}


async function runUpload(docId: string, source: ExtractionSource) {
  if (source.buffer.length > CLOUDINARY_SIZE_LIMIT) {
    await db.update(documents).set({
      uploadStatus: 'skipped',
      uploadError: null,
      storageUrl: null,
    }).where(eq(documents.id, docId))
    return
  }
  if (!cloudinaryConfigured) {
    await db.update(documents).set({
      uploadStatus: 'failed',
      uploadError: 'Cloudinary is not configured on the server',
    }).where(eq(documents.id, docId))
    return
  }
  await db.update(documents).set({ uploadStatus: 'uploading', uploadError: null })
    .where(eq(documents.id, docId))
  try {
    const result = await uploadBufferToCloudinary(source.buffer, source.fileName, source.mimeType)
    await db.update(documents).set({
      uploadStatus: 'uploaded',
      storageUrl: result.secureUrl,
      cloudinaryPublicId: result.publicId,
      cloudinaryResourceType: result.resourceType,
      uploadError: null,
    }).where(eq(documents.id, docId))
  } catch (err: any) {
    await db.update(documents).set({
      uploadStatus: 'failed',
      uploadError: err?.message?.slice(0, 500) || 'Upload failed',
    }).where(eq(documents.id, docId))
  }
}

async function runExtract(docId: string, orgId: string, source: ExtractionSource) {
  await db.update(documents).set({ extractionStatus: 'extracting', extractionError: null })
    .where(eq(documents.id, docId))
  try {
    await documentAgent.extractContext(docId, orgId, source)
    await db.update(documents).set({ extractionStatus: 'processing' })
      .where(eq(documents.id, docId))
    await documentAgent.extract(docId, orgId, source)
    await db.update(documents).set({ extractionStatus: 'done', extractionError: null })
      .where(eq(documents.id, docId))
  } catch (err: any) {
    await db.update(documents).set({
      extractionStatus: 'failed',
      extractionError: err?.message?.slice(0, 500) || 'Extraction failed',
    }).where(eq(documents.id, docId))
  }
}

async function touchRequirement(requirementId: string, patch: Partial<{
  documentId: string | null
  skipped: boolean
  skipReason: string | null
  viewedByCpa: boolean
  viewedAt: string | null
  viewedByUserId: string | null
}>) {
  await db.update(filingDocumentRequirements)
    .set({ ...patch, updatedAt: new Date().toISOString() })
    .where(eq(filingDocumentRequirements.id, requirementId))
}

// ─── GET /api/filings/:id/requirements ────────────────────────────────────────

export async function listRequirements(req: Request, res: Response, next: NextFunction) {
  try {
    const filingId = req.params.id as string
    const filing = req.user!.role === 'cpa'
      ? (await db.select().from(filings).where(eq(filings.id, filingId)).limit(1))[0]
      : (await db.select().from(filings)
          .where(and(eq(filings.id, filingId), eq(filings.orgId, req.user!.orgId)))
          .limit(1))[0]
    if (!filing) throw new AppError('Filing not found', 404)
    if (req.user!.role === 'cpa' && !(await ensureCpaHasOrgAccess(req.user!.userId, filing.orgId))) {
      throw new AppError('CPA not authorised for this organisation', 403)
    }

    const rows = await db.select().from(filingDocumentRequirements)
      .where(eq(filingDocumentRequirements.filingId, filing.id))
      .orderBy(filingDocumentRequirements.sortOrder)

    const enriched = await Promise.all(rows.map(async (r: any) => {
      const doc = r.documentId ? (await db.select().from(documents).where(eq(documents.id, r.documentId)).limit(1))[0] : null
      return { ...r, document: doc }
    }))
    res.json(enriched)
  } catch (err) { next(withContext(err as Error, 'listRequirements')) }
}

// ─── POST /api/filings/:id/requirements/:slot/upload ──────────────────────────

export async function uploadRequirement(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) throw new AppError('No file uploaded', 400)
    const { filing, requirement } = await loadRequirement(req)

    // Delete prior attached document (Cloudinary + DB) so reuploads don\'t orphan assets.
    // Previous document (if any) stays in the DB + Cloudinary — the slot just
    // unlinks from it. That preserves vault originals and lets auditors see
    // the full upload history for the filing.

    const buffer = req.file.buffer
    const isLarge = buffer.length > CLOUDINARY_SIZE_LIMIT

    const [doc] = await db.insert(documents).values({
      filingId: filing.id,
      orgId: req.user!.orgId,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      fileSize: buffer.length,
      uploadStatus: isLarge ? 'skipped' : 'uploading',
      extractionStatus: 'extracting',
      uploadedById: req.user!.userId,
    }).returning()

    await touchRequirement(requirement.id, {
      documentId: doc.id,
      skipped: false,
      skipReason: null,
      viewedByCpa: false,
      viewedAt: null,
      viewedByUserId: null,
    })

    auditLogger.log({
      orgId: req.user!.orgId,
      filingId: filing.id,
      actorType: req.user!.role === 'team_member' ? 'founder' : (req.user!.role as any),
      actorId: req.user!.userId,
      action: 'requirement_uploaded',
      reasoning: `Uploaded "${req.file.originalname}" for slot ${requirement.slotKey}`,
    })

    res.status(201).json({ document: doc, requirement: { ...requirement, documentId: doc.id } })

    setImmediate(() => {
      runUpload(doc.id, { buffer, mimeType: req.file!.mimetype, fileName: req.file!.originalname })
      runExtract(doc.id, req.user!.orgId, { buffer, mimeType: req.file!.mimetype, fileName: req.file!.originalname })
    })
  } catch (err) { next(withContext(err as Error, 'uploadRequirement')) }
}

// ─── POST /api/filings/:id/requirements/:slot/import-from-vault ───────────────
// Clones an existing vault document into a filing-linked document row so
// reuploading/replacing doesn\'t blow away the original vault copy.

export async function importRequirementFromVault(req: Request, res: Response, next: NextFunction) {
  try {
    const { documentId: sourceDocId } = req.body as { documentId?: string }
    if (!sourceDocId) throw new AppError('documentId is required', 400)

    const { filing, requirement } = await loadRequirement(req)

    const source = (await db.select().from(documents)
      .where(and(eq(documents.id, sourceDocId), eq(documents.orgId, req.user!.orgId)))
      .limit(1))[0]
    if (!source) throw new AppError('Source document not found', 404)

    // Previous document (if any) stays in the DB + Cloudinary — the slot just
    // unlinks from it. That preserves vault originals and lets auditors see
    // the full upload history for the filing.

    const [clone] = await db.insert(documents).values({
      filingId: filing.id,
      orgId: req.user!.orgId,
      vaultId: source.vaultId,
      folderId: source.folderId,
      fileName: source.fileName,
      storageUrl: source.storageUrl,
      cloudinaryPublicId: source.cloudinaryPublicId,
      cloudinaryResourceType: source.cloudinaryResourceType,
      fileSize: source.fileSize,
      mimeType: source.mimeType,
      extractedData: source.extractedData as any,
      aiTags: source.aiTags as any,
      confidenceScore: source.confidenceScore,
      uploadStatus: source.uploadStatus ?? 'uploaded',
      extractionStatus: source.extractionStatus ?? 'done',
      uploadedById: req.user!.userId,
    }).returning()

    // If the source had extracted context, copy it to the new doc id so the
    // AI advisor picks it up under the filing scope.
    const sourceCtx = (await db.select().from(documentContexts)
      .where(eq(documentContexts.documentId, source.id))
      .limit(1))[0]
    if (sourceCtx) {
      await db.insert(documentContexts).values({
        documentId: clone.id,
        orgId: sourceCtx.orgId,
        vaultId: sourceCtx.vaultId,
        rawText: sourceCtx.rawText,
        summary: sourceCtx.summary,
        keyEntities: sourceCtx.keyEntities as any,
        metadata: sourceCtx.metadata as any,
      })
    }

    await touchRequirement(requirement.id, {
      documentId: clone.id,
      skipped: false,
      skipReason: null,
      viewedByCpa: false,
      viewedAt: null,
      viewedByUserId: null,
    })

    auditLogger.log({
      orgId: req.user!.orgId,
      filingId: filing.id,
      actorType: req.user!.role === 'team_member' ? 'founder' : (req.user!.role as any),
      actorId: req.user!.userId,
      action: 'requirement_imported_from_vault',
      reasoning: `Imported "${source.fileName}" for slot ${requirement.slotKey}`,
    })

    res.status(201).json({ document: clone })
  } catch (err) { next(withContext(err as Error, 'importRequirementFromVault')) }
}

// ─── POST /api/filings/:id/requirements/:slot/skip ────────────────────────────

export async function skipRequirement(req: Request, res: Response, next: NextFunction) {
  try {
    const { reason } = req.body as { reason?: string }
    const trimmed = (reason ?? '').trim()
    if (!trimmed) throw new AppError('A remark is required to skip a document.', 400)

    const { filing, requirement } = await loadRequirement(req)
    // Previous document (if any) stays in the DB + Cloudinary — the slot just
    // unlinks from it. That preserves vault originals and lets auditors see
    // the full upload history for the filing.

    await touchRequirement(requirement.id, {
      documentId: null,
      skipped: true,
      skipReason: trimmed,
      viewedByCpa: false,
      viewedAt: null,
      viewedByUserId: null,
    })

    auditLogger.log({
      orgId: req.user!.orgId,
      filingId: filing.id,
      actorType: req.user!.role === 'team_member' ? 'founder' : (req.user!.role as any),
      actorId: req.user!.userId,
      action: 'requirement_skipped',
      reasoning: `Skipped slot ${requirement.slotKey}: ${trimmed}`,
    })

    res.json({ ok: true })
  } catch (err) { next(withContext(err as Error, 'skipRequirement')) }
}

// ─── POST /api/filings/:id/requirements/:slot/unskip ──────────────────────────

export async function unskipRequirement(req: Request, res: Response, next: NextFunction) {
  try {
    const { filing, requirement } = await loadRequirement(req)
    await touchRequirement(requirement.id, {
      skipped: false,
      skipReason: null,
    })
    auditLogger.log({
      orgId: req.user!.orgId,
      filingId: filing.id,
      actorType: req.user!.role === 'team_member' ? 'founder' : (req.user!.role as any),
      actorId: req.user!.userId,
      action: 'requirement_unskipped',
      reasoning: `Un-skipped slot ${requirement.slotKey}`,
    })
    res.json({ ok: true })
  } catch (err) { next(withContext(err as Error, 'unskipRequirement')) }
}

// ─── POST /api/filings/:id/requirements/:slot/retry-upload ────────────────────

export async function retryRequirementUpload(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) throw new AppError('No file provided for retry', 400)
    const { requirement } = await loadRequirement(req)
    if (!requirement.documentId) throw new AppError('No document attached to retry.', 400)

    await db.update(documents).set({
      uploadStatus: 'uploading',
      uploadError: null,
      fileSize: req.file.buffer.length,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
    }).where(eq(documents.id, requirement.documentId))

    res.json({ ok: true })

    setImmediate(() => {
      runUpload(requirement.documentId!, {
        buffer: req.file!.buffer,
        mimeType: req.file!.mimetype,
        fileName: req.file!.originalname,
      })
    })
  } catch (err) { next(withContext(err as Error, 'retryRequirementUpload')) }
}

// ─── POST /api/filings/:id/requirements/:slot/retry-extract ───────────────────

export async function retryRequirementExtract(req: Request, res: Response, next: NextFunction) {
  try {
    const { requirement } = await loadRequirement(req)
    if (!requirement.documentId) throw new AppError('No document attached.', 400)
    const doc = (await db.select().from(documents).where(eq(documents.id, requirement.documentId)).limit(1))[0]
    if (!doc) throw new AppError('Document missing.', 404)

    let buffer: Buffer | null = null
    let fileName = doc.fileName
    let mimeType = doc.mimeType
    if (req.file) {
      buffer = req.file.buffer
      fileName = req.file.originalname
      mimeType = req.file.mimetype
    } else if (doc.storageUrl && doc.uploadStatus === 'uploaded') {
      buffer = await fetchFromCloudinary(doc.storageUrl)
    } else {
      throw new AppError('No source available. Re-upload the file.', 400)
    }

    res.json({ ok: true })
    setImmediate(() => {
      runExtract(doc.id, req.user!.orgId, { buffer: buffer!, mimeType, fileName })
    })
  } catch (err) { next(withContext(err as Error, 'retryRequirementExtract')) }
}

// ─── POST /api/filings/:id/requirements/:slot/view ────────────────────────────
// CPA marks a single requirement as viewed.

export async function markRequirementViewed(req: Request, res: Response, next: NextFunction) {
  try {
    const { filing, requirement } = await loadRequirement(req)
    await touchRequirement(requirement.id, {
      viewedByCpa: true,
      viewedAt: new Date().toISOString(),
      viewedByUserId: req.user!.userId,
    })
    auditLogger.log({
      orgId: req.user!.orgId,
      filingId: filing.id,
      actorType: 'cpa',
      actorId: req.user!.userId,
      action: 'requirement_viewed',
      reasoning: `CPA marked slot ${requirement.slotKey} as viewed`,
    })
    res.json({ ok: true })
  } catch (err) { next(withContext(err as Error, 'markRequirementViewed')) }
}

// ─── POST /api/filings/:id/requirements/mark-all-viewed ───────────────────────

export async function markAllRequirementsViewed(req: Request, res: Response, next: NextFunction) {
  try {
    const filing = (await db.select().from(filings)
      .where(eq(filings.id, req.params.id as string))
      .limit(1))[0]
    if (!filing) throw new AppError('Filing not found', 404)
    if (!(await ensureCpaHasOrgAccess(req.user!.userId, filing.orgId))) {
      throw new AppError('CPA not authorised for this organisation', 403)
    }

    const now = new Date().toISOString()
    await db.update(filingDocumentRequirements)
      .set({ viewedByCpa: true, viewedAt: now, viewedByUserId: req.user!.userId, updatedAt: now })
      .where(eq(filingDocumentRequirements.filingId, filing.id))

    auditLogger.log({
      orgId: filing.orgId,
      filingId: filing.id,
      actorType: 'cpa',
      actorId: req.user!.userId,
      action: 'requirements_all_viewed',
      reasoning: 'CPA bulk-marked all requirements as viewed',
    })
    res.json({ ok: true })
  } catch (err) { next(withContext(err as Error, 'markAllRequirementsViewed')) }
}
