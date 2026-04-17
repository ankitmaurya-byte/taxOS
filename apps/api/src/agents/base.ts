import { GoogleGenerativeAI, GenerativeModel, Part } from '@google/generative-ai'
import type { ZodTypeAny, z } from 'zod'
import { auditLogger } from '../lib/auditLog'
import { AgentOutputError, parseAgentJson } from './lib/json'

const DEFAULT_TIMEOUT_MS = 30_000
const DEFAULT_MAX_ATTEMPTS = 3
const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504])

type PromptContent = string | Part[]

interface GenerateOptions {
  systemInstruction?: string
  timeoutMs?: number
  maxAttempts?: number
}

export abstract class BaseAgent {
  protected client: GoogleGenerativeAI
  protected modelVersion = 'gemini-2.5-flash'

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set')
    this.client = new GoogleGenerativeAI(apiKey)
  }

  protected getModel(systemInstruction?: string): GenerativeModel {
    return this.client.getGenerativeModel({
      model: this.modelVersion,
      ...(systemInstruction ? { systemInstruction } : {}),
    })
  }

  /** Run a generateContent call with timeout + retry on transient errors. */
  protected async generateText(
    content: PromptContent,
    options: GenerateOptions = {},
  ): Promise<string> {
    const model = this.getModel(options.systemInstruction)
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
    const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS

    let lastErr: unknown
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await withTimeout(
          model.generateContent(content as any),
          timeoutMs,
        )
        return result.response.text()
      } catch (err) {
        lastErr = err
        if (!isRetryable(err) || attempt === maxAttempts) throw err
        await sleep(backoffMs(attempt))
      }
    }
    throw lastErr
  }

  /** Run generateContent and parse+validate JSON output. Throws AgentOutputError on failure. */
  protected async generateJson<S extends ZodTypeAny>(
    content: PromptContent,
    schema: S,
    options: GenerateOptions = {},
  ): Promise<z.output<S>> {
    const text = await this.generateText(content, options)
    return parseAgentJson(text, schema) as z.output<S>
  }

  protected async log(params: {
    orgId: string
    filingId?: string | null
    action: string
    reasoning: string
    inputs?: Record<string, unknown>
    outputs?: Record<string, unknown>
    confidenceScore?: number
  }) {
    return auditLogger.log({
      ...params,
      actorType: 'ai',
      actorId: `agent:${this.constructor.name}`,
      modelVersion: this.modelVersion,
    })
  }

  protected shouldEscalate(score: number, threshold = 0.75): boolean {
    return score < threshold
  }
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const handle = setTimeout(() => reject(new Error(`Agent call timed out after ${ms}ms`)), ms)
    p.then(
      (v) => { clearTimeout(handle); resolve(v) },
      (e) => { clearTimeout(handle); reject(e) },
    )
  })
}

function isRetryable(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  if (/timed out/i.test(err.message)) return true
  const status = (err as { status?: number }).status
  if (typeof status === 'number' && RETRYABLE_STATUSES.has(status)) return true
  return /\b(429|500|502|503|504)\b/.test(err.message)
}

function backoffMs(attempt: number): number {
  return Math.min(4_000, 500 * 2 ** (attempt - 1))
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export { AgentOutputError }
