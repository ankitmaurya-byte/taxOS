// Used in: App.tsx — route /filings/room (workflow board view)
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/ui/status-badge'
import { ConfidenceBadge } from '@/components/agents/ConfidenceBadge'
import { formatDate } from '@/lib/utils'
import { ChevronRight, Search, Filter, ChevronDown, X } from 'lucide-react'
import type { FilingStatus } from 'shared'

const STAGES: { status: FilingStatus; label: string }[] = [
  { status: 'intake', label: 'Intake' },
  { status: 'ai_prep', label: 'AI Preparation' },
  { status: 'cpa_review', label: 'CPA Review' },
  { status: 'founder_approval', label: 'Founder Approval' },
  { status: 'submitted', label: 'Submitted' },
]

const STATUS_OPTIONS: { key: FilingStatus; label: string }[] = [
  { key: 'intake', label: 'Intake' },
  { key: 'ai_prep', label: 'AI Prep' },
  { key: 'cpa_review', label: 'CPA Review' },
  { key: 'founder_approval', label: 'Needs Approval' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'archived', label: 'Archived' },
]

function formatFieldLabel(key: string) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .replace(/^\w/, c => c.toUpperCase())
    .trim()
}

function formatFieldValue(value: unknown): string {
  if (value == null) return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'number') return value.toLocaleString('en-US')
  if (typeof value === 'string') return value || '—'
  return String(value)
}

function isCurrency(key: string, value: unknown): boolean {
  if (typeof value !== 'number') return false
  const hints = ['amount', 'income', 'tax', 'revenue', 'cost', 'expense', 'fee', 'salary', 'wage', 'payment', 'balance', 'credit', 'deduction', 'gross', 'net', 'total', 'price', 'profit', 'loss']
  const lower = key.toLowerCase()
  return hints.some(h => lower.includes(h))
}

