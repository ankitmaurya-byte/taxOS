import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { useState } from 'react'
import { api } from '@/lib/api'
import { Pencil, Check, X, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react'

const FILING_STATUSES = ['intake', 'ai_prep', 'cpa_review', 'founder_approval', 'submitted', 'archived']

const STATUS_STYLES: Record<string, string> = {
  intake: 'bg-[#F3F4F6] text-[#374151]',
  ai_prep: 'bg-[#DBEAFE] text-[#1E40AF]',
  cpa_review: 'bg-[#FEF3C7] text-[#92400E]',
  founder_approval: 'bg-[#FDE68A] text-[#78350F]',
  submitted: 'bg-[#DCFCE7] text-[#166534]',
  archived: 'bg-[#E5E7EB] text-[#6B7280]',
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function AdminFilingDetail() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()

  const { data: filing, isLoading } = useQuery({
    queryKey: ['admin-filing', id],
    queryFn: () => api.admin.getFiling(id!),
    enabled: !!id,
  })

  // Status edit
  const [editingStatus, setEditingStatus] = useState(false)
  const [newStatus, setNewStatus] = useState('')

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => api.admin.updateFilingStatus(id!, status),
    onSuccess: () => { setEditingStatus(false); queryClient.invalidateQueries({ queryKey: ['admin-filing', id] }) },
  })

  // Filing data edit
  const [editingData, setEditingData] = useState(false)
  const [dataFields, setDataFields] = useState<Record<string, string>>({})
  const [newKey, setNewKey] = useState('')
  const [newVal, setNewVal] = useState('')

  const updateDataMutation = useMutation({
    mutationFn: (fields: Record<string, unknown>) => api.admin.updateFilingData(id!, fields),
    onSuccess: () => { setEditingData(false); queryClient.invalidateQueries({ queryKey: ['admin-filing', id] }) },
  })

  // Conversations expand
  const [expandedConvo, setExpandedConvo] = useState<string | null>(null)

  if (isLoading) return <div className="p-6 text-[#6B7280]">Loading filing...</div>
  if (!filing) return <div className="p-6 text-red-500">Filing not found</div>

  function startEditData() {
    const flat: Record<string, string> = {}
    const fd = filing.filingData || {}
    for (const k of Object.keys(fd)) flat[k] = String(fd[k] ?? '')
    setDataFields(flat)
    setEditingData(true)
  }

  function addField() {
    if (!newKey.trim()) return
    setDataFields(prev => ({ ...prev, [newKey.trim()]: newVal }))
    setNewKey('')
    setNewVal('')
  }

  function removeField(k: string) {
    setDataFields(prev => { const n = { ...prev }; delete n[k]; return n })
  }

  function saveData() {
    updateDataMutation.mutate(dataFields)
  }

  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="text-sm text-[#6B7280]">
        <Link to="/admin/filings" className="text-[#6C5CE7] hover:underline">Admin Filings</Link>
        <span className="mx-2">/</span>
        <span className="text-[#111827]">{filing.formName} ({filing.formType})</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">{filing.formName}</h1>
          <p className="text-sm text-[#6B7280] mt-1">Form {filing.formType} &bull; Tax Year: {filing.taxYear || '—'}</p>
        </div>
        <div className="flex items-center gap-2">
          {editingStatus ? (
            <div className="flex items-center gap-2">
              <select
                className="border rounded-lg px-3 py-1.5 text-sm"
                value={newStatus}
                onChange={e => setNewStatus(e.target.value)}
              >
                {FILING_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </select>
              <button
                onClick={() => updateStatusMutation.mutate(newStatus)}
                disabled={updateStatusMutation.isPending}
                className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
              >
                <Check size={13} /> Save
              </button>
              <button onClick={() => setEditingStatus(false)} className="px-3 py-1.5 bg-gray-100 rounded-lg text-sm">
                <X size={13} />
              </button>
            </div>
          ) : (
            <>
              <span className={`px-3 py-1 rounded-lg text-sm font-medium ${STATUS_STYLES[filing.status] || 'bg-[#E0E7FF] text-[#4338CA]'}`}>
                {filing.status?.replace(/_/g, ' ')}
              </span>
              <button
                onClick={() => { setNewStatus(filing.status); setEditingStatus(true) }}
                className="flex items-center gap-1 px-3 py-1.5 border border-[#E5E7EB] bg-white rounded-lg text-sm hover:bg-gray-50"
              >
                <Pencil size={13} /> Edit Status
              </button>
            </>
          )}
        </div>
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Organization', value: filing.org?.name || '—' },
          { label: 'Entity', value: filing.entity?.legalName || '—' },
          { label: 'CPA Assigned', value: filing.cpa?.name || 'Unassigned' },
          { label: 'AI Confidence', value: filing.aiConfidenceScore != null ? `${Math.round(filing.aiConfidenceScore * 100)}%` : '—' },
          { label: 'Created', value: formatDate(filing.createdAt) },
          { label: 'Updated', value: formatDate(filing.updatedAt) },
          { label: 'Founder Approved', value: formatDate(filing.founderApprovedAt) },
          { label: 'Submitted', value: formatDate(filing.submittedAt) },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white border border-[#E5E7EB] rounded-xl p-4">
            <p className="text-xs text-[#6B7280] uppercase tracking-wide mb-1">{label}</p>
            <p className="text-sm font-medium text-[#111827]">{value}</p>
          </div>
        ))}
      </div>

      {/* AI Summary */}
      {filing.aiSummary && (
        <div className="bg-[#F0F0FF] border border-[#C7D2FE] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#4338CA] mb-2">AI Summary</h2>
          <p className="text-sm text-[#374151] whitespace-pre-wrap">{filing.aiSummary}</p>
          {filing.aiReasoning && (
            <p className="mt-3 text-xs text-[#6B7280] italic whitespace-pre-wrap">{filing.aiReasoning}</p>
          )}
        </div>
      )}

      {/* Filing Data */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-[#111827]">Filing Data</h2>
          {!editingData && (
            <button
              onClick={startEditData}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E5E7EB] rounded-lg text-sm hover:bg-gray-50"
            >
              <Pencil size={13} /> Edit Fields
            </button>
          )}
        </div>

        {editingData ? (
          <div className="space-y-3">
            <div className="space-y-2">
              {Object.entries(dataFields).map(([k, v]) => (
                <div key={k} className="flex items-center gap-2">
                  <span className="w-48 text-sm font-mono text-[#374151] bg-[#F3F4F6] px-3 py-1.5 rounded-lg">{k}</span>
                  <input
                    className="flex-1 border rounded-lg px-3 py-1.5 text-sm"
                    value={v}
                    onChange={e => setDataFields(prev => ({ ...prev, [k]: e.target.value }))}
                  />
                  <button onClick={() => removeField(k)} className="p-1.5 text-red-500 hover:bg-red-50 rounded">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
            {/* Add new field */}
            <div className="flex items-center gap-2 pt-2 border-t border-[#F3F4F6]">
              <input
                className="w-48 border rounded-lg px-3 py-1.5 text-sm font-mono"
                placeholder="field name"
                value={newKey}
                onChange={e => setNewKey(e.target.value)}
              />
              <input
                className="flex-1 border rounded-lg px-3 py-1.5 text-sm"
                placeholder="value"
                value={newVal}
                onChange={e => setNewVal(e.target.value)}
              />
              <button onClick={addField} className="flex items-center gap-1 px-3 py-1.5 bg-[#6C5CE7] text-white rounded-lg text-sm hover:bg-[#5B4BD5]">
                <Plus size={13} /> Add
              </button>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setEditingData(false)} className="px-4 py-1.5 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">Cancel</button>
              <button
                onClick={saveData}
                disabled={updateDataMutation.isPending}
                className="px-4 py-1.5 bg-[#6C5CE7] text-white rounded-lg text-sm hover:bg-[#5B4BD5] disabled:opacity-50"
              >
                {updateDataMutation.isPending ? 'Saving...' : 'Save Filing Data'}
              </button>
            </div>
          </div>
        ) : (
          <div>
            {!filing.filingData || Object.keys(filing.filingData).length === 0 ? (
              <p className="text-sm text-[#9CA3AF] italic">No filing data fields yet.</p>
            ) : (
              <div className="divide-y divide-[#F3F4F6]">
                {Object.entries(filing.filingData).map(([k, v]) => (
                  <div key={k} className="flex py-2.5 gap-4">
                    <span className="w-56 text-sm font-mono text-[#6B7280] shrink-0">{k}</span>
                    <span className="text-sm text-[#111827] break-all">{String(v)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Agent Conversations */}
      {filing.conversations?.length > 0 && (
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#111827] mb-4">AI Conversations ({filing.conversations.length})</h2>
          <div className="space-y-3">
            {filing.conversations.map((conv: any) => (
              <div key={conv.id} className="border border-[#E5E7EB] rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandedConvo(expandedConvo === conv.id ? null : conv.id)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-[#F9FAFB] hover:bg-[#F3F4F6] text-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-[#111827]">{conv.agentType}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${conv.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {conv.status}
                    </span>
                    <span className="text-[#6B7280]">{conv.messages?.length || 0} messages</span>
                  </div>
                  {expandedConvo === conv.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                {expandedConvo === conv.id && (
                  <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
                    {(conv.messages || []).map((msg: any, i: number) => (
                      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${
                          msg.role === 'user'
                            ? 'bg-[#6C5CE7] text-white'
                            : 'bg-[#F3F4F6] text-[#374151]'
                        }`}>
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                          {msg.timestamp && <p className="text-xs opacity-60 mt-1">{msg.timestamp}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Documents */}
      {filing.documents?.length > 0 && (
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#111827] mb-4">Documents ({filing.documents.length})</h2>
          <div className="space-y-2">
            {filing.documents.map((doc: any) => (
              <div key={doc.id} className="flex items-center justify-between p-3 bg-[#F9FAFB] rounded-lg">
                <div>
                  <p className="text-sm font-medium text-[#111827]">{doc.fileName}</p>
                  <p className="text-xs text-[#6B7280]">{doc.mimeType} &bull; {formatDate(doc.createdAt)}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded ${doc.reviewedByHuman ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {doc.reviewedByHuman ? 'Reviewed' : 'Pending Review'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
