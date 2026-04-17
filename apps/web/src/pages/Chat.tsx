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
  MessageSquare,
  Users,
  Briefcase,
  ChevronDown,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth'
import { notify } from '@/stores/notifications'
import type { LucideIcon } from 'lucide-react'
import { ChatRoom } from '@/components/ChatRoom'

// ─── Markdown + Metadata rendering ───────────────────

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[\s\S]+?\*\*|\*[^*\n]+\*|`[^`\n]+`)/)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4)
      return <strong key={i} className="font-semibold text-[#061b31]">{part.slice(2, -2)}</strong>
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2)
      return <em key={i} className="italic">{part.slice(1, -1)}</em>
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2)
      return <code key={i} className="bg-[#f6f9fc] border border-[#e5edf5] px-1 py-0.5 rounded text-[11px] font-mono">{part.slice(1, -1)}</code>
    return <span key={i}>{part}</span>
  })
}

function MarkdownBody({ text }: { text: string }) {
  const lines = text.split('\n')
  const nodes: React.ReactNode[] = []
  let i = 0
  let k = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith('### ')) {
      nodes.push(
        <h3 key={k++} className="text-[13px] font-bold text-[#061b31] mt-3 mb-1 first:mt-0">
          {renderInline(line.slice(4))}
        </h3>
      )
      i++
    } else if (line.startsWith('## ')) {
      nodes.push(
        <h2 key={k++} className="text-sm font-bold text-[#061b31] mt-4 mb-1.5 first:mt-0">
          {renderInline(line.slice(3))}
        </h2>
      )
      i++
    } else if (line.startsWith('# ')) {
      nodes.push(
        <h1 key={k++} className="text-sm font-bold text-[#061b31] mt-4 mb-1.5 first:mt-0">
          {renderInline(line.slice(2))}
        </h1>
      )
      i++
    } else if (/^\s*(\d+\.|\*|-)\s/.test(line)) {
      const isOrdered = /^\s*\d+\./.test(line)
      const items: { text: string; indent: number }[] = []
      while (i < lines.length && /^\s*(\d+\.|\*|-)\s/.test(lines[i])) {
        const indent = lines[i].match(/^(\s*)/)?.[1].length ?? 0
        const itemText = lines[i].replace(/^\s*(\d+\.|\*|-)\s+/, '')
        items.push({ text: itemText, indent })
        i++
      }
      const Tag = isOrdered ? 'ol' : 'ul'
      nodes.push(
        <Tag key={k++} className={`my-2 space-y-0.5 ${isOrdered ? 'list-decimal' : 'list-disc'} pl-4`}>
          {items.map((item, j) => (
            <li
              key={j}
              className="text-[13px] text-[#273951] leading-relaxed"
              style={{ marginLeft: item.indent > 0 ? item.indent * 3 : 0 }}
            >
              {renderInline(item.text)}
            </li>
          ))}
        </Tag>
      )
    } else if (line.trim() === '') {
      i++
    } else {
      const paras: string[] = []
      while (
        i < lines.length &&
        lines[i].trim() !== '' &&
        !lines[i].startsWith('#') &&
        !/^\s*(\d+\.|\*|-)\s/.test(lines[i])
      ) {
        paras.push(lines[i])
        i++
      }
      nodes.push(
        <p key={k++} className="text-[13px] text-[#273951] leading-relaxed my-1">
          {renderInline(paras.join(' '))}
        </p>
      )
    }
  }

  return <div className="space-y-0.5">{nodes}</div>
}

function getSourceUrl(source: string): string {
  // IRS Publication N  →  irs.gov/publications/pN
  const pubMatch = source.match(/IRS\s+Publication\s+(\d+)/i)
  if (pubMatch) return `https://www.irs.gov/publications/p${pubMatch[1]}`

  // IRC §N or I.R.C. §N  →  Cornell Law LII
  const ircMatch = source.match(/I\.?R\.?C\.?\s*§\s*(\d+)/i)
  if (ircMatch) return `https://www.law.cornell.edu/uscode/text/26/${ircMatch[1]}`

  // IRS Form NNN  →  irs.gov forms & instructions
  const formMatch = source.match(/(?:IRS\s+)?Form\s+([\dA-Z-]+)/i)
  if (formMatch) return `https://www.irs.gov/forms-instructions/about-form-${formMatch[1].toLowerCase()}`

  // Fallback: Google search
  return `https://www.google.com/search?q=${encodeURIComponent(source)}`
}

