import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { Search, X, Calendar, Pencil, Check } from 'lucide-react'
import { Pagination } from '@/components/Pagination'

const FILING_STATUSES = ['intake', 'ai_prep', 'cpa_review', 'founder_approval', 'submitted', 'archived']

const STATUS_STYLES: Record<string, string> = {
  intake: 'bg-[#f6f9fc] text-[#273951]',
  ai_prep: 'bg-[#DBEAFE] text-[#1E40AF]',
  cpa_review: 'bg-[#FEF3C7] text-[#92400E]',
  founder_approval: 'bg-[#FDE68A] text-[#78350F]',
  submitted: 'bg-[#DCFCE7] text-[#166534]',
  archived: 'bg-[#e5edf5] text-[#64748d]',
}

const PAGE_SIZE = 15

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function AdminFilings() {
  const queryClient = useQueryClient()
  const { data: filings, isLoading } = useQuery({
    queryKey: ['admin-global-filings'],
    queryFn: () => api.admin.getGlobalFilings(),
  })

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)

  // Inline status edit
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editStatus, setEditStatus] = useState('')

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.admin.updateFilingStatus(id, status),
    onSuccess: () => {
      setEditingId(null)
      queryClient.invalidateQueries({ queryKey: ['admin-global-filings'] })
    },
  })

  if (isLoading) return <div className="p-6 text-sm text-[#64748d]">Loading global filings...</div>

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
        <h1 className="text-2xl font-semibold text-[#061b31]">Global Filings</h1>
        <p className="mt-1 text-sm text-[#64748d]">View all IRS filings securely mapped across the entire system.</p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3">
        {/* Row 1: search + date range + clear */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative w-64">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748d]" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search filings, org, entity, CPA..."
              className="h-9 w-full rounded-lg border border-[#e5edf5] bg-white pl-9 pr-8 text-sm text-[#061b31] placeholder:text-[#64748d] outline-none focus:ring-2 focus:ring-[#533afd] focus:border-transparent"
            />
            {search && (
              <button onClick={() => handleSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748d] hover:text-[#273951]">
                <X size={13} />
              </button>
            )}
          </div>

          {/* Date from */}
          <div className="relative">
            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748d] pointer-events-none" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => handleDateFrom(e.target.value)}
              className="h-9 rounded-lg border border-[#e5edf5] bg-white pl-9 pr-3 text-sm text-[#273951] outline-none focus:ring-2 focus:ring-[#533afd] focus:border-transparent"
            />
          </div>
          <span className="text-xs text-[#64748d]">to</span>
          <div className="relative">
            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748d] pointer-events-none" />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => handleDateTo(e.target.value)}
              className="h-9 rounded-lg border border-[#e5edf5] bg-white pl-9 pr-3 text-sm text-[#273951] outline-none focus:ring-2 focus:ring-[#533afd] focus:border-transparent"
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
              !statusFilter ? 'bg-[#061b31] text-white' : 'bg-white text-[#273951] border border-[#e5edf5] hover:bg-[#f6f9fc]'
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
                  ? 'bg-[#061b31] text-white'
                  : 'bg-white text-[#273951] border border-[#e5edf5] hover:bg-[#f6f9fc]'
              }`}
            >
              {status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border border-[#e5edf5] bg-white overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm text-[#273951]">
          <thead className="bg-[#f6f9fc] text-xs uppercase text-[#64748d] border-b border-[#e5edf5]">
            <tr>
              <th className="px-5 py-3.5">Filing</th>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5">Organization</th>
              <th className="px-5 py-3.5">Entity</th>
              <th className="px-5 py-3.5">CPA Assigned</th>
              <th className="px-5 py-3.5">Created</th>
              <th className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e5edf5]">
            {paginated.map((f: any) => (
              <tr key={f.id} className="hover:bg-[#f6f9fc]/50">
                <td className="px-5 py-3.5 font-medium text-[#061b31]">
                  <Link to={`/admin/filings/${f.id}`} className="text-[#533afd] hover:underline">
                    {f.formName} ({f.formType})
                  </Link>
                </td>
                <td className="px-5 py-3.5">
                  {editingId === f.id ? (
                    <div className="flex items-center gap-1">
                      <select
                        className="border rounded px-1.5 py-0.5 text-xs"
                        value={editStatus}
                        onChange={ev => setEditStatus(ev.target.value)}
                      >
                        {FILING_STATUSES.map(s => (
                          <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => updateStatusMutation.mutate({ id: f.id, status: editStatus })}
                        disabled={updateStatusMutation.isPending}
                        className="p-0.5 text-green-600 hover:text-green-800 disabled:opacity-50"
                      >
                        <Check size={13} />
                      </button>
                      <button onClick={() => setEditingId(null)} className="p-0.5 text-gray-400 hover:text-gray-600">
                        <X size={13} />
                      </button>
                    </div>
                  ) : (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[f.status] || 'bg-[#E0E7FF] text-[#4338CA]'}`}>
                      {f.status?.replace(/_/g, ' ')}
                    </span>
                  )}
                </td>
                <td className="px-5 py-3.5 text-[#533afd] hover:underline">
                  <Link to={`/admin/organizations/${f.orgId}`}>{f.orgName}</Link>
                </td>
                <td className="px-5 py-3.5 italic text-[#273951]">{f.legalName}</td>
                <td className={`px-5 py-3.5 ${f.cpaAssignedId ? 'text-[#061b31]' : 'text-[#64748d]'}`}>
                  {f.cpaName || 'Unassigned'}
                </td>
                <td className="px-5 py-3.5 text-[#64748d] whitespace-nowrap">{formatDate(f.createdAt)}</td>
                <td className="px-5 py-3.5 text-right">
                  {editingId !== f.id && (
                    <button
                      onClick={() => { setEditingId(f.id); setEditStatus(f.status) }}
                      className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-[#533afd] bg-[#EEF2FF] hover:bg-[#E0E7FF] rounded ml-auto"
                    >
                      <Pencil size={11} /> Edit
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {paginated.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-[#64748d]">
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
