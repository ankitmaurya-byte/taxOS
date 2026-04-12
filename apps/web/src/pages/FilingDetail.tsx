// Used in: App.tsx — route /filings/:id (single filing detail page)
import { useState, useRef, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { StatusBadge } from '@/components/ui/status-badge'
import { formatDate } from '@/lib/utils'
import {
  ChevronRight,
  Hourglass,
  Calendar,
  Eye,
  FolderOpen,
  MoreHorizontal,
  X,
  FileText,
  CheckCircle2,
  Circle,
  Archive,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react'

export function FilingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [showPreview, setShowPreview] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState<
    { role: 'user' | 'assistant'; content: string; timestamp: string }[]
  >([])
  const [isStreaming, setIsStreaming] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const [startIntakeLoading, setStartIntakeLoading] = useState(false)
  const [updateStatusLoading, setUpdateStatusLoading] = useState(false)
  const [pauseLoading, setPauseLoading] = useState(false)
  const [escalateLoading, setEscalateLoading] = useState(false)
  const [prefillLoading, setPrefillLoading] = useState(false)
  const [auditRiskLoading, setAuditRiskLoading] = useState(false)
  const [approveLoading, setApproveLoading] = useState(false)
  const [rejectLoading, setRejectLoading] = useState(false)
  const [archiveLoading, setArchiveLoading] = useState(false)

  const filingDetails = useAuthStore(s => s.filingDetails)
  const entities = useAuthStore(s => s.entities)
  const deadlines = useAuthStore(s => s.deadlines)
  const fetchFiling = useAuthStore(s => s.fetchFiling)
  const fetchEntities = useAuthStore(s => s.fetchEntities)
  const fetchDeadlines = useAuthStore(s => s.fetchDeadlines)
  const fetchFilings = useAuthStore(s => s.fetchFilings)
  const fetchApprovals = useAuthStore(s => s.fetchApprovals)
  const fetchAuditLog = useAuthStore(s => s.fetchAuditLog)
  const startIntake = useAuthStore(s => s.startIntake)
  const updateFilingStatus = useAuthStore(s => s.updateFilingStatus)
  const pauseFiling = useAuthStore(s => s.pauseFiling)
  const escalateToCpa = useAuthStore(s => s.escalateToCpa)
  const runPrefill = useAuthStore(s => s.runPrefill)
  const runAuditRisk = useAuthStore(s => s.runAuditRisk)
  const approveFiling = useAuthStore(s => s.approveFiling)
  const rejectFiling = useAuthStore(s => s.rejectFiling)

  useEffect(() => {
    if (!id) return
    fetchFiling(id)
    fetchEntities()
    fetchDeadlines()
  }, [id, fetchFiling, fetchEntities, fetchDeadlines])

  const filingData = (id ? filingDetails[id] : undefined) as any
  const filing: any = filingData?.filing ?? filingData ?? undefined
  const intakeConversation = filing?.conversations?.find((conversation: any) => conversation.agentType === 'intake')
  const intakeMessages = intakeConversation?.messages || []
  const canChat = intakeConversation?.status === 'active'

  // Resolve entity — prefer from filing detail response, fallback to entities list
  const entity = entities.find((e: any) => e.id === filing?.entityId)
  const entityName = entity?.legalName

  // Status-based visibility flags
  const status = filing?.status as string | undefined
  const isTerminal = status === 'submitted' || status === 'archived'
  const isArchived = status === 'archived'
  const isSubmitted = status === 'submitted'

  // Agent action visibility per status
  const canStartIntake = status === 'intake' && !intakeConversation
  const canRunPrefill = status === 'intake' || status === 'ai_prep'
  const canRunAuditRisk = status === 'ai_prep' || status === 'cpa_review'
  const canPause = !isTerminal
  const canEscalate = status === 'intake' || status === 'ai_prep' || status === 'cpa_review'
  const canArchive = status === 'submitted'

  // Status transition actions (only for active workflow stages)
  const statusActions: Record<string, { label: string; nextStatus: string } | undefined> = {
    intake: { label: 'Move to AI Prep', nextStatus: 'ai_prep' },
    ai_prep: { label: 'Send to CPA Review', nextStatus: 'cpa_review' },
    cpa_review: { label: 'Send to Founder Approval', nextStatus: 'founder_approval' },
  }
  const statusAction = filing ? statusActions[filing.status] : undefined

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const handleSend = async () => {
    if (!chatInput.trim() || isStreaming || !id) return
    const userMsg = chatInput.trim()
    setChatInput('')
    setChatMessages((prev) => [
      ...prev,
      { role: 'user', content: userMsg, timestamp: new Date().toLocaleTimeString() },
    ])
    setIsStreaming(true)

    try {
      let fullResponse = ''
      await api.streamIntakeMessage(id, userMsg, (chunk: string) => {
        fullResponse += chunk
        setChatMessages((prev) => {
          const updated = [...prev]
          const lastIdx = updated.length - 1
          if (updated[lastIdx]?.role === 'assistant') {
            updated[lastIdx] = { ...updated[lastIdx], content: fullResponse }
          } else {
            updated.push({
              role: 'assistant',
              content: fullResponse,
              timestamp: new Date().toLocaleTimeString(),
            })
          }
          return updated
        })
      })
    } catch {
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date().toLocaleTimeString(),
        },
      ])
    } finally {
      setIsStreaming(false)
      fetchFiling(id)
      fetchFilings()
      fetchApprovals()
      fetchAuditLog()
    }
  }

  const handleStartIntake = async () => {
    if (!id) return
    setStartIntakeLoading(true)
    try { await startIntake(id) } finally { setStartIntakeLoading(false) }
  }

  const handleUpdateStatus = async (nextStatus: string) => {
    if (!id) return
    setUpdateStatusLoading(true)
    try { await updateFilingStatus(id, nextStatus) } finally { setUpdateStatusLoading(false) }
  }

  const handlePause = async () => {
    if (!id) return
    setPauseLoading(true)
    try { await pauseFiling(id) } finally { setPauseLoading(false) }
  }

  const handleEscalate = async () => {
    if (!id) return
    setEscalateLoading(true)
    try { await escalateToCpa(id) } finally { setEscalateLoading(false) }
  }

  const handlePrefill = async () => {
    if (!id) return
    setPrefillLoading(true)
    try { await runPrefill(id) } finally { setPrefillLoading(false) }
  }

  const handleAuditRisk = async () => {
    if (!id) return
    setAuditRiskLoading(true)
    try { await runAuditRisk(id) } finally { setAuditRiskLoading(false) }
  }

  const handleApprove = async () => {
    if (!id) return
    setApproveLoading(true)
    try { await approveFiling(id) } finally { setApproveLoading(false) }
  }

  const handleReject = async (reason: string) => {
    if (!id) return
    setRejectLoading(true)
    try { await rejectFiling(id, reason) } finally { setRejectLoading(false) }
  }

  const handleArchive = async () => {
    if (!id) return
    setArchiveLoading(true)
    try { await updateFilingStatus(id, 'archived') } finally { setArchiveLoading(false) }
  }

  // Stage progress
  const stages = ['Intake', 'AI Prep', 'CPA Review', 'Approval', 'Submitted']
  const statusToStage: Record<string, number> = {
    intake: 0,
    ai_prep: 1,
    cpa_review: 2,
    founder_approval: 3,
    submitted: 4,
    archived: 4,
  }
  const currentStage = filing ? statusToStage[filing.status] ?? 0 : 0

  if (!filing) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[#6B7280]">Loading filing...</p>
      </div>
    )
  }

  // Status-aware center content
  const centerContent = (() => {
    if (isArchived) {
      return {
        icon: <Archive size={40} className="text-[#6B7280] mb-4" />,
        title: 'Filing archived',
        description: 'This filing has been archived. No further actions are available.',
      }
    }
    if (isSubmitted) {
      return {
        icon: <ShieldCheck size={40} className="text-[#15803D] mb-4" />,
        title: 'Filing submitted',
        description: 'This filing has been approved and submitted successfully. You can archive it when ready.',
      }
    }
    if (status === 'founder_approval') {
      return {
        icon: <AlertTriangle size={40} className="text-[#F59E0B] mb-4" />,
        title: 'Awaiting founder approval',
        description: 'CPA review is complete. The founder must approve or reject this filing before it can be submitted.',
      }
    }
    return {
      icon: <Hourglass size={40} className="text-[#6C5CE7] mb-4" />,
      title: 'Filing in progress',
      description: 'Our team is processing your filing. You\'ll be notified once it\'s completed. Feel free to reach out with any questions.',
    }
  })()

  return (
    <div className="flex h-[calc(100vh-56px)] -m-8">
      {/* Left panel */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 px-8 pt-6 pb-3 text-[13px]">
          <Link to="/filings" className="text-[#6B7280] hover:text-[#374151]">
            Filings
          </Link>
          <ChevronRight size={12} className="text-[#9CA3AF]" />
          <span className="text-[#111827]">
            {filing.formType} ({filing.formName})
          </span>
        </div>

        {/* Filing header */}
        <div className="flex items-center justify-between px-8 pb-4">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-[#111827]">
              {filing.formType} ({filing.formName})
            </h1>
            <span className="text-lg">🇺🇸</span>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={filing.status} />
            {!isTerminal && (
              <button className="p-1.5 text-[#EF4444] hover:bg-[#FEE2E2] rounded transition-colors">
                <Circle size={8} fill="#EF4444" />
              </button>
            )}
            <button className="p-1.5 text-[#9CA3AF] hover:bg-[#F3F4F6] rounded transition-colors">
              <FolderOpen size={16} />
            </button>
            <button className="p-1.5 text-[#9CA3AF] hover:bg-[#F3F4F6] rounded transition-colors">
              <MoreHorizontal size={16} />
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 bg-white mx-8 mb-8 rounded-xl border border-[#E5E7EB] flex flex-col items-center justify-center p-8">
          {/* Stage progress */}
          <div className="flex items-center gap-0 mb-10 w-full max-w-md">
            {stages.map((stage, i) => (
              <div key={stage} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      i <= currentStage
                        ? 'bg-[#6C5CE7] text-white'
                        : 'bg-[#F3F4F6] text-[#9CA3AF]'
                    }`}
                  >
                    {i < currentStage ? (
                      <CheckCircle2 size={18} />
                    ) : (
                      <FileText size={18} />
                    )}
                  </div>
                  <span className="text-[10px] text-[#6B7280] mt-1.5 text-center">{stage}</span>
                </div>
                {i < stages.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 mx-1 ${
                      i < currentStage ? 'bg-[#6C5CE7]' : 'bg-[#E5E7EB]'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Center content — adapts to status */}
          {centerContent.icon}
          <h2 className="text-lg font-semibold text-[#111827] mb-2">{centerContent.title}</h2>
          <p className="text-sm text-[#6B7280] text-center max-w-md mb-6">
            {centerContent.description}
          </p>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-x-12 gap-y-3 text-[13px] mb-8">
            <span className="text-[#6B7280]">Agent:</span>
            <span className="text-[#111827]">
              {filing.cpaAssignedId
                ? `CPA (${filing.cpaAssignedId.slice(0, 8)}...)`
                : '—'}
            </span>
            <span className="text-[#6B7280]">Preparer:</span>
            <span className="text-[#111827]">
              {filing.aiConfidenceScore != null
                ? `AI (${Math.round(filing.aiConfidenceScore * 100)}% confidence)`
                : filing.cpaAssignedId
                  ? 'CPA assigned'
                  : '—'}
            </span>
            <span className="text-[#6B7280]">Approx. time of delivery:</span>
            <span className="text-[#111827]">
              {filing.submittedAt
                ? formatDate(filing.submittedAt)
                : (() => {
                    const deadline = deadlines.find((d: any) => d.id === filing.deadlineId)
                    return deadline?.dueDate ? formatDate(deadline.dueDate) : '—'
                  })()}
            </span>
            <span className="text-[#6B7280]">Deadline:</span>
            <span className="text-[#111827] flex items-center gap-1">
              <Calendar size={13} className="text-[#9CA3AF]" />
              {(() => {
                const deadline = deadlines.find((d: any) => d.id === filing.deadlineId)
                return deadline?.dueDate ? formatDate(deadline.dueDate) : formatDate(filing.createdAt)
              })()}
            </span>
            <span className="text-[#6B7280]">Entity:</span>
            <span className="text-[#111827]">
              {entityName ? (
                <Link to={`/entities/${filing.entityId}`} className="text-[#6C5CE7] hover:underline">
                  {entityName}
                </Link>
              ) : (
                '—'
              )}
            </span>
            <span className="text-[#6B7280]">Tax Year:</span>
            <span className="text-[#111827]">{filing.taxYear || '—'}</span>
            <span className="text-[#6B7280]">Founder Approved:</span>
            <span className="text-[#111827]">
              {filing.founderApprovedAt ? formatDate(filing.founderApprovedAt) : '—'}
            </span>
            <span className="text-[#6B7280]">Last Updated:</span>
            <span className="text-[#111827]">
              {filing.updatedAt ? formatDate(filing.updatedAt) : '—'}
            </span>
          </div>

          {/* Action buttons — only shown when filing is not in a terminal state */}
          {!isTerminal && (
            <div className="mb-8 flex w-full max-w-4xl flex-wrap gap-2">
              {/* Intake agent — only at intake stage when no conversation exists */}
              {canStartIntake && (
                <button
                  onClick={handleStartIntake}
                  disabled={startIntakeLoading}
                  className="h-10 rounded-lg bg-[#6C5CE7] px-4 text-sm font-medium text-white hover:bg-[#5B4BD5] disabled:opacity-50"
                >
                  {startIntakeLoading ? 'Starting Intake...' : 'Start Intake Agent'}
                </button>
              )}

              {/* Prefill agent — only at intake or ai_prep */}
              {canRunPrefill && (
                <button
                  onClick={handlePrefill}
                  disabled={prefillLoading}
                  className="h-10 rounded-lg border border-[#D8D3FF] px-4 text-sm font-medium text-[#6C5CE7] hover:bg-[#F3F0FF] disabled:opacity-50"
                >
                  {prefillLoading ? 'Running Prefill...' : 'Run Prefill Agent'}
                </button>
              )}

              {/* Audit risk — only at ai_prep or cpa_review */}
              {canRunAuditRisk && (
                <button
                  onClick={handleAuditRisk}
                  disabled={auditRiskLoading}
                  className="h-10 rounded-lg border border-[#E5E7EB] px-4 text-sm font-medium text-[#374151] hover:bg-[#F9FAFB] disabled:opacity-50"
                >
                  {auditRiskLoading ? 'Scoring Risk...' : 'Run Audit Risk'}
                </button>
              )}

              {/* Status transition — advance to next stage */}
              {statusAction && (
                <button
                  onClick={() => handleUpdateStatus(statusAction.nextStatus)}
                  disabled={updateStatusLoading}
                  className="h-10 rounded-lg border border-[#E5E7EB] px-4 text-sm font-medium text-[#374151] hover:bg-[#F9FAFB] disabled:opacity-50"
                >
                  {updateStatusLoading ? 'Updating...' : statusAction.label}
                </button>
              )}

              {/* Pause — available during active workflow */}
              {canPause && (
                <button
                  onClick={handlePause}
                  disabled={pauseLoading}
                  className="h-10 rounded-lg border border-[#E5E7EB] px-4 text-sm font-medium text-[#374151] hover:bg-[#F9FAFB] disabled:opacity-50"
                >
                  {pauseLoading ? 'Pausing...' : 'Pause Workflow'}
                </button>
              )}

              {/* Escalate — only during intake/ai_prep/cpa_review */}
              {canEscalate && (
                <button
                  onClick={handleEscalate}
                  disabled={escalateLoading}
                  className="h-10 rounded-lg border border-[#E5E7EB] px-4 text-sm font-medium text-[#374151] hover:bg-[#F9FAFB] disabled:opacity-50"
                >
                  {escalateLoading ? 'Escalating...' : 'Escalate to CPA'}
                </button>
              )}

              {/* Founder approval actions — only at founder_approval stage */}
              {status === 'founder_approval' && (
                <>
                  <button
                    onClick={handleApprove}
                    disabled={approveLoading}
                    className="h-10 rounded-lg bg-[#15803D] px-4 text-sm font-medium text-white hover:bg-[#166534] disabled:opacity-50"
                  >
                    {approveLoading ? 'Submitting...' : 'Approve & Submit'}
                  </button>
                  <button
                    onClick={() => {
                      const reason = window.prompt('Rejection reason:')
                      if (reason) handleReject(reason)
                    }}
                    disabled={rejectLoading}
                    className="h-10 rounded-lg border border-red-200 px-4 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    Reject Filing
                  </button>
                </>
              )}
            </div>
          )}

          {/* Archive button — only when filing is submitted */}
          {canArchive && (
            <div className="mb-8 flex w-full max-w-4xl flex-wrap gap-2">
              <button
                onClick={handleArchive}
                disabled={archiveLoading}
                className="h-10 rounded-lg border border-[#E5E7EB] px-4 text-sm font-medium text-[#374151] hover:bg-[#F9FAFB] disabled:opacity-50 flex items-center gap-2"
              >
                <Archive size={16} />
                {archiveLoading ? 'Archiving...' : 'Archive Filing'}
              </button>
            </div>
          )}

          {/* Intake conversation — only show when not terminal */}
          {!isTerminal && (
            <div className="mb-8 w-full max-w-4xl rounded-xl border border-[#E5E7EB] bg-[#FCFCFD] p-4 text-left">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-[#111827]">Intake Conversation</h3>
                  <p className="mt-1 text-xs text-[#6B7280]">
                    {intakeConversation
                      ? `Status: ${intakeConversation.status}`
                      : 'Start the intake agent to collect filing details conversationally.'}
                  </p>
                </div>
              </div>

              <div className="max-h-72 space-y-3 overflow-y-auto rounded-lg bg-white p-3">
                {intakeMessages.length === 0 && chatMessages.length === 0 ? (
                  <p className="text-sm text-[#6B7280]">No intake messages yet.</p>
                ) : (
                  [...intakeMessages, ...chatMessages].map((message: any, index: number) => (
                    <div
                      key={`${message.timestamp || 'msg'}-${index}`}
                      className={`rounded-lg px-3 py-2 text-sm ${message.role === 'assistant' ? 'bg-[#F3F0FF] text-[#211B4E]' : 'ml-10 bg-[#F3F4F6] text-[#111827]'}`}
                    >
                      <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-[#6B7280]">
                        {message.role === 'assistant' ? 'TaxOS AI' : 'You'}
                      </p>
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  disabled={!canChat || isStreaming}
                  placeholder={canChat ? 'Continue the intake conversation...' : 'Start intake to chat with the filing agent'}
                  className="h-10 flex-1 rounded-lg border border-[#E5E7EB] px-3 text-sm text-[#111827] outline-none focus:border-[#6C5CE7]"
                />
                <button
                  onClick={handleSend}
                  disabled={!canChat || isStreaming || !chatInput.trim()}
                  className="h-10 rounded-lg bg-[#6C5CE7] px-4 text-sm font-medium text-white hover:bg-[#5B4BD5] disabled:opacity-50"
                >
                  {isStreaming ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>
          )}

          {/* Intake conversation read-only view for terminal states */}
          {isTerminal && intakeMessages.length > 0 && (
            <div className="mb-8 w-full max-w-4xl rounded-xl border border-[#E5E7EB] bg-[#FCFCFD] p-4 text-left">
              <h3 className="text-sm font-semibold text-[#111827] mb-3">Intake Conversation (read-only)</h3>
              <div className="max-h-72 space-y-3 overflow-y-auto rounded-lg bg-white p-3">
                {intakeMessages.map((message: any, index: number) => (
                  <div
                    key={`${message.timestamp || 'msg'}-${index}`}
                    className={`rounded-lg px-3 py-2 text-sm ${message.role === 'assistant' ? 'bg-[#F3F0FF] text-[#211B4E]' : 'ml-10 bg-[#F3F4F6] text-[#111827]'}`}
                  >
                    <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-[#6B7280]">
                      {message.role === 'assistant' ? 'TaxOS AI' : 'You'}
                    </p>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => setShowPreview(true)}
            className="w-full max-w-sm h-10 border border-[#6C5CE7] text-[#6C5CE7] rounded-lg text-sm font-medium hover:bg-[#EDE9FD] transition-colors flex items-center justify-center gap-2"
          >
            <Eye size={16} />
            Preview form
          </button>
        </div>
      </div>

      {/* Preview form modal */}
      {showPreview && (
        <FormPreviewModal
          filing={filing}
          entityName={entityName}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  )
}

/* ─── Form Preview Modal ─── */
// Used in: FilingDetailPage — opened by "Preview form" button
function FormPreviewModal({
  filing,
  entityName,
  onClose,
}: {
  filing: any
  entityName?: string
  onClose: () => void
}) {
  const filingData = filing.filingData || {}
  const dataEntries = Object.entries(filingData)
  const documents = filing.documents || []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
          <div>
            <h2 className="text-lg font-semibold text-[#111827]">
              {filing.formType} — {filing.formName}
            </h2>
            <p className="text-xs text-[#6B7280] mt-0.5">
              {entityName || 'Unknown entity'} &middot; Tax year {filing.taxYear || '—'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#9CA3AF] hover:bg-[#F3F4F6] hover:text-[#374151]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Status summary */}
          <div className="flex items-center gap-3">
            <StatusBadge status={filing.status} />
            {filing.aiConfidenceScore != null && (
              <span className="text-xs text-[#6B7280]">
                AI confidence: {Math.round(filing.aiConfidenceScore * 100)}%
              </span>
            )}
          </div>

          {/* AI Summary */}
          {filing.aiSummary && (
            <div>
              <h3 className="text-sm font-semibold text-[#111827] mb-2">AI Summary</h3>
              <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg p-4 text-sm text-[#374151] whitespace-pre-wrap">
                {filing.aiSummary}
              </div>
            </div>
          )}

          {/* AI Reasoning */}
          {filing.aiReasoning && (
            <div>
              <h3 className="text-sm font-semibold text-[#111827] mb-2">AI Reasoning</h3>
              <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg p-4 text-sm text-[#374151] whitespace-pre-wrap">
                {filing.aiReasoning}
              </div>
            </div>
          )}

          {/* Filing Data fields */}
          <div>
            <h3 className="text-sm font-semibold text-[#111827] mb-2">
              Form Data {dataEntries.length > 0 && `(${dataEntries.length} fields)`}
            </h3>
            {dataEntries.length === 0 ? (
              <p className="text-sm text-[#6B7280] italic">No form data collected yet.</p>
            ) : (
              <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#F9FAFB]">
                      <th className="text-left text-xs font-medium text-[#6B7280] uppercase px-4 py-2 w-1/3">
                        Field
                      </th>
                      <th className="text-left text-xs font-medium text-[#6B7280] uppercase px-4 py-2">
                        Value
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {dataEntries.map(([key, value]) => (
                      <tr key={key} className="border-t border-[#F3F4F6]">
                        <td className="px-4 py-2 text-sm text-[#6B7280] font-medium">
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                        </td>
                        <td className="px-4 py-2 text-sm text-[#111827]">
                          {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value ?? '—')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Attached Documents */}
          <div>
            <h3 className="text-sm font-semibold text-[#111827] mb-2">
              Documents {documents.length > 0 && `(${documents.length})`}
            </h3>
            {documents.length === 0 ? (
              <p className="text-sm text-[#6B7280] italic">No documents attached.</p>
            ) : (
              <div className="space-y-2">
                {documents.map((doc: any) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 p-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg"
                  >
                    <FileText size={16} className="text-[#6C5CE7] flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#111827] truncate">{doc.fileName}</p>
                      <p className="text-xs text-[#6B7280]">{doc.mimeType}</p>
                    </div>
                    {doc.confidenceScore != null && (
                      <span className="text-xs text-[#6B7280]">
                        {Math.round(doc.confidenceScore * 100)}%
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Key Dates */}
          <div>
            <h3 className="text-sm font-semibold text-[#111827] mb-2">Key Dates</h3>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <span className="text-[#6B7280]">Created:</span>
              <span className="text-[#111827]">{formatDate(filing.createdAt)}</span>
              <span className="text-[#6B7280]">Last Updated:</span>
              <span className="text-[#111827]">{filing.updatedAt ? formatDate(filing.updatedAt) : '—'}</span>
              {filing.founderApprovedAt && (
                <>
                  <span className="text-[#6B7280]">Founder Approved:</span>
                  <span className="text-[#111827]">{formatDate(filing.founderApprovedAt)}</span>
                </>
              )}
              {filing.submittedAt && (
                <>
                  <span className="text-[#6B7280]">Submitted:</span>
                  <span className="text-[#111827]">{formatDate(filing.submittedAt)}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#E5E7EB] flex justify-end">
          <button
            onClick={onClose}
            className="h-9 px-4 bg-[#6C5CE7] text-white rounded-lg text-sm font-medium hover:bg-[#5B4BD5] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
