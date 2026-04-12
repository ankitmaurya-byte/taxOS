import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { format } from 'date-fns'
import { Search, X } from 'lucide-react'

export function AdminOrganizations() {
  const queryClient = useQueryClient()
  const { data: orgs, isLoading } = useQuery({
    queryKey: ['admin-organizations'],
    queryFn: () => api.admin.getOrganizationOverview(),
  })

  const suspendMutation = useMutation({
    mutationFn: (id: string) => api.admin.deleteOrganization(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-organizations'] })
  })

  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'created' | 'founders'>('name')

  if (isLoading) return <div className="p-6">Loading organizations...</div>

  let filtered = (orgs || []) as any[]

  if (search.trim()) {
    const q = search.toLowerCase()
    filtered = filtered.filter((org: any) =>
      org.name?.toLowerCase().includes(q)
    )
  }

  filtered = [...filtered].sort((a: any, b: any) => {
    if (sortBy === 'created') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    if (sortBy === 'founders') return (b.founderCount || 0) - (a.founderCount || 0)
    return (a.name || '').localeCompare(b.name || '')
  })

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-[#111827]">Organizations</h1>
          <p className="mt-1 text-sm text-[#6B7280]">Manage multitenant organizations.</p>
        </div>
      </div>

      {/* Search + Sort toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search organizations..."
            className="h-9 w-full rounded-lg border border-[#E5E7EB] bg-white pl-9 pr-8 text-sm text-[#111827] placeholder:text-[#9CA3AF] outline-none focus:ring-2 focus:ring-[#6C5CE7] focus:border-transparent"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#374151]">
              <X size={14} />
            </button>
          )}
        </div>
        <div className="flex gap-1.5">
          {([['name', 'Name'], ['created', 'Newest'], ['founders', 'Founders']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              className={`h-9 px-3 rounded-lg text-xs font-medium transition-colors ${
                sortBy === key
                  ? 'bg-[#111827] text-white'
                  : 'bg-white text-[#374151] border border-[#E5E7EB] hover:bg-[#F9FAFB]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-[#E5E7EB] bg-white overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm text-[#374151]">
          <thead className="bg-[#F9FAFB] text-xs uppercase text-[#6B7280] border-b border-[#E5E7EB]">
            <tr>
              <th className="px-6 py-4 font-medium">Name</th>
              <th className="px-6 py-4 font-medium">Founders</th>
              <th className="px-6 py-4 font-medium">Team</th>
              <th className="px-6 py-4 font-medium">CPAs</th>
              <th className="px-6 py-4 font-medium">Created</th>
              <th className="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {filtered.map((org: any) => (
              <tr key={org.id} className="hover:bg-[#F9FAFB]/50 transition-colors">
                <td className="px-6 py-4 font-medium text-[#111827]">
                  <Link to={`/admin/organizations/${org.id}`} className="text-[#6C5CE7] hover:underline">
                    {org.name}
                  </Link>
                </td>
                <td className="px-6 py-4">{org.founderCount}</td>
                <td className="px-6 py-4">{org.teamMemberCount}</td>
                <td className="px-6 py-4">{org.assignedCpaCount}</td>
                <td className="px-6 py-4">{format(new Date(org.createdAt), 'MMM d, yyyy')}</td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => suspendMutation.mutate(org.id)}
                    className="text-xs font-medium text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-2 py-1 rounded transition-colors"
                  >
                    {org.name.includes('[SUSPENDED]') ? 'Restore' : 'Suspend'}
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-[#6B7280]">{search ? 'No organizations match your search.' : 'No organizations found.'}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