function FilingDataFields({ data, depth = 0 }: { data: Record<string, any>; depth?: number }) {
  const entries = Object.entries(data)

  return (
    <div className={depth > 0 ? 'rounded-lg border border-[#e5edf5] overflow-hidden' : ''}>
      {entries.map(([key, value], idx) => {
        const isLast = idx === entries.length - 1
        const isObject = value != null && typeof value === 'object' && !Array.isArray(value)
        const isArray = Array.isArray(value)

        // Nested object — render as section
        if (isObject) {
          return (
            <div key={key} className={!isLast ? 'border-b border-[#f6f9fc]' : ''}>
              <div className="bg-[#f6f9fc] px-4 py-2.5">
                <p className="text-xs font-medium text-[#64748d] uppercase tracking-wide">{formatFieldLabel(key)}</p>
              </div>
              <div className="px-4 py-2">
                <FilingDataFields data={value} depth={depth + 1} />
              </div>
            </div>
          )
        }

        // Array — render each item
        if (isArray) {
          return (
            <div key={key} className={!isLast ? 'border-b border-[#f6f9fc]' : ''}>
              <div className="bg-[#f6f9fc] px-4 py-2.5">
                <p className="text-xs font-medium text-[#64748d] uppercase tracking-wide">{formatFieldLabel(key)}</p>
              </div>
              <div className="px-4 py-2 space-y-2">
                {value.map((item: any, i: number) => (
                  <div key={i}>
                    {item != null && typeof item === 'object' ? (
                      <div className="rounded-lg border border-[#e5edf5] overflow-hidden">
                        <div className="bg-[#FAFAFA] px-3 py-1.5 border-b border-[#f6f9fc]">
                          <span className="text-[11px] font-medium text-[#64748d]">#{i + 1}</span>
                        </div>
                        <FilingDataFields data={item} depth={depth + 1} />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-1 py-1">
                        <span className="text-[11px] text-[#64748d]">#{i + 1}</span>
                        <span className="text-sm text-[#061b31]">{formatFieldValue(item)}</span>
                      </div>
                    )}
                  </div>
                ))}
                {value.length === 0 && (
                  <p className="text-sm text-[#64748d] italic py-1">None</p>
                )}
              </div>
            </div>
          )
        }

        // Primitive value — clean row
        const currencyField = isCurrency(key, value)
        return (
          <div
            key={key}
            className={`flex items-center justify-between px-4 py-3 ${!isLast ? 'border-b border-[#f6f9fc]' : ''} ${idx % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'}`}
          >
            <span className="text-sm text-[#64748d]">{formatFieldLabel(key)}</span>
            <span className={`text-sm font-medium text-[#061b31] text-right max-w-[60%] break-words ${currencyField ? 'tabular-nums' : ''}`}>
              {currencyField ? `$${(value as number).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : formatFieldValue(value)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export function FilingRoom() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [chatMessage, setChatMessage] = useState('')
  const [chatHistory, setChatHistory] = useState<Array<{ role: string; content: string }>>([])
  const [streaming, setStreaming] = useState(false)

  // List view filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<FilingStatus | null>(null)
  const [yearFilter, setYearFilter] = useState<number | null>(null)
  const [showStatusDrop, setShowStatusDrop] = useState(false)
  const [showYearDrop, setShowYearDrop] = useState(false)

  const { data: filings = [] } = useQuery({ queryKey: ['filings'], queryFn: () => api.getFilings() })
  const { data: filing } = useQuery({
    queryKey: ['filing', id],
    queryFn: () => api.getFiling(id!),
    enabled: !!id,
  })

  const approveMutation = useMutation({
    mutationFn: () => api.approveFiling(id!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['filing', id] }),
  })

  const rejectMutation = useMutation({
    mutationFn: (reason: string) => api.rejectFiling(id!, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['filing', id] }),
  })

  const sendMessage = async () => {
    if (!chatMessage.trim() || !id) return
    const msg = chatMessage
    setChatMessage('')
    setChatHistory(prev => [...prev, { role: 'user', content: msg }])
    setStreaming(true)

    let assistantMsg = ''
    setChatHistory(prev => [...prev, { role: 'assistant', content: '' }])

    try {
      await api.streamIntakeMessage(id, msg, (chunk) => {
        assistantMsg += chunk
        setChatHistory(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: assistantMsg }
          return updated
        })
      })
    } catch (err) {
      console.error('Stream error:', err)
    }
    setStreaming(false)
  }

  // Filing list view when no ID selected
  if (!id) {
    const availableYears = Array.from(new Set(filings.map((f: any) => f.taxYear || 2025))).sort((a: number, b: number) => b - a)

    const filtered = filings.filter((f: any) => {
      const q = search.trim().toLowerCase()
      const matchSearch = !q || f.formType?.toLowerCase().includes(q) || f.formName?.toLowerCase().includes(q)
      const matchStatus = !statusFilter || f.status === statusFilter
      const matchYear = !yearFilter || (f.taxYear || 2025) === yearFilter
      return matchSearch && matchStatus && matchYear
    })

    const hasFilters = search || statusFilter || yearFilter

    return (
      <div className="space-y-5">
        <div className="flex items-center gap-1 text-[13px]">
          <Link to="/filings" className="text-[#64748d] hover:text-[#273951]">Filings</Link>
          <ChevronRight size={12} className="text-[#64748d]" />
          <span className="text-[#061b31]">Workflow View</span>
        </div>

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-normal tracking-tight text-[#061b31]" style={{ fontWeight: 300 }}>Filing Room</h1>
          <span className="text-sm text-[#64748d]">{filtered.length} filing{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#64748d]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by form type or name…"
              className="h-9 w-full rounded-lg border border-[#e5edf5] pl-8 pr-3 text-sm text-[#061b31] placeholder:text-[#64748d] outline-none focus:border-[#533afd] transition-colors"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748d] hover:text-[#273951]">
                <X size={13} />
              </button>
            )}
          </div>

          {/* Status filter */}
          <div className="relative">
            <button
              onClick={() => { setShowStatusDrop(!showStatusDrop); setShowYearDrop(false) }}
              className={`flex items-center gap-1.5 h-9 px-3 rounded-lg border text-sm transition-colors ${statusFilter ? 'border-[#533afd] text-[#533afd] bg-[#EDE9FD]' : 'border-[#e5edf5] text-[#273951] hover:bg-[#f6f9fc]'}`}
            >
              <Filter size={14} />
              {statusFilter ? STATUS_OPTIONS.find(o => o.key === statusFilter)?.label : 'Status'}
              <ChevronDown size={12} />
            </button>
            {showStatusDrop && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowStatusDrop(false)} />
                <div className="absolute left-0 top-full mt-1 z-20 min-w-[160px] rounded-lg border border-[#e5edf5] bg-white shadow-lg">
                  <button onClick={() => { setStatusFilter(null); setShowStatusDrop(false) }} className={`w-full text-left px-3 py-2 text-sm hover:bg-[#f6f9fc] ${!statusFilter ? 'text-[#533afd] font-medium' : 'text-[#061b31]'}`}>All statuses</button>
                  {STATUS_OPTIONS.map(opt => (
                    <button key={opt.key} onClick={() => { setStatusFilter(opt.key); setShowStatusDrop(false) }} className={`w-full text-left px-3 py-2 text-sm hover:bg-[#f6f9fc] ${statusFilter === opt.key ? 'text-[#533afd] font-medium' : 'text-[#061b31]'}`}>{opt.label}</button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Year filter */}
          <div className="relative">
            <button
              onClick={() => { setShowYearDrop(!showYearDrop); setShowStatusDrop(false) }}
              className={`flex items-center gap-1.5 h-9 px-3 rounded-lg border text-sm transition-colors ${yearFilter ? 'border-[#533afd] text-[#533afd] bg-[#EDE9FD]' : 'border-[#e5edf5] text-[#273951] hover:bg-[#f6f9fc]'}`}
            >
              {yearFilter ?? 'All years'}
              <ChevronDown size={12} />
            </button>
            {showYearDrop && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowYearDrop(false)} />
                <div className="absolute left-0 top-full mt-1 z-20 min-w-[120px] rounded-lg border border-[#e5edf5] bg-white shadow-lg">
                  <button onClick={() => { setYearFilter(null); setShowYearDrop(false) }} className={`w-full text-left px-3 py-2 text-sm hover:bg-[#f6f9fc] ${!yearFilter ? 'text-[#533afd] font-medium' : 'text-[#061b31]'}`}>All years</button>
                  {availableYears.map((y: number) => (
                    <button key={y} onClick={() => { setYearFilter(y); setShowYearDrop(false) }} className={`w-full text-left px-3 py-2 text-sm hover:bg-[#f6f9fc] ${yearFilter === y ? 'text-[#533afd] font-medium' : 'text-[#061b31]'}`}>{y}</button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Clear all */}
          {hasFilters && (
            <button onClick={() => { setSearch(''); setStatusFilter(null); setYearFilter(null) }} className="flex items-center gap-1 h-9 px-3 text-sm text-[#64748d] hover:text-[#273951] transition-colors">
              <X size={13} /> Clear
            </button>
          )}
        </div>

        {/* Filing cards */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-[#e5edf5] py-16 text-center">
            <Filter size={28} className="mb-3 text-[#e5edf5]" />
            <p className="text-sm font-medium text-[#273951]">No filings match your filters</p>
            <p className="mt-1 text-sm text-[#64748d]">Try adjusting the search or filter criteria.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((f: any) => (
              <Card key={f.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/filings/room/${f.id}`)}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium text-[#061b31]">{f.formType} — {f.formName}</p>
                    <p className="text-sm text-[#64748d] mt-0.5">Tax Year {f.taxYear || 2025} • {formatDate(f.updatedAt || f.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {f.aiConfidenceScore != null && <ConfidenceBadge score={f.aiConfidenceScore} />}
                    <StatusBadge status={f.status} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (!filing) return <div>Loading...</div>

  const stageIndex = STAGES.findIndex(s => s.status === filing.status)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1 text-[13px] mb-1">
        <Link to="/filings" className="text-[#64748d] hover:text-[#273951]">Filings</Link>
        <ChevronRight size={12} className="text-[#64748d]" />
        <Link to="/filings/room" className="text-[#64748d] hover:text-[#273951]">Workflow View</Link>
        <ChevronRight size={12} className="text-[#64748d]" />
        <span className="text-[#061b31]">{filing.formType}</span>
      </div>
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-normal text-[#061b31]" style={{ fontWeight: 300 }}>{filing.formType} — {filing.formName}</h1>
        <StatusBadge status={filing.status} />
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Timeline Sidebar */}
        <div className="col-span-2">
          <Card>
            <CardContent className="p-4">
              <div className="space-y-4">
                {STAGES.map((stage, i) => (
                  <div key={stage.status} className="flex items-center gap-2">
                    <div className={`flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold ${
                      i < stageIndex ? 'bg-[#15be53] text-white' :
                      i === stageIndex ? 'bg-[#533afd] text-white' :
                      'bg-[#e5edf5] text-[#64748d]'
                    }`}>
                      {i < stageIndex ? '✓' : i + 1}
                    </div>
                    <span className={`text-sm ${i === stageIndex ? 'font-medium text-[#061b31]' : 'text-[#64748d]'}`}>
                      {stage.label}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chat / Conversation Thread */}
        <div className="col-span-5">
          <Card className="flex flex-col h-[600px]">
            <CardHeader>
              <CardTitle>AI Conversation</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-3">
              {/* Existing conversation messages */}
              {filing.conversations?.map((convo: any) =>
                (convo.messages || []).map((msg: any, i: number) => (
                  <div key={`${convo.id}-${i}`} className={`rounded-lg p-3 ${
                    msg.role === 'assistant' ? 'bg-[#EDE9FD] text-[#273951]' : 'bg-[#f6f9fc] text-[#273951] ml-8'
                  }`}>
                    <p className="text-xs font-medium text-[#64748d] mb-1">
                      {msg.role === 'assistant' ? 'TaxOS AI' : 'You'}
                    </p>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                ))
              )}
              {/* Live chat messages */}
              {chatHistory.map((msg, i) => (
                <div key={`chat-${i}`} className={`rounded-lg p-3 ${
                  msg.role === 'assistant' ? 'bg-[#EDE9FD] text-[#273951]' : 'bg-[#f6f9fc] text-[#273951] ml-8'
                }`}>
                  <p className="text-xs font-medium text-[#64748d] mb-1">
                    {msg.role === 'assistant' ? 'TaxOS AI' : 'You'}
                  </p>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              ))}
            </CardContent>
            <div className="border-t p-4 flex gap-2">
              <Input
                value={chatMessage}
                onChange={e => setChatMessage(e.target.value)}
                placeholder="Ask the AI agent..."
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                disabled={streaming}
              />
              <Button onClick={sendMessage} disabled={streaming || !chatMessage.trim()}>
                Send
              </Button>
            </div>
          </Card>
        </div>

        {/* Form Preview */}
        <div className="col-span-5">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Form Preview</CardTitle>
                {filing.aiConfidenceScore != null && <ConfidenceBadge score={filing.aiConfidenceScore} />}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {filing.aiSummary && (
                <div className="rounded-md bg-[#EDE9FD] p-3">
                  <p className="text-sm font-medium text-[#533afd] mb-1">AI Summary</p>
                  <p className="text-sm text-[#273951]">{filing.aiSummary}</p>
                </div>
              )}
              {filing.aiReasoning && (
                <div className="rounded-md bg-[#f6f9fc] p-3">
                  <p className="text-sm font-medium text-[#273951] mb-1">AI Reasoning</p>
                  <p className="text-sm text-[#64748d]">{filing.aiReasoning}</p>
                </div>
              )}
              {filing.filingData && typeof filing.filingData === 'object' && (
                <div className='overflow-y-scroll max-h-96'>
                  <p className="text-sm font-medium text-[#061b31] mb-3">Filing Data</p>
                  <div className="rounded-md border border-[#e5edf5] overflow-hidden">
                    <FilingDataFields data={filing.filingData as Record<string, any>} />
                  </div>
                </div>
              )}

              {/* Documents */}
              {filing.documents?.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-[#273951] mb-2">Attached Documents</p>
                  {filing.documents.map((doc: any) => (
                    <div key={doc.id} className="flex items-center gap-2 rounded-md border px-3 py-2 mb-1">
                      <span className="text-sm">{doc.fileName}</span>
                      {doc.confidenceScore != null && <ConfidenceBadge score={doc.confidenceScore} />}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Approval Card */}
          {filing.status === 'founder_approval' && (
            <Card className="mt-4 border-[rgba(155,104,41,0.3)] bg-[rgba(155,104,41,0.08)]">
              <CardContent className="p-4 space-y-3">
                <p className="font-medium text-[#9b6829]">Founder Approval Required</p>
                <p className="text-sm text-[#9b6829]">{filing.aiSummary}</p>
                <div className="flex gap-2">
                  <Button onClick={() => approveMutation.mutate()}>Approve & Submit</Button>
                  <Button variant="destructive" onClick={() => {
                    const reason = prompt('Rejection reason:')
                    if (reason) rejectMutation.mutate(reason)
                  }}>
                    Reject
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/advisor')}>Ask AI</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
