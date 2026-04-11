// Used in: App.tsx — route /chat (AI tax Q&A chat page)
import { useState, useRef, useEffect } from 'react'
import { api } from '@/lib/api'
import { Bot, Send, ThumbsUp, ThumbsDown, Plus, MessageCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'

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

export function ChatPage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const role = user?.role || 'team_member'
  const config = CHAT_CONFIG[role as keyof typeof CHAT_CONFIG] || CHAT_CONFIG.team_member
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
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const active = conversations.find((c) => c.id === activeId)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [active?.messages])

  const handleSend = async () => {
    if (!input.trim() || isStreaming || !active) return
    const userMsg = input.trim()
    setInput('')

    const userMessage: Message = {
      role: 'user',
      content: userMsg,
      timestamp: new Date().toLocaleTimeString(),
    }

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeId
          ? { ...c, messages: [...c.messages, userMessage], preview: userMsg }
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
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate('/advisor')}
              className="rounded px-2 py-1 text-[11px] font-medium text-[#6C5CE7] hover:bg-[#EDE9FD]"
            >
              Advisor
            </button>
            <button
              onClick={newConversation}
              className="p-1.5 text-[#9CA3AF] hover:text-[#6C5CE7] hover:bg-[#EDE9FD] rounded transition-colors"
            >
              <Plus size={16} />
            </button>
          </div>
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
          {active?.messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center mb-4">
                <Bot size={24} className="text-white" />
              </div>
               <h3 className="text-lg font-semibold text-[#111827] mb-2">{config.title}</h3>
               <p className="text-sm text-[#6B7280] max-w-sm">
                 {config.description}
               </p>
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
