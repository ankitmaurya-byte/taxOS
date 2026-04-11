// Used in: Layout.tsx — slide-over AI chat panel triggered by "Inkle AI" button in TopBar
import { useState, useRef, useEffect } from 'react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import {
  X,
  Pencil,
  History,
  List,
  Send,
  ThumbsUp,
  ThumbsDown,
  Paperclip,
  ChevronRight,
  ArrowLeft,
  Info,
  Sparkles,
} from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

const ACTION_LIBRARY = [
  {
    title: 'Create an invoice',
    description: 'Generate and share invoices in a few clicks.',
  },
  {
    title: 'Create a bill',
    description: 'Upload or enter bill details and let Inkle AI record it for you.',
  },
  {
    title: 'Create bill from uploaded document',
    description: 'Upload a bill document and let Inkle AI parse and add it to the system.',
  },
  {
    title: 'Reconciliation',
    description: 'Let Inkle AI match, detect gaps, and tidy up your books instantly.',
  },
]

interface InkleAIPanelProps {
  onClose: () => void
}

const ROLE_PANEL_CONFIG = {
  admin: {
    title: 'Admin Copilot',
    subtitle: 'Platform operations, founders, and CPA assignment help',
    empty: 'Ask about founder reviews, CPA assignment, or platform access policy.',
    placeholder: 'Ask the admin copilot...',
    prefix: 'You are assisting a TaxOS platform admin. Focus on founder onboarding, CPA assignment, access policy, and platform operations.',
  },
  founder: {
    title: 'Founder Copilot',
    subtitle: 'Entities, filings, deadlines, and approvals',
    empty: 'Ask about your entity setup, filings, founder approvals, deadlines, or documents.',
    placeholder: 'Ask the founder copilot...',
    prefix: 'You are assisting a founder inside TaxOS. Focus on organization workflows, filings, deadlines, documents, and approvals.',
  },
  cpa: {
    title: 'CPA Copilot',
    subtitle: 'Review support, tax reasoning, and document validation',
    empty: 'Ask about CPA review steps, tax reasoning, risk checks, or filing support.',
    placeholder: 'Ask the CPA copilot...',
    prefix: 'You are assisting a CPA inside TaxOS. Focus on filing review, tax reasoning, risk validation, and document review support.',
  },
  team_member: {
    title: 'Workspace Assistant',
    subtitle: 'Permission-aware help for your assigned modules',
    empty: 'Ask about the filings, documents, or approvals available in your workspace.',
    placeholder: 'Ask your workspace assistant...',
    prefix: 'You are assisting a team member inside TaxOS. Focus on the tasks available to them based on granted permissions.',
  },
} as const

