// Used in: App.tsx — route /claim-filings (CPA claims unclaimed filings)
import { useEffect, useState } from 'react'
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
  Plus,
} from 'lucide-react'

const PAGE_SIZE = 10

export function ClaimFilings() {
  const filingsList = useAuthStore(s => s.filings)
  const fetchFilings = useAuthStore(s => s.fetchFilings)
  const claimFilingReview = useAuthStore(s => s.claimFilingReview)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  useEffect(() => {
    fetchFilings()
  }, [fetchFilings])

  // Only show filings in cpa_review that are NOT already claimed by another CPA
  const claimable = filingsList.filter(
    (f: any) => f.status === 'cpa_review' && !f.reviewLock
  )
  const visibleClaimable = claimable.slice(0, visibleCount)
  const hasMore = visibleCount < claimable.length

  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#EDE9FD]">
          <Inbox size={20} className="text-[#533afd]" />
        </div>
        <div>
          <h1 className="text-2xl font-normal tracking-tight text-[#061b31]" style={{ fontWeight: 300 }}>Claim Filings</h1>
          <p className="text-sm text-[#64748d]">
            Filings available for CPA review. Claim a filing to start reviewing.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-md border border-[rgba(155,104,41,0.25)] bg-[rgba(155,104,41,0.06)] px-5 py-4">
          <p className="text-2xl font-normal text-[#9b6829] font-tnum" style={{ fontWeight: 300 }}>{claimable.length}</p>
          <p className="mt-0.5 text-xs font-medium text-[#9b6829] opacity-80">Available to Claim</p>
        </div>
        <div className="rounded-md border border-[#b9b9f9] bg-[#EDE9FD] px-5 py-4">
          <p className="text-2xl font-normal text-[#533afd] font-tnum" style={{ fontWeight: 300 }}>{filingsList.filter((f: any) => f.status === 'cpa_review').length}</p>
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
          {visibleClaimable.map((filing: any) => (
            <div
              key={filing.id}
              className="flex items-center gap-4 rounded-md border border-[rgba(155,104,41,0.25)] bg-[rgba(155,104,41,0.06)] px-5 py-4 transition-all hover:shadow-sm hover:border-[#b9b9f9]"
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

          {hasMore && (
            <div className="flex items-center justify-center pt-2">
              <button
                onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-[6px] border border-[#e5edf5] bg-white text-sm text-[#273951] hover:bg-[#f6f9fc] transition-colors"
              >
                <Plus size={14} />
                Load {Math.min(PAGE_SIZE, claimable.length - visibleCount)} more
                <span className="text-[#64748d] font-tnum">· {visibleCount}/{claimable.length}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
