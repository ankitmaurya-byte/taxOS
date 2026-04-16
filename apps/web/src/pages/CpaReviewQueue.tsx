import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { ClipboardCheck, FileText, Building2, Calendar, ChevronRight, Clock } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  cpa_review: 'bg-amber-100 text-amber-800',
  founder_approval: 'bg-blue-100 text-blue-800',
  submitted: 'bg-green-100 text-green-800',
  intake: 'bg-gray-100 text-gray-700',
  ai_prep: 'bg-purple-100 text-purple-800',
  archived: 'bg-gray-100 text-gray-500',
}

export function CpaReviewQueue() {
  const user = useAuthStore((s) => s.user)

  const { data: filings = [], isLoading } = useQuery({
    queryKey: ['cpa-review-queue', user?.id],
    queryFn: async () => {
      const all = await api.filings.getAll() as any[]
      // Show only filings assigned to this CPA that are in active review stages
      return all.filter(
        (f) => f.cpaAssignedId === user?.id && (f.status === 'cpa_review' || f.status === 'founder_approval')
      )
    },
    enabled: !!user,
  })

  const pending = filings.filter((f: any) => f.status === 'cpa_review')
  const others = filings.filter((f: any) => f.status === 'founder_approval')

  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#EDE9FD]">
          <ClipboardCheck size={20} className="text-[#533afd]" />
        </div>
        <div>
          <h1 className="text-2xl font-light tracking-tight text-[#061b31]">My Review Queue</h1>
          <p className="text-sm text-[#64748d]">
            Filings escalated to you for CPA review and approval.
          </p>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Awaiting Review', value: pending.length, color: 'text-amber-600 bg-amber-50 border-amber-200' },
          { label: 'Total Active', value: filings.length, color: 'text-[#533afd] bg-[#EDE9FD] border-[#C4B5FD]' },
          { label: 'Sent to Founder', value: others.length, color: 'text-blue-700 bg-blue-50 border-blue-200' },
        ].map((stat) => (
          <div key={stat.label} className={`rounded-md border px-5 py-4 ${stat.color}`}>
            <p className="text-2xl font-bold">{stat.value}</p>
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
                <Clock size={14} className="text-amber-600" />
                <h2 className="text-sm font-semibold text-amber-700">Awaiting your review</h2>
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
              <h2 className="mb-3 text-sm font-semibold text-[#4B5563]">Sent to Founder Approval</h2>
              <div className="space-y-2">
                {others.map((filing: any) => (
                  <FilingCard key={filing.id} filing={filing} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function FilingCard({ filing, highlight = false }: { filing: any; highlight?: boolean }) {
  const statusColor = STATUS_COLORS[filing.status] || 'bg-gray-100 text-gray-700'

  return (
    <Link
      to={`/filings/${filing.id}`}
      className={`flex items-center gap-4 rounded-md border px-5 py-4 transition-all hover:shadow-sm hover:border-[#C4B5FD] ${
        highlight ? 'border-amber-200 bg-amber-50/50' : 'border-[#e5edf5] bg-white'
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
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${statusColor}`}>
          {filing.status.replace(/_/g, ' ')}
        </span>
        <ChevronRight size={16} className="text-[#64748d]" />
      </div>
    </Link>
  )
}
