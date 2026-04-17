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

  if (founderApplicationsLoading) return <div className="p-6 text-sm text-[#64748d]">Loading founder applications...</div>

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
    <div className="space-y-6 p-3 sm:p-5 md:p-6 lg:p-8">
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-normal text-[#061b31]" style={{ fontWeight: 300 }}>Founder Applications</h1>
        <p className="mt-1 text-sm text-[#64748d]">Review Certificate of Incorporation details before creating the organization.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="rounded-md border border-[#e5edf5] bg-white p-4">
          <p className="text-xs text-[#64748d]">Pending</p>
          <p className="mt-1 text-2xl font-normal text-[#9b6829] font-tnum" style={{ fontWeight: 300 }}>{pendingCount}</p>
        </div>
        <div className="rounded-md border border-[#e5edf5] bg-white p-4">
          <p className="text-xs text-[#64748d]">Approved</p>
          <p className="mt-1 text-2xl font-normal text-[#108c3d] font-tnum" style={{ fontWeight: 300 }}>{approvedCount}</p>
        </div>
        <div className="rounded-md border border-[#e5edf5] bg-white p-4">
          <p className="text-xs text-[#64748d]">Rejected</p>
          <p className="mt-1 text-2xl font-normal text-[#ea2261] font-tnum" style={{ fontWeight: 300 }}>{rejectedCount}</p>
        </div>
      </div>

      {/* Search + Status filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748d]" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search by org, name, email, jurisdiction..."
            className="h-9 w-full rounded-lg border border-[#e5edf5] bg-white pl-9 pr-8 text-sm text-[#061b31] placeholder:text-[#64748d] outline-none focus:ring-2 focus:ring-[#533afd] focus:border-transparent"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748d] hover:text-[#273951]">
              <X size={14} />
            </button>
          )}
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => { setStatusFilter(null); setPage(1) }}
            className={`h-9 px-3 rounded-lg text-xs font-medium transition-colors ${
              !statusFilter ? 'bg-[#061b31] text-white' : 'bg-white text-[#273951] border border-[#e5edf5] hover:bg-[#f6f9fc]'
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
                  ? 'bg-[#061b31] text-white'
                  : 'bg-white text-[#273951] border border-[#e5edf5] hover:bg-[#f6f9fc]'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <p className="text-xs text-[#64748d]">{filtered.length} application{filtered.length !== 1 ? 's' : ''}</p>

      <div className="space-y-4">
        {paginated.map((application: any) => (
          <div key={application.id} className="rounded-md border border-[#e5edf5] bg-white p-4 sm:p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-lg font-medium text-[#061b31]">{application.organizationName}</h2>
                <p className="text-sm text-[#64748d]">{application.name} · {application.email}</p>
              </div>
              <span className={`rounded-md px-3 py-1 text-xs ${application.status === 'pending' ? 'bg-[rgba(155,104,41,0.12)] text-[#9b6829]' : application.status === 'approved' ? 'bg-[rgba(21,190,83,0.12)] text-[#108c3d]' : 'bg-[rgba(234,34,97,0.08)] text-[#ea2261]'}`}>
                {application.status}
              </span>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 text-sm text-[#273951]">
              <p><span className="font-medium">Legal name:</span> {application.legalCompanyName}</p>
              <p><span className="font-medium">Registration #:</span> {application.registrationNumber}</p>
              <p><span className="font-medium">Jurisdiction:</span> {application.country} / {application.stateOrJurisdiction}</p>
              <p><span className="font-medium">Incorporated:</span> {application.incorporationDate}</p>
              {application.certificateStorageUrl && (
                <p className="md:col-span-2"><span className="font-medium">Certificate:</span> <a className="text-[#533afd] underline" href={application.certificateStorageUrl} target="_blank" rel="noreferrer">{application.certificateFileName}</a></p>
              )}
            </div>

            {application.status === 'pending' && (
              <div className="mt-5 flex gap-3 flex-wrap">
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
          <p className="text-sm text-[#64748d]">{search || statusFilter ? 'No applications match your filters.' : 'No founder applications found.'}</p>
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
          <div className="w-full max-w-sm max-w-[calc(100vw-1.5rem)] rounded-md bg-white p-5 sm:p-6 shadow-xl">
            <h3 className="text-lg font-normal text-[#061b31]" style={{ fontWeight: 400 }}>Reject Application</h3>
            <p className="mt-1 text-sm text-[#64748d]">Please provide a reason for rejecting this application.</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Invalid certificate uploaded..."
              className="mt-4 w-full rounded-lg border border-[#e5edf5] p-3 text-sm focus:border-[#533afd] focus:outline-none focus:ring-1 focus:ring-[#533afd]"
              rows={4}
            />
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setRejectPopupId(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-[#273951] hover:bg-[#f6f9fc]"
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
