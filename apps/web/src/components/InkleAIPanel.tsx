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
  FileText,
  Calculator,
  Shield,
  Building2,
  Calendar,
  AlertTriangle,
  DollarSign,
  BookOpen,
  HelpCircle,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface ActionItem {
  icon: LucideIcon
  title: string
  description: string
  prompt: string
  color: string
}

// ─── Role-aware action libraries ─────────────────────
const FOUNDER_ACTIONS: ActionItem[] = [
  { icon: FileText, title: 'What filings are due?', description: 'Check upcoming tax filing deadlines for your entities.', prompt: 'What tax filings are due for my company this quarter? List them with deadlines.', color: 'text-[#533afd] bg-[#f6f9fc]' },
  { icon: Calculator, title: 'Estimate quarterly taxes', description: 'Calculate your estimated quarterly tax payments.', prompt: 'Help me estimate my quarterly estimated tax payments. What information do you need?', color: 'text-[#F59E0B] bg-[#FFFBEB]' },
  { icon: AlertTriangle, title: 'Audit risk check', description: 'Assess your IRS audit risk based on your profile.', prompt: 'Based on my current filings and entity profile, what is my estimated IRS audit risk?', color: 'text-[#EF4444] bg-[#FEF2F2]' },
  { icon: Shield, title: 'Compliance health check', description: 'Get an overall compliance status summary.', prompt: 'Give me an overall compliance health check. Are there overdue filings or pending actions?', color: 'text-[#15803D] bg-[#F0FDF4]' },
  { icon: DollarSign, title: 'R&D tax credits', description: 'Check eligibility for R&D tax credits.', prompt: 'Am I eligible for the R&D tax credit? What qualifying activities should I track?', color: 'text-[#533afd] bg-[#f6f9fc]' },
  { icon: Zap, title: 'Tax saving strategies', description: 'Find deductions and credits for your company.', prompt: 'What are the top tax deductions and credits available to my type of company?', color: 'text-[#F59E0B] bg-[#FFFBEB]' },
  { icon: Building2, title: 'C-Corp vs S-Corp', description: 'Compare entity structures and tax implications.', prompt: 'Compare C-Corp vs S-Corp for my situation. What are the tax implications?', color: 'text-[#3B82F6] bg-[#EFF6FF]' },
  { icon: BookOpen, title: 'Section 174 explained', description: 'Understand R&D amortization rules.', prompt: 'Explain the Section 174 R&D amortization rules. How do they affect my filings?', color: 'text-[#3B82F6] bg-[#EFF6FF]' },
]

const CPA_ACTIONS: ActionItem[] = [
  { icon: FileText, title: '1120 review checklist', description: 'Comprehensive checklist for corporate return review.', prompt: 'Give me a comprehensive checklist for reviewing a 1120 corporate tax return.', color: 'text-[#533afd] bg-[#f6f9fc]' },
  { icon: AlertTriangle, title: 'Common audit red flags', description: 'Key IRS audit triggers to watch for.', prompt: 'What are the most common IRS audit triggers for C-Corps?', color: 'text-[#EF4444] bg-[#FEF2F2]' },
  { icon: Calculator, title: 'Verify estimated taxes', description: 'Validate quarterly payment calculations.', prompt: 'Walk me through how to verify quarterly estimated tax payments for a corporation.', color: 'text-[#F59E0B] bg-[#FFFBEB]' },
  { icon: Shield, title: 'Document validation', description: 'Best practices for reviewing uploaded documents.', prompt: 'What documents should I verify before approving a filing?', color: 'text-[#15803D] bg-[#F0FDF4]' },
  { icon: DollarSign, title: 'Officer compensation', description: 'IRS reasonable compensation guidelines.', prompt: 'Explain the IRS reasonable compensation rules for S-Corp officers.', color: 'text-[#533afd] bg-[#f6f9fc]' },
  { icon: BookOpen, title: 'Form 5472 requirements', description: 'Foreign-owned corporation reporting rules.', prompt: 'When is Form 5472 required? What transactions must be reported?', color: 'text-[#3B82F6] bg-[#EFF6FF]' },
]

