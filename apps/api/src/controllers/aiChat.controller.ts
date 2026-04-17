/**
 * AI Chat (Inkle AI) Conversations Controller
 *
 * Per-user conversation history for the Inkle AI panel.
 *   GET    /api/ai-chats          — list current user's conversations (desc by updatedAt)
 *   POST   /api/ai-chats          — create new conversation { title?, messages? }
 *   GET    /api/ai-chats/:id      — fetch one conversation
 *   PATCH  /api/ai-chats/:id      — update title and/or messages
 *   DELETE /api/ai-chats/:id      — remove
 */

import { Request, Response, NextFunction } from 'express'
import { and, desc, eq, sql } from 'drizzle-orm'
import { db } from '../db'
import { aiChatConversations } from '../db/schema'
import { AppError, withContext } from '../lib/errors'

type Msg = { role: string; content: string; timestamp: string }

function isMessage(v: unknown): v is Msg {
  return !!v && typeof v === 'object' && typeof (v as Msg).role === 'string' && typeof (v as Msg).content === 'string'
}

function ownedConversation(id: string, userId: string) {
  const row = db.select().from(aiChatConversations)
    .where(and(eq(aiChatConversations.id, id), eq(aiChatConversations.userId, userId)))
    .get()
  if (!row) throw new AppError('Conversation not found', 404)
  return row
}

export function listAiChats(req: Request, res: Response, next: NextFunction) {
  try {
    const rows = db.select().from(aiChatConversations)
      .where(eq(aiChatConversations.userId, req.user!.userId))
      .orderBy(desc(aiChatConversations.updatedAt))
      .all()
    res.json({ conversations: rows })
  } catch (err) { next(withContext(err as Error, 'listAiChats')) }
}

export function createAiChat(req: Request, res: Response, next: NextFunction) {
  try {
    const { title, messages } = req.body as { title?: string; messages?: unknown }
    const safeMessages: Msg[] = Array.isArray(messages) ? messages.filter(isMessage) : []
    const saved = db.insert(aiChatConversations).values({
      userId: req.user!.userId,
      orgId: req.user!.orgId,
      title: (typeof title === 'string' && title.trim()) ? title.trim().slice(0, 100) : 'Untitled',
      messages: safeMessages,
    }).returning().get()
    res.status(201).json(saved)
  } catch (err) { next(withContext(err as Error, 'createAiChat')) }
}

export function getAiChat(req: Request, res: Response, next: NextFunction) {
  try {
    const row = ownedConversation(String(req.params.id), req.user!.userId)
    res.json(row)
  } catch (err) { next(withContext(err as Error, 'getAiChat')) }
}

export function updateAiChat(req: Request, res: Response, next: NextFunction) {
  try {
    const existing = ownedConversation(String(req.params.id), req.user!.userId)
    const { title, messages } = req.body as { title?: string; messages?: unknown }

    const patch: { title?: string; messages?: Msg[]; updatedAt: ReturnType<typeof sql> } = {
      updatedAt: sql`CURRENT_TIMESTAMP`,
    }
    if (typeof title === 'string' && title.trim()) {
      patch.title = title.trim().slice(0, 100)
    }
    if (Array.isArray(messages)) {
      patch.messages = messages.filter(isMessage)
    }

    const saved = db.update(aiChatConversations)
      .set(patch)
      .where(eq(aiChatConversations.id, existing.id))
      .returning()
      .get()
    res.json(saved)
  } catch (err) { next(withContext(err as Error, 'updateAiChat')) }
}

export function deleteAiChat(req: Request, res: Response, next: NextFunction) {
  try {
    const existing = ownedConversation(String(req.params.id), req.user!.userId)
    db.delete(aiChatConversations).where(eq(aiChatConversations.id, existing.id)).run()
    res.status(204).end()
  } catch (err) { next(withContext(err as Error, 'deleteAiChat')) }
}
