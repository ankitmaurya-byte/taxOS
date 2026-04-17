import type { Response } from 'express'

export function openSSE(res: Response) {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
}

export function writeSSE(res: Response, payload: unknown) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`)
}

export function closeSSE(res: Response) {
  res.write('data: [DONE]\n\n')
  res.end()
}

export type SsePayload =
  | { type: 'text'; text: string }
  | { type: 'metadata'; metadata: Record<string, unknown> }
  | { type: 'error'; error: string }

export async function pumpSSE(
  res: Response,
  gen: AsyncGenerator<SsePayload>,
) {
  openSSE(res)
  try {
    for await (const payload of gen) {
      if (payload.type === 'text') {
        writeSSE(res, { text: payload.text })
      } else if (payload.type === 'metadata') {
        writeSSE(res, { metadata: payload.metadata })
      } else if (payload.type === 'error') {
        writeSSE(res, { error: payload.error })
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Stream failed'
    writeSSE(res, { error: message })
  } finally {
    closeSSE(res)
  }
}
