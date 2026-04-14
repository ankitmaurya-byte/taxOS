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

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '@/lib/api'
import { Users, Briefcase, MessageSquare, Bot, Search, X } from 'lucide-react'
import { Link } from 'react-router-dom'

type Tab = 'founders' | 'cpas' | 'org' | 'ai'

function formatTs(iso: string) {
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '' : d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function ChatMessages({ messages, selectedUserId }: { messages: any[]; selectedUserId: string }) {
  const filtered = selectedUserId
    ? messages.filter((m: any) => m.senderId === selectedUserId)
    : messages
  if (filtered.length === 0)
    return <p className="text-center text-sm text-[#9CA3AF] py-12">{selectedUserId ? 'No messages from this user.' : 'No messages yet.'}</p>
  return (
    <div className="space-y-2 p-4">
      {filtered.map((m: any, i: number) => (
        <div key={m.id || i} className="flex items-start gap-3 py-2 border-b border-[#F3F4F6] last:border-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EDE9FD] text-[10px] font-semibold text-[#6C5CE7]">
            {(m.sender?.name || m.senderId || '?').slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-semibold text-[#111827]">{m.sender?.name || m.senderId || 'Unknown'}</span>
              <span className="text-xs text-[#6B7280] capitalize">{m.sender?.role || ''}</span>
              <span className="ml-auto text-xs text-[#9CA3AF] whitespace-nowrap">{formatTs(m.createdAt)}</span>
            </div>
            <p className="text-sm text-[#374151] mt-0.5 break-words">{m.message}</p>
          </div>
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

  // Chat channels
  const { data: founderMsgs = [], isLoading: foundersLoading } = useQuery({
    queryKey: ['admin-chat-founders'],
    queryFn: () => api.admin.getFounderMessages(),
    enabled: tab === 'founders',
  })

  const { data: cpaMsgs = [], isLoading: cpasLoading } = useQuery({
    queryKey: ['admin-chat-cpas'],
    queryFn: () => api.admin.getCpaMessages(),
    enabled: tab === 'cpas',
  })

  const { data: orgMsgs = [], isLoading: orgLoading } = useQuery({
    queryKey: ['admin-chat-org', selectedOrgId],
    queryFn: () => api.admin.getOrgChatMessages(selectedOrgId),
    enabled: tab === 'org' && !!selectedOrgId,
  })

  // AI conversations
  const { data: aiConvos = [], isLoading: aiLoading } = useQuery({
    queryKey: ['admin-agent-conversations', aiUserFilter],
    queryFn: () => api.admin.getAgentConversations(aiUserFilter ? { userId: aiUserFilter } : undefined),
    enabled: tab === 'ai',
  })

  const filteredUsers = (users as any[]).filter((u: any) =>
    !userSearch || u.name?.toLowerCase().includes(userSearch.toLowerCase()) || u.email?.toLowerCase().includes(userSearch.toLowerCase())
  )

  const tabs = [
    { id: 'founders' as Tab, label: 'Founders Network', icon: <Users size={15} /> },
    { id: 'cpas' as Tab, label: 'CPA Network', icon: <Briefcase size={15} /> },
    { id: 'org' as Tab, label: 'Org Chats', icon: <MessageSquare size={15} /> },
    { id: 'ai' as Tab, label: 'AI Conversations', icon: <Bot size={15} /> },
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-[#111827]">Chat Monitor</h1>
        <p className="mt-1 text-sm text-[#6B7280]">Read-only view of all chat channels across the platform.</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-[#F3F4F6] p-1 rounded-xl w-fit">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-white text-[#6C5CE7] shadow-sm' : 'text-[#6B7280] hover:text-[#374151]'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-[260px_1fr] gap-5">
        {/* Left: user filter panel */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 h-fit">
          <h3 className="text-sm font-semibold text-[#374151] mb-3">
            {tab === 'ai' ? 'Filter by User (Org)' : 'Filter by User'}
          </h3>

          {/* Org selector for Org tab */}
          {tab === 'org' && (
            <div className="mb-3">
              <label className="block text-xs text-[#6B7280] mb-1">Select Organization</label>
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
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              type="text"
              placeholder="Search users..."
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              className="w-full border rounded-lg pl-8 pr-3 py-1.5 text-sm"
            />
            {userSearch && (
              <button onClick={() => setUserSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9CA3AF]">
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
                !selectedUserId && !aiUserFilter ? 'bg-[#EDE9FD] text-[#6C5CE7]' : 'hover:bg-[#F3F4F6] text-[#374151]'
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
                    ? 'bg-[#EDE9FD] text-[#6C5CE7]'
                    : 'hover:bg-[#F3F4F6] text-[#374151]'
                }`}
              >
                <p className="font-medium truncate">{u.name}</p>
                <p className="text-xs text-[#9CA3AF] truncate capitalize">{u.role?.replace('_', ' ')}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Right: messages panel */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden min-h-[400px]">
          {/* Founders */}
          {tab === 'founders' && (
            foundersLoading
              ? <p className="p-6 text-sm text-[#6B7280]">Loading...</p>
              : <ChatMessages messages={founderMsgs as any[]} selectedUserId={selectedUserId} />
          )}

          {/* CPAs */}
          {tab === 'cpas' && (
            cpasLoading
              ? <p className="p-6 text-sm text-[#6B7280]">Loading...</p>
              : <ChatMessages messages={cpaMsgs as any[]} selectedUserId={selectedUserId} />
          )}

          {/* Org Chat */}
          {tab === 'org' && (
            !selectedOrgId
              ? <p className="p-6 text-center text-sm text-[#9CA3AF]">Select an organization to view its team chat.</p>
              : orgLoading
                ? <p className="p-6 text-sm text-[#6B7280]">Loading...</p>
                : <ChatMessages messages={orgMsgs as any[]} selectedUserId={selectedUserId} />
          )}

          {/* AI Conversations */}
          {tab === 'ai' && (
            aiLoading
              ? <p className="p-6 text-sm text-[#6B7280]">Loading...</p>
              : (aiConvos as any[]).length === 0
                ? <p className="p-6 text-center text-sm text-[#9CA3AF]">No AI conversations found.</p>
                : (
                  <div className="divide-y divide-[#F3F4F6]">
                    {(aiConvos as any[]).map((conv: any) => (
                      <div key={conv.id}>
                        <button
                          onClick={() => setExpandedConvo(expandedConvo === conv.id ? null : conv.id)}
                          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[#F9FAFB] text-left transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Bot size={15} className="text-[#6C5CE7]" />
                            <div>
                              <p className="text-sm font-medium text-[#111827]">
                                {conv.agentType}
                                {conv.filingForm && <span className="text-[#6B7280] font-normal"> — {conv.filingForm}</span>}
                              </p>
                              <p className="text-xs text-[#9CA3AF]">{conv.orgName} &bull; {conv.messages?.length || 0} messages &bull; {formatTs(conv.updatedAt)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded ${conv.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                              {conv.status}
                            </span>
                            {conv.filingId && (
                              <Link
                                to={`/admin/filings/${conv.filingId}`}
                                onClick={e => e.stopPropagation()}
                                className="text-xs text-[#6C5CE7] hover:underline"
                              >
                                View Filing
                              </Link>
                            )}
                          </div>
                        </button>
                        {expandedConvo === conv.id && (
                          <div className="bg-[#F9FAFB] px-5 py-4 max-h-72 overflow-y-auto space-y-3">
                            {(conv.messages || []).map((msg: any, i: number) => (
                              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[75%] rounded-xl px-4 py-2.5 text-sm ${
                                  msg.role === 'user' ? 'bg-[#6C5CE7] text-white' : 'bg-white border border-[#E5E7EB] text-[#374151]'
                                }`}>
                                  <p className="whitespace-pre-wrap">{msg.content}</p>
                                  {msg.timestamp && <p className="text-xs opacity-60 mt-1">{msg.timestamp}</p>}
                                </div>
                              </div>
                            ))}
                            {(!conv.messages || conv.messages.length === 0) && (
                              <p className="text-center text-sm text-[#9CA3AF]">No messages in this conversation.</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )
          )}
        </div>
      </div>
    </div>
  )
}
