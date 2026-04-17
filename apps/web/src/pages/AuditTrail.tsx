// Used in: App.tsx — route /audit (audit trail log viewer)
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { formatDate } from '@/lib/utils'
import { Search, X, Download, Calendar, ChevronDown, ChevronRight, Bot, User, Shield, Settings, UserCheck } from 'lucide-react'
import { Pagination } from '@/components/Pagination'

const PAGE_SIZE = 20

const ACTOR_ICON: Record<string, typeof Bot> = {
  ai: Bot,
  cpa: UserCheck,
  founder: User,
  system: Settings,
  admin: Shield,
}

const ACTOR_DOT: Record<string, string> = {
  ai: 'bg-[#533afd]',
  cpa: 'bg-[#9b6829]',
  founder: 'bg-[#15be53]',
  system: 'bg-[#64748d]',
  admin: 'bg-[#ea2261]',
}

const ACTOR_BADGE: Record<string, string> = {
  ai: 'bg-[#ede9fd] text-[#533afd]',
  cpa: 'bg-[#fef3c7] text-[#9b6829]',
  founder: 'bg-[rgba(21,190,83,0.2)] text-[#108c3d]',
  system: 'bg-[#f6f9fc] text-[#64748d]',
  admin: 'bg-[#ffd7ef] text-[#ea2261]',
}

const ACTOR_TYPES = ['ai', 'cpa', 'founder', 'system', 'admin'] as const

