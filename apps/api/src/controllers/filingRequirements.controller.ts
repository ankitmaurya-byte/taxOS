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

function loadRequirement(req: Request) {
  // CPAs are members of the admin org but are assigned to client orgs, so we
  // can\'t filter by req.user.orgId for them — fall back to an org-access check.
  const filingId = req.params.id as string
  const filing = req.user!.role === 'cpa'
    ? db.select().from(filings).where(eq(filings.id, filingId)).get()
    : db.select().from(filings)
        .where(and(eq(filings.id, filingId), eq(filings.orgId, req.user!.orgId)))
        .get()
  if (!filing) throw new AppError('Filing not found', 404)
  if (req.user!.role === 'cpa' && !ensureCpaHasOrgAccess(req.user!.userId, filing.orgId)) {
    throw new AppError('CPA not authorised for this organisation', 403)
  }

  const requirement = db.select().from(filingDocumentRequirements)
    .where(and(
      eq(filingDocumentRequirements.filingId, filing.id),
      eq(filingDocumentRequirements.slotKey, req.params.slot as string),
    ))
    .get()
  if (!requirement) throw new AppError('Requirement slot not found', 404)

  return { filing, requirement }
}


async function runUpload(docId: string, source: ExtractionSource) {
  if (source.buffer.length > CLOUDINARY_SIZE_LIMIT) {
    db.update(documents).set({
      uploadStatus: 'skipped',
      uploadError: null,
      storageUrl: null,
    }).where(eq(documents.id, docId)).run()
    return
  }
  if (!cloudinaryConfigured) {
    db.update(documents).set({
      uploadStatus: 'failed',
      uploadError: 'Cloudinary is not configured on the server',
    }).where(eq(documents.id, docId)).run()
    return
  }
  db.update(documents).set({ uploadStatus: 'uploading', uploadError: null })
    .where(eq(documents.id, docId)).run()
  try {
    const result = await uploadBufferToCloudinary(source.buffer, source.fileName, source.mimeType)
    db.update(documents).set({
      uploadStatus: 'uploaded',
      storageUrl: result.secureUrl,
      cloudinaryPublicId: result.publicId,
      cloudinaryResourceType: result.resourceType,
      uploadError: null,
    }).where(eq(documents.id, docId)).run()
  } catch (err: any) {
    db.update(documents).set({
      uploadStatus: 'failed',
      uploadError: err?.message?.slice(0, 500) || 'Upload failed',
    }).where(eq(documents.id, docId)).run()
  }
}

async function runExtract(docId: string, orgId: string, source: ExtractionSource) {
  db.update(documents).set({ extractionStatus: 'extracting', extractionError: null })
    .where(eq(documents.id, docId)).run()
  try {
    await documentAgent.extractContext(docId, orgId, source)
    db.update(documents).set({ extractionStatus: 'processing' })
      .where(eq(documents.id, docId)).run()
    await documentAgent.extract(docId, orgId, source)
    db.update(documents).set({ extractionStatus: 'done', extractionError: null })
      .where(eq(documents.id, docId)).run()
  } catch (err: any) {
    db.update(documents).set({
      extractionStatus: 'failed',
      extractionError: err?.message?.slice(0, 500) || 'Extraction failed',
    }).where(eq(documents.id, docId)).run()
  }
}

function touchRequirement(requirementId: string, patch: Partial<{
  documentId: string | null
  skipped: boolean
  skipReason: string | null
  viewedByCpa: boolean
  viewedAt: string | null
  viewedByUserId: string | null
}>) {
  db.update(filingDocumentRequirements)
    .set({ ...patch, updatedAt: new Date().toISOString() })
    .where(eq(filingDocumentRequirements.id, requirementId))
    .run()
}

// ─── GET /api/filings/:id/requirements ────────────────────────────────────────

export function listRequirements(req: Request, res: Response, next: NextFunction) {
  try {
    const filingId = req.params.id as string
    const filing = req.user!.role === 'cpa'
      ? db.select().from(filings).where(eq(filings.id, filingId)).get()
      : db.select().from(filings)
          .where(and(eq(filings.id, filingId), eq(filings.orgId, req.user!.orgId)))
          .get()
    if (!filing) throw new AppError('Filing not found', 404)
    if (req.user!.role === 'cpa' && !ensureCpaHasOrgAccess(req.user!.userId, filing.orgId)) {
      throw new AppError('CPA not authorised for this organisation', 403)
    }

    const rows = db.select().from(filingDocumentRequirements)
      .where(eq(filingDocumentRequirements.filingId, filing.id))
      .orderBy(filingDocumentRequirements.sortOrder)
      .all()

    const enriched = rows.map((r: any) => {
      const doc = r.documentId ? db.select().from(documents).where(eq(documents.id, r.documentId)).get() : null
      return { ...r, document: doc }
    })
    res.json(enriched)
  } catch (err) { next(withContext(err as Error, 'listRequirements')) }
}

