// Used in: App.tsx — route /approvals (approval queue for filings)
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
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
      default: return 'bg-[#F3F4F6] text-[#374151]'
    }
  }

  return (
    <div className="space-y-8 p-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold text-[#111827]">Approval Queue</h1>
        <p className="mt-1 text-sm text-[#6B7280]">Review and action pending filing approvals.</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
          <p className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">Pending</p>
          <p className="mt-1 text-2xl font-semibold text-[#92400E]">{pending.length}</p>
        </div>
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
          <p className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">Approved</p>
          <p className="mt-1 text-2xl font-semibold text-[#166534]">{resolved.filter(a => a.status === 'approved').length}</p>
        </div>
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
          <p className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">Rejected</p>
          <p className="mt-1 text-2xl font-semibold text-[#991B1B]">{resolved.filter(a => a.status === 'rejected').length}</p>
        </div>
      </div>

      {/* Pending section */}
      <div>
        <h2 className="text-sm font-semibold text-[#374151] uppercase tracking-wide mb-3">Pending Review</h2>
        {pending.length === 0 ? (
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-12 text-center">
            <CheckCircle2 size={32} className="mx-auto text-[#10B981] mb-3" />
            <p className="text-sm font-medium text-[#111827]">All caught up</p>
            <p className="text-xs text-[#6B7280] mt-1">No pending approvals at this time.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingPag.getPage(pendingPage).map(approval => (
              <div key={approval.id} className="group rounded-xl border border-[#E5E7EB] bg-white transition-all hover:border-[#D1D5DB] hover:shadow-sm">
                {/* Clickable row — navigates to filing */}
                <div
                  onClick={() => approval.filingId && navigate(`/filings/${approval.filingId}`)}
                  className="flex items-center gap-4 p-5 cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${approval.queueType === 'founder' ? 'bg-[#EDE9FD] text-[#6C5CE7]' : 'bg-[#DBEAFE] text-[#1D4ED8]'}`}>
                        {approval.queueType === 'founder' ? 'Founder Review' : 'CPA Review'}
                      </span>
                      <span className="rounded-md bg-[#FEF3C7] px-2 py-0.5 text-[11px] font-medium text-[#92400E]">Pending</span>
                    </div>
                    <p className="text-sm text-[#111827] leading-relaxed">{approval.summary}</p>
                    {approval.aiRecommendation && (
                      <div className="mt-2 flex items-start gap-2 rounded-lg bg-[#F0F9FF] px-3 py-2">
                        <span className="text-[10px] font-semibold text-[#0369A1] uppercase tracking-wide mt-0.5 shrink-0">AI</span>
                        <p className="text-xs text-[#0C4A6E] leading-relaxed">{approval.aiRecommendation}</p>
                      </div>
                    )}
                  </div>
                  <ChevronRight size={16} className="text-[#D1D5DB] group-hover:text-[#9CA3AF] shrink-0 transition-colors" />
                </div>

                {/* Action bar */}
                <div className="flex items-center gap-2 border-t border-[#F3F4F6] px-5 py-3">
                  <button
                    disabled={resolveLoading[approval.id]}
                    onClick={async (e) => {
                      e.stopPropagation()
                      setResolveLoading(prev => ({ ...prev, [approval.id]: true }))
                      try { await resolveApproval(approval.id, 'approved') } finally { setResolveLoading(prev => ({ ...prev, [approval.id]: false })) }
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#166534] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#15803D] disabled:opacity-50 transition-colors"
                  >
                    <CheckCircle2 size={13} />
                    Approve
                  </button>
                  <button
                    disabled={resolveLoading[approval.id]}
                    onClick={async (e) => {
                      e.stopPropagation()
                      const reason = window.prompt('Rejection reason:')
                      if (reason) {
                        setResolveLoading(prev => ({ ...prev, [approval.id]: true }))
                        try { await resolveApproval(approval.id, 'rejected', reason) } finally { setResolveLoading(prev => ({ ...prev, [approval.id]: false })) }
                      }
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[#991B1B] bg-white border border-[#E5E7EB]  group-hover:opacity-100 hover:bg-[#FEF2F2] hover:border-[#FECACA] disabled:opacity-50 transition-all"
                  >
                    <XCircle size={13} />
                    Reject
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setExpandedChat(expandedChat === approval.id ? null : approval.id) }}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[#374151] bg-white border border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors"
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
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[#374151] bg-white border border-[#E5E7EB] hover:bg-[#F9FAFB] disabled:opacity-50 transition-colors"
                  >
                    <ArrowUpRight size={13} />
                    Escalate
                  </button>
                </div>

                {/* AI chat panel */}
                {expandedChat === approval.id && (
                  <div className="border-t border-[#F3F4F6] px-5 py-4 bg-[#FAFAFA]">
                    <div className="flex gap-2">
                      <input
                        className="flex-1 h-9 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm text-[#111827] placeholder:text-[#9CA3AF] outline-none focus:ring-2 focus:ring-[#6C5CE7] focus:border-transparent"
                        placeholder="Ask about this filing..."
                        value={chatInputs[approval.id] || ''}
                        onChange={(e) => setChatInputs((prev) => ({ ...prev, [approval.id]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter') sendApprovalQuestion(approval) }}
                      />
                      <button
                        onClick={() => sendApprovalQuestion(approval)}
                        disabled={chatLoading[approval.id] || !chatInputs[approval.id]?.trim()}
                        className="h-9 rounded-lg bg-[#6C5CE7] px-4 text-xs font-medium text-white hover:bg-[#5A4BD1] disabled:opacity-50 transition-colors"
                      >
                        {chatLoading[approval.id] ? 'Sending...' : 'Send'}
                      </button>
                    </div>
                    {chatErrors[approval.id] && (
                      <p className="mt-2 text-xs text-[#991B1B]">{chatErrors[approval.id]}</p>
                    )}
                    {chatResponses[approval.id] && (
                      <div className="mt-3 rounded-lg border border-[#E0E7FF] bg-white p-3">
                        <p className="mb-1 text-[10px] font-semibold text-[#6C5CE7] uppercase tracking-wide">AI Response</p>
                        <p className="whitespace-pre-wrap text-sm text-[#374151] leading-relaxed">{chatResponses[approval.id]}</p>
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
          <h2 className="text-sm font-semibold text-[#374151] uppercase tracking-wide mb-3">Resolved</h2>
          <div className="rounded-xl border border-[#E5E7EB] bg-white overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                <tr>
                  <th className="px-5 py-3 text-xs font-medium text-[#6B7280] uppercase tracking-wide">Summary</th>
                  <th className="px-5 py-3 text-xs font-medium text-[#6B7280] uppercase tracking-wide">Type</th>
                  <th className="px-5 py-3 text-xs font-medium text-[#6B7280] uppercase tracking-wide text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {resolvedPag.getPage(resolvedPage).map(approval => (
                  <tr
                    key={approval.id}
                    onClick={() => approval.filingId && navigate(`/filings/${approval.filingId}`)}
                    className="hover:bg-[#F9FAFB] cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3.5 text-[#374151]">{approval.summary}</td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs text-[#6B7280] capitalize">{approval.queueType}</span>
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
