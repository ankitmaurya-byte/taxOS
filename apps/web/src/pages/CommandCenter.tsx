import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/auth'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/ui/status-badge'
import { ConfidenceBadge } from '@/components/agents/ConfidenceBadge'
import { CreateFilingModal } from '@/components/filings/CreateFilingModal'
import { Pagination, usePagination } from '@/components/ui/pagination'
import { Button } from '@/components/ui/button'
import { daysUntil, formatDate } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import type { FilingStatus } from 'shared'

const KANBAN_PAGE_SIZE = 15

const KANBAN_COLUMNS: FilingStatus[] = ['intake', 'ai_prep', 'cpa_review', 'founder_approval', 'submitted', 'archived']

export function CommandCenter() {
  const navigate = useNavigate()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [approvalPage, setApprovalPage] = useState(1)
  const [kanbanShown, setKanbanShown] = useState<Record<string, number>>({})

  const filings = useAuthStore(s => s.filings)
  const deadlines = useAuthStore(s => s.deadlines)
  const approvals = useAuthStore(s => s.approvals)
  const auditLog = useAuthStore(s => s.auditLog)
  const fetchFilings = useAuthStore(s => s.fetchFilings)
  const fetchDeadlines = useAuthStore(s => s.fetchDeadlines)
  const fetchApprovals = useAuthStore(s => s.fetchApprovals)
  const fetchAuditLog = useAuthStore(s => s.fetchAuditLog)

  useEffect(() => {
    fetchFilings()
    fetchDeadlines()
    fetchApprovals()
    fetchAuditLog()
  }, [fetchFilings, fetchDeadlines, fetchApprovals, fetchAuditLog])

  const urgentItems = deadlines.filter(d => (d.urgencyScore || 0) >= 90).slice(0, 5)
  const pendingApprovals = approvals.filter(a => a.status === 'pending')
  const approvalPagination = usePagination(pendingApprovals, 10)
  const pagedApprovals = approvalPagination.getPage(approvalPage)
  const recentActivity = auditLog.slice(0, 10)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Command Center</h1>
          <p className="mt-1 text-sm text-[#6B7280]">Track active work and start new filings from one place.</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus size={16} className="mr-2" />
          Create filing
        </Button>
      </div>

      {/* Urgency Strip */}
      {urgentItems.length > 0 && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <h2 className="text-sm font-semibold text-red-800 mb-2">Needs Attention Today</h2>
          <div className="flex gap-3 overflow-x-auto">
            {urgentItems.map(d => (
              <div key={d.id} className="flex-shrink-0 rounded-md bg-white border border-red-200 px-3 py-2">
                <p className="text-sm font-medium text-gray-900">{d.formName}</p>
                <p className="text-xs text-red-600">
                  {daysUntil(d.dueDate) < 0
                    ? `${Math.abs(daysUntil(d.dueDate))} days overdue`
                    : `${daysUntil(d.dueDate)} days left`}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Filing Pipeline Kanban */}
        <div className="col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Filing Pipeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {KANBAN_COLUMNS.map(status => {
                  const items = filings.filter(f => f.status === status)
                  const shown = kanbanShown[status] || KANBAN_PAGE_SIZE
                  const visible = items.slice(0, shown)
                  const hasMore = items.length > shown
                  return (
                    <div key={status} className="min-w-[160px] flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <StatusBadge status={status} />
                        <span className="text-xs text-gray-500">{items.length}</span>
                      </div>
                      <div className="space-y-2">
                        {visible.map(filing => (
                          <div
                            key={filing.id}
                            className="cursor-pointer rounded-md border bg-white p-3 hover:shadow-sm transition-shadow"
                            onClick={() => navigate(`/filings/${filing.id}`)}
                          >
                            <p className="text-sm font-medium">{filing.formType}</p>
                            <p className="text-xs text-gray-500">{filing.formName}</p>
                            {filing.aiConfidenceScore != null && (
                              <div className="mt-1">
                                <ConfidenceBadge score={filing.aiConfidenceScore} />
                              </div>
                            )}
                          </div>
                        ))}
                        {hasMore && (
                          <button
                            onClick={() => setKanbanShown(prev => ({ ...prev, [status]: shown + KANBAN_PAGE_SIZE }))}
                            className="w-full rounded-md border border-dashed border-[#D1D5DB] py-2 text-xs font-medium text-[#6B7280] hover:bg-[#F9FAFB]"
                          >
                            Load more ({items.length - shown} remaining)
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Next Deadlines */}
          <Card>
            <CardHeader>
              <CardTitle>Next Deadlines</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {deadlines.slice(0, 3).map(d => (
                  <div key={d.id} className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <p className="text-sm font-medium">{d.formType}</p>
                      <p className="text-xs text-gray-500">{formatDate(d.dueDate)}</p>
                    </div>
                    <Badge className={(d.urgencyScore || 0) >= 90 ? 'bg-red-100 text-red-700' : (d.urgencyScore || 0) >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}>
                      {daysUntil(d.dueDate) < 0 ? 'Overdue' : `${daysUntil(d.dueDate)}d`}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* AI Activity Feed */}
          <Card>
            <CardHeader>
              <CardTitle>AI Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {recentActivity.map(entry => (
                  <div key={entry.id} className="border-l-2 border-blue-300 pl-3 py-1">
                    <p className="text-xs text-gray-500">{formatDate(entry.createdAt)}</p>
                    <p className="text-sm text-gray-700">{entry.action.replace(/_/g, ' ')}</p>
                    {entry.reasoning && (
                      <p className="text-xs text-gray-400 line-clamp-2">{entry.reasoning}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Approval Queue Preview */}
      {pendingApprovals.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>Pending Approvals</CardTitle>
              <Badge className="bg-red-100 text-red-700">{pendingApprovals.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {pagedApprovals.map(a => (
                <div key={a.id} className="rounded-md border p-4 cursor-pointer hover:shadow-sm" onClick={() => navigate('/approvals')}>
                  <p className="text-sm font-medium text-gray-900">{a.summary}</p>
                  {a.aiRecommendation && (
                    <p className="mt-1 text-xs text-gray-500">AI: {a.aiRecommendation}</p>
                  )}
                </div>
              ))}
            </div>
            <Pagination currentPage={approvalPage} totalPages={approvalPagination.totalPages} onPageChange={setApprovalPage} />
          </CardContent>
        </Card>
      )}

      <CreateFilingModal open={showCreateModal} onClose={() => setShowCreateModal(false)} />
    </div>
  )
}
