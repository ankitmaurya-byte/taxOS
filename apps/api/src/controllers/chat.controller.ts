/**
 * Chat Controller
 *
 * Three isolated chat channels:
 *
 *   Organization chat  (founders + team_members within a single org)
 *     GET  /api/chat/org/:orgId  — list messages
 *     POST /api/chat/org/:orgId  — send message
 *
 *   All-founders chat  (any active founder cross-org)
 *     GET  /api/chat/founders    — list messages
 *     POST /api/chat/founders    — send message
 *
 *   CPA-only chat  (CPAs only)
 *     GET  /api/chat/cpas        — list messages
 *     POST /api/chat/cpas        — send message
 *
 * All POST endpoints push a `chat_message` SSE event to relevant connected clients.
 *
 * Connected tables:
 *   - org_chat_messages
 *   - founder_chat_messages
 *   - cpa_chat_messages
 */

import { Request, Response, NextFunction } from 'express'
import { desc, eq } from 'drizzle-orm'
import { db } from '../db'
import { cpaChatMessages, founderChatMessages, orgChatMessages, users } from '../db/schema'
import { ensureCpaHasOrgAccess } from '../lib/rbac'
import { AppError, withContext } from '../lib/errors'
import { broadcastToOrg, broadcastToRole } from '../services/ws.service'

const DEFAULT_LIMIT = 20

async function senderInfo(senderId: string) {
  const u = (await db.select({ name: users.name, role: users.role }).from(users).where(eq(users.id, senderId)).limit(1))[0]
  return { name: u?.name ?? 'Unknown', role: u?.role ?? 'unknown' }
}

// ─── Organization chat ───────────────────────────────────────────────────────

export async function getOrgMessages(req: Request, res: Response, next: NextFunction) {
  try {
    const { orgId } = req.params as { orgId: string }

    // Founders/team_members must belong to the org; CPAs must be assigned; admin sees any org
    if (req.user!.role === 'cpa') {
      if (!(await ensureCpaHasOrgAccess(req.user!.userId, orgId))) {
        throw new AppError('CPA not assigned to this organization', 403)
      }
    } else if (req.user!.role !== 'admin' && req.user!.orgId !== orgId) {
      throw new AppError('You are not a member of this organization', 403)
    }

    const limit = Math.min(Number(req.query.limit) || DEFAULT_LIMIT, 100)
    const offset = Number(req.query.offset) || 0

    const total = (await db.select().from(orgChatMessages).where(eq(orgChatMessages.orgId, orgId))).length
    const messages = (await db.select().from(orgChatMessages)
      .where(eq(orgChatMessages.orgId, orgId))
      .orderBy(desc(orgChatMessages.createdAt))
      .limit(limit)
      .offset(offset))
      .reverse()

    const enriched = await Promise.all(messages.map(async m => ({ ...m, sender: await senderInfo(m.senderId) })))
    res.json({ messages: enriched, total, limit, offset })
  } catch (err) { next(withContext(err as Error, 'getOrgMessages')) }
}

export async function postOrgMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const { orgId } = req.params as { orgId: string }
    const { message } = req.body as { message?: string }
    if (!message?.trim()) throw new AppError('Message is required', 400)

    if (req.user!.role === 'cpa') {
      if (!(await ensureCpaHasOrgAccess(req.user!.userId, orgId))) {
        throw new AppError('CPA not assigned to this organization', 403)
      }
    } else if (req.user!.orgId !== orgId) {
      throw new AppError('You are not a member of this organization', 403)
    }

    const [saved] = await db.insert(orgChatMessages).values({
      orgId,
      senderId: req.user!.userId,
      message: message.trim(),
    }).returning()

    const event = {
      type: 'chat_message',
      data: {
        channel: 'org',
        orgId,
        message: { ...saved, sender: await senderInfo(saved.senderId) },
      },
    }

    // Push to all members of this org and CPAs assigned to it
    broadcastToOrg(orgId, event)

    res.status(201).json({ ...saved, sender: await senderInfo(saved.senderId) })
  } catch (err) { next(withContext(err as Error, 'postOrgMessage')) }
}