function extractMeta(content: string): { body: string; meta: Record<string, unknown> | null } {
  const idx = content.indexOf('\nMETADATA:')
  if (idx === -1) return { body: content.trim(), meta: null }
  const jsonPart = content.slice(idx).replace(/^\nMETADATA:\s*\n?/, '').trim()
  try {
    return { body: content.slice(0, idx).trim(), meta: JSON.parse(jsonPart) }
  } catch {
    return { body: content.trim(), meta: null }
  }
}

function MetaFooter({ meta }: { meta: Record<string, unknown> }) {
  const conf = meta.confidence as string | undefined
  const confStyle =
    conf === 'HIGH' ? 'text-[#065F46] bg-[#ECFDF5] border-[#A7F3D0]' :
    conf === 'MEDIUM' ? 'text-[#92400E] bg-[#FFFBEB] border-[#FDE68A]' :
    conf === 'LOW' ? 'text-[#991B1B] bg-[#FEF2F2] border-[#FECACA]' :
    'text-[#64748d] bg-[#f6f9fc] border-[#e5edf5]'

  const sources = Array.isArray(meta.sources) ? meta.sources as string[] : []

  return (
    <div className="mt-3 pt-3 border-t border-[#e5edf5] space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {conf && (
          <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border ${confStyle}`} style={{ fontWeight: 400 }}>
            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
            {conf} CONFIDENCE
          </span>
        )}
        {Boolean(meta.requiresCpaReview) && (
          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border text-[#7a4f1f] bg-[rgba(155,104,41,0.12)] border-[rgba(155,104,41,0.25)]" style={{ fontWeight: 400 }}>
            <AlertTriangle size={9} />
            CPA Review Recommended
          </span>
        )}
      </div>
      {typeof meta.cpaEscalationReason === 'string' && meta.cpaEscalationReason && (
        <p className="text-[11px] text-[#64748d] leading-relaxed">{meta.cpaEscalationReason}</p>
      )}
      {sources.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <BookOpen size={11} className="text-[#64748d] flex-shrink-0" />
          {sources.map((src, i) => (
            <a
              key={i}
              href={getSourceUrl(src)}
              target="_blank"
              rel="noreferrer"
              className="text-[10px] text-[#533afd] bg-[#f6f9fc] border border-[#D8D3FF] px-1.5 py-0.5 rounded hover:bg-[#EDE9FD] transition-colors underline-offset-2 hover:underline"
            >
              {src}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

function MessageContent({ content }: { content: string }) {
  const { body, meta } = extractMeta(content)
  return (
    <div>
      <MarkdownBody text={body} />
      {meta && <MetaFooter meta={meta} />}
    </div>
  )
}

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
      { icon: FileText, label: 'What filings are due this quarter?', prompt: 'What tax filings are due for my company this quarter? List them with deadlines.', color: 'text-[#533afd] bg-[#f6f9fc]' },
      { icon: Calendar, label: 'Show my upcoming deadlines', prompt: 'Show me all upcoming tax deadlines for my entities, sorted by urgency.', color: 'text-[#F59E0B] bg-[#FFFBEB]' },
      { icon: AlertTriangle, label: 'Am I at risk of an IRS audit?', prompt: 'Based on my current filings and entity profile, what is my estimated IRS audit risk? What factors increase my risk?', color: 'text-[#EF4444] bg-[#FEF2F2]' },
      { icon: Shield, label: 'Check my compliance status', prompt: 'Give me an overall compliance health check. Are there any overdue filings, missing documents, or pending actions I should address?', color: 'text-[#15803D] bg-[#F0FDF4]' },
    ],
  },
  {
    title: 'Tax Strategy',
    actions: [
      { icon: Calculator, label: 'Estimate my quarterly taxes', prompt: 'Help me estimate my quarterly estimated tax payments. What do I need to calculate them?', color: 'text-[#533afd] bg-[#f6f9fc]' },
      { icon: DollarSign, label: 'R&D tax credit eligibility', prompt: 'Am I eligible for the R&D tax credit? What qualifying activities and expenses should I track?', color: 'text-[#15803D] bg-[#F0FDF4]' },
      { icon: Zap, label: 'Tax saving opportunities', prompt: 'What are the top tax deductions and credits available to my type of company? How can I reduce my tax liability legally?', color: 'text-[#F59E0B] bg-[#FFFBEB]' },
      { icon: BookOpen, label: 'Explain Section 174 rules', prompt: 'Explain the Section 174 R&D amortization rules. How do they affect my tax filings starting from 2022?', color: 'text-[#3B82F6] bg-[#EFF6FF]' },
    ],
  },
  {
    title: 'Entity & Structure',
    actions: [
      { icon: Building2, label: 'C-Corp vs S-Corp — which is better?', prompt: 'Compare C-Corp vs S-Corp for my situation. What are the tax implications of each structure?', color: 'text-[#533afd] bg-[#f6f9fc]' },
      { icon: HelpCircle, label: 'Do I need a foreign subsidiary filing?', prompt: 'Do I need to file Form 5471 or 5472 for foreign-related transactions? When are these required?', color: 'text-[#3B82F6] bg-[#EFF6FF]' },
    ],
  },
]

const CPA_ACTIONS: ActionCategory[] = [
  {
    title: 'Review & Analysis',
    actions: [
      { icon: FileText, label: 'Filing review checklist', prompt: 'Give me a comprehensive checklist for reviewing a 1120 corporate tax return before sending it to the founder for approval.', color: 'text-[#533afd] bg-[#f6f9fc]' },
      { icon: AlertTriangle, label: 'Common audit red flags', prompt: 'What are the most common IRS audit triggers for C-Corps? What should I look for when reviewing filings?', color: 'text-[#EF4444] bg-[#FEF2F2]' },
      { icon: Calculator, label: 'Verify estimated tax calculations', prompt: 'Walk me through how to verify quarterly estimated tax payments for a corporation. What are the safe harbor rules?', color: 'text-[#F59E0B] bg-[#FFFBEB]' },
      { icon: Shield, label: 'Document validation best practices', prompt: 'What documents should I verify before approving a filing? What are red flags in uploaded financial documents?', color: 'text-[#15803D] bg-[#F0FDF4]' },
    ],
  },
  {
    title: 'Tax Knowledge',
    actions: [
      { icon: DollarSign, label: 'Officer compensation rules', prompt: 'Explain the IRS reasonable compensation rules for S-Corp officers. What benchmarks should I use?', color: 'text-[#533afd] bg-[#f6f9fc]' },
      { icon: BookOpen, label: 'Form 5472 requirements', prompt: 'When is Form 5472 required for foreign-owned US corporations? What transactions must be reported?', color: 'text-[#3B82F6] bg-[#EFF6FF]' },
    ],
  },
]

const ADMIN_ACTIONS: ActionCategory[] = [
  {
    title: 'Platform Operations',
    actions: [
      { icon: Building2, label: 'Onboarding checklist for founders', prompt: 'What is the standard onboarding flow for new founders? What documents do we verify before activating their account?', color: 'text-[#533afd] bg-[#f6f9fc]' },
      { icon: Shield, label: 'CPA assignment best practices', prompt: 'How should I assign CPAs to organizations? What factors determine the best CPA for a given company?', color: 'text-[#15803D] bg-[#F0FDF4]' },
      { icon: AlertTriangle, label: 'Review suspicious activity patterns', prompt: 'What patterns should I watch for that might indicate fraudulent founder applications or suspicious account activity?', color: 'text-[#EF4444] bg-[#FEF2F2]' },
    ],
  },
]

const TEAM_MEMBER_ACTIONS: ActionCategory[] = [
  {
    title: 'Common Tasks',
    actions: [
      { icon: FileText, label: 'How do I upload a document?', prompt: 'Walk me through how to upload and tag a document in TaxOS. What file types are supported?', color: 'text-[#533afd] bg-[#f6f9fc]' },
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

// ─── Chat mode selector ───────────────────────────────
type ChatMode = 'ai' | 'team' | 'cpas' | 'founders'

interface ModeOption {
  id: ChatMode
  label: string
  icon: LucideIcon
}

function getModeOptions(role: string): ModeOption[] {
  const base: ModeOption[] = [{ id: 'ai', label: 'AI Advisor', icon: Bot }]
  switch (role) {
    case 'founder':
      return [...base,
        { id: 'team', label: 'Team Chat', icon: MessageSquare },
        { id: 'founders', label: 'Founders Network', icon: Users },
      ]
    case 'team_member':
      return [...base, { id: 'team', label: 'Team Chat', icon: MessageSquare }]
    case 'cpa':
      return [...base, { id: 'cpas', label: 'CPA Network', icon: Briefcase }]
    case 'admin':
      return [...base, { id: 'cpas', label: 'CPA Network', icon: Briefcase }]
    default:
      return base
  }
}

export function ChatPage() {
  const user = useAuthStore((state) => state.user)
  const role = user?.role || 'team_member'
  const config = CHAT_CONFIG[role as keyof typeof CHAT_CONFIG] || CHAT_CONFIG.team_member
  const actionLibrary = getActionsForRole(role)
  const modeOptions = getModeOptions(role)

  const [chatMode, setChatMode] = useState<ChatMode>('ai')
  const [showModeDropdown, setShowModeDropdown] = useState(false)

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
      const writeContent = (content: string) => {
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== activeId) return c
            const msgs = [...c.messages]
            const lastIdx = msgs.length - 1
            if (msgs[lastIdx]?.role === 'assistant') {
              msgs[lastIdx] = { ...msgs[lastIdx], content }
            } else {
              msgs.push({
                role: 'assistant',
                content,
                timestamp: new Date().toLocaleTimeString(),
              })
            }
            return { ...c, messages: msgs }
          }),
        )
      }
      await api.streamTaxQa(
        `${config.prefix}\n\nUser question: ${userMsg}`,
        (chunk: string) => {
          fullResponse += chunk
          writeContent(fullResponse)
        },
        (metadata) => {
          // Server strips METADATA from the stream; re-attach so MessageContent can render MetaFooter.
          fullResponse = `${fullResponse.trimEnd()}\nMETADATA:\n${JSON.stringify(metadata)}`
          writeContent(fullResponse)
        },
      )
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

  const activeMode = modeOptions.find(m => m.id === chatMode) ?? modeOptions[0]

  // Non-AI modes: full-screen ChatRoom with mode selector at top
  if (chatMode !== 'ai') {
    return (
      <div className="flex h-[calc(100vh-56px)] -m-8 flex-col bg-white">
        {/* Mode bar */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-[#e5edf5]">
          <div className="relative">
            <button
              onClick={() => setShowModeDropdown(v => !v)}
              className="flex items-center gap-2 rounded-lg border border-[#e5edf5] bg-white px-3 py-2 text-sm font-medium text-[#061b31] hover:border-[#D8D3FF] transition-colors"
            >
              <activeMode.icon size={15} className="text-[#533afd]" />
              {activeMode.label}
              <ChevronDown size={14} className="text-[#64748d]" />
            </button>
            {showModeDropdown && (
              <div className="absolute top-full left-0 mt-1 w-48 rounded-md border border-[#e5edf5] bg-white shadow-lg z-20 py-1">
                {modeOptions.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => { setChatMode(opt.id); setShowModeDropdown(false) }}
                    className={`flex items-center gap-2.5 w-full px-3 py-2 text-sm transition-colors ${
                      opt.id === chatMode
                        ? 'text-[#533afd] bg-[#f6f9fc]'
                        : 'text-[#273951] hover:bg-[#f6f9fc]'
                    }`}
                  >
                    <opt.icon size={14} />
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        {/* Chat room */}
        <div className="flex-1 min-h-0 p-4">
          {chatMode === 'team' && (
            <ChatRoom channel="org" orgId={user?.orgId ?? undefined} title="Team Chat" />
          )}
          {chatMode === 'founders' && (
            <ChatRoom channel="founders" title="Founders Network" />
          )}
          {chatMode === 'cpas' && (
            <ChatRoom channel="cpas" title="CPA Network" />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-56px)] -m-8 bg-white">
      {/* Conversation list */}
      <div className="w-60 border-r border-[#e5edf5] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-[#e5edf5]">
          {/* Mode dropdown */}
          <div className="relative flex-1 mr-2">
            <button
              onClick={() => setShowModeDropdown(v => !v)}
              className="flex items-center gap-1.5 text-sm font-semibold text-[#061b31] hover:text-[#533afd] transition-colors"
            >
              <activeMode.icon size={14} className="text-[#533afd]" />
              {activeMode.label}
              <ChevronDown size={13} className="text-[#64748d]" />
            </button>
            {showModeDropdown && (
              <div className="absolute top-full left-0 mt-1 w-48 rounded-md border border-[#e5edf5] bg-white shadow-lg z-20 py-1">
                {modeOptions.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => { setChatMode(opt.id); setShowModeDropdown(false) }}
                    className={`flex items-center gap-2.5 w-full px-3 py-2 text-sm transition-colors ${
                      opt.id === chatMode
                        ? 'text-[#533afd] bg-[#f6f9fc]'
                        : 'text-[#273951] hover:bg-[#f6f9fc]'
                    }`}
                  >
                    <opt.icon size={14} />
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={newConversation}
            className="p-1.5 text-[#64748d] hover:text-[#533afd] hover:bg-[#EDE9FD] rounded transition-colors"
          >
            <Plus size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveId(c.id)}
              className={`w-full text-left px-4 py-3 border-b border-[#f6f9fc] transition-colors ${
                c.id === activeId ? 'bg-[#EDE9FD]' : 'hover:bg-[#f6f9fc]'
              }`}
            >
              <p className="text-sm font-medium text-[#061b31] truncate">{c.title}</p>
              <p className="text-xs text-[#64748d] truncate mt-0.5">{c.preview}</p>
              <p className="text-[10px] text-[#64748d] mt-1">{c.time}</p>
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
              <div className="w-12 h-12 rounded-md bg-gradient-to-br from-[#533afd] to-[#2e2b8c] flex items-center justify-center mb-4">
                <Bot size={24} className="text-white" />
              </div>
              <h3 className="text-lg text-[#061b31] mb-1" style={{ fontWeight: 300, letterSpacing: '-0.18px' }}>{config.title}</h3>
              <p className="text-sm text-[#64748d] max-w-md text-center mb-8">
                {config.description}
              </p>

              {/* Action Library */}
              <div className="w-full max-w-2xl space-y-6">
                <div className="flex items-center gap-2 mb-2">
                  <Zap size={16} className="text-[#533afd]" />
                  <h4 className="text-sm font-semibold text-[#061b31]">Action Library</h4>
                  <span className="text-xs text-[#64748d]">Click any action to get started</span>
                </div>

                {actionLibrary.map((category) => (
                  <div key={category.title}>
                    <p className="text-xs font-medium text-[#64748d] uppercase tracking-wide mb-2">
                      {category.title}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {category.actions.map((action) => (
                        <button
                          key={action.label}
                          onClick={() => handleActionClick(action.prompt)}
                          disabled={isStreaming}
                          className="flex items-start gap-3 rounded-md border border-[#e5edf5] bg-white px-4 py-3 text-left transition-all hover:border-[#D8D3FF] hover:shadow-sm disabled:opacity-50 group"
                        >
                          <div className={`flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0 ${action.color}`}>
                            <action.icon size={16} />
                          </div>
                          <span className="text-[13px] text-[#273951] leading-snug group-hover:text-[#061b31]">
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
                  <div className="bg-[#533afd] text-white rounded-md rounded-br-sm px-4 py-3 text-[13px]">
                    {msg.content}
                  </div>
                  <p className="text-[11px] text-[#64748d] mt-1 text-right">{msg.timestamp}</p>
                </div>
              </div>
            ) : (
              <div key={i} className="flex gap-2">
                <div className="w-7 h-7 rounded-md bg-gradient-to-br from-[#533afd] to-[#2e2b8c] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot size={14} className="text-white" />
                </div>
                <div className="max-w-2xl min-w-0">
                  <div className="bg-[#f6f9fc] border border-[#e5edf5] rounded-md rounded-tl-sm px-4 py-3">
                    <MessageContent content={msg.content} />
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <button
                      type="button"
                      onClick={() => notify({ title: 'Thanks for the feedback', message: 'We log thumbs-up to improve answers.', tone: 'success' })}
                      className="text-[#64748d] hover:text-[#108c3d] transition-colors"
                      aria-label="Helpful response"
                    >
                      <ThumbsUp size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => notify({ title: 'Thanks for flagging', message: 'We use thumbs-down to route tough questions to CPAs.', tone: 'info' })}
                      className="text-[#64748d] hover:text-[#ea2261] transition-colors"
                      aria-label="Not helpful"
                    >
                      <ThumbsDown size={13} />
                    </button>
                    <span className="text-[11px] text-[#64748d]">{msg.timestamp}</span>
                  </div>
                </div>
              </div>
            ),
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick actions when conversation has messages */}
        {active && active.messages.length > 0 && !isStreaming && (
          <div className="border-t border-[#f6f9fc] px-6 py-2 flex gap-2 overflow-x-auto">
            {actionLibrary[0]?.actions.slice(0, 3).map((action) => (
              <button
                key={action.label}
                onClick={() => handleActionClick(action.prompt)}
                className="flex items-center gap-1.5 rounded border border-[#e5edf5] bg-white px-3 py-1.5 text-xs text-[#64748d] hover:border-[#b9b9f9] hover:text-[#533afd] transition-colors whitespace-nowrap flex-shrink-0"
              >
                <action.icon size={12} />
                {action.label.length > 35 ? action.label.slice(0, 35) + '...' : action.label}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="border-t border-[#e5edf5] bg-[#f6f9fc] p-4">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={config.placeholder}
              className="flex-1 bg-white border border-[#e5edf5] rounded-lg px-4 py-2.5 text-[13px] text-[#061b31] placeholder:text-[#64748d] outline-none focus:border-[#533afd] transition-colors"
            />
            <button
              onClick={handleSend}
              disabled={isStreaming || !input.trim()}
              className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#533afd] text-white hover:bg-[#4434d4] disabled:opacity-50 transition-colors"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
