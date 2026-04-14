/**
 * WebSocket Service
 *
 * Provides real-time bidirectional communication for chat channels.
 * Filing workflow notifications continue to use SSE (sse.service.ts).
 *
 * Connection URL: ws://<host>/ws?token=<jwt>
 *
 * Broadcast helpers:
 *   broadcastToOrg(orgId, event)    — org chat recipients
 *   broadcastToRole(role, event)    — founders chat / CPA chat
 *   broadcastToUser(userId, event)  — single user
 */

import { WebSocketServer, WebSocket } from 'ws'
import { IncomingMessage, Server } from 'http'
import jwt from 'jsonwebtoken'

interface UserConn {
  ws: WebSocket
  userId: string
  orgId: string
  role: string
}

const connections = new Map<string, UserConn>()

export function createWsServer(httpServer: Server): WebSocketServer {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' })

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    // Parse token from query string
    const rawUrl = req.url ?? ''
    const qs = rawUrl.includes('?') ? rawUrl.split('?')[1] : ''
    const params = new URLSearchParams(qs)
    const token = params.get('token')

    if (!token) {
      ws.close(1008, 'Unauthorized')
      return
    }

    let payload: any
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET as string)
    } catch {
      ws.close(1008, 'Invalid token')
      return
    }

    const connId = `${payload.userId}-${Date.now()}-${Math.random().toString(36).slice(2)}`
    connections.set(connId, {
      ws,
      userId: payload.userId,
      orgId: payload.orgId ?? '',
      role: payload.role ?? 'founder',
    })

    ws.send(JSON.stringify({ type: 'ws_connected' }))

    ws.on('close', () => connections.delete(connId))
    ws.on('error', () => connections.delete(connId))
  })

  return wss
}

function send(conn: UserConn, event: object) {
  if (conn.ws.readyState === WebSocket.OPEN) {
    conn.ws.send(JSON.stringify(event))
  }
}

/** Send to all members of an org (founders, team_members) and CPAs assigned to it.
 *  For CPAs, the chat controller already filters assignment; we just broadcast to same orgId. */
export function broadcastToOrg(orgId: string, event: object) {
  for (const conn of connections.values()) {
    if (conn.orgId === orgId) send(conn, event)
  }
}

/** Send to all connected users with a given role. */
export function broadcastToRole(role: string, event: object) {
  for (const conn of connections.values()) {
    if (conn.role === role) send(conn, event)
  }
}

/** Send to a specific user (all their open tabs). */
export function broadcastToUser(userId: string, event: object) {
  for (const conn of connections.values()) {
    if (conn.userId === userId) send(conn, event)
  }
}