const ADMIN_ACTIONS: ActionItem[] = [
  { icon: Building2, title: 'Onboarding checklist', description: 'Standard flow for new founder verification.', prompt: 'What is the standard onboarding flow for new founders?', color: 'text-[#533afd] bg-[#f6f9fc]' },
  { icon: Shield, title: 'CPA assignment guide', description: 'Best practices for assigning CPAs.', prompt: 'How should I assign CPAs to organizations?', color: 'text-[#15803D] bg-[#F0FDF4]' },
  { icon: AlertTriangle, title: 'Suspicious patterns', description: 'Detect fraudulent applications.', prompt: 'What patterns indicate fraudulent founder applications?', color: 'text-[#EF4444] bg-[#FEF2F2]' },
]

const TEAM_ACTIONS: ActionItem[] = [
  { icon: FileText, title: 'Upload a document', description: 'How to upload and tag documents.', prompt: 'Walk me through how to upload and tag a document in TaxOS.', color: 'text-[#533afd] bg-[#f6f9fc]' },
  { icon: HelpCircle, title: 'What can I access?', description: 'Check your available permissions.', prompt: 'Based on my permissions, what actions can I perform in TaxOS?', color: 'text-[#3B82F6] bg-[#EFF6FF]' },
  { icon: Calendar, title: 'Upcoming deadlines', description: 'View tax deadlines for your org.', prompt: 'What tax deadlines are coming up for my organization?', color: 'text-[#F59E0B] bg-[#FFFBEB]' },
]