export function InkleAIPanel({ onClose }: InkleAIPanelProps) {
  const user = useAuthStore((state) => state.user)
  const role = user?.role || 'team_member'
  const config = ROLE_PANEL_CONFIG[role as keyof typeof ROLE_PANEL_CONFIG] || ROLE_PANEL_CONFIG.team_member
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [activeView, setActiveView] = useState<'chat' | 'history' | 'actions'>('chat')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return
    const userMsg = input.trim()
    setInput('')

    const userMessage: Message = {
      role: 'user',
      content: userMsg,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, userMessage])
    setIsStreaming(true)

    try {
      let fullResponse = ''
      await api.streamTaxQa(`${config.prefix}\n\nUser question: ${userMsg}`, (chunk: string) => {
        fullResponse += chunk
        setMessages((prev) => {
          const msgs = [...prev]
          const lastIdx = msgs.length - 1
          if (msgs[lastIdx]?.role === 'assistant') {
            msgs[lastIdx] = { ...msgs[lastIdx], content: fullResponse }
          } else {
            msgs.push({
              role: 'assistant',
              content: fullResponse,
              timestamp: new Date().toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              }),
            })
          }
          return msgs
        })
      })
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, something went wrong. Please try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    } finally {
      setIsStreaming(false)
    }
  }

  return (
    <div className="fixed right-0 top-0 h-full w-[420px] bg-white border-l border-[#E5E7EB] shadow-2xl z-50 flex">
      {/* Left sidebar icons */}
      <div className="w-12 border-r border-[#E5E7EB] flex flex-col items-center py-4 gap-2 bg-[#F9FAFB]">
        <button
          onClick={() => setActiveView('chat')}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
            activeView === 'chat'
              ? 'bg-[#EDE9FD] text-[#6C5CE7]'
              : 'text-[#9CA3AF] hover:bg-[#F3F4F6]'
          }`}
          title="New chat"
        >
          <Pencil size={16} />
        </button>
        <button
          onClick={() => setActiveView('history')}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
            activeView === 'history'
              ? 'bg-[#EDE9FD] text-[#6C5CE7]'
              : 'text-[#9CA3AF] hover:bg-[#F3F4F6]'
          }`}
          title="History"
        >
          <History size={16} />
        </button>
        <button
          onClick={() => setActiveView('actions')}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
            activeView === 'actions'
              ? 'bg-[#EDE9FD] text-[#6C5CE7]'
              : 'text-[#9CA3AF] hover:bg-[#F3F4F6]'
          }`}
          title="Action Library"
        >
          <List size={16} />
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#6C5CE7] to-[#8B5CF6] flex items-center justify-center">
              <Sparkles size={16} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-[#111827]">{config.title}</h3>
                <span className="text-[10px] font-semibold text-[#10B981] bg-[#D1FAE5] px-1.5 py-0.5 rounded">
                  Beta
                </span>
              </div>
              <p className="text-xs text-[#6B7280]">{config.subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#9CA3AF] hover:text-[#374151] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content area */}
        {activeView === 'actions' ? (
          <ActionLibraryView onBack={() => setActiveView('chat')} />
        ) : activeView === 'history' ? (
          <HistoryView />
        ) : (
          <>
            {/* Chat messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-[#FAFAFA]">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#6C5CE7] to-[#8B5CF6] flex items-center justify-center mb-3">
                    <Sparkles size={20} className="text-white" />
                  </div>
                  <p className="text-sm text-[#6B7280] max-w-xs">
                    {config.empty}
                  </p>
                </div>
              )}

              {messages.map((msg, i) =>
                msg.role === 'user' ? (
                  <div key={i} className="flex justify-end">
                    <div className="max-w-[280px]">
                      <div className="bg-[#6C5CE7] text-white rounded-xl rounded-br-sm px-4 py-2.5 text-[13px]">
                        {msg.content}
                      </div>
                      <p className="text-[10px] text-[#9CA3AF] mt-1 text-right">
                        {msg.timestamp}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div key={i} className="flex gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#F59E0B] to-[#FBBF24] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs">&#128568;</span>
                    </div>
                    <div className="max-w-[280px]">
                      <div className="bg-white border border-[#E5E7EB] rounded-xl rounded-tl-sm px-4 py-2.5 text-[13px] text-[#111827] whitespace-pre-wrap">
                        {msg.content}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-[10px] text-[#9CA3AF]">{msg.timestamp}</p>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <button className="text-[#9CA3AF] hover:text-[#6B7280]">
                          <ThumbsUp size={12} />
                        </button>
                        <button className="text-[#9CA3AF] hover:text-[#6B7280]">
                          <ThumbsDown size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                ),
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Beta disclaimer */}
            <div className="px-4 py-1.5 flex items-center gap-1 text-[11px] text-[#9CA3AF]">
              <Info size={12} />
              Our AI agent is still in Beta version, it can make mistakes.
            </div>

            {/* Input area */}
            <div className="px-4 pb-4">
              <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                  placeholder={config.placeholder}
                  rows={2}
                  className="w-full px-4 py-3 text-[13px] text-[#111827] placeholder:text-[#9CA3AF] outline-none resize-none"
                />
                <div className="flex items-center justify-between px-3 pb-2">
                  <button className="text-[#9CA3AF] hover:text-[#6B7280]">
                    <Paperclip size={16} />
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={isStreaming || !input.trim()}
                    className="text-[#9CA3AF] hover:text-[#6C5CE7] disabled:opacity-30 transition-colors"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ─── Action Library View ─── */
// Used in: InkleAIPanel — rendered when action library sidebar icon is clicked
function ActionLibraryView({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-4">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-[#111827] font-medium mb-4 hover:text-[#6C5CE7]"
      >
        <ArrowLeft size={16} />
        Inkle AI Action Library
      </button>

      <div className="space-y-3">
        {ACTION_LIBRARY.map((action, i) => (
          <button
            key={i}
            className="w-full flex items-center gap-3 p-4 bg-white border border-[#E5E7EB] rounded-xl hover:border-[#6C5CE7] hover:shadow-sm transition-all text-left group"
          >
            {/* Left accent border */}
            <div className="w-0.5 h-12 bg-gradient-to-b from-[#6C5CE7] to-[#EC4899] rounded-full flex-shrink-0" />

            {/* Icon */}
            <div className="w-10 h-10 rounded-lg bg-[#F3F4F6] flex items-center justify-center flex-shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2ZM6 20V4H13V9H18V20H6Z"
                  fill="#9CA3AF"
                />
                <path d="M8 14H16V16H8V14ZM8 10H13V12H8V10Z" fill="#9CA3AF" />
              </svg>
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-[#111827]">{action.title}</h4>
              <p className="text-xs text-[#6B7280] mt-0.5">{action.description}</p>
            </div>

            {/* Arrow */}
            <ChevronRight
              size={16}
              className="text-[#9CA3AF] group-hover:text-[#6C5CE7] flex-shrink-0"
            />
          </button>
        ))}
      </div>
    </div>
  )
}

/* ─── History View ─── */
// Used in: InkleAIPanel — rendered when history sidebar icon is clicked
function HistoryView() {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-4">
      <h3 className="text-sm font-semibold text-[#111827] mb-4">Chat History</h3>
      <div className="text-center py-12">
        <History size={32} className="text-[#D1D5DB] mx-auto mb-2" />
        <p className="text-sm text-[#6B7280]">No previous conversations yet.</p>
      </div>
    </div>
  )
}
