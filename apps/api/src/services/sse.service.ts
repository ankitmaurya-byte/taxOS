/**
 * SSE Service — manages server-sent event connections.
 *
 * Connections are keyed by userId. Each user can have multiple connections
 * (e.g. multiple browser tabs). Messages are fanned out to all connections
 * for a given user / role / org.
 */

import { Response } from 'express'

interface SseConnection {
  userId: string
  role: string
  orgIds: string[]
  response: Response
  connectedAt: string
}

// Map<userId, SseConnection[]>
const connections = new Map<string, SseConnection[]>()

export function addConnection(conn: SseConnection): void {
  const existing = connections.get(conn.userId) ?? []
  connections.set(conn.userId, [...existing, conn])
}

export function removeConnection(userId: string, response: Response): void {
  const existing = connections.get(userId) ?? []
  const updated = existing.filter(c => c.response !== response)
  if (updated.length === 0) {
    connections.delete(userId)
  } else {
    connections.set(userId, updated)
  }
}

function writeEvent(conn: SseConnection, event: { type: string; data: unknown }): boolean {
  try {
    conn.response.write(`data: ${JSON.stringify(event)}\n\n`)
    return true
  } catch {
    return false
  }
}

export function sendToUser(userId: string, event: { type: string; data: unknown }): void {
  const userConns = connections.get(userId) ?? []
  const alive: SseConnection[] = []
  for (const conn of userConns) {
    if (writeEvent(conn, event)) alive.push(conn)
  }
  if (alive.length !== userConns.length) {
    connections.set(userId, alive)
  }
}

export function sendToUsers(userIds: string[], event: { type: string; data: unknown }): void {
  for (const uid of userIds) sendToUser(uid, event)
}

export function sendToRole(role: string, event: { type: string; data: unknown }): void {
  for (const [userId, userConns] of connections) {
    const alive: SseConnection[] = []
    for (const conn of userConns) {
      if (conn.role === role) {
        if (writeEvent(conn, event)) alive.push(conn)
      } else {
        alive.push(conn)
      }
    }
    if (alive.length !== userConns.length) connections.set(userId, alive)
  }
}

export function sendToOrg(orgId: string, event: { type: string; data: unknown }): void {
  for (const [userId, userConns] of connections) {
    const alive: SseConnection[] = []
    for (const conn of userConns) {
      if (conn.orgIds.includes(orgId)) {
        if (writeEvent(conn, event)) alive.push(conn)
      } else {
        alive.push(conn)
      }
    }
    if (alive.length !== userConns.length) connections.set(userId, alive)
  }
}

export function getConnectionCount(): number {
  let count = 0
  for (const conns of connections.values()) count += conns.length
  return count
}
