import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { Search, X } from 'lucide-react'

const ENTITY_TYPES = ['C-Corp', 'LLC', 'S-Corp', 'Pvt-Ltd']

export function AdminEntities() {
  const { data: entities, isLoading } = useQuery({
    queryKey: ['admin-global-entities'],
    queryFn: () => api.admin.getGlobalEntities(),
  })

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string | null>(null)

  if (isLoading) return <div className="p-6">Loading global entities...</div>

  let filtered = (entities || []) as any[]

  if (search.trim()) {
    const q = search.toLowerCase()
    filtered = filtered.filter((e: any) =>
      e.legalName?.toLowerCase().includes(q) ||
      e.orgName?.toLowerCase().includes(q) ||
      e.ein?.toLowerCase().includes(q) ||
      e.stateOfIncorporation?.toLowerCase().includes(q)
    )
  }

  if (typeFilter) {
    filtered = filtered.filter((e: any) => e.entityType === typeFilter)
  }

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold text-[#111827]">Global Entities</h1>
        <p className="mt-1 text-sm text-[#6B7280]">Observe structured corporate subsidiaries and branches.</p>
      </div>

      {/* Search + Type filter toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, org, EIN, state..."
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
            onClick={() => setTypeFilter(null)}
            className={`h-9 px-3 rounded-lg text-xs font-medium transition-colors ${
              !typeFilter ? 'bg-[#111827] text-white' : 'bg-white text-[#374151] border border-[#E5E7EB] hover:bg-[#F9FAFB]'
            }`}
          >
            All Types
          </button>
          {ENTITY_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`h-9 px-3 rounded-lg text-xs font-medium transition-colors ${
                typeFilter === type
                  ? 'bg-[#111827] text-white'
                  : 'bg-white text-[#374151] border border-[#E5E7EB] hover:bg-[#F9FAFB]'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-[#E5E7EB] bg-white overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm text-[#374151]">
          <thead className="bg-[#F9FAFB] text-xs uppercase text-[#6B7280] border-b border-[#E5E7EB]">
            <tr>
              <th className="px-6 py-4">Legal Name</th>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4">State</th>
              <th className="px-6 py-4">EIN</th>
              <th className="px-6 py-4">Parent Organization</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {filtered.map((e: any) => (
              <tr key={e.id} className="hover:bg-[#F9FAFB]/50">
                <td className="px-6 py-4 font-medium text-[#111827]">{e.legalName}</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#F3F4F6] text-[#374151]">
                    {e.entityType}
                  </span>
                </td>
                <td className="px-6 py-4">{e.stateOfIncorporation}</td>
                <td className="px-6 py-4 font-mono text-xs">{e.ein || 'Pending'}</td>
                <td className="px-6 py-4 text-[#6C5CE7] hover:underline">
                  <Link to={`/admin/organizations/${e.orgId}`}>{e.orgName}</Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-[#6B7280]">{search || typeFilter ? 'No entities match your filters.' : 'No entities found.'}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
