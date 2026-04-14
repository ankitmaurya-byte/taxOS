import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { Search, X, Pencil, Trash2, Check } from 'lucide-react'
import { Pagination } from '@/components/Pagination'

const PAGE_SIZE = 15

const ENTITY_TYPES = ['C-Corp', 'LLC', 'S-Corp', 'Pvt-Ltd']

export function AdminEntities() {
  const queryClient = useQueryClient()
  const { data: entities, isLoading } = useQuery({
    queryKey: ['admin-global-entities'],
    queryFn: () => api.admin.getGlobalEntities(),
  })

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ legalName: '', entityType: '', stateOfIncorporation: '', ein: '' })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => api.admin.updateEntity(id, payload),
    onSuccess: () => {
      setEditingId(null)
      queryClient.invalidateQueries({ queryKey: ['admin-global-entities'] })
    },
  })

  const dissolveMutation = useMutation({
    mutationFn: (id: string) => api.admin.dissolveEntity(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-global-entities'] }),
  })

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

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  function handleSearch(v: string) { setSearch(v); setPage(1) }
  function handleTypeFilter(v: string | null) { setTypeFilter(v); setPage(1) }

  function startEdit(e: any) {
    setEditingId(e.id)
    setEditForm({ legalName: e.legalName || '', entityType: e.entityType || '', stateOfIncorporation: e.stateOfIncorporation || '', ein: e.ein || '' })
  }

  function cancelEdit() { setEditingId(null) }

  function saveEdit(id: string) {
    updateMutation.mutate({ id, payload: editForm })
  }

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold text-[#111827]">Global Entities</h1>
        <p className="mt-1 text-sm text-[#6B7280]">Observe and manage corporate subsidiaries and branches.</p>
      </div>

      {/* Search + Type filter toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by name, org, EIN, state..."
            className="h-9 w-full rounded-lg border border-[#E5E7EB] bg-white pl-9 pr-8 text-sm text-[#111827] placeholder:text-[#9CA3AF] outline-none focus:ring-2 focus:ring-[#6C5CE7] focus:border-transparent"
          />
          {search && (
            <button onClick={() => handleSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#374151]">
              <X size={14} />
            </button>
          )}
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => handleTypeFilter(null)}
            className={`h-9 px-3 rounded-lg text-xs font-medium transition-colors ${
              !typeFilter ? 'bg-[#111827] text-white' : 'bg-white text-[#374151] border border-[#E5E7EB] hover:bg-[#F9FAFB]'
            }`}
          >
            All Types
          </button>
          {ENTITY_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => handleTypeFilter(type)}
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
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {paginated.map((e: any) => (
              editingId === e.id ? (
                <tr key={e.id} className="bg-[#FAFAFA]">
                  <td className="px-4 py-2">
                    <input
                      className="border rounded px-2 py-1 text-sm w-full"
                      value={editForm.legalName}
                      onChange={ev => setEditForm({ ...editForm, legalName: ev.target.value })}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <select
                      className="border rounded px-2 py-1 text-sm w-full"
                      value={editForm.entityType}
                      onChange={ev => setEditForm({ ...editForm, entityType: ev.target.value })}
                    >
                      {ENTITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <input
                      className="border rounded px-2 py-1 text-sm w-full"
                      value={editForm.stateOfIncorporation}
                      onChange={ev => setEditForm({ ...editForm, stateOfIncorporation: ev.target.value })}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      className="border rounded px-2 py-1 text-sm w-full font-mono"
                      value={editForm.ein}
                      onChange={ev => setEditForm({ ...editForm, ein: ev.target.value })}
                    />
                  </td>
                  <td className="px-4 py-2 text-[#6C5CE7]">
                    <Link to={`/admin/organizations/${e.orgId}`} className="hover:underline">{e.orgName}</Link>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => saveEdit(e.id)}
                        disabled={updateMutation.isPending}
                        className="flex items-center gap-1 px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50"
                      >
                        <Check size={12} /> Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200"
                      >
                        <X size={12} /> Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={e.id} className="hover:bg-[#F9FAFB]/50">
                  <td className="px-6 py-4 font-medium text-[#111827]">
                    {e.legalName}
                    {e.status === 'dissolved' && <span className="ml-2 text-xs text-red-500">[dissolved]</span>}
                  </td>
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
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => startEdit(e)}
                        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-[#6C5CE7] bg-[#EEF2FF] hover:bg-[#E0E7FF] rounded"
                      >
                        <Pencil size={11} /> Edit
                      </button>
                      {e.status !== 'dissolved' && (
                        <button
                          onClick={() => dissolveMutation.mutate(e.id)}
                          disabled={dissolveMutation.isPending}
                          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded disabled:opacity-50"
                        >
                          <Trash2 size={11} /> Dissolve
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            ))}
            {paginated.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-[#6B7280]">{search || typeFilter ? 'No entities match your filters.' : 'No entities found.'}</td></tr>
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
        itemLabel="entities"
      />
    </div>
  )
}
