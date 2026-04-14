import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { Search, X, Calendar } from 'lucide-react'
import { Pagination } from '@/components/Pagination'

const FILING_STATUSES = ['intake', 'ai_prep', 'cpa_review', 'founder_approval', 'submitted', 'archived']

const STATUS_STYLES: Record<string, string> = {
  intake: 'bg-[#F3F4F6] text-[#374151]',
  ai_prep: 'bg-[#DBEAFE] text-[#1E40AF]',
  cpa_review: 'bg-[#FEF3C7] text-[#92400E]',
  founder_approval: 'bg-[#FDE68A] text-[#78350F]',
  submitted: 'bg-[#DCFCE7] text-[#166534]',
  archived: 'bg-[#E5E7EB] text-[#6B7280]',
}

const PAGE_SIZE = 15

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function AdminFilings() {
  const { data: filings, isLoading } = useQuery({
    queryKey: ['admin-global-filings'],
    queryFn: () => api.admin.getGlobalFilings(),
  })

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)

  if (isLoading) return <div className="p-6 text-sm text-[#6B7280]">Loading global filings...</div>

  let filtered = (filings || []) as any[]

  if (search.trim()) {
    const q = search.toLowerCase()
    filtered = filtered.filter((f: any) =>
      f.formName?.toLowerCase().includes(q) ||
      f.formType?.toLowerCase().includes(q) ||
      f.orgName?.toLowerCase().includes(q) ||
      f.legalName?.toLowerCase().includes(q) ||
      f.cpaName?.toLowerCase().includes(q)
    )
  }

  if (statusFilter) {
    filtered = filtered.filter((f: any) => f.status === statusFilter)
  }

  if (dateFrom) {
    const from = new Date(dateFrom).getTime()
    filtered = filtered.filter((f: any) => {
      const d = new Date(f.createdAt).getTime()
      return !isNaN(d) && d >= from
    })
  }

  if (dateTo) {
    const to = new Date(dateTo).getTime() + 86_400_000 // inclusive end-of-day
    filtered = filtered.filter((f: any) => {
      const d = new Date(f.createdAt).getTime()
      return !isNaN(d) && d <= to
    })
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const hasFilters = search || statusFilter || dateFrom || dateTo

  function clearAll() {
    setSearch('')
    setStatusFilter(null)
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  function handleStatusFilter(s: string | null) {
    setStatusFilter(s)
    setPage(1)
  }

  function handleSearch(v: string) {
    setSearch(v)
    setPage(1)
  }

  function handleDateFrom(v: string) {
    setDateFrom(v)
    setPage(1)
  }

  function handleDateTo(v: string) {
    setDateTo(v)
    setPage(1)
  }

  return (
    <div className="space-y-5 p-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold text-[#111827]">Global Filings</h1>
        <p className="mt-1 text-sm text-[#6B7280]">View all IRS filings securely mapped across the entire system.</p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3">
        {/* Row 1: search + date range + clear */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative w-64">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search filings, org, entity, CPA..."
              className="h-9 w-full rounded-lg border border-[#E5E7EB] bg-white pl-9 pr-8 text-sm text-[#111827] placeholder:text-[#9CA3AF] outline-none focus:ring-2 focus:ring-[#6C5CE7] focus:border-transparent"
            />
            {search && (
              <button onClick={() => handleSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#374151]">
                <X size={13} />
              </button>
            )}
          </div>

          {/* Date from */}
          <div className="relative">
            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => handleDateFrom(e.target.value)}
              className="h-9 rounded-lg border border-[#E5E7EB] bg-white pl-9 pr-3 text-sm text-[#374151] outline-none focus:ring-2 focus:ring-[#6C5CE7] focus:border-transparent"
            />
          </div>
          <span className="text-xs text-[#9CA3AF]">to</span>
          <div className="relative">
            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none" />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => handleDateTo(e.target.value)}
              className="h-9 rounded-lg border border-[#E5E7EB] bg-white pl-9 pr-3 text-sm text-[#374151] outline-none focus:ring-2 focus:ring-[#6C5CE7] focus:border-transparent"
            />
          </div>

          {hasFilters && (
            <button
              onClick={clearAll}
              className="flex items-center gap-1 h-9 px-3 rounded-lg text-xs font-medium text-[#EF4444] border border-[#FCA5A5] bg-[#FEF2F2] hover:bg-[#FEE2E2] transition-colors"
            >
              <X size={12} /> Clear filters
            </button>
          )}
        </div>

        {/* Row 2: status pills */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => handleStatusFilter(null)}
            className={`h-8 px-3 rounded-lg text-xs font-medium transition-colors ${
              !statusFilter ? 'bg-[#111827] text-white' : 'bg-white text-[#374151] border border-[#E5E7EB] hover:bg-[#F9FAFB]'
            }`}
          >
            All
          </button>
          {FILING_STATUSES.map((status) => (
            <button
              key={status}
              onClick={() => handleStatusFilter(status)}
              className={`h-8 px-3 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-[#111827] text-white'
                  : 'bg-white text-[#374151] border border-[#E5E7EB] hover:bg-[#F9FAFB]'
              }`}
            >
              {status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#E5E7EB] bg-white overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm text-[#374151]">
          <thead className="bg-[#F9FAFB] text-xs uppercase text-[#6B7280] border-b border-[#E5E7EB]">
            <tr>
              <th className="px-5 py-3.5">Filing</th>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5">Organization</th>
              <th className="px-5 py-3.5">Entity</th>
              <th className="px-5 py-3.5">CPA Assigned</th>
              <th className="px-5 py-3.5">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {paginated.map((f: any) => (
              <tr key={f.id} className="hover:bg-[#F9FAFB]/50">
                <td className="px-5 py-3.5 font-medium text-[#111827]">{f.formName} ({f.formType})</td>
                <td className="px-5 py-3.5">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[f.status] || 'bg-[#E0E7FF] text-[#4338CA]'}`}>
                    {f.status?.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-[#6C5CE7] hover:underline">
                  <Link to={`/admin/organizations/${f.orgId}`}>{f.orgName}</Link>
                </td>
                <td className="px-5 py-3.5 italic text-[#374151]">{f.legalName}</td>
                <td className={`px-5 py-3.5 ${f.cpaAssignedId ? 'text-[#111827]' : 'text-[#9CA3AF]'}`}>
                  {f.cpaName || 'Unassigned'}
                </td>
                <td className="px-5 py-3.5 text-[#6B7280] whitespace-nowrap">{formatDate(f.createdAt)}</td>
              </tr>
            ))}
            {paginated.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-[#6B7280]">
                  {hasFilters ? 'No filings match your filters.' : 'No filings found.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        page={safePage}
        totalPages={totalPages}
        totalItems={filtered.length}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        itemLabel="filings"
      />
    </div>
  )
}
