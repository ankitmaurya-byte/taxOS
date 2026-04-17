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

export function friendlyAgentError(raw: string): { code: string; message: string } {
  const lower = raw.toLowerCase()
  if (lower.includes('429') || lower.includes('quota') || lower.includes('rate-limit') || lower.includes('too many requests')) {
    return {
      code: 'ai_quota_exceeded',
      message: 'AI limit exceeded. Please upgrade your plan or contact the TaxOS team.',
    }
  }
  if (lower.includes('api key') || lower.includes('permission_denied') || lower.includes('unauthorized')) {
    return {
      code: 'ai_unauthorized',
      message: 'AI service is not configured correctly. Please contact the TaxOS team.',
    }
  }
  return { code: 'ai_error', message: raw || 'Stream failed' }
}

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
        const friendly = friendlyAgentError(payload.error)
        writeSSE(res, { error: friendly.message, code: friendly.code })
      }
    }
  } catch (err) {
    const raw = err instanceof Error ? err.message : 'Stream failed'
    const friendly = friendlyAgentError(raw)
    writeSSE(res, { error: friendly.message, code: friendly.code })
  } finally {
    closeSSE(res)
  }
}