export function AuditTrail() {
  const auditLog = useAuthStore(s => s.auditLog)
  const fetchAuditLog = useAuthStore(s => s.fetchAuditLog)

  const [actorFilter, setActorFilter] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())

  useEffect(() => { fetchAuditLog() }, [fetchAuditLog])

  let filtered = auditLog as any[]
  if (actorFilter) filtered = filtered.filter(e => e.actorType === actorFilter)
  if (search.trim()) {
    const q = search.toLowerCase()
    filtered = filtered.filter(e =>
      e.action?.toLowerCase().includes(q) ||
      e.actorType?.toLowerCase().includes(q) ||
      e.actorId?.toLowerCase().includes(q) ||
      e.reasoning?.toLowerCase().includes(q)
    )
  }
  if (dateFrom) {
    const from = new Date(dateFrom).getTime()
    filtered = filtered.filter(e => { const d = new Date(e.createdAt).getTime(); return !isNaN(d) && d >= from })
  }
  if (dateTo) {
    const to = new Date(dateTo).getTime() + 86_400_000
    filtered = filtered.filter(e => { const d = new Date(e.createdAt).getTime(); return !isNaN(d) && d <= to })
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const hasFilters = actorFilter || search || dateFrom || dateTo

  function resetFilters() { setActorFilter(null); setSearch(''); setDateFrom(''); setDateTo(''); setPage(1) }
  function handleFilter(v: string | null) { setActorFilter(v); setPage(1) }
  function handleSearch(v: string) { setSearch(v); setPage(1) }
  function toggleExpand(id: number) {
    setExpandedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next })
  }

  // Export
  function toCsv(rows: any[]) {
    const header = ['ID', 'Actor Type', 'Actor ID', 'Action', 'Reasoning', 'Confidence', 'Model', 'Created At']
    const lines = rows.map(e => [e.id, e.actorType, e.actorId || '', e.action, (e.reasoning || '').replace(/,/g, ';'), e.confidenceScore != null ? Math.round(e.confidenceScore * 100) + '%' : '', e.modelVersion || '', e.createdAt].join(','))
    return [header.join(','), ...lines].join('\n')
  }
  function download(csv: string, filename: string) {
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }
  async function exportFiltered() { try { await api.exportAuditCsv(undefined); download(toCsv(filtered), 'audit-trail-filtered.csv') } catch { download(toCsv(filtered), 'audit-trail-filtered.csv') } }
  async function exportAll() { try { const csv = await api.exportAuditCsv(undefined); download(typeof csv === 'string' ? csv : toCsv(auditLog as any[]), 'audit-trail-all.csv') } catch { download(toCsv(auditLog as any[]), 'audit-trail-all.csv') } }

  // Stats
  const aiCount = (auditLog as any[]).filter(e => e.actorType === 'ai').length
  const humanCount = (auditLog as any[]).filter(e => e.actorType !== 'ai' && e.actorType !== 'system').length

  return (
    <div className="space-y-6 p-3 sm:p-5 md:p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-[26px] font-light tracking-[-0.26px] text-[#061b31]">Audit Trail</h1>
          <p className="mt-1 text-sm text-[#64748d]">Complete log of actions across your organization.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportFiltered} disabled={filtered.length === 0} className="flex items-center gap-1.5 h-9 px-4 rounded-sm border border-[#b9b9f9] bg-white text-sm font-normal text-[#533afd] hover:bg-[rgba(83,58,253,0.05)] disabled:opacity-40 transition-colors">
            <Download size={14} /> Export filtered
          </button>
          <button onClick={exportAll} disabled={(auditLog as any[]).length === 0} className="flex items-center gap-1.5 h-9 px-4 rounded-sm bg-[#533afd] text-sm font-normal text-white hover:bg-[#4434d4] disabled:opacity-40 transition-colors">
            <Download size={14} /> Export all
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-md border border-[#e5edf5] bg-white p-4">
          <p className="text-[12px] font-normal text-[#64748d]">Total entries</p>
          <p className="mt-1 text-[22px] font-light text-[#061b31] font-tnum">{(auditLog as any[]).length}</p>
        </div>
        <div className="rounded-md border border-[#e5edf5] bg-white p-4">
          <p className="text-[12px] font-normal text-[#64748d]">AI actions</p>
          <p className="mt-1 text-[22px] font-light text-[#533afd] font-tnum">{aiCount}</p>
        </div>
        <div className="rounded-md border border-[#e5edf5] bg-white p-4">
          <p className="text-[12px] font-normal text-[#64748d]">Human actions</p>
          <p className="mt-1 text-[22px] font-light text-[#061b31] font-tnum">{humanCount}</p>
        </div>
        <div className="rounded-md border border-[#e5edf5] bg-white p-4">
          <p className="text-[12px] font-normal text-[#64748d]">Filtered</p>
          <p className="mt-1 text-[22px] font-light text-[#061b31] font-tnum">{filtered.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-64">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748d]" />
          <input type="text" value={search} onChange={e => handleSearch(e.target.value)} placeholder="Search action, actor, reasoning..." className="h-9 w-full rounded-sm border border-[#e5edf5] bg-white pl-9 pr-8 text-sm text-[#061b31] placeholder:text-[#64748d] outline-none focus:border-[#533afd] transition-colors" />
          {search && <button onClick={() => handleSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748d] hover:text-[#061b31]"><X size={13} /></button>}
        </div>
        <div className="relative">
          <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748d] pointer-events-none" />
          <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1) }} className="h-9 rounded-sm border border-[#e5edf5] bg-white pl-9 pr-3 text-sm text-[#273951] outline-none focus:border-[#533afd] transition-colors" />
        </div>
        <span className="text-[12px] text-[#64748d]">to</span>
        <div className="relative">
          <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748d] pointer-events-none" />
          <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1) }} className="h-9 rounded-sm border border-[#e5edf5] bg-white pl-9 pr-3 text-sm text-[#273951] outline-none focus:border-[#533afd] transition-colors" />
        </div>
        {hasFilters && (
          <button onClick={resetFilters} className="flex items-center gap-1 h-9 px-3 rounded-sm text-[12px] font-normal text-[#ea2261] border border-[#ffd7ef] bg-white hover:bg-[#fff5fa] transition-colors"><X size={12} /> Clear</button>
        )}
      </div>

      {/* Actor pills */}
      <div className="flex flex-wrap gap-1.5">
        <button onClick={() => handleFilter(null)} className={`h-8 px-3 rounded-sm text-[12px] font-normal transition-colors ${!actorFilter ? 'bg-[#061b31] text-white' : 'bg-white text-[#273951] border border-[#e5edf5] hover:bg-[#f6f9fc]'}`}>All</button>
        {ACTOR_TYPES.map(type => (
          <button key={type} onClick={() => handleFilter(type)} className={`h-8 px-3 rounded-sm text-[12px] font-normal transition-colors flex items-center gap-1.5 ${actorFilter === type ? 'bg-[#061b31] text-white' : 'bg-white text-[#273951] border border-[#e5edf5] hover:bg-[#f6f9fc]'}`}>
            <span className={`w-2 h-2 rounded-full ${ACTOR_DOT[type]}`} />
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
        <span className="ml-2 self-center text-[12px] text-[#64748d] font-tnum">{filtered.length} entries</span>
      </div>

      {/* Table */}
      <div className="rounded-md border border-[#e5edf5] bg-white overflow-x-auto" style={{ boxShadow: 'rgba(23,23,23,0.08) 0px 15px 35px' }}>
        <table className="w-full text-left text-sm min-w-[720px]">
          <thead className="bg-[#f6f9fc] border-b border-[#e5edf5]">
            <tr>
              <th className="w-8 px-4 py-3" />
              <th className="px-4 py-3 text-[12px] font-normal text-[#64748d] uppercase tracking-wide">Actor</th>
              <th className="px-4 py-3 text-[12px] font-normal text-[#64748d] uppercase tracking-wide">Action</th>
              <th className="px-4 py-3 text-[12px] font-normal text-[#64748d] uppercase tracking-wide hidden md:table-cell">Reasoning</th>
              <th className="px-4 py-3 text-[12px] font-normal text-[#64748d] uppercase tracking-wide text-right">Confidence</th>
              <th className="px-4 py-3 text-[12px] font-normal text-[#64748d] uppercase tracking-wide text-right">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e5edf5]">
            {paginated.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-[#64748d]">{hasFilters ? 'No entries match your filters.' : 'No audit entries yet.'}</td></tr>
            ) : paginated.map((entry: any) => {
              const Icon = ACTOR_ICON[entry.actorType] || Settings
              const expanded = expandedIds.has(entry.id)
              return (
                <tr key={entry.id} className="group">
                  <td className="px-4 py-3 align-top">
                    <button onClick={() => toggleExpand(entry.id)} className="p-0.5 rounded-sm hover:bg-[#f6f9fc] text-[#64748d] transition-colors">
                      {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex items-center gap-2">
                      <div className={`flex h-6 w-6 items-center justify-center rounded-sm ${ACTOR_DOT[entry.actorType]} bg-opacity-20`}>
                        <Icon size={12} className={entry.actorType === 'ai' ? 'text-[#533afd]' : entry.actorType === 'founder' ? 'text-[#108c3d]' : entry.actorType === 'cpa' ? 'text-[#9b6829]' : entry.actorType === 'admin' ? 'text-[#ea2261]' : 'text-[#64748d]'} />
                      </div>
                      <span className={`inline-flex items-center px-[6px] py-[1px] rounded-sm text-[10px] font-light ${ACTOR_BADGE[entry.actorType] || ACTOR_BADGE.system}`}>{entry.actorType}</span>
                    </div>
                    {entry.actorId && <p className="mt-0.5 text-[11px] text-[#64748d] pl-8 truncate max-w-[140px]">{entry.actorId}</p>}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <p className="text-sm text-[#061b31]">{entry.action?.replace(/_/g, ' ')}</p>
                    {entry.modelVersion && <p className="text-[11px] text-[#64748d] mt-0.5">{entry.modelVersion}</p>}
                    {expanded && (entry.inputs || entry.outputs) && (
                      <div className="mt-2 p-3 rounded-sm bg-[#f6f9fc] border border-[#e5edf5] text-[12px] font-mono space-y-2">
                        {entry.inputs && <div><span className="text-[#273951] font-medium">Inputs</span><pre className="mt-1 whitespace-pre-wrap break-all text-[#64748d]">{JSON.stringify(entry.inputs, null, 2)}</pre></div>}
                        {entry.outputs && <div><span className="text-[#273951] font-medium">Outputs</span><pre className="mt-1 whitespace-pre-wrap break-all text-[#64748d]">{JSON.stringify(entry.outputs, null, 2)}</pre></div>}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top max-w-[240px] hidden md:table-cell">
                    <p className="text-sm text-[#64748d] leading-relaxed line-clamp-2">{entry.reasoning || '—'}</p>
                  </td>
                  <td className="px-4 py-3 align-top text-right">
                    {entry.confidenceScore != null ? (
                      <span className="inline-flex items-center px-[6px] py-[1px] rounded-sm text-[10px] font-light bg-[#ede9fd] text-[#533afd] font-tnum">{Math.round(entry.confidenceScore * 100)}%</span>
                    ) : <span className="text-[12px] text-[#64748d]">—</span>}
                  </td>
                  <td className="px-4 py-3 align-top text-right">
                    <p className="text-[12px] text-[#273951] font-tnum">{formatDate(entry.createdAt)}</p>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Pagination page={safePage} totalPages={totalPages} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} itemLabel="entries" />
    </div>
  )
}
