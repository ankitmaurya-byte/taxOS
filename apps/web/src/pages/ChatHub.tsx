/**
 * ChatHub — three-channel chat page.
 *
 * Channels visible to a user depend on their role:
 *   - founder     → Org Chat + Founders Chat
 *   - cpa         → Org Chat (for each assigned org) + CPA Chat
 *   - team_member → Org Chat only
 *   - admin       → (not expected to use chat; rendered empty)
 *
 * Route: /chat-hub
 */

import { useState } from 'react'
import { useAuthStore } from '@/stores/auth'
import { ChatRoom } from '@/components/ChatRoom'
import { MessageSquare, Users, Briefcase } from 'lucide-react'

type Tab = 'org' | 'founders' | 'cpas'

export function ChatHubPage() {
  const user = useAuthStore(s => s.user)
  const [tab, setTab] = useState<Tab>('org')

  if (!user) return null

  const isCpa = user.role === 'cpa'
  const isFounder = user.role === 'founder'

  const allTabs: { id: Tab; label: string; icon: React.ReactNode; visible: boolean }[] = [
    { id: 'org' as Tab, label: 'Team Chat', icon: <MessageSquare size={15} />, visible: true },
    { id: 'founders' as Tab, label: 'Founders', icon: <Users size={15} />, visible: isFounder },
    { id: 'cpas' as Tab, label: 'CPA Network', icon: <Briefcase size={15} />, visible: isCpa },
  ]
  const tabs = allTabs.filter(t => t.visible)

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col gap-0">
      <h1 className="text-xl font-bold text-[#061b31] mb-4">Chat</h1>

      {/* Tab bar */}
      <div className="flex gap-1 mb-4 bg-[#f6f9fc] p-1 rounded-md w-fit">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id
                ? 'bg-white text-[#533afd] shadow-sm'
                : 'text-[#64748d] hover:text-[#273951]'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Chat panel */}
      <div className="flex-1 min-h-0">
        {tab === 'org' && (
          <ChatRoom
            channel="org"
            orgId={user.orgId ?? undefined}
            title="Team Chat"
          />
        )}
        {tab === 'founders' && isFounder && (
          <ChatRoom
            channel="founders"
            title="All Founders"
          />
        )}
        {tab === 'cpas' && isCpa && (
          <ChatRoom
            channel="cpas"
            title="CPA Network"
          />
        )}
      </div>
    </div>
  )
}
