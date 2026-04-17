import type { ZodType } from 'zod'

const FENCE_RE = /^\s*```(?:json)?\s*|\s*```\s*$/g

export function stripCodeFences(text: string): string {
  return text.replace(FENCE_RE, '').trim()
}

export class AgentOutputError extends Error {
  constructor(
    message: string,
    public readonly rawText: string,
    public readonly cause?: unknown,
  ) {
    super(message)
    this.name = 'AgentOutputError'
  }
}

export function parseAgentJson<T>(rawText: string, schema: ZodType<T>): T {
  const stripped = stripCodeFences(rawText)
  let parsed: unknown
  try {
    parsed = JSON.parse(stripped)
  } catch (err) {
    throw new AgentOutputError(
      `Agent returned non-JSON output: ${truncate(stripped, 200)}`,
      rawText,
      err,
    )
  }
  const validated = schema.safeParse(parsed)
  if (!validated.success) {
    throw new AgentOutputError(
      `Agent output failed schema validation: ${validated.error.issues
        .map((i) => `${i.path.join('.')} ${i.message}`)
        .join('; ')}`,
      rawText,
      validated.error,
    )
  }
  return validated.data
}

export function safeJsonParse<T = unknown>(raw: unknown, fallback: T): T {
  if (raw == null) return fallback
  if (typeof raw !== 'string') return (raw as T) ?? fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : `${s.slice(0, n)}…`
}
