import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai'
import { auditLogger } from '../lib/auditLog'

export abstract class BaseAgent {
  protected client: GoogleGenerativeAI
  protected modelVersion = 'gemini-2.5-flash'

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set')
    this.client = new GoogleGenerativeAI(apiKey)
  }

  this.client = new GoogleGenerativeAI(apiKey)
}
  protected getModel(systemInstruction?: string): GenerativeModel {
    return this.client.getGenerativeModel({
      model: this.modelVersion,
      ...(systemInstruction ? { systemInstruction } : {}),
    })
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
