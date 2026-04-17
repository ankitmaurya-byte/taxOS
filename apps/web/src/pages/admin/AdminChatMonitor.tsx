/**
 * AdminChatMonitor — admin-only read-only view of all chat channels
 *
 * Tabs:
 *   1. Founders Network — all-founder cross-org chat
 *   2. CPA Network     — CPA-only chat
 *   3. Org Chats       — per-org team chat (org selector)
 *   4. AI Conversations — agent conversations per filing
 *
 * User filter: pick a user → shows only their messages (or their org's conversations for AI)
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useRef, useCallback, useEffect } from 'react'
import { api } from '@/lib/api'
import { Users, Briefcase, MessageSquare, Bot, Search, X } from 'lucide-react'
import { Link } from 'react-router-dom'

const CHAT_INITIAL = 20
const CHAT_LOAD_MORE = 30

type Tab = 'founders' | 'cpas' | 'org' | 'ai'

function formatTs(iso: string) {
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '' : d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function ChatMessages({ fetchFn, selectedUserId, channel }: {
  fetchFn: (params: { limit: number; offset: number }) => Promise<{ messages: any[]; total: number }>
  selectedUserId: string
  channel: string
}) {
  const [allMessages, setAllMessages] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [initialLoaded, setInitialLoaded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const prevScrollHeight = useRef(0)

  const hasMore = allMessages.length < total

  // Initial load — fetch latest 20
  useEffect(() => {
    setAllMessages([])
    setTotal(0)
    setInitialLoaded(false)
    setLoading(true)
    fetchFn({ limit: CHAT_INITIAL, offset: 0 }).then(res => {
      setAllMessages(res.messages)
      setTotal(res.total)
      setInitialLoaded(true)
      setLoading(false)
      // Scroll to bottom after initial load
      setTimeout(() => {
        const el = containerRef.current
        if (el) el.scrollTop = el.scrollHeight
      }, 50)
    }).catch(() => setLoading(false))
  }, [channel, selectedUserId])

  // Load older messages
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return
    const el = containerRef.current
    if (el) prevScrollHeight.current = el.scrollHeight
    setLoading(true)
    try {
      const res = await fetchFn({ limit: CHAT_LOAD_MORE, offset: allMessages.length })
      setAllMessages(prev => [...res.messages, ...prev])
      setTotal(res.total)
      // Preserve scroll position
      setTimeout(() => {
        const el2 = containerRef.current
        if (el2 && prevScrollHeight.current > 0) {
          el2.scrollTop = el2.scrollHeight - prevScrollHeight.current
        }
      }, 50)
    } finally { setLoading(false) }
  }, [loading, hasMore, allMessages.length, fetchFn])

  const handleScroll = useCallback(() => {
    const el = containerRef.current
    if (!el || !hasMore || loading) return
    if (el.scrollTop < 80) loadMore()
  }, [hasMore, loading, loadMore])

  if (!initialLoaded && loading)
    return <p className="p-6 text-sm text-[#64748d]">Loading...</p>

  // Filter by user client-side (messages already fetched)
  const filtered = selectedUserId
    ? allMessages.filter((m: any) => m.senderId === selectedUserId)
    : allMessages

  if (filtered.length === 0 && !loading)
    return <p className="text-center text-sm text-[#64748d] py-12">{selectedUserId ? 'No messages from this user.' : 'No messages yet.'}</p>

  return (
    <div ref={containerRef} onScroll={handleScroll} className="flex flex-col p-4 max-h-[600px] overflow-y-auto">
      {hasMore && (
        <button
          onClick={loadMore}
          disabled={loading}
          className="w-full py-2 mb-2 text-xs font-medium text-[#533afd] hover:bg-[#f6f9fc] rounded-lg disabled:opacity-50"
        >
          {loading ? 'Loading...' : `Load older messages (${total - allMessages.length} more)`}
        </button>
      )}
      <div className="space-y-2">
        {filtered.map((m: any, i: number) => (
          <div key={m.id || i} className="flex items-start gap-3 py-2 border-b border-[#f6f9fc] last:border-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#EDE9FD] text-[10px] font-semibold text-[#533afd]">
              {(m.sender?.name || m.senderId || '?').slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium text-[#061b31]">{m.sender?.name || m.senderId || 'Unknown'}</span>
                <span className="text-xs text-[#64748d] capitalize">{m.sender?.role || ''}</span>
                <span className="ml-auto text-xs text-[#64748d] whitespace-nowrap">{formatTs(m.createdAt)}</span>
              </div>
              <p className="text-sm text-[#273951] mt-0.5 break-words">{m.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ConvoMessages({ messages }: { messages: any[] }) {
  const [shown, setShown] = useState(CHAT_INITIAL)
  const containerRef = useRef<HTMLDivElement>(null)
  const prevScrollHeight = useRef(0)
  const didInitScroll = useRef(false)

  const startIdx = Math.max(0, messages.length - shown)
  const visible = messages.slice(startIdx)
  const hasMore = startIdx > 0

  useEffect(() => {
    const el = containerRef.current
    if (el && !didInitScroll.current) {
      el.scrollTop = el.scrollHeight
      didInitScroll.current = true
    }
  }, [visible.length])

  useEffect(() => {
    const el = containerRef.current
    if (el && prevScrollHeight.current > 0) {
      const diff = el.scrollHeight - prevScrollHeight.current
      if (diff > 0) el.scrollTop = diff
    }
  }, [shown])

  const handleScroll = useCallback(() => {
    const el = containerRef.current
    if (!el || !hasMore) return
    if (el.scrollTop < 60) {
      prevScrollHeight.current = el.scrollHeight
      setShown(prev => prev + CHAT_LOAD_MORE)
    }
  }, [hasMore])

  if (!messages || messages.length === 0)
    return <p className="text-center text-sm text-[#64748d] py-4">No messages in this conversation.</p>

  return (
    <div ref={containerRef} onScroll={handleScroll} className="bg-[#f6f9fc] px-5 py-4 max-h-72 overflow-y-auto">
      {hasMore && (
        <button
          onClick={() => {
            const el = containerRef.current
            if (el) prevScrollHeight.current = el.scrollHeight
            setShown(prev => prev + CHAT_LOAD_MORE)
          }}
          className="w-full py-1.5 mb-2 text-xs font-medium text-[#533afd] hover:bg-[#f6f9fc] rounded-lg"
        >
          Load older ({startIdx} more)
        </button>
      )}
      <div className="space-y-3">
        {visible.map((msg: any, i: number) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] rounded-md px-4 py-2.5 text-sm ${
              msg.role === 'user' ? 'bg-[#533afd] text-white' : 'bg-white border border-[#e5edf5] text-[#273951]'
            }`}>
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.timestamp && <p className="text-xs opacity-60 mt-1">{msg.timestamp}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AiConversationList({ fetchFn, aiUserFilter, expandedConvo, setExpandedConvo }: {
  fetchFn: (params: Record<string, string>) => Promise<{ conversations: any[]; total: number }>
  aiUserFilter: string
  expandedConvo: string | null
  setExpandedConvo: (id: string | null) => void
}) {
  const [convos, setConvos] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [initialLoaded, setInitialLoaded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const prevScrollHeight = useRef(0)

  const hasMore = convos.length < total

  // Initial load
  useEffect(() => {
    setConvos([])
    setTotal(0)
    setInitialLoaded(false)
    setLoading(true)
    const params: Record<string, string> = { limit: String(CHAT_INITIAL), offset: '0' }
    if (aiUserFilter) params.userId = aiUserFilter
    fetchFn(params).then(res => {
      setConvos(res.conversations)
      setTotal(res.total)
      setInitialLoaded(true)
      setLoading(false)
      setTimeout(() => {
        const el = containerRef.current
        if (el) el.scrollTop = el.scrollHeight
      }, 50)
    }).catch(() => setLoading(false))
  }, [aiUserFilter])

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return
    const el = containerRef.current
    if (el) prevScrollHeight.current = el.scrollHeight
    setLoading(true)
    try {
      const params: Record<string, string> = { limit: String(CHAT_LOAD_MORE), offset: String(convos.length) }
      if (aiUserFilter) params.userId = aiUserFilter
      const res = await fetchFn(params)
      setConvos(prev => [...prev, ...res.conversations])
      setTotal(res.total)
      setTimeout(() => {
        const el2 = containerRef.current
        if (el2 && prevScrollHeight.current > 0) {
          el2.scrollTop = el2.scrollHeight - prevScrollHeight.current
        }
      }, 50)
    } finally { setLoading(false) }
  }, [loading, hasMore, convos.length, aiUserFilter, fetchFn])

  const handleScroll = useCallback(() => {
    const el = containerRef.current
    if (!el || !hasMore || loading) return
    if (el.scrollTop < 60) loadMore()
  }, [hasMore, loading, loadMore])

  if (!initialLoaded && loading)
    return <p className="p-6 text-sm text-[#64748d]">Loading...</p>

  if (convos.length === 0)
    return <p className="p-6 text-center text-sm text-[#64748d]">No AI conversations found.</p>

  return (
    <div ref={containerRef} onScroll={handleScroll} className="max-h-[600px] overflow-y-auto divide-y divide-[#f6f9fc]">
      {hasMore && (
        <button
          onClick={loadMore}
          disabled={loading}
          className="w-full py-2 text-xs font-medium text-[#533afd] hover:bg-[#f6f9fc] disabled:opacity-50"
        >
          {loading ? 'Loading...' : `Load older conversations (${total - convos.length} more)`}
        </button>
      )}
      {convos.map((conv: any) => (
        <div key={conv.id}>
          <button
            onClick={() => setExpandedConvo(expandedConvo === conv.id ? null : conv.id)}
            className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[#f6f9fc] text-left transition-colors"
          >
            <div className="flex items-center gap-3">
              <Bot size={15} className="text-[#533afd]" />
              <div>
                <p className="text-sm font-medium text-[#061b31]">
                  {conv.agentType}
                  {conv.filingForm && <span className="text-[#64748d] font-normal"> — {conv.filingForm}</span>}
                </p>
                <p className="text-xs text-[#64748d]">{conv.orgName} &bull; {conv.messages?.length || 0} messages &bull; {formatTs(conv.updatedAt)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded ${conv.status === 'active' ? 'bg-[rgba(21,190,83,0.12)] text-[#108c3d]' : 'bg-[#f6f9fc] text-[#64748d]'}`}>
                {conv.status}
              </span>
              {conv.filingId && (
                <Link
                  to={`/admin/filings/${conv.filingId}`}
                  onClick={e => e.stopPropagation()}
                  className="text-xs text-[#533afd] hover:underline"
                >
                  View Filing
                </Link>
              )}
            </div>
          </button>
          {expandedConvo === conv.id && (
            <ConvoMessages messages={conv.messages || []} />
          )}
        </div>
      ))}
    </div>
  )
}

export function AdminChatMonitor() {
  const [tab, setTab] = useState<Tab>('founders')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedOrgId, setSelectedOrgId] = useState('')
  const [aiUserFilter, setAiUserFilter] = useState('')
  const [expandedConvo, setExpandedConvo] = useState<string | null>(null)
  const [userSearch, setUserSearch] = useState('')

  // Load system users for filter picker
  const { data: users = [] } = useQuery({
    queryKey: ['system-users'],
    queryFn: () => api.admin.getSystemUsers(),
  })

  // Load orgs for org chat selector
  const { data: orgs = [] } = useQuery({
    queryKey: ['admin-organizations'],
    queryFn: () => api.admin.getOrganizationOverview(),
  })

  // Fetch functions for server-side paginated chat
  const fetchFounderMsgs = useCallback((p: { limit: number; offset: number }) =>
    api.admin.getFounderMessages(p), [])
  const fetchCpaMsgs = useCallback((p: { limit: number; offset: number }) =>
    api.admin.getCpaMessages(p), [])
  const fetchOrgMsgs = useCallback((p: { limit: number; offset: number }) =>
    api.admin.getOrgChatMessages(selectedOrgId, p), [selectedOrgId])
  const fetchAiConvos = useCallback((p: Record<string, string>) =>
    api.admin.getAgentConversations(p), [])

  // Filter users by role based on active tab, then by search, limit to 15
  const filteredUsers = (users as any[])
    .filter((u: any) => {
      if (tab === 'founders') return u.role === 'founder'
      if (tab === 'cpas') return u.role === 'cpa'
      return true
    })
    .filter((u: any) =>
      !userSearch || u.name?.toLowerCase().includes(userSearch.toLowerCase()) || u.email?.toLowerCase().includes(userSearch.toLowerCase())
    )
    .slice(0, 15)

  const tabs = [
    { id: 'founders' as Tab, label: 'Founders Network', icon: <Users size={15} /> },
    { id: 'cpas' as Tab, label: 'CPA Network', icon: <Briefcase size={15} /> },
    { id: 'org' as Tab, label: 'Org Chats', icon: <MessageSquare size={15} /> },
    { id: 'ai' as Tab, label: 'AI Conversations', icon: <Bot size={15} /> },
  ]

  return (
    <div className="p-3 sm:p-5 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-normal text-[#061b31]" style={{ fontWeight: 300 }}>Chat Monitor</h1>
        <p className="mt-1 text-sm text-[#64748d]">Read-only view of all chat channels across the platform.</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-[#f6f9fc] p-1 rounded-md w-fit max-w-full overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-white text-[#533afd] shadow-sm' : 'text-[#64748d] hover:text-[#273951]'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-3 lg:gap-5">
        {/* Left: user filter panel */}
        <div className="bg-white border border-[#e5edf5] rounded-md p-4 h-fit">
          <h3 className="text-sm font-normal text-[#273951] mb-3" style={{ fontWeight: 400 }}>
            {tab === 'ai' ? 'Filter by User (Org)' : 'Filter by User'}
          </h3>

          {/* Org selector for Org tab */}
          {tab === 'org' && (
            <div className="mb-3">
              <label className="block text-xs text-[#64748d] mb-1">Select Organization</label>
              <select
                className="w-full border rounded-lg px-2 py-1.5 text-sm"
                value={selectedOrgId}
                onChange={e => setSelectedOrgId(e.target.value)}
              >
                <option value="">— pick an org —</option>
                {(orgs as any[]).map((o: any) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="relative mb-2">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#64748d]" />
            <input
              type="text"
              placeholder="Search users..."
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              className="w-full border rounded-lg pl-8 pr-3 py-1.5 text-sm"
            />
            {userSearch && (
              <button onClick={() => setUserSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#64748d]">
                <X size={12} />
              </button>
            )}
          </div>

          <div className="space-y-1 max-h-80 overflow-y-auto">
            <button
              onClick={() => {
                setSelectedUserId('')
                setAiUserFilter('')
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                !selectedUserId && !aiUserFilter ? 'bg-[#EDE9FD] text-[#533afd]' : 'hover:bg-[#f6f9fc] text-[#273951]'
              }`}
            >
              All users
            </button>
            {filteredUsers.map((u: any) => (
              <button
                key={u.id}
                onClick={() => {
                  if (tab === 'ai') {
                    setAiUserFilter(u.id)
                    setSelectedUserId('')
                  } else {
                    setSelectedUserId(u.id)
                    setAiUserFilter('')
                  }
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  (selectedUserId === u.id || aiUserFilter === u.id)
                    ? 'bg-[#EDE9FD] text-[#533afd]'
                    : 'hover:bg-[#f6f9fc] text-[#273951]'
                }`}
              >
                <p className="font-medium truncate">{u.name}</p>
                <p className="text-xs text-[#64748d] truncate capitalize">{u.role?.replace('_', ' ')}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Right: messages panel */}
        <div className="bg-white border border-[#e5edf5] rounded-md overflow-hidden min-h-[400px]">
          {/* Founders */}
          {tab === 'founders' && (
            <ChatMessages fetchFn={fetchFounderMsgs} selectedUserId={selectedUserId} channel={`founders-${selectedUserId}`} />
          )}

          {/* CPAs */}
          {tab === 'cpas' && (
            <ChatMessages fetchFn={fetchCpaMsgs} selectedUserId={selectedUserId} channel={`cpas-${selectedUserId}`} />
          )}

          {/* Org Chat */}
          {tab === 'org' && (
            !selectedOrgId
              ? <p className="p-6 text-center text-sm text-[#64748d]">Select an organization to view its team chat.</p>
              : <ChatMessages fetchFn={fetchOrgMsgs} selectedUserId={selectedUserId} channel={`org-${selectedOrgId}-${selectedUserId}`} />
          )}

          {/* AI Conversations */}
          {tab === 'ai' && (
            <AiConversationList fetchFn={fetchAiConvos} aiUserFilter={aiUserFilter} expandedConvo={expandedConvo} setExpandedConvo={setExpandedConvo} />
          )}
        </div>
      </div>
    </div>
  )
}
