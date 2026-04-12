// Used in: App.tsx — route /chat (AI tax Q&A chat page)
import { useState, useRef, useEffect } from 'react'
import { api } from '@/lib/api'
import {
  Bot,
  Send,
  ThumbsUp,
  ThumbsDown,
  Plus,
  FileText,
  Calculator,
  Shield,
  Building2,
  Calendar,
  HelpCircle,
  Zap,
  AlertTriangle,
  DollarSign,
  BookOpen,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth'
import type { LucideIcon } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface Conversation {
  id: string
  title: string
  messages: Message[]
  preview: string
  time: string
}

const CHAT_CONFIG = {
  admin: {
    title: 'TaxOS Admin Copilot',
    description: 'Review founder onboarding, CPA assignments, and platform-level operations.',
    placeholder: 'Ask about founders, CPAs, or platform operations...',
    prefix: 'You are assisting a TaxOS platform admin. Focus on founder onboarding reviews, CPA assignment workflows, account governance, and platform operations. Do not answer as if the admin is operating a founder workspace unless explicitly asked.',
  },
  founder: {
    title: 'Founder Tax Copilot',
    description: 'Manage your company filings, deadlines, entities, and compliance decisions.',
    placeholder: 'Ask about filings, entities, deadlines, or founder approvals...',
    prefix: 'You are assisting a founder inside TaxOS. Focus on entity management, filings, deadlines, founder approvals, documents, and compliance actions for their organization.',
  },
  cpa: {
    title: 'CPA Review Copilot',
    description: 'Support filing review, tax reasoning, document checks, and escalation decisions.',
    placeholder: 'Ask about review steps, filing issues, or tax analysis...',
    prefix: 'You are assisting a CPA inside TaxOS. Focus on filing review, tax analysis, document validation, risk flags, and handoff decisions for assigned organizations.',
  },
  team_member: {
    title: 'Workspace Assistant',
    description: 'Help within the modules your founder enabled for you.',
    placeholder: 'Ask about your assigned workspace tasks...',
    prefix: 'You are assisting a team member inside TaxOS. Focus on the tasks they may perform in filings, documents, and approvals based on granted permissions.',
  },
} as const

// ─── Action Library ──────────────────────────────────
interface ActionItem {
  icon: LucideIcon
  label: string
  prompt: string
  color: string
}

interface ActionCategory {
  title: string
  actions: ActionItem[]
}

const FOUNDER_ACTIONS: ActionCategory[] = [
  {
    title: 'Filings & Compliance',
    actions: [
      { icon: FileText, label: 'What filings are due this quarter?', prompt: 'What tax filings are due for my company this quarter? List them with deadlines.', color: 'text-[#6C5CE7] bg-[#F3F0FF]' },
      { icon: Calendar, label: 'Show my upcoming deadlines', prompt: 'Show me all upcoming tax deadlines for my entities, sorted by urgency.', color: 'text-[#F59E0B] bg-[#FFFBEB]' },
      { icon: AlertTriangle, label: 'Am I at risk of an IRS audit?', prompt: 'Based on my current filings and entity profile, what is my estimated IRS audit risk? What factors increase my risk?', color: 'text-[#EF4444] bg-[#FEF2F2]' },
      { icon: Shield, label: 'Check my compliance status', prompt: 'Give me an overall compliance health check. Are there any overdue filings, missing documents, or pending actions I should address?', color: 'text-[#15803D] bg-[#F0FDF4]' },
    ],
  },
  {
    title: 'Tax Strategy',
    actions: [
      { icon: Calculator, label: 'Estimate my quarterly taxes', prompt: 'Help me estimate my quarterly estimated tax payments. What do I need to calculate them?', color: 'text-[#6C5CE7] bg-[#F3F0FF]' },
      { icon: DollarSign, label: 'R&D tax credit eligibility', prompt: 'Am I eligible for the R&D tax credit? What qualifying activities and expenses should I track?', color: 'text-[#15803D] bg-[#F0FDF4]' },
      { icon: Zap, label: 'Tax saving opportunities', prompt: 'What are the top tax deductions and credits available to my type of company? How can I reduce my tax liability legally?', color: 'text-[#F59E0B] bg-[#FFFBEB]' },
      { icon: BookOpen, label: 'Explain Section 174 rules', prompt: 'Explain the Section 174 R&D amortization rules. How do they affect my tax filings starting from 2022?', color: 'text-[#3B82F6] bg-[#EFF6FF]' },
    ],
  },
  {
    title: 'Entity & Structure',
    actions: [
      { icon: Building2, label: 'C-Corp vs S-Corp — which is better?', prompt: 'Compare C-Corp vs S-Corp for my situation. What are the tax implications of each structure?', color: 'text-[#6C5CE7] bg-[#F3F0FF]' },
      { icon: HelpCircle, label: 'Do I need a foreign subsidiary filing?', prompt: 'Do I need to file Form 5471 or 5472 for foreign-related transactions? When are these required?', color: 'text-[#3B82F6] bg-[#EFF6FF]' },
    ],
  },
]

const CPA_ACTIONS: ActionCategory[] = [
  {
    title: 'Review & Analysis',
    actions: [
      { icon: FileText, label: 'Filing review checklist', prompt: 'Give me a comprehensive checklist for reviewing a 1120 corporate tax return before sending it to the founder for approval.', color: 'text-[#6C5CE7] bg-[#F3F0FF]' },
      { icon: AlertTriangle, label: 'Common audit red flags', prompt: 'What are the most common IRS audit triggers for C-Corps? What should I look for when reviewing filings?', color: 'text-[#EF4444] bg-[#FEF2F2]' },
      { icon: Calculator, label: 'Verify estimated tax calculations', prompt: 'Walk me through how to verify quarterly estimated tax payments for a corporation. What are the safe harbor rules?', color: 'text-[#F59E0B] bg-[#FFFBEB]' },
      { icon: Shield, label: 'Document validation best practices', prompt: 'What documents should I verify before approving a filing? What are red flags in uploaded financial documents?', color: 'text-[#15803D] bg-[#F0FDF4]' },
    ],
  },
  {
    title: 'Tax Knowledge',
    actions: [
      { icon: DollarSign, label: 'Officer compensation rules', prompt: 'Explain the IRS reasonable compensation rules for S-Corp officers. What benchmarks should I use?', color: 'text-[#6C5CE7] bg-[#F3F0FF]' },
      { icon: BookOpen, label: 'Form 5472 requirements', prompt: 'When is Form 5472 required for foreign-owned US corporations? What transactions must be reported?', color: 'text-[#3B82F6] bg-[#EFF6FF]' },
    ],
  },
]

const ADMIN_ACTIONS: ActionCategory[] = [
  {
    title: 'Platform Operations',
    actions: [
      { icon: Building2, label: 'Onboarding checklist for founders', prompt: 'What is the standard onboarding flow for new founders? What documents do we verify before activating their account?', color: 'text-[#6C5CE7] bg-[#F3F0FF]' },
      { icon: Shield, label: 'CPA assignment best practices', prompt: 'How should I assign CPAs to organizations? What factors determine the best CPA for a given company?', color: 'text-[#15803D] bg-[#F0FDF4]' },
      { icon: AlertTriangle, label: 'Review suspicious activity patterns', prompt: 'What patterns should I watch for that might indicate fraudulent founder applications or suspicious account activity?', color: 'text-[#EF4444] bg-[#FEF2F2]' },
    ],
  },
]

const TEAM_MEMBER_ACTIONS: ActionCategory[] = [
  {
    title: 'Common Tasks',
    actions: [
      { icon: FileText, label: 'How do I upload a document?', prompt: 'Walk me through how to upload and tag a document in TaxOS. What file types are supported?', color: 'text-[#6C5CE7] bg-[#F3F0FF]' },
      { icon: HelpCircle, label: 'What can I access?', prompt: 'Based on my permissions, what actions can I perform in TaxOS? What modules are available to me?', color: 'text-[#3B82F6] bg-[#EFF6FF]' },
      { icon: Calendar, label: 'Show upcoming deadlines', prompt: 'What tax deadlines are coming up for my organization?', color: 'text-[#F59E0B] bg-[#FFFBEB]' },
    ],
  },
]

function getActionsForRole(role: string): ActionCategory[] {
  switch (role) {
    case 'founder': return FOUNDER_ACTIONS
    case 'cpa': return CPA_ACTIONS
    case 'admin': return ADMIN_ACTIONS
    case 'team_member': return TEAM_MEMBER_ACTIONS
    default: return TEAM_MEMBER_ACTIONS
  }
}

export function ChatPage() {
  const user = useAuthStore((state) => state.user)
  const role = user?.role || 'team_member'
  const config = CHAT_CONFIG[role as keyof typeof CHAT_CONFIG] || CHAT_CONFIG.team_member
  const actionLibrary = getActionsForRole(role)

  const [conversations, setConversations] = useState<Conversation[]>([
    {
      id: '1',
      title: config.title,
      messages: [],
      preview: config.description,
      time: 'Just now',
    },
  ])
  const [activeId, setActiveId] = useState('1')
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [showActionLibrary, setShowActionLibrary] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const active = conversations.find((c) => c.id === activeId)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [active?.messages])

  // Hide action library once a message is sent
  useEffect(() => {
    if (active && active.messages.length > 0) {
      setShowActionLibrary(false)
    } else {
      setShowActionLibrary(true)
    }
  }, [active?.messages.length])

  const sendMessage = async (text: string) => {
    if (!text.trim() || isStreaming || !active) return
    const userMsg = text.trim()
    setInput('')

    const userMessage: Message = {
      role: 'user',
      content: userMsg,
      timestamp: new Date().toLocaleTimeString(),
    }

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeId
          ? { ...c, messages: [...c.messages, userMessage], preview: userMsg, title: userMsg.slice(0, 40) + (userMsg.length > 40 ? '...' : '') }
          : c,
      ),
    )

    setIsStreaming(true)
    try {
      let fullResponse = ''
      await api.streamTaxQa(`${config.prefix}\n\nUser question: ${userMsg}`, (chunk: string) => {
        fullResponse += chunk
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== activeId) return c
            const msgs = [...c.messages]
            const lastIdx = msgs.length - 1
            if (msgs[lastIdx]?.role === 'assistant') {
              msgs[lastIdx] = { ...msgs[lastIdx], content: fullResponse }
            } else {
              msgs.push({
                role: 'assistant',
                content: fullResponse,
                timestamp: new Date().toLocaleTimeString(),
              })
            }
            return { ...c, messages: msgs }
          }),
        )
      })
    } catch {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeId
            ? {
                ...c,
                messages: [
                  ...c.messages,
                  {
                    role: 'assistant',
                    content: 'Sorry, something went wrong. Please try again.',
                    timestamp: new Date().toLocaleTimeString(),
                  },
                ],
              }
            : c,
        ),
      )
    } finally {
      setIsStreaming(false)
    }
  }

  const handleSend = () => sendMessage(input)

  const handleActionClick = (prompt: string) => {
    sendMessage(prompt)
  }

  const newConversation = () => {
    const id = Date.now().toString()
    setConversations((prev) => [
      ...prev,
      { id, title: 'New Chat', messages: [], preview: 'Start a new conversation', time: 'Just now' },
    ])
    setActiveId(id)
  }

  return (
    <div className="flex h-[calc(100vh-56px)] -m-8 bg-white">
      {/* Conversation list */}
      <div className="w-60 border-r border-[#E5E7EB] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-[#E5E7EB]">
          <h2 className="text-sm font-semibold text-[#111827]">Conversations</h2>
          <button
            onClick={newConversation}
            className="p-1.5 text-[#9CA3AF] hover:text-[#6C5CE7] hover:bg-[#EDE9FD] rounded transition-colors"
          >
            <Plus size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveId(c.id)}
              className={`w-full text-left px-4 py-3 border-b border-[#F3F4F6] transition-colors ${
                c.id === activeId ? 'bg-[#EDE9FD]' : 'hover:bg-[#F9FAFB]'
              }`}
            >
              <p className="text-sm font-medium text-[#111827] truncate">{c.title}</p>
              <p className="text-xs text-[#6B7280] truncate mt-0.5">{c.preview}</p>
              <p className="text-[10px] text-[#9CA3AF] mt-1">{c.time}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {active?.messages.length === 0 && showActionLibrary && (
            <div className="flex flex-col items-center pt-4">
              {/* Header */}
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center mb-4">
                <Bot size={24} className="text-white" />
              </div>
              <h3 className="text-lg font-semibold text-[#111827] mb-1">{config.title}</h3>
              <p className="text-sm text-[#6B7280] max-w-md text-center mb-8">
                {config.description}
              </p>

              {/* Action Library */}
              <div className="w-full max-w-2xl space-y-6">
                <div className="flex items-center gap-2 mb-2">
                  <Zap size={16} className="text-[#6C5CE7]" />
                  <h4 className="text-sm font-semibold text-[#111827]">Action Library</h4>
                  <span className="text-xs text-[#9CA3AF]">Click any action to get started</span>
                </div>

                {actionLibrary.map((category) => (
                  <div key={category.title}>
                    <p className="text-xs font-medium text-[#6B7280] uppercase tracking-wide mb-2">
                      {category.title}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {category.actions.map((action) => (
                        <button
                          key={action.label}
                          onClick={() => handleActionClick(action.prompt)}
                          disabled={isStreaming}
                          className="flex items-start gap-3 rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-left transition-all hover:border-[#D8D3FF] hover:shadow-sm disabled:opacity-50 group"
                        >
                          <div className={`flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0 ${action.color}`}>
                            <action.icon size={16} />
                          </div>
                          <span className="text-[13px] text-[#374151] leading-snug group-hover:text-[#111827]">
                            {action.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {active?.messages.map((msg, i) =>
            msg.role === 'user' ? (
              <div key={i} className="flex justify-end">
                <div className="max-w-md">
                  <div className="bg-[#6C5CE7] text-white rounded-xl rounded-br-sm px-4 py-3 text-[13px]">
                    {msg.content}
                  </div>
                  <p className="text-[11px] text-[#9CA3AF] mt-1 text-right">{msg.timestamp}</p>
                </div>
              </div>
            ) : (
              <div key={i} className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center flex-shrink-0">
                  <Bot size={14} className="text-white" />
                </div>
                <div className="max-w-lg">
                  <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl rounded-tl-sm px-4 py-3 text-[13px] text-[#111827] whitespace-pre-wrap">
                    {msg.content}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <button className="text-[#9CA3AF] hover:text-[#6B7280]">
                      <ThumbsUp size={13} />
                    </button>
                    <button className="text-[#9CA3AF] hover:text-[#6B7280]">
                      <ThumbsDown size={13} />
                    </button>
                    <span className="text-[11px] text-[#9CA3AF]">{msg.timestamp}</span>
                  </div>
                </div>
              </div>
            ),
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick actions when conversation has messages */}
        {active && active.messages.length > 0 && !isStreaming && (
          <div className="border-t border-[#F3F4F6] px-6 py-2 flex gap-2 overflow-x-auto">
            {actionLibrary[0]?.actions.slice(0, 3).map((action) => (
              <button
                key={action.label}
                onClick={() => handleActionClick(action.prompt)}
                className="flex items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs text-[#6B7280] hover:border-[#D8D3FF] hover:text-[#6C5CE7] transition-colors whitespace-nowrap flex-shrink-0"
              >
                <action.icon size={12} />
                {action.label.length > 35 ? action.label.slice(0, 35) + '...' : action.label}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="border-t border-[#E5E7EB] bg-[#F9FAFB] p-4">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={config.placeholder}
              className="flex-1 bg-white border border-[#E5E7EB] rounded-lg px-4 py-2.5 text-[13px] text-[#111827] placeholder:text-[#9CA3AF] outline-none focus:border-[#6C5CE7] transition-colors"
            />
            <button
              onClick={handleSend}
              disabled={isStreaming || !input.trim()}
              className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#6C5CE7] text-white hover:bg-[#5B4BD5] disabled:opacity-50 transition-colors"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
