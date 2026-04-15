// Used in: App.tsx — route /deadlines (tax deadlines calendar)
import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/auth'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Pagination, usePagination } from '@/components/ui/pagination'
import { formatDate, daysUntil } from '@/lib/utils'

const PAGE_SIZE = 15

export function DeadlinesPage() {
  const [selectedEntityId, setSelectedEntityId] = useState('')
  const [selectedDeadlineId, setSelectedDeadlineId] = useState<string | null>(null)
  const [runLoading, setRunLoading] = useState(false)
  const [page, setPage] = useState(1)

  const deadlines = useAuthStore(s => s.deadlines)
  const entities = useAuthStore(s => s.entities)
  const fetchDeadlines = useAuthStore(s => s.fetchDeadlines)
  const fetchEntities = useAuthStore(s => s.fetchEntities)
  const runDeadlines = useAuthStore(s => s.runDeadlines)

  useEffect(() => {
    fetchDeadlines()
    fetchEntities()
  }, [fetchDeadlines, fetchEntities])

  const selectedDeadline = selectedDeadlineId
    ? deadlines.find(d => d.id === selectedDeadlineId)
    : undefined

  const getUrgencyColor = (score: number) => {
    if (score >= 90) return 'border-l-red-500 bg-red-50'
    if (score >= 60) return 'border-l-amber-500 bg-amber-50'
    return 'border-l-green-500 bg-green-50'
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      upcoming: 'bg-blue-100 text-blue-700',
      overdue: 'bg-red-100 text-red-700',
      filed: 'bg-green-100 text-green-700',
      extended: 'bg-purple-100 text-purple-700',
    }
    return colors[status] || 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Deadlines</h1>
        <div className="flex items-center gap-2">
          <select
            value={selectedEntityId}
            onChange={(e) => setSelectedEntityId(e.target.value)}
            className="h-10 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm text-[#111827]"
          >
            <option value="">Select entity</option>
            {entities.map((entity: any) => (
              <option key={entity.id} value={entity.id}>
                {entity.legalName}
              </option>
            ))}
          </select>
          <button
            onClick={async () => {
              if (!selectedEntityId) return
              setRunLoading(true)
              try { await runDeadlines(selectedEntityId) } finally { setRunLoading(false) }
            }}
            disabled={!selectedEntityId || runLoading}
            className="h-10 rounded-lg bg-[#6C5CE7] px-4 text-sm font-medium text-white hover:bg-[#5B4BD5] disabled:opacity-50"
          >
            {runLoading ? 'Recalculating...' : 'Run Deadline Agent'}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {usePagination(deadlines, PAGE_SIZE).getPage(page).map(deadline => {
          const days = daysUntil(deadline.dueDate)
          return (
            <Card
              key={deadline.id}
              className={`cursor-pointer border-l-4 ${getUrgencyColor(deadline.urgencyScore || 0)}`}
              onClick={() => setSelectedDeadlineId(deadline.id)}
            >
              <CardContent className="flex items-center justify-between p-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900">{deadline.formType}</p>
                    <Badge className={getStatusBadge(deadline.status)}>{deadline.status}</Badge>
                    {deadline.aiPredicted && (
                      <Badge className="bg-purple-50 text-purple-600 text-xs">AI predicted</Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{deadline.formName}</p>
                  {deadline.description && (
                    <p className="text-xs text-gray-400">{deadline.description}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{formatDate(deadline.dueDate)}</p>
                  <p className={`text-sm font-bold ${days < 0 ? 'text-red-600' : days < 14 ? 'text-amber-600' : 'text-green-600'}`}>
                    {days < 0 ? `${Math.abs(days)} days overdue` : days === 0 ? 'Due today' : `${days} days left`}
                  </p>
                  <div className="mt-1">
                    <div className="h-2 w-20 rounded-full bg-gray-200 ml-auto">
                      <div
                        className={`h-2 rounded-full ${(deadline.urgencyScore || 0) >= 90 ? 'bg-red-500' : (deadline.urgencyScore || 0) >= 60 ? 'bg-amber-500' : 'bg-green-500'}`}
                        style={{ width: `${deadline.urgencyScore || 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
        <Pagination currentPage={page} totalPages={Math.max(1, Math.ceil(deadlines.length / PAGE_SIZE))} onPageChange={setPage} />
      </div>

      {selectedDeadline && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button className="absolute inset-0 bg-black/40" onClick={() => setSelectedDeadlineId(null)} />
          <div className="relative w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-[#111827]">{selectedDeadline.formType}</h2>
                <p className="mt-1 text-sm text-[#6B7280]">{selectedDeadline.formName}</p>
              </div>
              <Badge className={getStatusBadge(selectedDeadline.status)}>{selectedDeadline.status}</Badge>
            </div>
            <div className="mt-5 grid gap-3 text-sm">
              <div className="flex justify-between gap-6">
                <span className="text-[#6B7280]">Due date</span>
                <span className="font-medium text-[#111827]">{formatDate(selectedDeadline.dueDate)}</span>
              </div>
              <div className="flex justify-between gap-6">
                <span className="text-[#6B7280]">Urgency score</span>
                <span className="font-medium text-[#111827]">{selectedDeadline.urgencyScore ?? 0}</span>
              </div>
              <div className="flex justify-between gap-6">
                <span className="text-[#6B7280]">AI predicted</span>
                <span className="font-medium text-[#111827]">{selectedDeadline.aiPredicted ? 'Yes' : 'No'}</span>
              </div>
              {selectedDeadline.description && (
                <div className="rounded-lg bg-[#F9FAFB] p-3 text-[#374151]">{selectedDeadline.description}</div>
              )}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedDeadlineId(null)}
                className="h-9 rounded-lg bg-[#6C5CE7] px-4 text-sm font-medium text-white hover:bg-[#5B4BD5]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
