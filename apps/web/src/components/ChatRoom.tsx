/**
 * ChatRoom — reusable real-time chat component.
 *
 * Props:
 *   channel   — 'org' | 'founders' | 'cpas'
 *   orgId     — required when channel='org'
 *   title     — displayed in the panel header
 *
 * Loads message history on mount via REST, then keeps up-to-date in real-time
 * through a WebSocket connection to /ws. Interval polling is removed.
 */

import { useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { Send } from 'lucide-react'

const WS_URL = (import.meta.env.VITE_WS_URL || 'ws://localhost:3001') + '/ws'

interface Message {
  id: string
  message: string
  createdAt: string
  sender: { name: string; role: string }
}

interface ChatRoomProps {
  channel: 'org' | 'founders' | 'cpas'
  orgId?: string
  title: string
}

export function ChatRoom({ channel, orgId, title }: ChatRoomProps) {
  const user = useAuthStore(s => s.user)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WebSocket | null>(null)

  // ── Load history ──────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    async function loadHistory() {
      try {
        let res: any
        if (channel === 'org' && orgId) res = await api.chat.getOrgMessages(orgId, { limit: 50, offset: 0 })
        else if (channel === 'founders') res = await api.chat.getFounderMessages({ limit: 50, offset: 0 })
        else res = await api.chat.getCpaMessages({ limit: 50, offset: 0 })
        if (!cancelled) setMessages(res.messages || res)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadHistory()
    return () => { cancelled = true }
  }, [channel, orgId])

  // ── WebSocket for real-time messages ──────────────────────────────────────
  useEffect(() => {
    if (!user) return

    const token = localStorage.getItem('taxos_token')
    const url = token ? `${WS_URL}?token=${encodeURIComponent(token)}` : WS_URL
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as { type: string; data: Record<string, unknown> }
        if (event.type !== 'chat_message') return

        const { channel: evChannel, orgId: evOrgId, message: msg } = event.data as {
          channel: string
          orgId?: string
          message: Message
        }

        // Only accept messages for the channel this component is showing
        const isMatch =
          (channel === 'org' && evChannel === 'org' && evOrgId === orgId) ||
          (channel === 'founders' && evChannel === 'founders') ||
          (channel === 'cpas' && evChannel === 'cpas')

        if (!isMatch) return

        setMessages(prev => {
          // Avoid duplicates (in case we added it optimistically on send)
          if (prev.some(m => m.id === msg.id)) return prev
          return [...prev, msg]
        })
      } catch {
        // ignore malformed frames
      }
    }

    ws.onerror = () => { /* silent — browser will retry */ }

    return () => {
      ws.close()
      wsRef.current = null
    }
  }, [user?.id, channel, orgId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Send ──────────────────────────────────────────────────────────────────
  async function handleSend() {
    if (!input.trim() || sending) return
    setSending(true)
    try {
      let saved: Message
      if (channel === 'org' && orgId) saved = await api.chat.postOrgMessage(orgId, input.trim()) as Message
      else if (channel === 'founders') saved = await api.chat.postFounderMessage(input.trim()) as Message
      else saved = await api.chat.postCpaMessage(input.trim()) as Message
      // Optimistically add; WebSocket broadcast will be de-duped
      setMessages(prev => prev.some(m => m.id === saved.id) ? prev : [...prev, saved])
      setInput('')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-[#E5E7EB] bg-[#F9FAFB]">
        <h2 className="text-sm font-semibold text-[#111827]">{title}</h2>
        <p className="text-xs text-[#6B7280]">{messages.length} messages</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {loading ? (
          <p className="text-center text-xs text-[#9CA3AF] pt-8">Loading messages…</p>
        ) : messages.length === 0 ? (
          <p className="text-center text-xs text-[#9CA3AF] pt-8">No messages yet. Start the conversation!</p>
        ) : (
          messages.map(msg => {
            const isMe = msg.sender.name === user?.name
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${isMe ? 'bg-[#6C5CE7] text-white' : 'bg-[#F3F4F6] text-[#111827]'}`}>
                  {!isMe && (
                    <p className="text-[10px] font-semibold mb-1 opacity-70">{msg.sender.name}</p>
                  )}
                  <p>{msg.message}</p>
                  <p className={`text-[10px] mt-1 ${isMe ? 'text-white/70' : 'text-[#9CA3AF]'} text-right`}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-[#E5E7EB] flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="Type a message…"
          className="flex-1 text-sm border border-[#E5E7EB] rounded-lg px-3 py-2 outline-none focus:border-[#6C5CE7] transition-colors"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          className="h-9 w-9 flex items-center justify-center rounded-lg bg-[#6C5CE7] text-white hover:bg-[#5B4BD5] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  )
}
