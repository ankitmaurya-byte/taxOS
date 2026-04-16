// Used in: App.tsx — route /action-centre (pending actions and tasks)
import { useEffect } from 'react'
import { useAuthStore } from '@/stores/auth'
import { formatDate, daysUntil } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'
import { MessageCircle, CheckCircle2 } from 'lucide-react'

export function ActionCentrePage() {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)

  const approvals = useAuthStore(s => s.approvals)
  const deadlines = useAuthStore(s => s.deadlines)
  const fetchApprovals = useAuthStore(s => s.fetchApprovals)
  const fetchDeadlines = useAuthStore(s => s.fetchDeadlines)

  useEffect(() => { fetchApprovals(); fetchDeadlines() }, [fetchApprovals, fetchDeadlines])

  const pending = approvals.filter((a: any) => a.status === 'pending')
  const urgentDeadlines = deadlines.filter(
    (d: any) => daysUntil(d.dueDate) <= 14 && d.status !== 'filed',
  )

  const items = [
    ...pending.map((a: any) => ({
      id: a.id,
      filingId: a.filingId,
      title: a.summary,
      description: a.aiRecommendation || 'Approval required',
      date: a.createdAt,
      type: 'approval' as const,
    })),
    ...urgentDeadlines.map((d: any) => ({
      id: d.id,
      title: `${d.formType} — ${d.formName}`,
      description: `Due ${formatDate(d.dueDate)} (${daysUntil(d.dueDate)} days)`,
      date: d.dueDate,
      type: 'deadline' as const,
    })),
  ]

  return (
    <div className="relative min-h-[calc(100vh-7rem)]">
      <h1 className="text-xl font-bold text-[#061b31] mb-5">Action Centre</h1>

      {/* Content */}
      {items.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center pt-24">
          <div className="space-y-3 mb-6">
            {[140, 170, 120].map((width, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  {[...Array(3)].map((_, j) => (
                    <div
                      key={j}
                      className="h-2.5 rounded-full bg-[#e5edf5]"
                      style={{ width: Math.max(20, width / 3 - j * 10) }}
                    />
                  ))}
                </div>
                <CheckCircle2 size={20} className="text-[#10B981] fill-[#10B981] stroke-white" />
              </div>
            ))}
          </div>
          <p className="text-sm text-[#64748d]">Hooray! You're all done here! 🥳</p>
        </div>
      ) : (
        /* Action items list */
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-[#e5edf5] rounded-md px-5 py-4 flex items-center justify-between hover:border-[#e5edf5] cursor-pointer transition-colors"
              onClick={() =>
                navigate(item.type === 'approval' && item.filingId ? `/filings/${item.filingId}` : item.type === 'approval' ? '/approvals' : '/filings')
              }
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <span className="w-2 h-2 rounded-full mt-1.5 bg-[#EF4444] flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#061b31] truncate">{item.title}</p>
                  <p className="text-xs text-[#64748d] mt-0.5 truncate">{item.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                <span className="text-xs text-[#64748d]">{formatDate(item.date)}</span>
                <span className="h-8 px-3 text-[13px] font-medium text-[#533afd] border border-[#533afd] rounded-lg hover:bg-[#EDE9FD] transition-colors inline-flex items-center">
                  {item.type === 'approval' ? 'Review' : 'View'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Floating chat button */}
      {user?.role !== 'team_member' && (
        <button
          onClick={() => navigate('/chat')}
          className="fixed bottom-8 right-8 w-14 h-14 bg-[#533afd] text-white rounded-full shadow-lg hover:bg-[#4434d4] transition-colors flex items-center justify-center"
        >
          <MessageCircle size={24} />
        </button>
      )}
    </div>
  )
}
