// Used in: App.tsx — route /deadlines (tax deadlines calendar)
import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/auth'
import { Pagination } from '@/components/Pagination'
import { formatDate, daysUntil } from '@/lib/utils'
import { api } from '@/lib/api'
import { promptDialog, confirmDialog } from '@/stores/dialogs'
import { notify } from '@/stores/notifications'
import {
  Search,
  X,
  CalendarClock,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Zap,
  SkipForward,
  Undo2,
  CalendarPlus,
  BellOff,
  MoreHorizontal,
  Loader2,
} from 'lucide-react'

const PAGE_SIZE = 15

const STATUS_STYLES: Record<string, { dot: string; badge: string; label: string }> = {
  upcoming: { dot: 'bg-[#533afd]', badge: 'bg-[#ede9fd] text-[#533afd]', label: 'Upcoming' },
  overdue:  { dot: 'bg-[#ea2261]', badge: 'bg-[#ffd7ef] text-[#ea2261]', label: 'Overdue' },
  filed:    { dot: 'bg-[#15be53]', badge: 'bg-[rgba(21,190,83,0.2)] text-[#108c3d]', label: 'Filed' },
  extended: { dot: 'bg-[#9b6829]', badge: 'bg-[#fef3c7] text-[#9b6829]', label: 'Extended' },
  skipped:  { dot: 'bg-[#64748d]', badge: 'bg-[#f6f9fc] text-[#64748d]', label: 'Skipped' },
}

const STATUS_KEYS = Object.keys(STATUS_STYLES) as (keyof typeof STATUS_STYLES)[]

