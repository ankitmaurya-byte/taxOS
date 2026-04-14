// Used in: App.tsx — route /audit (audit trail log viewer)
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { formatDate } from '@/lib/utils'
import { Search, X, Download, Calendar } from 'lucide-react'
import { Pagination } from '@/components/Pagination'

const PAGE_SIZE = 15

const ACTOR_COLORS: Record<string, string> = {
  ai:      'border-l-[#3B82F6] bg-[#EFF6FF]',
  cpa:     'border-l-[#F59E0B] bg-[#FFFBEB]',
  founder: 'border-l-[#22C55E] bg-[#F0FDF4]',
  system:  'border-l-[#9CA3AF] bg-[#F9FAFB]',
  admin:   'border-l-[#6C5CE7] bg-[#F3F0FF]',
}

const ACTOR_BADGE: Record<string, string> = {
  ai:      'bg-[#DBEAFE] text-[#1E40AF]',
  cpa:     'bg-[#FEF3C7] text-[#92400E]',
  founder: 'bg-[#DCFCE7] text-[#166534]',
  system:  'bg-[#F3F4F6] text-[#374151]',
  admin:   'bg-[#EDE9FD] text-[#5B21B6]',
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

  useEffect(() => { fetchAuditLog() }, [fetchAuditLog])

  // ── Filter ────────────────────────────────────────────
  let filtered = auditLog as any[]

  if (actorFilter) {
    filtered = filtered.filter(e => e.actorType === actorFilter)
  }

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
    filtered = filtered.filter(e => {
      const d = new Date(e.createdAt).getTime()
      return !isNaN(d) && d >= from
    })
  }

  if (dateTo) {
    const to = new Date(dateTo).getTime() + 86_400_000
    filtered = filtered.filter(e => {
      const d = new Date(e.createdAt).getTime()
      return !isNaN(d) && d <= to
    })
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const hasFilters = actorFilter || search || dateFrom || dateTo

  function resetFilters() {
    setActorFilter(null)
    setSearch('')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  function handleFilter(v: string | null) { setActorFilter(v); setPage(1) }
  function handleSearch(v: string) { setSearch(v); setPage(1) }

  // ── Export helpers ────────────────────────────────────
  function toCsv(rows: any[]) {
    const header = ['ID', 'Actor Type', 'Actor ID', 'Action', 'Reasoning', 'Confidence', 'Model', 'Created At']
    const lines = rows.map(e => [
      e.id,
      e.actorType,
      e.actorId || '',
      e.action,
      (e.reasoning || '').replace(/,/g, ';'),
      e.confidenceScore != null ? Math.round(e.confidenceScore * 100) + '%' : '',
      e.modelVersion || '',
      e.createdAt,
    ].join(','))
    return [header.join(','), ...lines].join('\n')
  }

  function download(csv: string, filename: string) {
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  async function exportFiltered() {
    // If there's a filingId filter available use API, else use client-side filtered data
    try {
      const csv = await api.exportAuditCsv(undefined)
      // Re-filter client side to match current filters
      download(toCsv(filtered), 'audit-trail-filtered.csv')
    } catch {
      download(toCsv(filtered), 'audit-trail-filtered.csv')
    }
  }

  async function exportAll() {
    try {
      const csv = await api.exportAuditCsv(undefined)
      download(typeof csv === 'string' ? csv : toCsv(auditLog as any[]), 'audit-trail-all.csv')
    } catch {
      download(toCsv(auditLog as any[]), 'audit-trail-all.csv')
    }
  }

  return (
    <div className="space-y-5 p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#111827]">Audit Trail</h1>
          <p className="mt-1 text-sm text-[#6B7280]">Full log of all actions taken across your organization.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportFiltered}
            disabled={filtered.length === 0}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-[#E5E7EB] bg-white text-sm font-medium text-[#374151] hover:bg-[#F9FAFB] disabled:opacity-40 transition-colors"
          >
            <Download size={14} />
            Export filtered
          </button>
          <button
            onClick={exportAll}
            disabled={(auditLog as any[]).length === 0}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-[#6C5CE7] text-sm font-medium text-white hover:bg-[#5B4BD5] disabled:opacity-40 transition-colors"
          >
            <Download size={14} />
            Export all
          </button>
        </div>
      </div>

      {/* Filters row 1: search + date */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-64">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            type="text"
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search action, actor, reasoning..."
            className="h-9 w-full rounded-lg border border-[#E5E7EB] bg-white pl-9 pr-8 text-sm text-[#111827] placeholder:text-[#9CA3AF] outline-none focus:ring-2 focus:ring-[#6C5CE7] focus:border-transparent"
          />
          {search && (
            <button onClick={() => handleSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#374151]">
              <X size={13} />
            </button>
          )}
        </div>

        <div className="relative">
          <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none" />
          <input
            type="date"
            value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); setPage(1) }}
            className="h-9 rounded-lg border border-[#E5E7EB] bg-white pl-9 pr-3 text-sm text-[#374151] outline-none focus:ring-2 focus:ring-[#6C5CE7] focus:border-transparent"
          />
        </div>
        <span className="text-xs text-[#9CA3AF]">to</span>
        <div className="relative">
          <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none" />
          <input
            type="date"
            value={dateTo}
            onChange={e => { setDateTo(e.target.value); setPage(1) }}
            className="h-9 rounded-lg border border-[#E5E7EB] bg-white pl-9 pr-3 text-sm text-[#374151] outline-none focus:ring-2 focus:ring-[#6C5CE7] focus:border-transparent"
          />
        </div>

        {hasFilters && (
          <button
            onClick={resetFilters}
            className="flex items-center gap-1 h-9 px-3 rounded-lg text-xs font-medium text-[#EF4444] border border-[#FCA5A5] bg-[#FEF2F2] hover:bg-[#FEE2E2] transition-colors"
          >
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {/* Filters row 2: actor type pills */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => handleFilter(null)}
          className={`h-8 px-3 rounded-lg text-xs font-medium transition-colors ${
            !actorFilter ? 'bg-[#111827] text-white' : 'bg-white text-[#374151] border border-[#E5E7EB] hover:bg-[#F9FAFB]'
          }`}
        >
          All
        </button>
        {ACTOR_TYPES.map(type => (
          <button
            key={type}
            onClick={() => handleFilter(type)}
            className={`h-8 px-3 rounded-lg text-xs font-medium transition-colors ${
              actorFilter === type
                ? 'bg-[#111827] text-white'
                : 'bg-white text-[#374151] border border-[#E5E7EB] hover:bg-[#F9FAFB]'
            }`}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
        <span className="ml-2 self-center text-xs text-[#9CA3AF]">{filtered.length} entries</span>
      </div>

      {/* Log entries */}
      <div className="space-y-2">
        {paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 rounded-xl border border-[#E5E7EB] bg-white text-center">
            <p className="text-sm text-[#6B7280]">{hasFilters ? 'No entries match your filters.' : 'No audit entries yet.'}</p>
          </div>
        ) : paginated.map((entry: any) => (
          <div
            key={entry.id}
            className={`rounded-xl border-l-4 border border-[#E5E7EB] px-4 py-3.5 ${ACTOR_COLORS[entry.actorType] || ACTOR_COLORS.system}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center flex-wrap gap-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${ACTOR_BADGE[entry.actorType] || ACTOR_BADGE.system}`}>
                    {entry.actorType}
                  </span>
                  <span className="text-sm font-medium text-[#111827]">
                    {entry.action?.replace(/_/g, ' ')}
                  </span>
                  {entry.confidenceScore != null && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#EDE9FD] text-[#5B21B6]">
                      {Math.round(entry.confidenceScore * 100)}% confidence
                    </span>
                  )}
                </div>
                {entry.reasoning && (
                  <p className="text-sm text-[#6B7280] leading-relaxed">{entry.reasoning}</p>
                )}
                <div className="flex items-center flex-wrap gap-3 text-xs text-[#9CA3AF]">
                  <span>{formatDate(entry.createdAt)}</span>
                  {entry.actorId && <span>by <span className="text-[#6B7280]">{entry.actorId}</span></span>}
                  {entry.modelVersion && <span>model: {entry.modelVersion}</span>}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Pagination
        page={safePage}
        totalPages={totalPages}
        totalItems={filtered.length}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        itemLabel="entries"
      />
    </div>
  )
}
