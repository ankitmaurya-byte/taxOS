import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { ClipboardCheck, FileText, Building2, Calendar, ChevronRight, Clock, ShieldCheck } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  cpa_review: 'bg-[rgba(155,104,41,0.12)] text-[#9b6829]',
  founder_approval: 'bg-[#EDE9FD] text-[#533afd]',
  submitted: 'bg-[rgba(21,190,83,0.12)] text-[#108c3d]',
  intake: 'bg-[#f6f9fc] text-[#273951]',
  ai_prep: 'bg-[#EDE9FD] text-[#533afd]',
  archived: 'bg-[#f6f9fc] text-[#64748d]',
}

export function CpaReviewQueue() {
  const user = useAuthStore((s) => s.user)

  const { data: filings = [], isLoading } = useQuery({
    queryKey: ['cpa-review-queue', user?.id],
    queryFn: async () => {
      const all = await api.filings.getAll() as any[]
      // Include:
      //  - Filings assigned to this CPA in active review stages
      //  - Filings where prefill auto-skipped CPA review (visible to all CPAs with org access)
      return all.filter((f) => {
        const assignedMine = f.cpaAssignedId === user?.id && (f.status === 'cpa_review' || f.status === 'founder_approval')
        const skipped = f.cpaReviewSkipped === true || f.cpaReviewSkipped === 1
        return assignedMine || skipped
      })
    },
    enabled: !!user,
  })

  const pending = filings.filter((f: any) => f.status === 'cpa_review' && !(f.cpaReviewSkipped === true || f.cpaReviewSkipped === 1))
  const skipped = filings.filter((f: any) => f.cpaReviewSkipped === true || f.cpaReviewSkipped === 1)
  const others = filings.filter((f: any) =>
    f.status === 'founder_approval' && !(f.cpaReviewSkipped === true || f.cpaReviewSkipped === 1) && f.cpaAssignedId === user?.id,
  )

  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#EDE9FD]">
          <ClipboardCheck size={20} className="text-[#533afd]" />
        </div>
        <div>
          <h1 className="text-2xl font-normal tracking-tight text-[#061b31]" style={{ fontWeight: 300 }}>My Review Queue</h1>
          <p className="text-sm text-[#64748d]">
            Filings escalated to you for CPA review and approval.
          </p>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Awaiting Review', value: pending.length, color: 'text-[#9b6829] bg-[rgba(155,104,41,0.08)] border-[rgba(155,104,41,0.2)]' },
          { label: 'Total Active', value: filings.length, color: 'text-[#533afd] bg-[#EDE9FD] border-[#b9b9f9]' },
          { label: 'Sent to Founder', value: others.length, color: 'text-[#533afd] bg-[#EDE9FD] border-[#b9b9f9]' },
          { label: 'CPA Review Skipped', value: skipped.length, color: 'text-[#108c3d] bg-[rgba(21,190,83,0.08)] border-[rgba(21,190,83,0.2)]' },
        ].map((stat) => (
          <div key={stat.label} className={`rounded-md border px-5 py-4 ${stat.color}`}>
            <p className="text-2xl font-normal font-tnum" style={{ fontWeight: 300 }}>{stat.value}</p>
            <p className="mt-0.5 text-xs font-medium opacity-80">{stat.label}</p>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-sm text-[#64748d]">
          Loading your review queue...
        </div>
      ) : filings.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-[#e5edf5] py-16 text-center">
          <ClipboardCheck size={36} className="text-[#e5edf5] mb-3" />
          <p className="text-sm font-medium text-[#273951]">No filings assigned to you yet</p>
          <p className="mt-1 text-xs text-[#64748d]">
            When a team member or founder escalates a filing to CPA review, it will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Awaiting Review section */}
          {pending.length > 0 && (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Clock size={14} className="text-[#9b6829]" />
                <h2 className="text-sm font-normal text-[#9b6829]" style={{ fontWeight: 400 }}>Awaiting your review</h2>
              </div>
              <div className="space-y-2">
                {pending.map((filing: any) => (
                  <FilingCard key={filing.id} filing={filing} highlight />
                ))}
              </div>
            </div>
          )}

          {/* Filings sent to founder approval */}
          {others.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-normal text-[#273951]" style={{ fontWeight: 400 }}>Sent to Founder Approval</h2>
              <div className="space-y-2">
                {others.map((filing: any) => (
                  <FilingCard key={filing.id} filing={filing} />
                ))}
              </div>
            </div>
          )}

          {/* Filings where AI prefill confidence was high enough to skip CPA review */}
          {skipped.length > 0 && (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <ShieldCheck size={14} className="text-[#108c3d]" />
                <h2 className="text-sm font-normal text-[#108c3d]" style={{ fontWeight: 400 }}>CPA Review Skipped (high AI confidence)</h2>
              </div>
              <p className="text-xs text-[#64748d] mb-2">
                AI prefill was confident enough that the filing went straight to founder approval. Review optional.
              </p>
              <div className="space-y-2">
                {skipped.map((filing: any) => (
                  <FilingCard key={filing.id} filing={filing} skippedBadge />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function FilingCard({ filing, highlight = false, skippedBadge = false }: { filing: any; highlight?: boolean; skippedBadge?: boolean }) {
  const statusColor = STATUS_COLORS[filing.status] || 'bg-[#f6f9fc] text-[#273951]'

  return (
    <Link
      to={`/filings/${filing.id}`}
      className={`flex items-center gap-4 rounded-md border px-5 py-4 transition-all hover:shadow-sm hover:border-[#b9b9f9] ${
        highlight ? 'border-[rgba(155,104,41,0.25)] bg-[rgba(155,104,41,0.06)]' : 'border-[#e5edf5] bg-white'
      }`}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f6f9fc] flex-shrink-0">
        <FileText size={16} className="text-[#64748d]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium text-[#061b31]">{filing.formName || filing.formType}</p>
        <div className="mt-0.5 flex items-center gap-3 text-xs text-[#64748d]">
          {filing.orgName && (
            <span className="flex items-center gap-1">
              <Building2 size={11} />
              {filing.orgName}
            </span>
          )}
          {filing.taxYear && (
            <span className="flex items-center gap-1">
              <Calendar size={11} />
              TY {filing.taxYear}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {skippedBadge && (
          <span className="inline-flex items-center gap-1 rounded-md border border-[rgba(21,190,83,0.3)] bg-[rgba(21,190,83,0.08)] px-2 py-0.5 text-[10px] font-medium text-[#108c3d]">
            <ShieldCheck size={10} />
            Review skipped
          </span>
        )}
        <span className={`rounded-md px-2.5 py-0.5 text-[11px] font-medium capitalize ${statusColor}`}>
          {filing.status.replace(/_/g, ' ')}
        </span>
        <ChevronRight size={16} className="text-[#64748d]" />
      </div>
    </Link>
  )
}
