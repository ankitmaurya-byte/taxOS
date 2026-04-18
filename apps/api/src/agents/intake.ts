import { BaseAgent } from './base'
import { db } from '../db'
import { agentConversations, filings } from '../db/schema'
import { eq } from 'drizzle-orm'
import type { SsePayload } from './lib/sse'

const FORM_REQUIRED_FIELDS: Record<string, string[]> = {
  '1120': ['grossReceipts', 'totalDeductions', 'officerCompensation', 'taxableIncome', 'estimatedTaxPayments'],
  '5472': ['reportableTransactions', 'foreignOwnerInfo', 'transactionAmounts'],
  '5471': ['foreignCorpInfo', 'usShareholderInfo', 'incomeStatement', 'balanceSheet'],
  '7004': ['estimatedTax', 'extensionType'],
  default: ['revenue', 'expenses', 'entityDetails'],
}

const INTAKE_SYSTEM_PROMPT = `
You are TaxOS Intake Agent, an expert US tax assistant conducting a filing intake interview.

Your job is to collect all required information for the specified filing type through
a natural conversation — NOT a form. Ask one question at a time. Be friendly, clear,
and avoid jargon. If the founder uses a term incorrectly, gently correct them.

Rules:
1. Ask ONLY one question per message
2. Acknowledge the previous answer before asking the next question
3. If an answer is ambiguous, ask for clarification
4. When you have all required data, output a JSON block starting with "INTAKE_COMPLETE:"
5. Always explain WHY you need each piece of information
6. If the founder asks a tax question, answer it briefly then return to the intake

IMPORTANT — Handling off-topic or irrelevant answers:
- If the user gives an answer that does NOT relate to the question you asked, do NOT accept it.
- Politely acknowledge their message, then re-ask the same question.
- Do NOT move to the next question until the current one is answered with relevant information.
- If the user asks an off-topic question, briefly say you are focused on the intake and redirect.

DATA EXTRACTION:
After each valid answer, include one or more lines at the END of your response, each on its own line, in EXACTLY this format:
[COLLECTED: key=value]
Use camelCase keys matching the required fields. Examples:
[COLLECTED: grossReceipts=2500000]
[COLLECTED: employeeCount=15]
Only include a [COLLECTED:] line for data you are confident about. Do not guess.
`

const COLLECTED_RE = /\[COLLECTED:\s*([a-zA-Z][a-zA-Z0-9_]*)\s*=\s*([^\]\n]+?)\s*\]/g

export class IntakeAgent extends BaseAgent {
  async startConversation(filingId: string, formType: string, entityContext: object, orgId: string) {
    const requiredFields = FORM_REQUIRED_FIELDS[formType] || FORM_REQUIRED_FIELDS.default

    const systemPrompt = `${INTAKE_SYSTEM_PROMPT}

Filing type: ${formType}
Required fields: ${requiredFields.join(', ')}
Entity context: ${JSON.stringify(entityContext)}
`
    const raw = await this.generateText('Please start the intake interview for this filing.', {
      systemInstruction: systemPrompt,
    })
    const { visibleText } = extractCollected(raw)

    const now = new Date().toISOString()
    const [convo] = await db.insert(agentConversations).values({
      filingId,
      orgId,
      agentType: 'intake',
      messages: [
        { role: 'user', content: 'Start the intake interview.', timestamp: now },
        { role: 'assistant', content: raw, timestamp: now },
      ] as any,
      status: 'active',
    }).returning()

    await db.update(filings).set({ status: 'ai_prep', updatedAt: now })
      .where(eq(filings.id, filingId))

    await this.log({
      orgId,
      filingId,
      action: 'intake_started',
      reasoning: `Started intake questionnaire for Form ${formType}`,
    })

    return { conversationId: convo.id, message: visibleText }
  }