export function DeadlinesPage() {
  const [selectedEntityId, setSelectedEntityId] = useState('')
  const [runLoading, setRunLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const deadlines = useAuthStore(s => s.deadlines)
  const entities = useAuthStore(s => s.entities)
  const fetchDeadlines = useAuthStore(s => s.fetchDeadlines)
  const fetchEntities = useAuthStore(s => s.fetchEntities)
  const runDeadlines = useAuthStore(s => s.runDeadlines)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [menuId, setMenuId] = useState<string | null>(null)

  async function actOn(id: string, fn: () => Promise<unknown>) {
    setBusyId(id)
    try {
      await fn()
      await fetchDeadlines()
    } catch (err: any) {
      notify({ title: 'Action failed', message: err?.message || 'Could not update deadline.', tone: 'error' })
    } finally {
      setBusyId(null)
      setMenuId(null)
    }
  }

  const handleComplete = (id: string) =>
    actOn(id, async () => {
      const note = await promptDialog({
        title: 'Mark deadline as filed?',
        message: 'Optional — note a confirmation number, filing link, or any context worth keeping.',
        placeholder: 'Confirmation / filing notes (optional)',
        multiline: true,
        confirmLabel: 'Mark filed',
      })
      if (note === null) throw new Error('cancelled')
      await api.deadlines.complete(id, note)
    }).catch(() => { setBusyId(null) })

  const handleSkip = (id: string) =>
    actOn(id, async () => {
      const reason = await promptDialog({
        title: 'Skip this deadline?',
        message: 'Explain why. CPAs and auditors can see this remark later.',
        placeholder: 'Remark',
        multiline: true,
        required: true,
        confirmLabel: 'Skip',
        tone: 'danger',
      })
      if (!reason) throw new Error('cancelled')
      await api.deadlines.skip(id, reason)
    }).catch(() => { setBusyId(null) })

  const handleExtend = (id: string) =>
    actOn(id, async () => {
      const date = await promptDialog({
        title: 'Extend deadline',
        message: 'Enter the new due date (YYYY-MM-DD). Leave blank to mark extended without a date change.',
        placeholder: 'YYYY-MM-DD',
        confirmLabel: 'Extend',
      })
      if (date === null) throw new Error('cancelled')
      await api.deadlines.extend(id, date.trim() || undefined)
    }).catch(() => { setBusyId(null) })

  const handleSnooze = (id: string) =>
    actOn(id, async () => {
      const date = await promptDialog({
        title: 'Snooze until…',
        message: 'Hide from "due soon" lists until this date. Enter as YYYY-MM-DD.',
        placeholder: 'YYYY-MM-DD',
        required: true,
        confirmLabel: 'Snooze',
      })
      if (!date) throw new Error('cancelled')
      await api.deadlines.snooze(id, date.trim())
    }).catch(() => { setBusyId(null) })

  const handleReopen = (id: string) =>
    actOn(id, async () => {
      const ok = await confirmDialog({
        title: 'Reopen deadline?',
        message: 'This clears completion + skip state and marks the deadline upcoming again.',
        confirmLabel: 'Reopen',
      })
      if (!ok) throw new Error('cancelled')
      await api.deadlines.reopen(id)
    }).catch(() => { setBusyId(null) })

  useEffect(() => { fetchDeadlines(); fetchEntities() }, [fetchDeadlines, fetchEntities])

  // Close modal on ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelectedId(null) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Filter
  let filtered = deadlines as any[]
  if (statusFilter) filtered = filtered.filter(d => d.status === statusFilter)
  if (search.trim()) {
    const q = search.toLowerCase()
    filtered = filtered.filter(d => d.formType?.toLowerCase().includes(q) || d.formName?.toLowerCase().includes(q) || d.description?.toLowerCase().includes(q))
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const selectedDeadline = selectedId ? deadlines.find(d => d.id === selectedId) : null

  // Stats
  const overdueCount = (deadlines as any[]).filter(d => d.status === 'overdue').length
  const upcomingSoon = (deadlines as any[]).filter(d => d.status === 'upcoming' && daysUntil(d.dueDate) <= 14).length
  const filedCount = (deadlines as any[]).filter(d => d.status === 'filed').length
  const skippedCount = (deadlines as any[]).filter(d => d.status === 'skipped').length

  function urgencyBar(score: number) {
    if (score >= 90) return 'bg-[#ea2261]'
    if (score >= 60) return 'bg-[#9b6829]'
    return 'bg-[#15be53]'
  }

  return (
    <div className="space-y-6 p-3 sm:p-5 md:p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-[26px] font-light tracking-[-0.26px] text-[#061b31]">Deadlines</h1>
          <p className="mt-1 text-sm text-[#64748d]">Tax filing deadlines and compliance calendar.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={selectedEntityId} onChange={e => setSelectedEntityId(e.target.value)} className="h-9 rounded-sm border border-[#e5edf5] bg-white px-3 text-sm text-[#273951] outline-none focus:border-[#533afd] transition-colors">
            <option value="">Select entity</option>
            {entities.map((entity: any) => <option key={entity.id} value={entity.id}>{entity.legalName}</option>)}
          </select>
          <button
            onClick={async () => { if (!selectedEntityId) return; setRunLoading(true); try { await runDeadlines(selectedEntityId) } finally { setRunLoading(false) } }}
            disabled={!selectedEntityId || runLoading}
            className="flex items-center gap-1.5 h-9 px-4 rounded-sm bg-[#533afd] text-sm font-normal text-white hover:bg-[#4434d4] disabled:opacity-40 transition-colors"
          >
            <Zap size={14} />
            {runLoading ? 'Recalculating...' : 'Run Deadline Agent'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
        <div className="rounded-md border border-[#e5edf5] bg-white p-4">
          <div className="flex items-center gap-2 mb-2"><CalendarClock size={14} className="text-[#64748d]" /><p className="text-[12px] text-[#64748d]">Total</p></div>
          <p className="text-[22px] font-light text-[#061b31] font-tnum">{(deadlines as any[]).length}</p>
        </div>
        <div className="rounded-md border border-[#e5edf5] bg-white p-4">
          <div className="flex items-center gap-2 mb-2"><AlertTriangle size={14} className="text-[#ea2261]" /><p className="text-[12px] text-[#64748d]">Overdue</p></div>
          <p className="text-[22px] font-light text-[#ea2261] font-tnum">{overdueCount}</p>
        </div>
        <div className="rounded-md border border-[#e5edf5] bg-white p-4">
          <div className="flex items-center gap-2 mb-2"><Clock size={14} className="text-[#9b6829]" /><p className="text-[12px] text-[#64748d]">Due ≤ 14d</p></div>
          <p className="text-[22px] font-light text-[#9b6829] font-tnum">{upcomingSoon}</p>
        </div>
        <div className="rounded-md border border-[#e5edf5] bg-white p-4">
          <div className="flex items-center gap-2 mb-2"><CheckCircle2 size={14} className="text-[#15be53]" /><p className="text-[12px] text-[#64748d]">Filed</p></div>
          <p className="text-[22px] font-light text-[#108c3d] font-tnum">{filedCount}</p>
        </div>
        <div className="rounded-md border border-[#e5edf5] bg-white p-4">
          <div className="flex items-center gap-2 mb-2"><SkipForward size={14} className="text-[#64748d]" /><p className="text-[12px] text-[#64748d]">Skipped</p></div>
          <p className="text-[22px] font-light text-[#273951] font-tnum">{skippedCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-64">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748d]" />
          <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Search form type, name..." className="h-9 w-full rounded-sm border border-[#e5edf5] bg-white pl-9 pr-8 text-sm text-[#061b31] placeholder:text-[#64748d] outline-none focus:border-[#533afd] transition-colors" />
          {search && <button onClick={() => { setSearch(''); setPage(1) }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748d] hover:text-[#061b31]"><X size={13} /></button>}
        </div>
        <button onClick={() => { setStatusFilter(null); setPage(1) }} className={`h-8 px-3 rounded-sm text-[12px] font-normal transition-colors ${!statusFilter ? 'bg-[#061b31] text-white' : 'bg-white text-[#273951] border border-[#e5edf5] hover:bg-[#f6f9fc]'}`}>All</button>
        {STATUS_KEYS.map(key => {
          const s = STATUS_STYLES[key]
          return (
            <button key={key} onClick={() => { setStatusFilter(key); setPage(1) }} className={`h-8 px-3 rounded-sm text-[12px] font-normal transition-colors flex items-center gap-1.5 ${statusFilter === key ? 'bg-[#061b31] text-white' : 'bg-white text-[#273951] border border-[#e5edf5] hover:bg-[#f6f9fc]'}`}>
              <span className={`w-2 h-2 rounded-full ${s.dot}`} />
              {s.label}
            </button>
          )
        })}
        <span className="ml-2 text-[12px] text-[#64748d] font-tnum">{filtered.length} deadlines</span>
      </div>

      {/* Table */}
      <div className="rounded-md border border-[#e5edf5] bg-white overflow-x-auto" style={{ boxShadow: 'rgba(23,23,23,0.08) 0px 15px 35px' }}>
        <table className="w-full text-left text-sm min-w-[720px]">
          <thead className="bg-[#f6f9fc] border-b border-[#e5edf5]">
            <tr>
              <th className="px-4 py-3 text-[12px] font-normal text-[#64748d] uppercase tracking-wide">Form</th>
              <th className="px-4 py-3 text-[12px] font-normal text-[#64748d] uppercase tracking-wide">Status</th>
              <th className="px-4 py-3 text-[12px] font-normal text-[#64748d] uppercase tracking-wide">Due date</th>
              <th className="px-4 py-3 text-[12px] font-normal text-[#64748d] uppercase tracking-wide text-right">Days</th>
              <th className="px-4 py-3 text-[12px] font-normal text-[#64748d] uppercase tracking-wide text-right">Urgency</th>
              <th className="px-4 py-3 text-[12px] font-normal text-[#64748d] uppercase tracking-wide text-right">Source</th>
              <th className="px-4 py-3 text-[12px] font-normal text-[#64748d] uppercase tracking-wide text-right w-16">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e5edf5]">
            {paginated.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-[#64748d]">No deadlines match your filters.</td></tr>
            ) : paginated.map((deadline: any) => {
              const days = daysUntil(deadline.dueDate)
              const s = STATUS_STYLES[deadline.status] || STATUS_STYLES.upcoming
              return (
                <tr key={deadline.id} onClick={() => setSelectedId(deadline.id)} className="hover:bg-[#f6f9fc] cursor-pointer transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm text-[#061b31]">{deadline.formType}</p>
                    <p className="text-[12px] text-[#64748d] mt-0.5">{deadline.formName}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-[6px] py-[1px] rounded-sm text-[10px] font-light ${s.badge}`}>{s.label}</span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-[#273951] font-tnum">{formatDate(deadline.dueDate)}</p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-sm font-tnum ${days < 0 ? 'text-[#ea2261]' : days <= 14 ? 'text-[#9b6829]' : 'text-[#108c3d]'}`}>
                      {days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Today' : `${days}d`}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <span className="text-[12px] text-[#64748d] font-tnum">{deadline.urgencyScore ?? 0}</span>
                      <div className="h-1.5 w-16 rounded-full bg-[#e5edf5]">
                        <div className={`h-1.5 rounded-full ${urgencyBar(deadline.urgencyScore || 0)}`} style={{ width: `${Math.min(deadline.urgencyScore || 0, 100)}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {deadline.aiPredicted ? (
                      <span className="inline-flex items-center gap-1 px-[6px] py-[1px] rounded-sm text-[10px] font-light bg-[#ede9fd] text-[#533afd]"><Zap size={9} /> AI</span>
                    ) : (
                      <span className="text-[12px] text-[#64748d]">Manual</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                    <div className="relative inline-block">
                      <button
                        onClick={(e) => { e.stopPropagation(); setMenuId(menuId === deadline.id ? null : deadline.id) }}
                        disabled={busyId === deadline.id}
                        className="p-1 rounded-sm text-[#64748d] hover:bg-[#f6f9fc] hover:text-[#273951] disabled:opacity-50"
                        aria-label="Deadline actions"
                      >
                        {busyId === deadline.id ? <Loader2 size={14} className="animate-spin" /> : <MoreHorizontal size={14} />}
                      </button>
                      {menuId === deadline.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setMenuId(null)} />
                          <div
                            className="absolute right-0 top-full mt-1 z-20 w-48 rounded-[6px] border border-[#e5edf5] bg-white py-1"
                            style={{ boxShadow: 'rgba(50,50,93,0.25) 0px 30px 45px -30px, rgba(0,0,0,0.1) 0px 18px 36px -18px' }}
                          >
                            {deadline.status !== 'filed' && (
                              <button
                                onClick={() => handleComplete(deadline.id)}
                                className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-[#108c3d] hover:bg-[#f6f9fc]"
                              >
                                <CheckCircle2 size={13} /> Mark filed
                              </button>
                            )}
                            {deadline.status !== 'extended' && deadline.status !== 'filed' && (
                              <button
                                onClick={() => handleExtend(deadline.id)}
                                className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-[#9b6829] hover:bg-[#f6f9fc]"
                              >
                                <CalendarPlus size={13} /> Extend
                              </button>
                            )}
                            {deadline.status === 'upcoming' && (
                              <button
                                onClick={() => handleSnooze(deadline.id)}
                                className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-[#273951] hover:bg-[#f6f9fc]"
                              >
                                <BellOff size={13} /> Snooze
                              </button>
                            )}
                            {deadline.status !== 'skipped' && deadline.status !== 'filed' && (
                              <button
                                onClick={() => handleSkip(deadline.id)}
                                className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-[#ea2261] hover:bg-[rgba(234,34,97,0.05)]"
                              >
                                <SkipForward size={13} /> Skip
                              </button>
                            )}
                            {(deadline.status === 'filed' || deadline.status === 'skipped' || deadline.status === 'extended') && (
                              <button
                                onClick={() => handleReopen(deadline.id)}
                                className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-[#533afd] hover:bg-[#f6f9fc]"
                              >
                                <Undo2 size={13} /> Reopen
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Pagination page={safePage} totalPages={totalPages} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} itemLabel="deadlines" />

      {/* Detail modal */}
      {selectedDeadline && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setSelectedId(null)} />
          <div className="relative w-full max-w-md max-w-[calc(100vw-1.5rem)] rounded-md bg-white p-4 sm:p-6" style={{ boxShadow: 'rgba(3,3,39,0.25) 0px 14px 21px -14px, rgba(0,0,0,0.1) 0px 8px 17px -8px' }}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[22px] font-light tracking-[-0.22px] text-[#061b31]">{selectedDeadline.formType}</h2>
                <p className="mt-1 text-sm text-[#64748d]">{selectedDeadline.formName}</p>
              </div>
              <span className={`inline-flex items-center px-[6px] py-[1px] rounded-sm text-[10px] font-light ${STATUS_STYLES[selectedDeadline.status]?.badge || ''}`}>{STATUS_STYLES[selectedDeadline.status]?.label || selectedDeadline.status}</span>
            </div>

            <div className="mt-6 space-y-3">
              {([
                ['Due date', formatDate(selectedDeadline.dueDate)],
                ['Days remaining', (() => { const d = daysUntil(selectedDeadline.dueDate); return d < 0 ? `${Math.abs(d)} days overdue` : d === 0 ? 'Due today' : `${d} days` })()],
                ['Urgency score', String(selectedDeadline.urgencyScore ?? 0)],
                ['Source', selectedDeadline.aiPredicted ? 'AI predicted' : 'Manual'],
                selectedDeadline.completedAt ? ['Filed at', formatDate(selectedDeadline.completedAt)] : null,
                selectedDeadline.snoozedUntil ? ['Snoozed / extended until', formatDate(selectedDeadline.snoozedUntil)] : null,
              ].filter(Boolean) as [string, string][]).map(([label, value]) => (
                <div key={label} className="flex items-center justify-between py-2 border-b border-[#e5edf5] last:border-0">
                  <span className="text-sm text-[#64748d]">{label}</span>
                  <span className="text-sm text-[#061b31] font-tnum">{value}</span>
                </div>
              ))}
              {selectedDeadline.skipReason && (
                <div className="rounded-sm bg-[#f6f9fc] border border-[#e5edf5] p-3 text-sm text-[#9b6829]">
                  <p className="text-[11px] font-medium text-[#64748d] uppercase tracking-wide mb-1">Skip remark</p>
                  {selectedDeadline.skipReason}
                </div>
              )}
              {selectedDeadline.note && (
                <div className="rounded-sm bg-[#f6f9fc] border border-[#e5edf5] p-3 text-sm text-[#273951]">
                  <p className="text-[11px] font-medium text-[#64748d] uppercase tracking-wide mb-1">Note</p>
                  {selectedDeadline.note}
                </div>
              )}
              {selectedDeadline.description && (
                <div className="rounded-sm bg-[#f6f9fc] border border-[#e5edf5] p-3 text-sm text-[#273951]">{selectedDeadline.description}</div>
              )}
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              {selectedDeadline.status !== 'filed' && (
                <button
                  onClick={() => handleComplete(selectedDeadline.id)}
                  disabled={busyId === selectedDeadline.id}
                  className="inline-flex items-center gap-1.5 h-9 rounded-sm bg-[#108c3d] px-3 text-sm font-normal text-white hover:bg-[#0a6b2e] disabled:opacity-50"
                >
                  <CheckCircle2 size={14} /> Mark filed
                </button>
              )}
              {selectedDeadline.status !== 'extended' && selectedDeadline.status !== 'filed' && (
                <button
                  onClick={() => handleExtend(selectedDeadline.id)}
                  disabled={busyId === selectedDeadline.id}
                  className="inline-flex items-center gap-1.5 h-9 rounded-sm border border-[#e5edf5] bg-white px-3 text-sm font-normal text-[#273951] hover:bg-[#f6f9fc] disabled:opacity-50"
                >
                  <CalendarPlus size={14} /> Extend
                </button>
              )}
              {selectedDeadline.status === 'upcoming' && (
                <button
                  onClick={() => handleSnooze(selectedDeadline.id)}
                  disabled={busyId === selectedDeadline.id}
                  className="inline-flex items-center gap-1.5 h-9 rounded-sm border border-[#e5edf5] bg-white px-3 text-sm font-normal text-[#273951] hover:bg-[#f6f9fc] disabled:opacity-50"
                >
                  <BellOff size={14} /> Snooze
                </button>
              )}
              {selectedDeadline.status !== 'skipped' && selectedDeadline.status !== 'filed' && (
                <button
                  onClick={() => handleSkip(selectedDeadline.id)}
                  disabled={busyId === selectedDeadline.id}
                  className="inline-flex items-center gap-1.5 h-9 rounded-sm border border-[#ffd7ef] bg-white px-3 text-sm font-normal text-[#ea2261] hover:bg-[rgba(234,34,97,0.05)] disabled:opacity-50"
                >
                  <SkipForward size={14} /> Skip
                </button>
              )}
              {(selectedDeadline.status === 'filed' || selectedDeadline.status === 'skipped' || selectedDeadline.status === 'extended') && (
                <button
                  onClick={() => handleReopen(selectedDeadline.id)}
                  disabled={busyId === selectedDeadline.id}
                  className="inline-flex items-center gap-1.5 h-9 rounded-sm border border-[#b9b9f9] bg-white px-3 text-sm font-normal text-[#533afd] hover:bg-[rgba(83,58,253,0.05)] disabled:opacity-50"
                >
                  <Undo2 size={14} /> Reopen
                </button>
              )}
              <button onClick={() => setSelectedId(null)} className="h-9 rounded-sm bg-[#533afd] px-4 text-sm font-normal text-white hover:bg-[#4434d4] transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