// ─── POST /api/filings/:id/requirements/:slot/upload ──────────────────────────

export async function uploadRequirement(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) throw new AppError('No file uploaded', 400)
    const { filing, requirement } = loadRequirement(req)

    // Delete prior attached document (Cloudinary + DB) so reuploads don\'t orphan assets.
    // Previous document (if any) stays in the DB + Cloudinary — the slot just
    // unlinks from it. That preserves vault originals and lets auditors see
    // the full upload history for the filing.

    const buffer = req.file.buffer
    const isLarge = buffer.length > CLOUDINARY_SIZE_LIMIT

    const doc = db.insert(documents).values({
      filingId: filing.id,
      orgId: req.user!.orgId,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      fileSize: buffer.length,
      uploadStatus: isLarge ? 'skipped' : 'uploading',
      extractionStatus: 'extracting',
      uploadedById: req.user!.userId,
    }).returning().get()

    touchRequirement(requirement.id, {
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

    const { filing, requirement } = loadRequirement(req)

    const source = db.select().from(documents)
      .where(and(eq(documents.id, sourceDocId), eq(documents.orgId, req.user!.orgId)))
      .get()
    if (!source) throw new AppError('Source document not found', 404)

    // Previous document (if any) stays in the DB + Cloudinary — the slot just
    // unlinks from it. That preserves vault originals and lets auditors see
    // the full upload history for the filing.

    const clone = db.insert(documents).values({
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
    }).returning().get()

    // If the source had extracted context, copy it to the new doc id so the
    // AI advisor picks it up under the filing scope.
    const sourceCtx = db.select().from(documentContexts)
      .where(eq(documentContexts.documentId, source.id))
      .get()
    if (sourceCtx) {
      db.insert(documentContexts).values({
        documentId: clone.id,
        orgId: sourceCtx.orgId,
        vaultId: sourceCtx.vaultId,
        rawText: sourceCtx.rawText,
        summary: sourceCtx.summary,
        keyEntities: sourceCtx.keyEntities as any,
        metadata: sourceCtx.metadata as any,
      }).run()
    }

    touchRequirement(requirement.id, {
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

    const { filing, requirement } = loadRequirement(req)
    // Previous document (if any) stays in the DB + Cloudinary — the slot just
    // unlinks from it. That preserves vault originals and lets auditors see
    // the full upload history for the filing.

    touchRequirement(requirement.id, {
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
    const { filing, requirement } = loadRequirement(req)
    touchRequirement(requirement.id, {
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
    const { requirement } = loadRequirement(req)
    if (!requirement.documentId) throw new AppError('No document attached to retry.', 400)

    db.update(documents).set({
      uploadStatus: 'uploading',
      uploadError: null,
      fileSize: req.file.buffer.length,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
    }).where(eq(documents.id, requirement.documentId)).run()

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
    const { requirement } = loadRequirement(req)
    if (!requirement.documentId) throw new AppError('No document attached.', 400)
    const doc = db.select().from(documents).where(eq(documents.id, requirement.documentId)).get()
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

export function markRequirementViewed(req: Request, res: Response, next: NextFunction) {
  try {
    const { filing, requirement } = loadRequirement(req)
    touchRequirement(requirement.id, {
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

export function markAllRequirementsViewed(req: Request, res: Response, next: NextFunction) {
  try {
    const filing = db.select().from(filings)
      .where(eq(filings.id, req.params.id as string))
      .get()
    if (!filing) throw new AppError('Filing not found', 404)
    if (!ensureCpaHasOrgAccess(req.user!.userId, filing.orgId)) {
      throw new AppError('CPA not authorised for this organisation', 403)
    }

    const now = new Date().toISOString()
    db.update(filingDocumentRequirements)
      .set({ viewedByCpa: true, viewedAt: now, viewedByUserId: req.user!.userId, updatedAt: now })
      .where(eq(filingDocumentRequirements.filingId, filing.id))
      .run()

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
