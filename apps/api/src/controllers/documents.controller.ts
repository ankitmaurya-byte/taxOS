import { Request, Response, NextFunction } from 'express'
import { eq, and, desc } from 'drizzle-orm'
import { db } from '../db'
import { documents, documentContexts } from '../db/schema'
import { AppError, withContext } from '../lib/errors'
import { DocumentAgent } from '../agents/document'

const documentAgent = new DocumentAgent()

// ─── GET /api/documents ──────────────────────────────
export function listDocuments(req: Request, res: Response) {
  const { filingId, reviewStatus } = req.query
  const results = db.select().from(documents)
    .where(eq(documents.orgId, req.user!.orgId))
    .orderBy(desc(documents.createdAt))
    .all()
    .filter(d => {
      if (filingId && d.filingId !== filingId) return false
      if (reviewStatus === 'reviewed' && !d.reviewedByHuman) return false
      if (reviewStatus === 'unreviewed' && d.reviewedByHuman) return false
      return true
    })
  res.json(results)
}

// ─── POST /api/documents/upload ──────────────────────
export async function uploadDocument(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) throw new AppError('No file uploaded', 400)

    const doc = db.insert(documents).values({
      filingId: req.body.filingId || null,
      orgId: req.user!.orgId,
      vaultId: req.body.vaultId || null,
      folderId: req.body.folderId || null,
      fileName: req.file.originalname,
      storageUrl: `/uploads/${req.file.filename}`,
      mimeType: req.file.mimetype,
      uploadedById: req.user!.userId,
    }).returning().get()

    res.status(201).json(doc)

    // Auto-extract context in background (don't block response)
    setImmediate(async () => {
      try {
        await documentAgent.extractContext(doc.id, req.user!.orgId, req.body.vaultId || null)
        await documentAgent.extract(doc.id, req.user!.orgId)
      } catch (err) {
        console.error(`Auto-extraction failed for document ${doc.id}:`, err)
        // Mark as failed so frontend can show retry button
        db.update(documents).set({ confidenceScore: -1 })
          .where(eq(documents.id, doc.id)).run()
      }
    })
  } catch (err) { next(withContext(err as Error, 'uploadDocument')) }
}

// ─── GET /api/documents/:id ──────────────────────────
export function getDocument(req: Request, res: Response) {
  const doc = db.select().from(documents)
    .where(and(eq(documents.id, req.params.id as string), eq(documents.orgId, req.user!.orgId)))
    .get()
  if (!doc) return res.status(404).json({ error: 'Document not found' })
  res.json(doc)
}

// ─── PUT /api/documents/:id/review ───────────────────
export function markAsReviewed(req: Request, res: Response) {
  const doc = db.select().from(documents)
    .where(and(eq(documents.id, req.params.id as string), eq(documents.orgId, req.user!.orgId)))
    .get()
  if (!doc) return res.status(404).json({ error: 'Document not found' })

  db.update(documents).set({ reviewedByHuman: true })
    .where(eq(documents.id, req.params.id as string)).run()
  res.json({ message: 'Document marked as reviewed' })
}

// ─── DELETE /api/documents/:id ───────────────────────
export function deleteDocument(req: Request, res: Response) {
  const doc = db.select().from(documents)
    .where(and(eq(documents.id, req.params.id as string), eq(documents.orgId, req.user!.orgId)))
    .get()
  if (!doc) return res.status(404).json({ error: 'Document not found' })

  db.delete(documentContexts).where(eq(documentContexts.documentId, doc.id)).run()
  db.delete(documents).where(eq(documents.id, doc.id)).run()
  res.json({ message: 'Document deleted' })
}

// ─── GET /api/documents/:id/context ──────────────────
export function getDocumentContext(req: Request, res: Response) {
  const doc = db.select().from(documents)
    .where(and(eq(documents.id, req.params.id as string), eq(documents.orgId, req.user!.orgId)))
    .get()
  if (!doc) return res.status(404).json({ error: 'Document not found' })

  const context = db.select().from(documentContexts)
    .where(eq(documentContexts.documentId, doc.id))
    .all()

  res.json(context)
}
