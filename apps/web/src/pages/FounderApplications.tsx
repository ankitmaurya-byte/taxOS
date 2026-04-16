import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/auth'
import { Search, X } from 'lucide-react'
import { Pagination } from '@/components/Pagination'

const PAGE_SIZE = 10

export function FounderApplicationsPage() {
  const { founderApplications, founderApplicationsLoading, fetchFounderApplications, reviewFounderApplication } = useAuthStore()
  const [reviewing, setReviewing] = useState<string | null>(null)
  const [rejectPopupId, setRejectPopupId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (founderApplications.length === 0 && !founderApplicationsLoading) {
      fetchFounderApplications()
    }
  }, [])

  const handleReview = async (id: string, decision: 'approved' | 'rejected', reviewNotes?: string) => {
    setReviewing(id)
    try {
      await reviewFounderApplication(id, decision, reviewNotes)
    } finally {
      setReviewing(null)
    }
  }

  if (founderApplicationsLoading) return <div className="p-6 text-sm text-[#6B7280]">Loading founder applications...</div>

  let filtered = founderApplications as any[]

  if (statusFilter) {
    filtered = filtered.filter((a: any) => a.status === statusFilter)
  }

  if (search.trim()) {
    const q = search.toLowerCase()
    filtered = filtered.filter((a: any) =>
      a.organizationName?.toLowerCase().includes(q) ||
      a.name?.toLowerCase().includes(q) ||
      a.email?.toLowerCase().includes(q) ||
      a.legalCompanyName?.toLowerCase().includes(q) ||
      a.country?.toLowerCase().includes(q) ||
      a.stateOrJurisdiction?.toLowerCase().includes(q)
    )
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const pendingCount = founderApplications.filter((a: any) => a.status === 'pending').length
  const approvedCount = founderApplications.filter((a: any) => a.status === 'approved').length
  const rejectedCount = founderApplications.filter((a: any) => a.status === 'rejected').length

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#111827]">Founder Applications</h1>
        <p className="mt-1 text-sm text-[#6B7280]">Review Certificate of Incorporation details before creating the organization.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
          <p className="text-xs text-[#6B7280]">Pending</p>
          <p className="mt-1 text-2xl font-semibold text-[#92400E]">{pendingCount}</p>
        </div>
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
          <p className="text-xs text-[#6B7280]">Approved</p>
          <p className="mt-1 text-2xl font-semibold text-[#166534]">{approvedCount}</p>
        </div>
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
          <p className="text-xs text-[#6B7280]">Rejected</p>
          <p className="mt-1 text-2xl font-semibold text-[#991B1B]">{rejectedCount}</p>
        </div>
      </div>

      {/* Search + Status filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search by org, name, email, jurisdiction..."
            className="h-9 w-full rounded-lg border border-[#E5E7EB] bg-white pl-9 pr-8 text-sm text-[#111827] placeholder:text-[#9CA3AF] outline-none focus:ring-2 focus:ring-[#6C5CE7] focus:border-transparent"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#374151]">
              <X size={14} />
            </button>
          )}
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => { setStatusFilter(null); setPage(1) }}
            className={`h-9 px-3 rounded-lg text-xs font-medium transition-colors ${
              !statusFilter ? 'bg-[#111827] text-white' : 'bg-white text-[#374151] border border-[#E5E7EB] hover:bg-[#F9FAFB]'
            }`}
          >
            All ({founderApplications.length})
          </button>
          {(['pending', 'approved', 'rejected'] as const).map((status) => (
            <button
              key={status}
              onClick={() => { setStatusFilter(status); setPage(1) }}
              className={`h-9 px-3 rounded-lg text-xs font-medium capitalize transition-colors ${
                statusFilter === status
                  ? 'bg-[#111827] text-white'
                  : 'bg-white text-[#374151] border border-[#E5E7EB] hover:bg-[#F9FAFB]'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <p className="text-xs text-[#6B7280]">{filtered.length} application{filtered.length !== 1 ? 's' : ''}</p>

      <div className="space-y-4">
        {paginated.map((application: any) => (
          <div key={application.id} className="rounded-xl border border-[#E5E7EB] bg-white p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-medium text-[#111827]">{application.organizationName}</h2>
                <p className="text-sm text-[#6B7280]">{application.name} · {application.email}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs ${application.status === 'pending' ? 'bg-[#FEF3C7] text-[#92400E]' : application.status === 'approved' ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#FEE2E2] text-[#991B1B]'}`}>
                {application.status}
              </span>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 text-sm text-[#374151]">
              <p><span className="font-medium">Legal name:</span> {application.legalCompanyName}</p>
              <p><span className="font-medium">Registration #:</span> {application.registrationNumber}</p>
              <p><span className="font-medium">Jurisdiction:</span> {application.country} / {application.stateOrJurisdiction}</p>
              <p><span className="font-medium">Incorporated:</span> {application.incorporationDate}</p>
              {application.certificateStorageUrl && (
                <p className="md:col-span-2"><span className="font-medium">Certificate:</span> <a className="text-[#6C5CE7] underline" href={application.certificateStorageUrl} target="_blank" rel="noreferrer">{application.certificateFileName}</a></p>
              )}
            </div>

            {application.status === 'pending' && (
              <div className="mt-5 flex gap-3">
                <button
                  onClick={() => handleReview(application.id, 'approved')}
                  disabled={reviewing === application.id}
                  className="rounded-lg bg-[#166534] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {reviewing === application.id ? 'Processing...' : 'Approve'}
                </button>
                <button
                  onClick={() => {
                    setRejectPopupId(application.id)
                    setRejectReason('')
                  }}
                  disabled={reviewing === application.id}
                  className="rounded-lg bg-[#B91C1C] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        ))}
        {paginated.length === 0 && (
          <p className="text-sm text-[#6B7280]">{search || statusFilter ? 'No applications match your filters.' : 'No founder applications found.'}</p>
        )}
      </div>

      <Pagination
        page={safePage}
        totalPages={totalPages}
        totalItems={filtered.length}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        itemLabel="applications"
      />

      {rejectPopupId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-[#111827]">Reject Application</h3>
            <p className="mt-1 text-sm text-[#6B7280]">Please provide a reason for rejecting this application.</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Invalid certificate uploaded..."
              className="mt-4 w-full rounded-lg border border-[#E5E7EB] p-3 text-sm focus:border-[#6C5CE7] focus:outline-none focus:ring-1 focus:ring-[#6C5CE7]"
              rows={4}
            />
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setRejectPopupId(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-[#374151] hover:bg-[#F3F4F6]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (rejectReason.trim()) {
                    handleReview(rejectPopupId, 'rejected', rejectReason.trim())
                    setRejectPopupId(null)
                  }
                }}
                disabled={!rejectReason.trim()}
                className="rounded-lg bg-[#B91C1C] px-4 py-2 text-sm font-medium text-white hover:bg-[#991B1B] disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
