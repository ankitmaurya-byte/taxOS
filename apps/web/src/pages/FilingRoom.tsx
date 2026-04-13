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
          <Link to="/filings" className="text-[#6B7280] hover:text-[#374151]">Filings</Link>
          <ChevronRight size={12} className="text-[#9CA3AF]" />
          <span className="text-[#111827]">Workflow View</span>
        </div>

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-[#111827]">Filing Room</h1>
          <span className="text-sm text-[#6B7280]">{filtered.length} filing{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by form type or name…"
              className="h-9 w-full rounded-lg border border-[#E5E7EB] pl-8 pr-3 text-sm text-[#111827] placeholder:text-[#9CA3AF] outline-none focus:border-[#6C5CE7] transition-colors"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#374151]">
                <X size={13} />
              </button>
            )}
          </div>

          {/* Status filter */}
          <div className="relative">
            <button
              onClick={() => { setShowStatusDrop(!showStatusDrop); setShowYearDrop(false) }}
              className={`flex items-center gap-1.5 h-9 px-3 rounded-lg border text-sm transition-colors ${statusFilter ? 'border-[#6C5CE7] text-[#6C5CE7] bg-[#EDE9FD]' : 'border-[#E5E7EB] text-[#374151] hover:bg-[#F3F4F6]'}`}
            >
              <Filter size={14} />
              {statusFilter ? STATUS_OPTIONS.find(o => o.key === statusFilter)?.label : 'Status'}
              <ChevronDown size={12} />
            </button>
            {showStatusDrop && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowStatusDrop(false)} />
                <div className="absolute left-0 top-full mt-1 z-20 min-w-[160px] rounded-lg border border-[#E5E7EB] bg-white shadow-lg">
                  <button onClick={() => { setStatusFilter(null); setShowStatusDrop(false) }} className={`w-full text-left px-3 py-2 text-sm hover:bg-[#F3F0FF] ${!statusFilter ? 'text-[#6C5CE7] font-medium' : 'text-[#111827]'}`}>All statuses</button>
                  {STATUS_OPTIONS.map(opt => (
                    <button key={opt.key} onClick={() => { setStatusFilter(opt.key); setShowStatusDrop(false) }} className={`w-full text-left px-3 py-2 text-sm hover:bg-[#F3F0FF] ${statusFilter === opt.key ? 'text-[#6C5CE7] font-medium' : 'text-[#111827]'}`}>{opt.label}</button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Year filter */}
          <div className="relative">
            <button
              onClick={() => { setShowYearDrop(!showYearDrop); setShowStatusDrop(false) }}
              className={`flex items-center gap-1.5 h-9 px-3 rounded-lg border text-sm transition-colors ${yearFilter ? 'border-[#6C5CE7] text-[#6C5CE7] bg-[#EDE9FD]' : 'border-[#E5E7EB] text-[#374151] hover:bg-[#F3F4F6]'}`}
            >
              {yearFilter ?? 'All years'}
              <ChevronDown size={12} />
            </button>
            {showYearDrop && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowYearDrop(false)} />
                <div className="absolute left-0 top-full mt-1 z-20 min-w-[120px] rounded-lg border border-[#E5E7EB] bg-white shadow-lg">
                  <button onClick={() => { setYearFilter(null); setShowYearDrop(false) }} className={`w-full text-left px-3 py-2 text-sm hover:bg-[#F3F0FF] ${!yearFilter ? 'text-[#6C5CE7] font-medium' : 'text-[#111827]'}`}>All years</button>
                  {availableYears.map((y: number) => (
                    <button key={y} onClick={() => { setYearFilter(y); setShowYearDrop(false) }} className={`w-full text-left px-3 py-2 text-sm hover:bg-[#F3F0FF] ${yearFilter === y ? 'text-[#6C5CE7] font-medium' : 'text-[#111827]'}`}>{y}</button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Clear all */}
          {hasFilters && (
            <button onClick={() => { setSearch(''); setStatusFilter(null); setYearFilter(null) }} className="flex items-center gap-1 h-9 px-3 text-sm text-[#6B7280] hover:text-[#374151] transition-colors">
              <X size={13} /> Clear
            </button>
          )}
        </div>

        {/* Filing cards */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#E5E7EB] py-16 text-center">
            <Filter size={28} className="mb-3 text-[#D1D5DB]" />
            <p className="text-sm font-medium text-[#374151]">No filings match your filters</p>
            <p className="mt-1 text-sm text-[#6B7280]">Try adjusting the search or filter criteria.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((f: any) => (
              <Card key={f.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/filings/room/${f.id}`)}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium text-[#111827]">{f.formType} — {f.formName}</p>
                    <p className="text-sm text-[#6B7280] mt-0.5">Tax Year {f.taxYear || 2025} • {formatDate(f.updatedAt || f.createdAt)}</p>
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
        <Link to="/filings" className="text-[#6B7280] hover:text-[#374151]">Filings</Link>
        <ChevronRight size={12} className="text-[#9CA3AF]" />
        <Link to="/filings/room" className="text-[#6B7280] hover:text-[#374151]">Workflow View</Link>
        <ChevronRight size={12} className="text-[#9CA3AF]" />
        <span className="text-[#111827]">{filing.formType}</span>
      </div>
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-900">{filing.formType} — {filing.formName}</h1>
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
                    <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                      i < stageIndex ? 'bg-green-500 text-white' :
                      i === stageIndex ? 'bg-primary text-white' :
                      'bg-gray-200 text-gray-500'
                    }`}>
                      {i < stageIndex ? '✓' : i + 1}
                    </div>
                    <span className={`text-sm ${i === stageIndex ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>
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
                    msg.role === 'assistant' ? 'bg-blue-50 text-gray-800' : 'bg-gray-100 text-gray-800 ml-8'
                  }`}>
                    <p className="text-xs font-medium text-gray-500 mb-1">
                      {msg.role === 'assistant' ? 'TaxOS AI' : 'You'}
                    </p>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                ))
              )}
              {/* Live chat messages */}
              {chatHistory.map((msg, i) => (
                <div key={`chat-${i}`} className={`rounded-lg p-3 ${
                  msg.role === 'assistant' ? 'bg-blue-50 text-gray-800' : 'bg-gray-100 text-gray-800 ml-8'
                }`}>
                  <p className="text-xs font-medium text-gray-500 mb-1">
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
                <div className="rounded-md bg-blue-50 p-3">
                  <p className="text-sm font-medium text-blue-800 mb-1">AI Summary</p>
                  <p className="text-sm text-blue-700">{filing.aiSummary}</p>
                </div>
              )}
              {filing.aiReasoning && (
                <div className="rounded-md bg-gray-50 p-3">
                  <p className="text-sm font-medium text-gray-700 mb-1">AI Reasoning</p>
                  <p className="text-sm text-gray-600">{filing.aiReasoning}</p>
                </div>
              )}
              {filing.filingData && typeof filing.filingData === 'object' && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Filing Data</p>
                  {Object.entries(filing.filingData as Record<string, any>).map(([key, value]) => (
                    <div key={key} className="flex justify-between rounded-md border px-3 py-2">
                      <span className="text-sm text-gray-600">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                      <span className="text-sm font-medium">
                        {typeof value === 'number' ? `$${value.toLocaleString()}` : JSON.stringify(value)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Documents */}
              {filing.documents?.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Attached Documents</p>
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
            <Card className="mt-4 border-orange-200 bg-orange-50">
              <CardContent className="p-4 space-y-3">
                <p className="font-medium text-orange-800">Founder Approval Required</p>
                <p className="text-sm text-orange-700">{filing.aiSummary}</p>
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