function getActionsForRole(role: string): ActionItem[] {
  switch (role) {
    case 'founder': return FOUNDER_ACTIONS
    case 'cpa': return CPA_ACTIONS
    case 'admin': return ADMIN_ACTIONS
    default: return TEAM_ACTIONS
  }
}

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
  const actions = getActionsForRole(role)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [activeView, setActiveView] = useState<'chat' | 'history' | 'actions'>('chat')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text: string) => {
    if (!text.trim() || isStreaming) return
    const userMsg = text.trim()
    setInput('')
    setActiveView('chat')

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
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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

  const handleSend = () => sendMessage(input)

  return (
    <div className="fixed right-0 top-0 h-full w-[420px] bg-white border-l border-[#e5edf5] shadow-2xl z-50 flex">
      {/* Left sidebar icons */}
      <div className="w-12 border-r border-[#e5edf5] flex flex-col items-center py-4 gap-2 bg-[#f6f9fc]">
        <button
          onClick={() => setActiveView('chat')}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
            activeView === 'chat' ? 'bg-[#EDE9FD] text-[#533afd]' : 'text-[#64748d] hover:bg-[#f6f9fc]'
          }`}
          title="New chat"
        >
          <Pencil size={16} />
        </button>
        <button
          onClick={() => setActiveView('history')}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
            activeView === 'history' ? 'bg-[#EDE9FD] text-[#533afd]' : 'text-[#64748d] hover:bg-[#f6f9fc]'
          }`}
          title="History"
        >
          <History size={16} />
        </button>
        <button
          onClick={() => setActiveView('actions')}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
            activeView === 'actions' ? 'bg-[#EDE9FD] text-[#533afd]' : 'text-[#64748d] hover:bg-[#f6f9fc]'
          }`}
          title="Action Library"
        >
          <List size={16} />
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#e5edf5]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#533afd] to-[#8B5CF6] flex items-center justify-center">
              <Sparkles size={16} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-[#061b31]">{config.title}</h3>
                <span className="text-[10px] font-semibold text-[#10B981] bg-[#D1FAE5] px-1.5 py-0.5 rounded">Beta</span>
              </div>
              <p className="text-xs text-[#64748d]">{config.subtitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#64748d] hover:text-[#273951] transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Content area */}
        {activeView === 'actions' ? (
          <ActionLibraryView actions={actions} onAction={(prompt) => sendMessage(prompt)} onBack={() => setActiveView('chat')} />
        ) : activeView === 'history' ? (
          <HistoryView />
        ) : (
          <>
            {/* Chat messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-[#FAFAFA]">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#533afd] to-[#8B5CF6] flex items-center justify-center mb-3">
                    <Sparkles size={20} className="text-white" />
                  </div>
                  <p className="text-sm text-[#64748d] max-w-xs mb-4">{config.empty}</p>

                  {/* Quick actions in empty state */}
                  <div className="w-full space-y-2">
                    {actions.slice(0, 4).map((action) => (
                      <button
                        key={action.title}
                        onClick={() => sendMessage(action.prompt)}
                        disabled={isStreaming}
                        className="w-full flex items-center gap-3 rounded-md border border-[#e5edf5] bg-white px-3 py-2.5 text-left hover:border-[#D8D3FF] hover:shadow-sm transition-all disabled:opacity-50"
                      >
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0 ${action.color}`}>
                          <action.icon size={14} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-[#061b31]">{action.title}</p>
                          <p className="text-[10px] text-[#64748d] truncate">{action.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) =>
                msg.role === 'user' ? (
                  <div key={i} className="flex justify-end">
                    <div className="max-w-[280px]">
                      <div className="bg-[#533afd] text-white rounded-md rounded-br-sm px-4 py-2.5 text-[13px]">
                        {msg.content}
                      </div>
                      <p className="text-[10px] text-[#64748d] mt-1 text-right">{msg.timestamp}</p>
                    </div>
                  </div>
                ) : (
                  <div key={i} className="flex gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#533afd] to-[#8B5CF6] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Sparkles size={12} className="text-white" />
                    </div>
                    <div className="max-w-[280px]">
                      <div className="bg-white border border-[#e5edf5] rounded-md rounded-tl-sm px-4 py-2.5 text-[13px] text-[#061b31] whitespace-pre-wrap">
                        {msg.content}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-[10px] text-[#64748d]">{msg.timestamp}</p>
                        <button className="text-[#64748d] hover:text-[#64748d]"><ThumbsUp size={12} /></button>
                        <button className="text-[#64748d] hover:text-[#64748d]"><ThumbsDown size={12} /></button>
                      </div>
                    </div>
                  </div>
                ),
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Beta disclaimer */}
            <div className="px-4 py-1.5 flex items-center gap-1 text-[11px] text-[#64748d]">
              <Info size={12} />
              Our AI agent is still in Beta version, it can make mistakes.
            </div>

            {/* Input area */}
            <div className="px-4 pb-4">
              <div className="bg-white border border-[#e5edf5] rounded-md overflow-hidden">
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
                  className="w-full px-4 py-3 text-[13px] text-[#061b31] placeholder:text-[#64748d] outline-none resize-none"
                />
                <div className="flex items-center justify-between px-3 pb-2">
                  <button className="text-[#64748d] hover:text-[#64748d]">
                    <Paperclip size={16} />
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={isStreaming || !input.trim()}
                    className="text-[#64748d] hover:text-[#533afd] disabled:opacity-30 transition-colors"
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
function ActionLibraryView({ actions, onAction, onBack }: { actions: ActionItem[]; onAction: (prompt: string) => void; onBack: () => void }) {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-4">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-[#061b31] font-medium mb-4 hover:text-[#533afd]"
      >
        <ArrowLeft size={16} />
        Action Library
      </button>

      <div className="space-y-2">
        {actions.map((action, i) => (
          <button
            key={i}
            onClick={() => onAction(action.prompt)}
            className="w-full flex items-center gap-3 p-3.5 bg-white border border-[#e5edf5] rounded-md hover:border-[#533afd] hover:shadow-sm transition-all text-left group"
          >
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0 ${action.color}`}>
              <action.icon size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-[#061b31]">{action.title}</h4>
              <p className="text-xs text-[#64748d] mt-0.5">{action.description}</p>
            </div>
            <ChevronRight size={16} className="text-[#64748d] group-hover:text-[#533afd] flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  )
}

/* ─── History View ─── */
function HistoryView() {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-4">
      <h3 className="text-sm font-semibold text-[#061b31] mb-4">Chat History</h3>
      <div className="text-center py-12">
        <History size={32} className="text-[#e5edf5] mx-auto mb-2" />
        <p className="text-sm text-[#64748d]">No previous conversations yet.</p>
      </div>
    </div>
  )
}
