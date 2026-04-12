import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { Search, X } from 'lucide-react'

const FILING_STATUSES = ['intake', 'ai_prep', 'cpa_review', 'founder_approval', 'submitted', 'archived']

const STATUS_STYLES: Record<string, string> = {
  intake: 'bg-[#F3F4F6] text-[#374151]',
  ai_prep: 'bg-[#DBEAFE] text-[#1E40AF]',
  cpa_review: 'bg-[#FEF3C7] text-[#92400E]',
  founder_approval: 'bg-[#FDE68A] text-[#78350F]',
  submitted: 'bg-[#DCFCE7] text-[#166534]',
  archived: 'bg-[#E5E7EB] text-[#6B7280]',
}

export function AdminFilings() {
  const { data: filings, isLoading } = useQuery({
    queryKey: ['admin-global-filings'],
    queryFn: () => api.admin.getGlobalFilings(),
  })

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)

  if (isLoading) return <div className="p-6">Loading global filings...</div>

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

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold text-[#111827]">Global Filings</h1>
        <p className="mt-1 text-sm text-[#6B7280]">View all IRS filings securely mapped across the entire system.</p>
      </div>

      {/* Search + Status filter toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search filings, org, entity, CPA..."
            className="h-9 w-full rounded-lg border border-[#E5E7EB] bg-white pl-9 pr-8 text-sm text-[#111827] placeholder:text-[#9CA3AF] outline-none focus:ring-2 focus:ring-[#6C5CE7] focus:border-transparent"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#374151]">
              <X size={14} />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setStatusFilter(null)}
            className={`h-9 px-3 rounded-lg text-xs font-medium transition-colors ${
              !statusFilter ? 'bg-[#111827] text-white' : 'bg-white text-[#374151] border border-[#E5E7EB] hover:bg-[#F9FAFB]'
            }`}
          >
            All
          </button>
          {FILING_STATUSES.map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`h-9 px-3 rounded-lg text-xs font-medium transition-colors ${
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

      <div className="rounded-xl border border-[#E5E7EB] bg-white overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm text-[#374151]">
          <thead className="bg-[#F9FAFB] text-xs uppercase text-[#6B7280] border-b border-[#E5E7EB]">
            <tr>
              <th className="px-6 py-4">Filing</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Organization</th>
              <th className="px-6 py-4">Entity</th>
              <th className="px-6 py-4">CPA Assigned</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {filtered.map((f: any) => (
              <tr key={f.id} className="hover:bg-[#F9FAFB]/50">
                <td className="px-6 py-4 font-medium text-[#111827]">{f.formName} ({f.formType})</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[f.status] || 'bg-[#E0E7FF] text-[#4338CA]'}`}>
                    {f.status?.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 text-[#6C5CE7] hover:underline">
                  <Link to={`/admin/organizations/${f.orgId}`}>{f.orgName}</Link>
                </td>
                <td className="px-6 py-4 italic">{f.legalName}</td>
                <td className={`px-6 py-4 ${f.cpaAssignedId ? 'text-[#111827]' : 'text-gray-400'}`}>{f.cpaName || 'Unassigned'}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-[#6B7280]">{search || statusFilter ? 'No filings match your filters.' : 'No filings found.'}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