// ─── All-founder cross-org chat ──────────────────────────────────────────────

export async function getFounderMessages(req: Request, res: Response, next: NextFunction) {
  try {
    if (req.user!.role !== 'founder' && req.user!.role !== 'admin') throw new AppError('Only founders and admins can access this chat', 403)

    const limit = Math.min(Number(req.query.limit) || DEFAULT_LIMIT, 100)
    const offset = Number(req.query.offset) || 0

    const total = (await db.select().from(founderChatMessages)).length
    const messages = (await db.select().from(founderChatMessages)
      .orderBy(desc(founderChatMessages.createdAt))
      .limit(limit)
      .offset(offset))
      .reverse()

    const enrichedMessages = await Promise.all(messages.map(async m => ({ ...m, sender: await senderInfo(m.senderId) })))
    res.json({ messages: enrichedMessages, total, limit, offset })
  } catch (err) { next(withContext(err as Error, 'getFounderMessages')) }
}

export async function postFounderMessage(req: Request, res: Response, next: NextFunction) {
  try {
    if (req.user!.role !== 'founder') throw new AppError('Only founders can post here', 403)

    const { message } = req.body as { message?: string }
    if (!message?.trim()) throw new AppError('Message is required', 400)

    const [saved] = await db.insert(founderChatMessages).values({
      senderId: req.user!.userId,
      message: message.trim(),
    }).returning()

    const event = {
      type: 'chat_message',
      data: {
        channel: 'founders',
        message: { ...saved, sender: await senderInfo(saved.senderId) },
      },
    }

    // Broadcast to all connected founders
    broadcastToRole('founder', event)

    res.status(201).json({ ...saved, sender: await senderInfo(saved.senderId) })
  } catch (err) { next(withContext(err as Error, 'postFounderMessage')) }
}

// ─── CPA-only chat ───────────────────────────────────────────────────────────

export async function getCpaMessages(req: Request, res: Response, next: NextFunction) {
  try {
    if (req.user!.role !== 'cpa' && req.user!.role !== 'admin') throw new AppError('Only CPAs and admins can access this chat', 403)

    const limit = Math.min(Number(req.query.limit) || DEFAULT_LIMIT, 100)
    const offset = Number(req.query.offset) || 0

    const total = (await db.select().from(cpaChatMessages)).length
    const messages = (await db.select().from(cpaChatMessages)
      .orderBy(desc(cpaChatMessages.createdAt))
      .limit(limit)
      .offset(offset))
      .reverse()

    const enrichedMessages = await Promise.all(messages.map(async m => ({ ...m, sender: await senderInfo(m.senderId) })))
    res.json({ messages: enrichedMessages, total, limit, offset })
  } catch (err) { next(withContext(err as Error, 'getCpaMessages')) }
}

export async function postCpaMessage(req: Request, res: Response, next: NextFunction) {
  try {
    if (req.user!.role !== 'cpa' && req.user!.role !== 'admin') throw new AppError('Only CPAs and admins can post here', 403)

    const { message } = req.body as { message?: string }
    if (!message?.trim()) throw new AppError('Message is required', 400)

    const [saved] = await db.insert(cpaChatMessages).values({
      senderId: req.user!.userId,
      message: message.trim(),
    }).returning()

    const event = {
      type: 'chat_message',
      data: {
        channel: 'cpas',
        message: { ...saved, sender: await senderInfo(saved.senderId) },
      },
    }

    broadcastToRole('cpa', event)
    broadcastToRole('admin', event)

    res.status(201).json({ ...saved, sender: await senderInfo(saved.senderId) })
  } catch (err) { next(withContext(err as Error, 'postCpaMessage')) }
}
