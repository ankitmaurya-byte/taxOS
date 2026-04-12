import { BaseAgent } from './base'
import { db } from '../db'
import { agentConversations, filings } from '../db/schema'
import { eq } from 'drizzle-orm'

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
- If the user gives an answer that does NOT relate to the question you asked (e.g. random text, jokes, unrelated topics), do NOT accept it as a valid answer.
- Politely acknowledge their message, then re-ask the same question.
- Example: "I appreciate the thought! However, I still need [the specific information]. Could you please provide that so we can continue?"
- Do NOT move to the next question until the current one is answered with relevant information.
- If the user asks an off-topic question (not tax-related), briefly say you're focused on the intake and redirect.

DATA EXTRACTION:
After each valid answer from the user, include a line at the END of your response in this exact format:
[COLLECTED: key=value]
Use camelCase keys matching the required fields. For example:
[COLLECTED: grossReceipts=2500000]
[COLLECTED: employeeCount=15]
You may include multiple [COLLECTED: ...] lines if the user provides multiple data points in one answer.
Only include this for data you are confident about — do not guess.
`

export class IntakeAgent extends BaseAgent {
  async startConversation(filingId: string, formType: string, entityContext: object, orgId: string) {
    const requiredFields = FORM_REQUIRED_FIELDS[formType] || FORM_REQUIRED_FIELDS.default

    const systemPrompt = `${INTAKE_SYSTEM_PROMPT}

Filing type: ${formType}
Required fields: ${requiredFields.join(', ')}
Entity context: ${JSON.stringify(entityContext)}
`
    const model = this.getModel(systemPrompt)
    const result = await model.generateContent('Please start the intake interview for this filing.')
    const content = result.response.text()

    // Create conversation record — store the initial user prompt + assistant response
    // so Gemini history always starts with 'user' role
    const convo = db.insert(agentConversations).values({
      filingId,
      orgId,
      agentType: 'intake',
      messages: [
        { role: 'user', content: 'Start the intake interview.', timestamp: new Date().toISOString() },
        { role: 'assistant', content, timestamp: new Date().toISOString() },
      ] as any,
      status: 'active',
    }).returning().get()

    // Update filing status
    db.update(filings).set({ status: 'ai_prep', updatedAt: new Date().toISOString() })
      .where(eq(filings.id, filingId)).run()

    await this.log({
      orgId,
      filingId,
      action: 'intake_started',
      reasoning: `Started intake questionnaire for Form ${formType}`,
    })

    return { conversationId: convo.id, message: content }
  }

  async *streamMessage(filingId: string, userMessage: string, orgId: string): AsyncGenerator<string> {
    const convo = db.select().from(agentConversations)
      .where(eq(agentConversations.filingId, filingId))
      .all()
      .find(c => c.agentType === 'intake' && c.status === 'active')

    if (!convo) throw new Error('No active intake conversation found')

    const messages = (convo.messages as Array<{ role: string; content: string; timestamp?: string }>) || []
    messages.push({ role: 'user', content: userMessage, timestamp: new Date().toISOString() })

    // Build Gemini history — must start with 'user' role
    const geminiHistory = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

    // Remove the last user message from history (it will be sent as the current message)
    const lastMessage = geminiHistory.pop()!
    const model = this.getModel(INTAKE_SYSTEM_PROMPT)
    const chat = model.startChat({ history: geminiHistory })

    const result = await chat.sendMessageStream(lastMessage.parts[0].text)

    let fullResponse = ''
    for await (const chunk of result.stream) {
      const text = chunk.text()
      if (text) {
        fullResponse += text
        yield text
      }
    }

    messages.push({ role: 'assistant', content: fullResponse, timestamp: new Date().toISOString() })

    // Check if intake is complete
    if (fullResponse.includes('INTAKE_COMPLETE:')) {
      db.update(agentConversations).set({
        messages: messages as any,
        status: 'completed',
        updatedAt: new Date().toISOString(),
      }).where(eq(agentConversations.id, convo.id)).run()

      await this.log({
        orgId,
        filingId,
        action: 'intake_completed',
        reasoning: 'All required information collected through intake interview',
      })
    } else {
      db.update(agentConversations).set({
        messages: messages as any,
        updatedAt: new Date().toISOString(),
      }).where(eq(agentConversations.id, convo.id)).run()
    }
  }
}