  async *streamMessage(filingId: string, userMessage: string, orgId: string): AsyncGenerator<SsePayload> {
    const convos = await db.select().from(agentConversations)
      .where(eq(agentConversations.filingId, filingId))
    const convo = convos.find(c => c.agentType === 'intake' && c.status === 'active')

    if (!convo) throw new Error('No active intake conversation found')

    const messages = (convo.messages as Array<{ role: string; content: string; timestamp?: string }>) || []
    const now = new Date().toISOString()
    messages.push({ role: 'user', content: userMessage, timestamp: now })

    const geminiHistory = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))
    const lastMessage = geminiHistory.pop()!

    const model = this.getModel(INTAKE_SYSTEM_PROMPT)
    const chat = model.startChat({ history: geminiHistory })
    const result = await chat.sendMessageStream(lastMessage.parts[0].text)

    const stripper = new StreamingCollectedStripper()
    let fullResponse = ''
    for await (const chunk of result.stream) {
      const text = chunk.text()
      if (!text) continue
      fullResponse += text
      const visible = stripper.push(text)
      if (visible) yield { type: 'text', text: visible }
    }
    const tail = stripper.flush()
    if (tail) yield { type: 'text', text: tail }

    const { collected } = extractCollected(fullResponse)
    messages.push({ role: 'assistant', content: fullResponse, timestamp: new Date().toISOString() })

    const isComplete = fullResponse.includes('INTAKE_COMPLETE:')

    // Persist collected fields onto the filing
    if (Object.keys(collected).length > 0) {
      const filing = (await db.select().from(filings).where(eq(filings.id, filingId)).limit(1))[0]
      const merged = { ...(filing?.filingData || {}), ...collected }
      await db.update(filings).set({
        filingData: merged as any,
        updatedAt: new Date().toISOString(),
      }).where(eq(filings.id, filingId))
    }

    await db.update(agentConversations).set({
      messages: messages as any,
      status: isComplete ? 'completed' : 'active',
      updatedAt: new Date().toISOString(),
    }).where(eq(agentConversations.id, convo.id))

    if (isComplete) {
      await this.log({
        orgId,
        filingId,
        action: 'intake_completed',
        reasoning: 'All required information collected through intake interview',
        outputs: { collectedKeys: Object.keys(collected) },
      })
    } else if (Object.keys(collected).length > 0) {
      await this.log({
        orgId,
        filingId,
        action: 'intake_data_collected',
        reasoning: `Collected ${Object.keys(collected).length} field(s) from intake response`,
        outputs: { collected },
      })
    }

    if (Object.keys(collected).length > 0 || isComplete) {
      yield {
        type: 'metadata',
        metadata: { collected, isComplete },
      }
    }
  }
}

// ─── Helpers ─────────────────────────────────────────

function extractCollected(text: string): { visibleText: string; collected: Record<string, string> } {
  const collected: Record<string, string> = {}
  let match: RegExpExecArray | null
  const re = new RegExp(COLLECTED_RE.source, 'g')
  while ((match = re.exec(text)) !== null) {
    const [, key, value] = match
    collected[key] = value.trim()
  }
  const visibleText = text.replace(re, '').replace(/\n{3,}/g, '\n\n').trim()
  return { visibleText, collected }
}

/**
 * Streams assistant text while stripping `[COLLECTED: ...]` markers. Because
 * a marker can straddle chunk boundaries, we buffer suspicious tails until
 * we are sure they cannot match.
 */
class StreamingCollectedStripper {
  private buffer = ''

  push(chunk: string): string {
    this.buffer += chunk
    const cleaned = this.buffer.replace(COLLECTED_RE, '')
    // Hold back any trailing partial '[COLLECTED:...' that might continue next chunk.
    const openIdx = cleaned.lastIndexOf('[')
    if (openIdx !== -1 && !cleaned.slice(openIdx).includes(']')) {
      this.buffer = cleaned.slice(openIdx)
      return cleaned.slice(0, openIdx)
    }
    this.buffer = ''
    return cleaned
  }

  flush(): string {
    const tail = this.buffer.replace(COLLECTED_RE, '')
    this.buffer = ''
    return tail
  }
}
