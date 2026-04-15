/**
 * Documents Controller
 *
 * Handles document upload, retrieval, and human review tracking.
 * Uploaded files are stored on disk; AI extraction is done via agents (see agents/document.ts).
 *
 * Declared in : controllers/documents.controller.ts
 * Used in     : routes/documents.ts
 * API Prefix  : /api/documents
 *
 * Functions:
 *   listDocuments     → GET  /api/documents            (list with optional filters)
 *                       Frontend: api.getDocuments() → pages/Documents.tsx, pages/DocumentVault.tsx
 *   uploadDocument    → POST /api/documents/upload      (multipart file upload)
 *                       Frontend: api.uploadDocument() → pages/Documents.tsx (drag-drop + button), pages/DocumentVault.tsx
 *   getDocument       → GET  /api/documents/:id         (single document by ID)
 *                       Frontend: (available, not currently called by a page)
 *   markAsReviewed    → PUT  /api/documents/:id/review  (flag as human-reviewed)
 *                       Frontend: (available, not currently called by a page)
 *
 * Connected tables:
 *   - documents (db/schema.ts)   → main CRUD target
 *   - filings (via filingId)     → optional link to a filing
 *   - users (via uploadedById)   → who uploaded the file
 *
 * Dependencies:
 *   - upload middleware (middleware/upload.ts) → multer config for file handling
 *     Accepts: PDF, PNG, JPEG, CSV, XLSX (max 25MB)
 *     Storage: /uploads/<timestamp>-<random>.<ext>
 */

import { Request, Response, NextFunction } from 'express'
import { eq, and, desc } from 'drizzle-orm'
import { db } from '../db'
import { documents } from '../db/schema'
import { AppError, withContext } from '../lib/errors'

// ─── GET /api/documents ──────────────────────────────
// Frontend caller: api.getDocuments() → pages/Documents.tsx, DocumentVault.tsx
// Lists all documents for the user's org.
// Optional query filters:
//   ?filingId=fil_123       → filter by linked filing
//   ?reviewStatus=reviewed  → only human-reviewed docs
//   ?reviewStatus=unreviewed → only docs not yet reviewed
// Connected fields: req.user.orgId → documents.orgId
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
// Frontend caller: api.uploadDocument() → pages/Documents.tsx (drag-drop + button), DocumentVault.tsx
// Uploads a file via multipart form data.
// The file is processed by multer (middleware/upload.ts) before this handler runs.
// req.file is populated by multer with: originalname, filename, mimetype, size.
//
// Connected fields:
//   documents.filingId     ← req.body.filingId (optional, links doc to a filing)
//   documents.orgId        ← req.user.orgId
//   documents.uploadedById ← req.user.userId
//   documents.storageUrl   ← /uploads/<multer-generated-filename>
export async function uploadDocument(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) throw new AppError('No file uploaded', 400)

    const doc = db.insert(documents).values({
      filingId: req.body.filingId || null,
      orgId: req.user!.orgId,
      fileName: req.file.originalname,
      storageUrl: `/uploads/${req.file.filename}`,
      mimeType: req.file.mimetype,
      uploadedById: req.user!.userId,
    }).returning().get()

    res.status(201).json(doc)
  } catch (err) { next(withContext(err as Error, 'uploadDocument')) }
}

// ─── GET /api/documents/:id ──────────────────────────
// Returns a single document by ID, scoped to the user's org.
// Connected fields: req.params.id as string → documents.id, req.user.orgId → documents.orgId
export function getDocument(req: Request, res: Response) {
  const doc = db.select().from(documents)
    .where(and(eq(documents.id, req.params.id as string), eq(documents.orgId, req.user!.orgId)))
    .get()
  if (!doc) return res.status(404).json({ error: 'Document not found' })
  res.json(doc)
}

// ─── PUT /api/documents/:id/review ───────────────────
// Marks a document as reviewed by a human (sets reviewedByHuman = true).
// This is used after a CPA or founder manually verifies AI-extracted data.
// Connected fields: documents.reviewedByHuman ← true
export function markAsReviewed(req: Request, res: Response) {
  const doc = db.select().from(documents)
    .where(and(eq(documents.id, req.params.id as string), eq(documents.orgId, req.user!.orgId)))
    .get()
  if (!doc) return res.status(404).json({ error: 'Document not found' })

  db.update(documents).set({ reviewedByHuman: true })
    .where(eq(documents.id, req.params.id as string)).run()
  res.json({ message: 'Document marked as reviewed' })
}
