// Used in: App.tsx — route /claim-filings (CPA claims unclaimed filings)
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import { StatusBadge } from '@/components/ui/status-badge'
import { formatDate } from '@/lib/utils'
import {
  FileText,
  Building2,
  Calendar,
  ChevronRight,
  Inbox,
  ShieldCheck,
} from 'lucide-react'

export function ClaimFilings() {
  const user = useAuthStore(s => s.user)
  const filingsList = useAuthStore(s => s.filings)
  const fetchFilings = useAuthStore(s => s.fetchFilings)
  const claimFilingReview = useAuthStore(s => s.claimFilingReview)

  useEffect(() => {
    fetchFilings()
  }, [fetchFilings])

  // Only show filings in cpa_review that are NOT already claimed by another CPA
  const claimable = filingsList.filter(
    (f: any) => f.status === 'cpa_review' && !f.reviewLock
  )

  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#EDE9FD]">
          <Inbox size={20} className="text-[#533afd]" />
        </div>
        <div>
          <h1 className="text-2xl font-light tracking-tight text-[#061b31]">Claim Filings</h1>
          <p className="text-sm text-[#64748d]">
            Filings available for CPA review. Claim a filing to start reviewing.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-md border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-2xl font-bold text-amber-600">{claimable.length}</p>
          <p className="mt-0.5 text-xs font-medium text-amber-600 opacity-80">Available to Claim</p>
        </div>
        <div className="rounded-md border border-[#C4B5FD] bg-[#EDE9FD] px-5 py-4">
          <p className="text-2xl font-bold text-[#533afd]">{filingsList.filter((f: any) => f.status === 'cpa_review').length}</p>
          <p className="mt-0.5 text-xs font-medium text-[#533afd] opacity-80">Total in CPA Review</p>
        </div>
      </div>

      {claimable.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-[#e5edf5] py-16 text-center">
          <ShieldCheck size={36} className="text-[#e5edf5] mb-3" />
          <p className="text-sm font-medium text-[#273951]">No filings available to claim</p>
          <p className="mt-1 text-xs text-[#64748d]">
            When filings are escalated to CPA review, they will appear here for you to claim.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {claimable.map((filing: any) => (
            <div
              key={filing.id}
              className="flex items-center gap-4 rounded-md border border-amber-200 bg-amber-50/50 px-5 py-4 transition-all hover:shadow-sm hover:border-[#C4B5FD]"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white flex-shrink-0">
                <FileText size={16} className="text-[#64748d]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-[#061b31]">
                  {filing.formType} — {filing.formName}
                </p>
                <div className="mt-1 flex items-center gap-3 text-xs text-[#64748d]">
                  {filing.entityId && (
                    <span className="flex items-center gap-1">
                      <Building2 size={11} />
                      {filing.entityId.slice(0, 8)}...
                    </span>
                  )}
                  {filing.taxYear && (
                    <span className="flex items-center gap-1">
                      <Calendar size={11} />
                      TY {filing.taxYear}
                    </span>
                  )}
                  {filing.createdAt && (
                    <span className="text-[#64748d]">Created {formatDate(filing.createdAt)}</span>
                  )}
                </div>
                {filing.aiSummary && (
                  <p className="mt-1.5 text-xs text-[#64748d] line-clamp-2">{filing.aiSummary}</p>
                )}
                {filing.aiConfidenceScore != null && (
                  <p className="mt-1 text-xs text-[#64748d]">
                    AI confidence: {Math.round(filing.aiConfidenceScore * 100)}%
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <StatusBadge status={filing.status} />
                <button
                  onClick={async () => {
                    await claimFilingReview(filing.id)
                    fetchFilings()
                  }}
                  className="h-9 rounded-lg bg-[#533afd] px-4 text-sm font-medium text-white hover:bg-[#4434d4] transition-colors"
                >
                  Claim
                </button>
                <Link to={`/filings/${filing.id}`}>
                  <ChevronRight size={16} className="text-[#64748d]" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
