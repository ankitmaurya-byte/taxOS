// Used in: App.tsx — route /action-centre (pending actions and tasks)
import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/auth'
import { formatDate, daysUntil } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'
import { MessageCircle, CheckCircle2 } from 'lucide-react'

type Tab = 'all' | 'tax' | 'books'

export function ActionCentrePage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<Tab>('all')

  const approvals = useAuthStore(s => s.approvals)
  const deadlines = useAuthStore(s => s.deadlines)
  const fetchApprovals = useAuthStore(s => s.fetchApprovals)
  const fetchDeadlines = useAuthStore(s => s.fetchDeadlines)

  useEffect(() => { fetchApprovals(); fetchDeadlines() }, [fetchApprovals, fetchDeadlines])

  const pending = approvals.filter((a: any) => a.status === 'pending')
  const urgentDeadlines = deadlines.filter(
    (d: any) => daysUntil(d.dueDate) <= 14 && d.status !== 'filed',
  )

  // Build action items based on tab
  const taxItems = [
    ...pending.map((a: any) => ({
      id: a.id,
      title: a.summary,
      description: a.aiRecommendation || 'Approval required',
      date: a.createdAt,
      type: 'approval' as const,
      category: 'tax' as const,
    })),
    ...urgentDeadlines.map((d: any) => ({
      id: d.id,
      title: `${d.formType} — ${d.formName}`,
      description: `Due ${formatDate(d.dueDate)} (${daysUntil(d.dueDate)} days)`,
      date: d.dueDate,
      type: 'deadline' as const,
      category: 'tax' as const,
    })),
  ]

  const allItems = activeTab === 'all' ? taxItems : activeTab === 'tax' ? taxItems : []
  const taxCount = taxItems.length
  const booksCount = 0

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: taxCount + booksCount },
    { key: 'tax', label: 'Tax', count: taxCount },
    { key: 'books', label: 'Books', count: booksCount },
  ]

  return (
    <div className="relative min-h-[calc(100vh-7rem)]">
      <h1 className="text-xl font-bold text-[#111827] mb-5">Action Centre</h1>

      {/* Tabs */}
      <div className="flex border border-[#E5E7EB] rounded-lg w-fit mb-8">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-6 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-[#111827] shadow-sm border border-[#E5E7EB] rounded-lg -m-px z-10'
                : 'text-[#6B7280] hover:text-[#374151]'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Content */}
      {allItems.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center pt-24">
          <div className="space-y-3 mb-6">
            {[140, 170, 120].map((width, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  {[...Array(3)].map((_, j) => (
                    <div
                      key={j}
                      className="h-2.5 rounded-full bg-[#E5E7EB]"
                      style={{ width: Math.max(20, width / 3 - j * 10) }}
                    />
                  ))}
                </div>
                <CheckCircle2 size={20} className="text-[#10B981] fill-[#10B981] stroke-white" />
              </div>
            ))}
          </div>
          <p className="text-sm text-[#6B7280]">Hooray! You're all done here! 🥳</p>
        </div>
      ) : (
        /* Action items list */
        <div className="space-y-3">
          {allItems.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-[#E5E7EB] rounded-xl px-5 py-4 flex items-center justify-between hover:border-[#D1D5DB] cursor-pointer transition-colors"
              onClick={() =>
                navigate(item.type === 'approval' ? '/approvals' : '/filings')
              }
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <span className="w-2 h-2 rounded-full mt-1.5 bg-[#EF4444] flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#111827] truncate">{item.title}</p>
                  <p className="text-xs text-[#6B7280] mt-0.5 truncate">{item.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                <span className="text-xs text-[#9CA3AF]">{formatDate(item.date)}</span>
                <button className="h-8 px-3 text-[13px] font-medium text-[#6C5CE7] border border-[#6C5CE7] rounded-lg hover:bg-[#EDE9FD] transition-colors">
                  {item.type === 'approval' ? 'Review' : 'View'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Floating chat button */}
      <button
        onClick={() => navigate('/chat')}
        className="fixed bottom-8 right-8 w-14 h-14 bg-[#6C5CE7] text-white rounded-full shadow-lg hover:bg-[#5B4BD5] transition-colors flex items-center justify-center"
      >
        <MessageCircle size={24} />
      </button>
    </div>
  )
}
