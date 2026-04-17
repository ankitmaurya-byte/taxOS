// Used in: App.tsx — route /approvals (approval queue for filings)
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { promptDialog } from '@/stores/dialogs'
import { Pagination, usePagination } from '@/components/ui/pagination'
import { CheckCircle2, XCircle, MessageSquare, ArrowUpRight, ChevronRight } from 'lucide-react'

const PAGE_SIZE = 10

export function ApprovalQueue() {
  const navigate = useNavigate()
  const approvals = useAuthStore(s => s.approvals)
  const fetchApprovals = useAuthStore(s => s.fetchApprovals)
  const resolveApproval = useAuthStore(s => s.resolveApproval)
  const escalateApproval = useAuthStore(s => s.escalateApproval)

  const [expandedChat, setExpandedChat] = useState<string | null>(null)
  const [chatInputs, setChatInputs] = useState<Record<string, string>>({})
  const [chatResponses, setChatResponses] = useState<Record<string, string>>({})
  const [chatLoading, setChatLoading] = useState<Record<string, boolean>>({})
  const [chatErrors, setChatErrors] = useState<Record<string, string>>({})
  const [resolveLoading, setResolveLoading] = useState<Record<string, boolean>>({})
  const [escalateLoading, setEscalateLoading] = useState<Record<string, boolean>>({})
  const [pendingPage, setPendingPage] = useState(1)
  const [resolvedPage, setResolvedPage] = useState(1)

  useEffect(() => { fetchApprovals() }, [fetchApprovals])

  const sendApprovalQuestion = async (approval: any) => {
    const question = chatInputs[approval.id]?.trim()
    if (!question || chatLoading[approval.id]) return

    setChatLoading((prev) => ({ ...prev, [approval.id]: true }))
    setChatErrors((prev) => ({ ...prev, [approval.id]: '' }))
    setChatResponses((prev) => ({ ...prev, [approval.id]: '' }))

    try {
      let fullResponse = ''
      const prompt = [
        'You are helping with an approval queue decision for a filing.',
        `Queue type: ${approval.queueType}.`,
        `Approval summary: ${approval.summary}`,
        approval.aiRecommendation ? `Existing AI recommendation: ${approval.aiRecommendation}` : '',
        `User question: ${question}`,
      ]
        .filter(Boolean)
        .join('\n')

      await api.streamTaxQa(prompt, (chunk: string) => {
        fullResponse += chunk
        setChatResponses((prev) => ({ ...prev, [approval.id]: fullResponse }))
      })

      setChatInputs((prev) => ({ ...prev, [approval.id]: '' }))
    } catch {
      setChatErrors((prev) => ({
        ...prev,
        [approval.id]: 'Sorry, something went wrong while asking the AI. Please try again.',
      }))
    } finally {
      setChatLoading((prev) => ({ ...prev, [approval.id]: false }))
    }
  }

  const pending = approvals.filter(a => a.status === 'pending')
  const resolved = approvals.filter(a => a.status !== 'pending')
  const pendingPag = usePagination(pending, PAGE_SIZE)
  const resolvedPag = usePagination(resolved, PAGE_SIZE)

  const statusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-[#DCFCE7] text-[#166534]'
      case 'rejected': return 'bg-[#FEE2E2] text-[#991B1B]'
      case 'escalated': return 'bg-[#FEF3C7] text-[#92400E]'
      default: return 'bg-[#f6f9fc] text-[#273951]'
    }
  }

  return (
    <div className="space-y-8 p-3 sm:p-5 md:p-6 lg:p-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-normal text-[#061b31]" style={{ fontWeight: 300 }}>Approval Queue</h1>
        <p className="mt-1 text-sm text-[#64748d]">Review and action pending filing approvals.</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="rounded-md border border-[#e5edf5] bg-white p-4">
          <p className="text-xs font-medium text-[#64748d] uppercase tracking-wide">Pending</p>
          <p className="mt-1 text-2xl font-normal text-[#9b6829] font-tnum" style={{ fontWeight: 300 }}>{pending.length}</p>
        </div>
        <div className="rounded-md border border-[#e5edf5] bg-white p-4">
          <p className="text-xs font-medium text-[#64748d] uppercase tracking-wide">Approved</p>
          <p className="mt-1 text-2xl font-normal text-[#108c3d] font-tnum" style={{ fontWeight: 300 }}>{resolved.filter(a => a.status === 'approved').length}</p>
        </div>
        <div className="rounded-md border border-[#e5edf5] bg-white p-4">
          <p className="text-xs font-medium text-[#64748d] uppercase tracking-wide">Rejected</p>
          <p className="mt-1 text-2xl font-normal text-[#ea2261] font-tnum" style={{ fontWeight: 300 }}>{resolved.filter(a => a.status === 'rejected').length}</p>
        </div>
      </div>

      {/* Pending section */}
      <div>
        <h2 className="text-sm font-medium text-[#273951] uppercase tracking-wide mb-3">Pending Review</h2>
        {pending.length === 0 ? (
          <div className="rounded-md border border-[#e5edf5] bg-white p-12 text-center">
            <CheckCircle2 size={32} className="mx-auto text-[#15be53] mb-3" />
            <p className="text-sm font-medium text-[#061b31]">All caught up</p>
            <p className="text-xs text-[#64748d] mt-1">No pending approvals at this time.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingPag.getPage(pendingPage).map(approval => (
              <div key={approval.id} className="group rounded-md border border-[#e5edf5] bg-white transition-all hover:border-[#e5edf5] hover:shadow-sm">
                {/* Clickable row — navigates to filing */}
                <div
                  onClick={() => approval.filingId && navigate(`/filings/${approval.filingId}`)}
                  className="flex items-center gap-4 p-5 cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${approval.queueType === 'founder' ? 'bg-[#EDE9FD] text-[#533afd]' : 'bg-[#DBEAFE] text-[#1D4ED8]'}`}>
                        {approval.queueType === 'founder' ? 'Founder Review' : 'CPA Review'}
                      </span>
                      <span className="rounded-md bg-[#FEF3C7] px-2 py-0.5 text-[11px] font-medium text-[#92400E]">Pending</span>
                    </div>
                    <p className="text-sm text-[#061b31] leading-relaxed">{approval.summary}</p>
                    {approval.aiRecommendation && (
                      <div className="mt-2 flex items-start gap-2 rounded-lg bg-[#F0F9FF] px-3 py-2">
                        <span className="text-[10px] font-medium text-[#533afd] uppercase tracking-wide mt-0.5 shrink-0">AI</span>
                        <p className="text-xs text-[#0C4A6E] leading-relaxed">{approval.aiRecommendation}</p>
                      </div>
                    )}
                  </div>
                  <ChevronRight size={16} className="text-[#e5edf5] group-hover:text-[#64748d] shrink-0 transition-colors" />
                </div>

                {/* Action bar */}
                <div className="flex items-center gap-2 flex-wrap border-t border-[#f6f9fc] px-4 sm:px-5 py-3">
                  <button
                    disabled={resolveLoading[approval.id]}
                    onClick={async (e) => {
                      e.stopPropagation()
                      setResolveLoading(prev => ({ ...prev, [approval.id]: true }))
                      try { await resolveApproval(approval.id, 'approved') } finally { setResolveLoading(prev => ({ ...prev, [approval.id]: false })) }
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#108c3d] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#0a6b2e] disabled:opacity-50 transition-colors"
                  >
                    <CheckCircle2 size={13} />
                    Approve
                  </button>
                  <button
                    disabled={resolveLoading[approval.id]}
                    onClick={async (e) => {
                      e.stopPropagation()
                      const reason = await promptDialog({
                        title: 'Reject approval',
                        message: 'Share why this request is being rejected.',
                        placeholder: 'Rejection reason',
                        multiline: true,
                        required: true,
                        confirmLabel: 'Reject',
                        tone: 'danger',
                      })
                      if (reason) {
                        setResolveLoading(prev => ({ ...prev, [approval.id]: true }))
                        try { await resolveApproval(approval.id, 'rejected', reason) } finally { setResolveLoading(prev => ({ ...prev, [approval.id]: false })) }
                      }
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[#991B1B] bg-white border border-[#e5edf5]  group-hover:opacity-100 hover:bg-[#FEF2F2] hover:border-[#FECACA] disabled:opacity-50 transition-all"
                  >
                    <XCircle size={13} />
                    Reject
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setExpandedChat(expandedChat === approval.id ? null : approval.id) }}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[#273951] bg-white border border-[#e5edf5] hover:bg-[#f6f9fc] transition-colors"
                  >
                    <MessageSquare size={13} />
                    Ask AI
                  </button>
                  <button
                    disabled={escalateLoading[approval.id]}
                    onClick={async (e) => {
                      e.stopPropagation()
                      setEscalateLoading(prev => ({ ...prev, [approval.id]: true }))
                      try { await escalateApproval(approval.id) } finally { setEscalateLoading(prev => ({ ...prev, [approval.id]: false })) }
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[#273951] bg-white border border-[#e5edf5] hover:bg-[#f6f9fc] disabled:opacity-50 transition-colors"
                  >
                    <ArrowUpRight size={13} />
                    Escalate
                  </button>
                </div>

                {/* AI chat panel */}
                {expandedChat === approval.id && (
                  <div className="border-t border-[#f6f9fc] px-5 py-4 bg-[#FAFAFA]">
                    <div className="flex gap-2">
                      <input
                        className="flex-1 h-9 rounded-lg border border-[#e5edf5] bg-white px-3 text-sm text-[#061b31] placeholder:text-[#64748d] outline-none focus:ring-2 focus:ring-[#533afd] focus:border-transparent"
                        placeholder="Ask about this filing..."
                        value={chatInputs[approval.id] || ''}
                        onChange={(e) => setChatInputs((prev) => ({ ...prev, [approval.id]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter') sendApprovalQuestion(approval) }}
                      />
                      <button
                        onClick={() => sendApprovalQuestion(approval)}
                        disabled={chatLoading[approval.id] || !chatInputs[approval.id]?.trim()}
                        className="h-9 rounded-lg bg-[#533afd] px-4 text-xs font-medium text-white hover:bg-[#4434d4] disabled:opacity-50 transition-colors"
                      >
                        {chatLoading[approval.id] ? 'Sending...' : 'Send'}
                      </button>
                    </div>
                    {chatErrors[approval.id] && (
                      <p className="mt-2 text-xs text-[#991B1B]">{chatErrors[approval.id]}</p>
                    )}
                    {chatResponses[approval.id] && (
                      <div className="mt-3 rounded-lg border border-[#E0E7FF] bg-white p-3">
                        <p className="mb-1 text-[10px] font-medium text-[#533afd] uppercase tracking-wide">AI Response</p>
                        <p className="whitespace-pre-wrap text-sm text-[#273951] leading-relaxed">{chatResponses[approval.id]}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            <Pagination currentPage={pendingPage} totalPages={pendingPag.totalPages} onPageChange={setPendingPage} />
          </div>
        )}
      </div>

      {/* Resolved section */}
      {resolved.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-[#273951] uppercase tracking-wide mb-3">Resolved</h2>
          <div className="rounded-md border border-[#e5edf5] bg-white overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[520px]">
              <thead className="bg-[#f6f9fc] border-b border-[#e5edf5]">
                <tr>
                  <th className="px-5 py-3 text-xs font-medium text-[#64748d] uppercase tracking-wide">Summary</th>
                  <th className="px-5 py-3 text-xs font-medium text-[#64748d] uppercase tracking-wide">Type</th>
                  <th className="px-5 py-3 text-xs font-medium text-[#64748d] uppercase tracking-wide text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f6f9fc]">
                {resolvedPag.getPage(resolvedPage).map(approval => (
                  <tr
                    key={approval.id}
                    onClick={() => approval.filingId && navigate(`/filings/${approval.filingId}`)}
                    className="hover:bg-[#f6f9fc] cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3.5 text-[#273951]">{approval.summary}</td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs text-[#64748d] capitalize">{approval.queueType}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium capitalize ${statusColor(approval.status)}`}>
                        {approval.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3">
            <Pagination currentPage={resolvedPage} totalPages={resolvedPag.totalPages} onPageChange={setResolvedPage} />
          </div>
        </div>
      )}
    </div>
  )
}
