// Used in: App.tsx — route /filings/:id (single filing detail page)
import { useState, useRef, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { promptDialog } from '@/stores/dialogs'
import { MessageContent } from '@/components/MessageContent'

// Strip [COLLECTED: key=value] markers from displayed message text
function cleanMessageContent(content: string): string {
  return content.replace(/\[COLLECTED:\s*\w+\s*=\s*.+?\s*\]/g, '').trim()
}

// Format camelCase keys to readable labels
function formatKey(key: string): string {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())
}
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
  Download,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'

export function FilingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [filingNotFound, setFilingNotFound] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState<
    { role: 'user' | 'assistant'; content: string; timestamp: string }[]
  >([])
  const [isStreaming, setIsStreaming] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const [showEditData, setShowEditData] = useState(false)
  const [startIntakeLoading, setStartIntakeLoading] = useState(false)
  const [updateStatusLoading, setUpdateStatusLoading] = useState(false)
  const [pauseLoading, setPauseLoading] = useState(false)
  const [resumeLoading, setResumeLoading] = useState(false)
  const [escalateLoading, setEscalateLoading] = useState(false)
  const [prefillLoading, setPrefillLoading] = useState(false)
  const [auditRiskLoading, setAuditRiskLoading] = useState(false)
  const [approveLoading, setApproveLoading] = useState(false)
  const [rejectLoading, setRejectLoading] = useState(false)
  const [archiveLoading, setArchiveLoading] = useState(false)
  const [cpaApproveLoading, setCpaApproveLoading] = useState(false)
  const [cpaRejectLoading, setCpaRejectLoading] = useState(false)
  const [escalateFounderLoading, setEscalateFounderLoading] = useState(false)
  const [stopWorkflowLoading, setStopWorkflowLoading] = useState(false)
  const [auditRiskResult, setAuditRiskResult] = useState<any>(null)

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
  const resumeFiling = useAuthStore(s => s.resumeFiling)
  const escalateToCpa = useAuthStore(s => s.escalateToCpa)
  const runPrefill = useAuthStore(s => s.runPrefill)
  const runAuditRisk = useAuthStore(s => s.runAuditRisk)
  const approveFiling = useAuthStore(s => s.approveFiling)
  const rejectFiling = useAuthStore(s => s.rejectFiling)
  const cpaApproveFiling = useAuthStore(s => s.cpaApproveFiling)
  const cpaRejectFiling = useAuthStore(s => s.cpaRejectFiling)
  const claimFilingReview = useAuthStore(s => s.claimFilingReview)

  // Current user role (declared early for redirect logic)
  const user = useAuthStore(s => s.user)
  const userRole = user?.role
  const isFounder = userRole === 'founder'
  const isCpa = userRole === 'cpa'
  const isTeamMember = userRole === 'team_member'

  useEffect(() => {
    if (!id) return
    fetchFiling(id).catch(() => {
      setFilingNotFound(true)
    })
    fetchEntities()
    fetchDeadlines()
  }, [id, fetchFiling, fetchEntities, fetchDeadlines])

  // Redirect if filing not found or not accessible
  useEffect(() => {
    if (filingNotFound) {
      navigate(user?.role === 'founder' ? '/home' : '/dashboard', { replace: true })
    }
  }, [filingNotFound, navigate, user?.role])

  const filingData = (id ? filingDetails[id] : undefined) as any
  const filing: any = filingData?.filing ?? filingData ?? undefined
  const intakeConversation = filing?.conversations?.find((conversation: any) => conversation.agentType === 'intake')
  const intakeMessages = intakeConversation?.messages || []
  const canChat = intakeConversation?.status === 'active'

  // Extract collected data from [COLLECTED: key=value] markers in assistant messages
  const collectedData: Record<string, string> = {}
  const allMessages = [...intakeMessages, ...chatMessages]
  for (const msg of allMessages) {
    if (msg.role === 'assistant') {
      const matches = (msg.content || '').matchAll(/\[COLLECTED:\s*(\w+)\s*=\s*(.+?)\s*\]/g)
      for (const match of matches) {
        collectedData[match[1]] = match[2]
      }
    }
  }

  // Resolve entity — prefer from filing detail response, fallback to entities list
  const entity = entities.find((e: any) => e.id === filing?.entityId)
  const entityName = entity?.legalName

  // Status-based visibility flags
  const status = filing?.status as string | undefined
  const isTerminal = status === 'submitted' || status === 'archived'
  const isArchived = status === 'archived'
  const isSubmitted = status === 'submitted'
  const isPaused = filing?.paused === true || filing?.paused === 1

  // Agent action visibility — per status AND per role
  // Intake: all agent actions available
  const canStartIntake = !isPaused && (status === 'intake' || status === 'ai_prep') && !intakeConversation && (isFounder || isCpa)
  const canRunPrefill = !isPaused && status === 'ai_prep' && (isFounder || isCpa)
  // Founder sees audit risk in ai_prep / founder_approval; CPA only in cpa_review
  const canRunAuditRisk = !isPaused && (
    (isFounder && (status === 'ai_prep' || status === 'founder_approval'))
    || (isCpa && status === 'cpa_review')
  )
  // Pause: only visible during cpa_review or founder_approval, for founder + team_member, and only when not already paused
  const canPause = !isPaused && (status === 'cpa_review' || status === 'founder_approval') && (isFounder || isTeamMember)
  const canResume = isPaused && (status === 'cpa_review' || status === 'founder_approval') && (isFounder || isTeamMember)
  const canStopWorkflow = !isPaused && (status === 'ai_prep' || status === 'cpa_review') && isFounder
  const canEscalate = !isPaused && (status === 'intake' || status === 'ai_prep') && isFounder
  // Post-prefill high-confidence shortcut: team_member/founder can skip CPA review and push filing to founder approval.
  const aiConfidenceScore = (filing?.aiConfidenceScore as number | null | undefined) ?? null
  const cpaReviewSkipped = filing?.cpaReviewSkipped === true || filing?.cpaReviewSkipped === 1
  const canEscalateToFounder = !isPaused
    && status === 'cpa_review'
    && cpaReviewSkipped
    && typeof aiConfidenceScore === 'number' && aiConfidenceScore >= 0.8
    && (isFounder || isTeamMember)
  // Archive: founder can archive submitted filings
  const canArchive = !isPaused && status === 'submitted' && isFounder
  // Advance: only intake → ai_prep (founder/CPA)
  const canAdvanceStatus = (s: string | undefined) => {
    if (isPaused) return false
    if (s === 'intake') return isFounder || isCpa
    return false
  }

  // Status transition actions
  const statusActions: Record<string, { label: string; nextStatus: string } | undefined> = {
    intake: { label: 'Move to AI Prep', nextStatus: 'ai_prep' },
  }
  const statusAction = filing && canAdvanceStatus(filing.status) ? statusActions[filing.status] : undefined

  // Review lock info
  const reviewLock = filing?.reviewLock as { cpaUserId: string; cpaName: string; cpaEmail: string; status: string } | null
  // CPA approve only if CPA has claimed this filing
  const canCpaApprove = !isPaused && status === 'cpa_review' && isCpa && reviewLock?.cpaUserId === user?.id
  // CPA can claim if cpa_review and not yet claimed
  const canCpaClaim = !isPaused && status === 'cpa_review' && isCpa && !reviewLock
  // Rejection remarks
  const rejectionRemarks = (filing?.rejectionRemarks || []) as { source: string; reason: string; date: string }[]
  // CPAs notified for claim
  const notifiedCpas = (filing?.notifiedCpas || []) as { cpaUserId: string; cpaName: string; cpaEmail: string; status: string; notifiedAt: string }[]

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
    try {
      const result = await runAuditRisk(id)
      setAuditRiskResult(result)
    } finally { setAuditRiskLoading(false) }
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

  const handleCpaApprove = async () => {
    if (!id) return
    setCpaApproveLoading(true)
    try { await cpaApproveFiling(id) } finally { setCpaApproveLoading(false) }
  }

  const handleCpaReject = async (reason: string) => {
    if (!id) return
    setCpaRejectLoading(true)
    try { await cpaRejectFiling(id, reason) } finally { setCpaRejectLoading(false) }
  }

  const handleEscalateToFounder = async (reason: string) => {
    if (!id) return
    setEscalateFounderLoading(true)
    try {
      await api.filings.escalateToFounder(id, reason)
      await fetchFiling(id)
    } finally { setEscalateFounderLoading(false) }
  }

  const handleStopWorkflow = async () => {
    if (!id) return
    setStopWorkflowLoading(true)
    try { await pauseFiling(id) } finally { setStopWorkflowLoading(false) }
  }

  const handleArchive = async () => {
    if (!id) return
    setArchiveLoading(true)
    try { await updateFilingStatus(id, 'archived') } finally { setArchiveLoading(false) }
  }

  const handleExport = () => {
    if (!filing) return
    const payload = {
      id: filing.id,
      formType: filing.formType,
      formName: filing.formName,
      taxYear: filing.taxYear,
      status: filing.status,
      filingData: filing.filingData ?? {},
      aiSummary: filing.aiSummary,
      documents: (filing.documents ?? []).map((d: any) => ({
        fileName: d.fileName,
        mimeType: d.mimeType,
      })),
      exportedAt: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `filing-${filing.formType}-${filing.id.slice(0, 8)}.json`
    a.click()
    URL.revokeObjectURL(url)
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
        <p className="text-[#64748d]">Loading filing...</p>
      </div>
    )
  }
const renderValue = (value: any): React.ReactNode => {
  if (value === null || value === undefined) return '—';

  // Arrays → comma-separated
  if (Array.isArray(value)) {
    return value.map(v => String(v)).join(', ') || '—';
  }

  // Prefill agent objects: { value, confidence, source, needsCpaReview }
  if (typeof value === 'object' && 'value' in value) {
    const conf = value.confidence != null ? Math.round(value.confidence * 100) : null;
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[#061b31]">{String(value.value ?? '—')}</span>
        {conf != null && (
          <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium font-tnum ${
            conf >= 90 ? 'bg-[rgba(21,190,83,0.12)] text-[#108c3d]' :
            conf >= 75 ? 'bg-[rgba(155,104,41,0.12)] text-[#9b6829]' : 'bg-[rgba(234,34,97,0.08)] text-[#ea2261]'
          }`}>
            {conf}%
          </span>
        )}
        {value.source && (
          <span className="text-[10px] text-[#64748d]">via {value.source}</span>
        )}
        {value.needsCpaReview && (
          <span className="inline-flex items-center rounded-md bg-[rgba(155,104,41,0.12)] px-1.5 py-0.5 text-[10px] font-medium text-[#9b6829]">Review</span>
        )}
      </div>
    );
  }

  // Generic objects → key-value pairs
  if (typeof value === 'object') {
    return (
      <div className="rounded-lg bg-[#f6f9fc] border border-[#f6f9fc] px-3 py-2 space-y-1.5">
        {Object.entries(value).map(([k, v]) => (
          <div key={k} className="flex items-start gap-2 text-sm">
            <span className="font-medium text-[#64748d] min-w-[100px] shrink-0">{formatKey(k)}</span>
            <span className="text-[#061b31]">{renderValue(v)}</span>
          </div>
        ))}
      </div>
    );
  }

  return String(value);
};
  // Status-aware center content
  const centerContent = (() => {
    if (isArchived) {
      return {
        icon: <Archive size={40} className="text-[#64748d] mb-4" />,
        title: 'Filing archived',
        description: 'This filing has been archived. No further actions are available.',
      }
    }
    if (isSubmitted) {
      return {
        icon: <ShieldCheck size={40} className="text-[#108c3d] mb-4" />,
        title: 'Filing submitted',
        description: 'This filing has been approved and submitted successfully. You can archive it when ready.',
      }
    }
    if (status === 'founder_approval') {
      return {
        icon: <AlertTriangle size={40} className="text-[#9b6829] mb-4" />,
        title: 'Awaiting founder approval',
        description: 'CPA review is complete. The founder must approve or reject this filing before it can be submitted.',
      }
    }
    return {
      icon: <Hourglass size={40} className="text-[#533afd] mb-4" />,
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
          <Link to="/filings" className="text-[#64748d] hover:text-[#273951]">
            Filings
          </Link>
          <ChevronRight size={12} className="text-[#64748d]" />
          <span className="text-[#061b31]">
            {filing.formType} ({filing.formName})
          </span>
        </div>

        {/* Filing header */}
        <div className="flex items-center justify-between px-8 pb-4">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-normal text-[#061b31]" style={{ fontWeight: 400 }}>
                {filing.formType} ({filing.formName})
              </h1>
              <span className="text-lg">🇺🇸</span>
            </div>
            <div className="text-xs text-[#64748d]">
              Entity:{' '}
              {entityName ? (
                <Link to={`/entities/${filing.entityId}`} className="text-[#533afd] hover:underline">
                  {entityName}
                </Link>
              ) : (
                <span className="text-[#061b31]">—</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={filing.status} />
            {canPause && (
              <button
                type="button"
                onClick={() => { if (id) { setPauseLoading(true); pauseFiling(id).finally(() => setPauseLoading(false)) } }}
                disabled={pauseLoading}
                className="p-1.5 text-[#ea2261] hover:bg-[rgba(234,34,97,0.08)] rounded transition-colors disabled:opacity-50"
                aria-label="Pause AI workflow"
                title="Pause AI workflow"
              >
                <Circle size={8} fill="#ea2261" />
              </button>
            )}
            <Link
              to="/documents"
              className="p-1.5 text-[#64748d] hover:bg-[#f6f9fc] rounded transition-colors"
              aria-label="Open documents vault"
              title="Open documents"
            >
              <FolderOpen size={16} />
            </Link>
            <button
              type="button"
              onClick={() => setShowEditData(v => !v)}
              disabled={isPaused}
              className="p-1.5 text-[#64748d] hover:bg-[#f6f9fc] rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Edit filing data"
              title={isPaused ? 'Paused' : 'Edit filing data'}
            >
              <MoreHorizontal size={16} />
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 bg-white mx-8 mb-8 rounded-md border border-[#e5edf5] flex flex-col items-center justify-center p-8">
          {/* Stage progress */}
          <div className="flex items-center gap-0 mb-10 w-full max-w-md">
            {stages.map((stage, i) => (
              <div key={stage} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      i <= currentStage
                        ? 'bg-[#533afd] text-white'
                        : 'bg-[#f6f9fc] text-[#64748d]'
                    }`}
                  >
                    {i < currentStage ? (
                      <CheckCircle2 size={18} />
                    ) : (
                      <FileText size={18} />
                    )}
                  </div>
                  <span className="text-[10px] text-[#64748d] mt-1.5 text-center">{stage}</span>
                </div>
                {i < stages.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 mx-1 ${
                      i < currentStage ? 'bg-[#533afd]' : 'bg-[#e5edf5]'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Center content — adapts to status */}
          {centerContent.icon}
          <h2 className="text-lg font-normal text-[#061b31] mb-2" style={{ fontWeight: 400 }}>{centerContent.title}</h2>
          <p className="text-sm text-[#64748d] text-center max-w-md mb-6">
            {centerContent.description}
          </p>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-x-12 gap-y-3 text-[13px] mb-8">
            <span className="text-[#64748d]">Reviewing by:</span>
            <span className="text-[#061b31]">
              {reviewLock
                ? <span className="inline-flex items-center gap-1 text-[#108c3d]"><ShieldCheck size={13} />{reviewLock.cpaEmail || reviewLock.cpaName}</span>
                : <span className="text-[#64748d]">CPA not assigned yet</span>}
            </span>
            <span className="text-[#64748d]">Preparer:</span>
            <span className="text-[#061b31]">
              {filing.aiConfidenceScore != null
                ? `AI (${Math.round(filing.aiConfidenceScore * 100)}% confidence)`
                : filing.cpaAssignedId
                  ? 'CPA assigned'
                  : '—'}
            </span>
            <span className="text-[#64748d]">Approx. time of delivery:</span>
            <span className="text-[#061b31]">
              {filing.submittedAt
                ? formatDate(filing.submittedAt)
                : (() => {
                    const deadline = deadlines.find((d: any) => d.id === filing.deadlineId)
                    return deadline?.dueDate ? formatDate(deadline.dueDate) : '—'
                  })()}
            </span>
            <span className="text-[#64748d]">Deadline:</span>
            <span className="text-[#061b31] flex items-center gap-1">
              <Calendar size={13} className="text-[#64748d]" />
              {(() => {
                const deadline = deadlines.find((d: any) => d.id === filing.deadlineId)
                return deadline?.dueDate ? formatDate(deadline.dueDate) : formatDate(filing.createdAt)
              })()}
            </span>
            <span className="text-[#64748d]">Entity:</span>
            <span className="text-[#061b31]">
              {entityName ? (
                <Link to={`/entities/${filing.entityId}`} className="text-[#533afd] hover:underline">
                  {entityName}
                </Link>
              ) : (
                '—'
              )}
            </span>
            <span className="text-[#64748d]">Tax Year:</span>
            <span className="text-[#061b31]">{filing.taxYear || '—'}</span>
            <span className="text-[#64748d]">Approved By:</span>
            <span className="text-[#061b31]">
              {filing.founderApprovedAt
                ? <>
                    {(filing as any).approvedBy
                      ? <>{(filing as any).approvedBy.name} ({(filing as any).approvedBy.email}) — {formatDate(filing.founderApprovedAt)}</>
                      : formatDate(filing.founderApprovedAt)
                    }
                  </>
                : <span className="text-[#64748d]">To be approved</span>
              }
            </span>
            <span className="text-[#64748d]">Last Updated:</span>
            <span className="text-[#061b31]">
              {filing.updatedAt ? formatDate(filing.updatedAt) : '—'}
            </span>
          </div>

          {/* Rejection remarks */}
          {rejectionRemarks.length > 0 && (
            <div className="mb-8 w-full max-w-4xl rounded-md border border-[rgba(155,104,41,0.3)] bg-[rgba(155,104,41,0.08)] p-4 text-left">
              <h3 className="text-sm font-normal text-[#9b6829] mb-2 flex items-center gap-1.5" style={{ fontWeight: 400 }}>
                <AlertTriangle size={14} />
                Remarks
              </h3>
              <div className="space-y-2">
                {rejectionRemarks.map((remark, i) => (
                  <div key={i} className="rounded-lg bg-white border border-[rgba(155,104,41,0.2)] px-3 py-2 text-sm">
                    <span className="font-medium text-[#9b6829]">{remark.source}:</span>{' '}
                    <span className="text-[#273951]">{remark.reason}</span>
                    {remark.date && (
                      <span className="ml-2 text-xs text-[#64748d]">{formatDate(remark.date)}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notified CPAs — hide once claimed */}
          {notifiedCpas.length > 0 && !reviewLock && (
            <div className="mb-8 w-full max-w-4xl rounded-md border border-[#e5edf5] bg-white p-4 text-left">
              <h3 className="text-sm font-normal text-[#061b31] mb-3 flex items-center gap-1.5" style={{ fontWeight: 400 }}>
                <Eye size={14} className="text-[#533afd]" />
                Claim Sent To ({notifiedCpas.length} CPAs)
              </h3>
              <div className="space-y-2">
                {notifiedCpas.map((cpa, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-[#f6f9fc] px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#EDE9FD] text-xs font-bold text-[#533afd]">
                        {(cpa.cpaName || 'C')[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#061b31]">{cpa.cpaName}</p>
                        <p className="text-xs text-[#64748d]">{cpa.cpaEmail}</p>
                      </div>
                    </div>
                    <span className={`rounded-md px-2.5 py-0.5 text-[11px] font-medium ${
                      cpa.status === 'approved' ? 'bg-[rgba(21,190,83,0.12)] text-[#108c3d]' :
                      cpa.status === 'dismissed' ? 'bg-[#f6f9fc] text-[#64748d]' :
                      'bg-[rgba(155,104,41,0.12)] text-[#9b6829]'
                    }`}>
                      {cpa.status === 'approved' ? 'Claimed' : cpa.status === 'dismissed' ? 'Dismissed' : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Founder approval actions — approve, reject, audit risk, edit */}
          {status === 'founder_approval' && isFounder && !isPaused && (
            <div className="mb-8 flex w-full max-w-4xl flex-wrap gap-3">
              <button
                onClick={handleApprove}
                disabled={approveLoading}
                className="h-10 rounded-lg bg-[#108c3d] px-5 text-sm font-medium text-white hover:bg-[#0a6b2e] disabled:opacity-50"
              >
                {approveLoading ? 'Submitting...' : 'Approve & Submit'}
              </button>
              <button
                onClick={async () => {
                  const reason = await promptDialog({
                    title: 'Reject filing',
                    message: 'Filing will be sent back to AI Prep. Provide a reason so the team can address it.',
                    placeholder: 'Rejection reason',
                    multiline: true,
                    required: true,
                    confirmLabel: 'Reject filing',
                    tone: 'danger',
                  })
                  if (reason) handleReject(reason)
                }}
                disabled={rejectLoading}
                className="h-10 rounded-lg border border-[#ffd7ef] px-5 text-sm font-medium text-[#ea2261] hover:bg-[rgba(234,34,97,0.08)] disabled:opacity-50"
              >
                Reject Filing
              </button>
              {canRunAuditRisk && (
                <button
                  onClick={handleAuditRisk}
                  disabled={auditRiskLoading}
                  className="h-10 rounded-lg border border-[#e5edf5] px-4 text-sm font-medium text-[#273951] hover:bg-[#f6f9fc] disabled:opacity-50"
                >
                  {auditRiskLoading ? 'Scoring Risk...' : 'Run Audit Risk'}
                </button>
              )}
            </div>
          )}

          {/* Founder approval — non-founder sees wait message only */}
          {status === 'founder_approval' && !isFounder && (
            <p className="mb-8 text-sm text-[#64748d]">Waiting for founder to review and approve this filing.</p>
          )}

          {/* CPA Review — CPA claimed: approve */}
          {canCpaApprove && (
            <div className="mb-8 flex w-full max-w-4xl flex-wrap gap-3">
              <button
                onClick={handleCpaApprove}
                disabled={cpaApproveLoading}
                className="h-10 rounded-lg bg-[#108c3d] px-5 text-sm font-medium text-white hover:bg-[#0a6b2e] disabled:opacity-50"
              >
                {cpaApproveLoading ? 'Approving...' : 'Approve Filing'}
              </button>
              <button
                onClick={async () => {
                  const reason = await promptDialog({
                    title: 'Reject filing',
                    message: 'Filing will be sent back to AI Prep. Share a reason so the preparer knows what to fix.',
                    placeholder: 'Rejection reason',
                    multiline: true,
                    required: true,
                    confirmLabel: 'Reject filing',
                    tone: 'danger',
                  })
                  if (reason) handleCpaReject(reason)
                }}
                disabled={cpaRejectLoading}
                className="h-10 rounded-lg border border-[#ffd7ef] px-5 text-sm font-medium text-[#ea2261] hover:bg-[rgba(234,34,97,0.08)] disabled:opacity-50"
              >
                Reject Filing
              </button>
              {canRunAuditRisk && (
                <button
                  onClick={handleAuditRisk}
                  disabled={auditRiskLoading}
                  className="h-10 rounded-lg border border-[#e5edf5] px-4 text-sm font-medium text-[#273951] hover:bg-[#f6f9fc] disabled:opacity-50"
                >
                  {auditRiskLoading ? 'Scoring Risk...' : 'Run Audit Risk'}
                </button>
              )}
            </div>
          )}

          {/* CPA Review — CPA not claimed: claim button */}
          {canCpaClaim && (
            <div className="mb-8 flex w-full max-w-4xl flex-wrap gap-3">
              <button
                onClick={async () => {
                  if (!id) return
                  await claimFilingReview(id)
                }}
                className="h-10 rounded-lg bg-[#533afd] px-5 text-sm font-medium text-white hover:bg-[#4434d4]"
              >
                Claim Filing
              </button>
            </div>
          )}

          {/* CPA Review — high-confidence shortcut: founder/team_member can skip CPA and push to founder approval */}
          {canEscalateToFounder && (
            <div className="mb-8 w-full max-w-4xl rounded-md border border-[rgba(21,190,83,0.25)] bg-[rgba(21,190,83,0.06)] p-4">
              <div className="mb-3">
                <p className="text-sm font-medium text-[#108c3d]">AI prefill confidence is high</p>
                <p className="mt-0.5 text-xs text-[#273951]">
                  CPA review is optional ({Math.round((aiConfidenceScore ?? 0) * 100)}% confidence). You can skip CPA review and send this filing directly to founder approval.
                </p>
              </div>
              <button
                onClick={async () => {
                  const reason = await promptDialog({
                    title: 'Escalate to founder',
                    message: 'Skip CPA review and send this filing to founder approval. Reason is optional.',
                    placeholder: 'Reason (optional)',
                    multiline: true,
                    confirmLabel: 'Escalate',
                  })
                  if (reason === null) return
                  handleEscalateToFounder(reason)
                }}
                disabled={escalateFounderLoading}
                className="h-10 rounded-lg bg-[#108c3d] px-5 text-sm font-medium text-white hover:bg-[#0a6b2e] disabled:opacity-50"
              >
                {escalateFounderLoading ? 'Escalating...' : 'Escalate to Founder'}
              </button>
            </div>
          )}

          {/* CPA Review — founder: only Stop Workflow */}
          {status === 'cpa_review' && canStopWorkflow && (
            <div className="mb-8 flex w-full max-w-4xl flex-wrap gap-2">
              <button
                onClick={handleStopWorkflow}
                disabled={stopWorkflowLoading}
                className="h-10 rounded-lg border border-[#ffd7ef] px-4 text-sm font-medium text-[#ea2261] hover:bg-[rgba(234,34,97,0.08)] disabled:opacity-50"
              >
                {stopWorkflowLoading ? 'Stopping...' : 'Stop Workflow'}
              </button>
              <p className="flex items-center text-xs text-[#64748d]">Waiting for CPA to review. Stop workflow to release CPA lock.</p>
            </div>
          )}

          {/* Paused banner + Resume */}
          {isPaused && (
            <div className="mb-8 w-full max-w-4xl rounded-md border border-[#ffd7ef] bg-[rgba(234,34,97,0.06)] p-4">
              <div className="mb-3">
                <p className="text-sm font-medium text-[#ea2261]">Workflow paused</p>
                <p className="mt-0.5 text-xs text-[#273951]">
                  All actions on this filing are disabled until the workflow is resumed.
                </p>
              </div>
              {canResume && (
                <button
                  onClick={async () => {
                    if (!id) return
                    setResumeLoading(true)
                    try { await resumeFiling(id) } finally { setResumeLoading(false) }
                  }}
                  disabled={resumeLoading}
                  className="h-10 rounded-lg bg-[#533afd] px-5 text-sm font-medium text-white hover:bg-[#4434d4] disabled:opacity-50"
                >
                  {resumeLoading ? 'Resuming...' : 'Resume Workflow'}
                </button>
              )}
            </div>
          )}

          {/* Intake & AI Prep workflow buttons */}
          {!isTerminal && !isPaused && (status === 'intake' || status === 'ai_prep') && (
            <div className="mb-8 flex w-full max-w-4xl flex-wrap gap-2">
              {canStartIntake && (
                <button
                  onClick={handleStartIntake}
                  disabled={startIntakeLoading}
                  className="h-10 rounded-lg bg-[#533afd] px-4 text-sm font-medium text-white hover:bg-[#4434d4] disabled:opacity-50"
                >
                  {startIntakeLoading ? 'Starting Intake...' : 'Start Intake Agent'}
                </button>
              )}

              {canRunPrefill && (
                <button
                  onClick={handlePrefill}
                  disabled={prefillLoading}
                  className="h-10 rounded-lg border border-[#D8D3FF] px-4 text-sm font-medium text-[#533afd] hover:bg-[#f6f9fc] disabled:opacity-50"
                >
                  {prefillLoading ? 'Running Prefill...' : 'Run Prefill Agent'}
                </button>
              )}

              {canRunAuditRisk && (
                <button
                  onClick={handleAuditRisk}
                  disabled={auditRiskLoading}
                  className="h-10 rounded-lg border border-[#e5edf5] px-4 text-sm font-medium text-[#273951] hover:bg-[#f6f9fc] disabled:opacity-50"
                >
                  {auditRiskLoading ? 'Scoring Risk...' : 'Run Audit Risk'}
                </button>
              )}

              {statusAction && (
                <button
                  onClick={() => handleUpdateStatus(statusAction.nextStatus)}
                  disabled={updateStatusLoading}
                  className="h-10 rounded-lg border border-[#e5edf5] px-4 text-sm font-medium text-[#273951] hover:bg-[#f6f9fc] disabled:opacity-50"
                >
                  {updateStatusLoading ? 'Updating...' : statusAction.label}
                </button>
              )}

              {canPause && (
                <button
                  onClick={handlePause}
                  disabled={pauseLoading}
                  className="h-10 rounded-lg border border-[#e5edf5] px-4 text-sm font-medium text-[#273951] hover:bg-[#f6f9fc] disabled:opacity-50"
                >
                  {pauseLoading ? 'Pausing...' : 'Pause Workflow'}
                </button>
              )}

              {canStopWorkflow && (
                <button
                  onClick={handleStopWorkflow}
                  disabled={stopWorkflowLoading}
                  className="h-10 rounded-lg border border-[#ffd7ef] px-4 text-sm font-medium text-[#ea2261] hover:bg-[rgba(234,34,97,0.08)] disabled:opacity-50"
                >
                  {stopWorkflowLoading ? 'Stopping...' : 'Stop Workflow'}
                </button>
              )}

              {canEscalate && (
                <button
                  onClick={handleEscalate}
                  disabled={escalateLoading}
                  className="h-10 rounded-lg border border-[#e5edf5] px-4 text-sm font-medium text-[#273951] hover:bg-[#f6f9fc] disabled:opacity-50"
                >
                  {escalateLoading ? 'Escalating...' : 'Escalate to CPA'}
                </button>
              )}
            </div>
          )}

          {/* Archive button — only when filing is submitted */}
          {canArchive && (
            <div className="mb-8 flex w-full max-w-4xl flex-wrap gap-2">
              <button
                onClick={handleArchive}
                disabled={archiveLoading}
                className="h-10 rounded-lg border border-[#e5edf5] px-4 text-sm font-medium text-[#273951] hover:bg-[#f6f9fc] disabled:opacity-50 flex items-center gap-2"
              >
                <Archive size={16} />
                {archiveLoading ? 'Archiving...' : 'Archive Filing'}
              </button>
              <button
                onClick={handleExport}
                className="h-10 rounded-lg border border-[#D8D3FF] px-4 text-sm font-medium text-[#533afd] hover:bg-[#f6f9fc] flex items-center gap-2"
              >
                <Download size={16} />
                Export Filing
              </button>
            </div>
          )}

          {/* Export button for archived filings */}
          {isArchived && (
            <div className="mb-8 flex w-full max-w-4xl flex-wrap gap-2">
              <button
                onClick={handleExport}
                className="h-10 rounded-lg border border-[#D8D3FF] px-4 text-sm font-medium text-[#533afd] hover:bg-[#f6f9fc] flex items-center gap-2"
              >
                <Download size={16} />
                Export Filing
              </button>
            </div>
          )}

          {/* Audit Risk Result */}
          {auditRiskResult && (
            <div className="mb-8 w-full max-w-4xl rounded-md border border-[#e5edf5] bg-white p-4 text-left">
              <h3 className="text-sm font-normal text-[#061b31] mb-3 flex items-center gap-1.5" style={{ fontWeight: 400 }}>
                <ShieldCheck size={14} />
                Audit Risk Assessment
              </h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="rounded-lg bg-[#f6f9fc] px-3 py-2.5">
                  <span className="text-xs text-[#64748d]">Risk Score</span>
                  <p className={`text-lg font-normal font-tnum ${
                    auditRiskResult.riskScore > 60 ? 'text-[#ea2261]' :
                    auditRiskResult.riskScore > 30 ? 'text-[#9b6829]' : 'text-[#108c3d]'
                  }`} style={{ fontWeight: 400 }}>
                    {auditRiskResult.riskScore}/100
                  </p>
                </div>
                <div className="rounded-lg bg-[#f6f9fc] px-3 py-2.5">
                  <span className="text-xs text-[#64748d]">Risk Level</span>
                  <p className="text-lg font-normal text-[#061b31]" style={{ fontWeight: 400 }}>{auditRiskResult.riskLevel}</p>
                </div>
              </div>
              {auditRiskResult.summary && (
                <div className="rounded-lg bg-[#f6f9fc] border border-[#e5edf5] p-3 text-sm text-[#273951] whitespace-pre-wrap mb-3">
                  {auditRiskResult.summary}
                </div>
              )}
              {auditRiskResult.flaggedItems?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-[#64748d] uppercase">Flagged Items</h4>
                  {auditRiskResult.flaggedItems.map((item: any, i: number) => (
                    <div key={i} className="rounded-lg border border-[#e5edf5] px-3 py-2 text-sm">
                      <span className={`inline-block mr-2 px-1.5 py-0.5 rounded text-xs font-medium ${
                        item.severity === 'high' ? 'bg-[rgba(234,34,97,0.08)] text-[#ea2261]' :
                        item.severity === 'medium' ? 'bg-[rgba(155,104,41,0.12)] text-[#9b6829]' : 'bg-[rgba(21,190,83,0.12)] text-[#108c3d]'
                      }`}>{item.severity}</span>
                      <span className="text-[#273951]">{item.description || item.issue}</span>
                      {item.recommendation && (
                        <p className="mt-1 text-xs text-[#64748d]">{item.recommendation}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Intake conversation — only show when an intake conversation exists or filing is at intake/ai_prep */}
          {canChat && (
            <div className="mb-8 w-full max-w-4xl rounded-md border border-[#e5edf5] bg-[#FCFCFD] p-4 text-left">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-normal text-[#061b31]" style={{ fontWeight: 400 }}>Intake Conversation</h3>
                  <p className="mt-1 text-xs text-[#64748d]">
                    Status: {intakeConversation?.status}
                  </p>
                </div>
              </div>

              <div className="max-h-72 space-y-3 overflow-y-auto rounded-lg bg-white p-3">
                {intakeMessages.length === 0 && chatMessages.length === 0 ? (
                  <p className="text-sm text-[#64748d]">No intake messages yet.</p>
                ) : (
                  [...intakeMessages, ...chatMessages].map((message: any, index: number) => (
                    <div
                      key={`${message.timestamp || 'msg'}-${index}`}
                      className={`rounded-lg px-3 py-2 text-sm ${message.role === 'assistant' ? 'bg-[#f6f9fc] text-[#211B4E]' : 'ml-10 bg-[#f6f9fc] text-[#061b31]'}`}
                    >
                      <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-[#64748d]">
                        {message.role === 'assistant' ? 'TaxOS AI' : 'You'}
                      </p>
                      {message.role === 'assistant'
                        ? <MessageContent content={cleanMessageContent(message.content)} />
                        : <p className="whitespace-pre-wrap">{cleanMessageContent(message.content)}</p>}
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
                  disabled={isStreaming}
                  placeholder="Continue the intake conversation..."
                  className="h-10 flex-1 rounded-lg border border-[#e5edf5] px-3 text-sm text-[#061b31] outline-none focus:border-[#533afd]"
                />
                <button
                  onClick={handleSend}
                  disabled={isStreaming || !chatInput.trim()}
                  className="h-10 rounded-lg bg-[#533afd] px-4 text-sm font-medium text-white hover:bg-[#4434d4] disabled:opacity-50"
                >
                  {isStreaming ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>
          )}

          {/* Intake conversation read-only — show past messages when conversation is completed or filing moved past intake */}
          {!canChat && intakeMessages.length > 0 && (
            <div className="mb-8 w-full max-w-4xl rounded-md border border-[#e5edf5] bg-[#FCFCFD] p-4 text-left">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-normal text-[#061b31]" style={{ fontWeight: 400 }}>Intake Conversation</h3>
                  <p className="mt-1 text-xs text-[#64748d]">
                    Completed — {intakeMessages.length} messages
                  </p>
                </div>
              </div>
              <div className="max-h-72 space-y-3 overflow-y-auto rounded-lg bg-white p-3">
                {intakeMessages.map((message: any, index: number) => (
                  <div
                    key={`${message.timestamp || 'msg'}-${index}`}
                    className={`rounded-lg px-3 py-2 text-sm ${message.role === 'assistant' ? 'bg-[#f6f9fc] text-[#211B4E]' : 'ml-10 bg-[#f6f9fc] text-[#061b31]'}`}
                  >
                    <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-[#64748d]">
                      {message.role === 'assistant' ? 'TaxOS AI' : 'You'}
                    </p>
                    {message.role === 'assistant'
                      ? <MessageContent content={cleanMessageContent(message.content)} />
                      : <p className="whitespace-pre-wrap">{cleanMessageContent(message.content)}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Collected data from intake conversation */}
          {Object.keys(collectedData).length > 0 && (
            <div className="mb-8 w-full max-w-4xl rounded-md border border-[#e5edf5] bg-white p-4 text-left">
              <h3 className="text-sm font-normal text-[#061b31] mb-3" style={{ fontWeight: 400 }}>Collected Data</h3>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(collectedData).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between rounded-lg bg-[#f6f9fc] px-3 py-2.5">
                    <span className="text-xs font-medium text-[#64748d]">{formatKey(key)}</span>
                    <span className="text-sm font-medium text-[#061b31]">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filing data — editable section */}
          <div className="mb-8 w-full max-w-4xl rounded-md border border-[#e5edf5] bg-white p-4 text-left">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-normal text-[#061b31]" style={{ fontWeight: 400 }}>
                Filing Data {Object.keys(filing.filingData ?? {}).length > 0 && `(${Object.keys(filing.filingData).length} fields)`}
              </h3>
              {(status === 'intake' || status === 'ai_prep') && !isPaused && (
                <button
                  onClick={() => setShowEditData(true)}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[#e5edf5] text-xs font-medium text-[#273951] hover:bg-[#f6f9fc] transition-colors"
                >
                  <Pencil size={13} />
                  Edit / Add Fields
                </button>
              )}
            </div>
            {Object.keys(filing.filingData ?? {}).length === 0 ? (
              <p className="text-sm text-[#64748d] italic">No data fields yet. Use "Edit / Add Fields" to add them manually.</p>
            ) : (
              <div className="bg-white border border-[#e5edf5] rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#f6f9fc]">
                      <th className="text-left text-xs font-medium text-[#64748d] uppercase px-4 py-2 w-1/3">Field</th>
                      <th className="text-left text-xs font-medium text-[#64748d] uppercase px-4 py-2">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(filing.filingData ?? {}).map(([key, value]) => (
                      <tr key={key} className="border-t border-[#f6f9fc]">
                        <td className="px-4 py-2 text-sm text-[#64748d] font-medium">{formatKey(key)}</td>
                        <td className="px-4 py-2 text-sm text-[#061b31]">
                        {renderValue(value)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <button
            onClick={() => setShowPreview(true)}
            className="w-full max-w-sm h-10 border border-[#533afd] text-[#533afd] rounded-lg text-sm font-medium hover:bg-[#EDE9FD] transition-colors flex items-center justify-center gap-2"
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

      {/* Edit filing data modal */}
      {showEditData && id && (
        <FilingDataEditor
          filingId={id}
          initialData={filing.filingData ?? {}}
          onClose={() => setShowEditData(false)}
          onSaved={() => { fetchFiling(id); setShowEditData(false) }}
        />
      )}
    </div>
  )
}

/* ─── Prefill Value Cell ─── */
// Renders either a raw primitive or a structured prefill object
// { value, confidence, source, needsCpaReview, ... } into a clean display.
function PrefillValueCell({ value }: { value: unknown }) {
  if (value == null || value === '') {
    return <span className="text-[#64748d]">—</span>
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-[#64748d] italic">Empty list</span>
    return (
      <div className="space-y-1.5">
        {value.map((item, i) => (
          <div key={i} className="rounded-md border border-[#f6f9fc] bg-[#FAFAFA] px-2.5 py-1.5">
            <PrefillValueCell value={item} />
          </div>
        ))}
      </div>
    )
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const hasPrefillShape = 'value' in obj
    if (hasPrefillShape) {
      const mainValue = obj.value
      const confidence = typeof obj.confidence === 'number' ? obj.confidence : null
      const source = typeof obj.source === 'string' ? obj.source : null
      const needsReview = obj.needsCpaReview === true
      const extraEntries = Object.entries(obj).filter(
        ([k]) => !['value', 'confidence', 'source', 'needsCpaReview'].includes(k),
      )

      return (
        <div className="space-y-1.5">
          <div className="flex items-center flex-wrap gap-2">
            <span className="font-medium text-[#061b31] break-words">
              {mainValue == null || mainValue === ''
                ? '—'
                : typeof mainValue === 'object'
                  ? JSON.stringify(mainValue)
                  : String(mainValue)}
            </span>
            {confidence != null && (
              <span
                className={`rounded-md px-1.5 py-0.5 text-[11px] font-medium ${
                  confidence >= 0.8
                    ? 'bg-[rgba(21,190,83,0.12)] text-[#108c3d]'
                    : confidence >= 0.5
                      ? 'bg-[rgba(155,104,41,0.12)] text-[#9b6829]'
                      : 'bg-[rgba(234,34,97,0.08)] text-[#ea2261]'
                }`}
              >
                {Math.round(confidence * 100)}%
              </span>
            )}
            {needsReview && (
              <span className="rounded-md bg-[rgba(234,34,97,0.08)] px-1.5 py-0.5 text-[11px] font-medium text-[#ea2261]">
                CPA review
              </span>
            )}
          </div>
          {source && (
            <p className="text-[11px] text-[#64748d]">
              Source: <span className="text-[#273951]">{source}</span>
            </p>
          )}
          {extraEntries.length > 0 && (
            <div className="rounded-md border border-[#f6f9fc] bg-[#FAFAFA] px-2.5 py-1.5 space-y-1">
              {extraEntries.map(([k, v]) => (
                <div key={k} className="flex gap-2 text-[11px]">
                  <span className="text-[#64748d] min-w-[80px]">{k}:</span>
                  <span className="text-[#273951] break-words">
                    {v == null ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }

    const entries = Object.entries(obj)
    if (entries.length === 0) return <span className="text-[#64748d] italic">Empty object</span>
    return (
      <div className="rounded-md border border-[#f6f9fc] bg-[#FAFAFA] divide-y divide-[#f6f9fc]">
        {entries.map(([k, v]) => (
          <div key={k} className="flex gap-3 px-2.5 py-1.5">
            <span className="min-w-[110px] text-xs font-medium text-[#64748d]">
              {k.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
            </span>
            <div className="flex-1 text-xs text-[#273951]">
              <PrefillValueCell value={v} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (typeof value === 'boolean') return <span>{value ? 'Yes' : 'No'}</span>
  return <span className="break-words">{String(value)}</span>
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
      <div className="relative bg-white rounded-md shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5edf5]">
          <div>
            <h2 className="text-lg font-normal text-[#061b31]" style={{ fontWeight: 400 }}>
              {filing.formType} — {filing.formName}
            </h2>
            <p className="text-xs text-[#64748d] mt-0.5">
              {entityName || 'Unknown entity'} &middot; Tax year {filing.taxYear || '—'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#64748d] hover:bg-[#f6f9fc] hover:text-[#273951]"
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
              <span className="text-xs text-[#64748d]">
                AI confidence: {Math.round(filing.aiConfidenceScore * 100)}%
              </span>
            )}
          </div>

          {/* AI Summary */}
          {filing.aiSummary && (
            <div>
              <h3 className="text-sm font-normal text-[#061b31] mb-2" style={{ fontWeight: 400 }}>AI Summary</h3>
              <div className="bg-[#f6f9fc] border border-[#e5edf5] rounded-lg p-4 text-sm text-[#273951] whitespace-pre-wrap">
                {filing.aiSummary}
              </div>
            </div>
          )}

          {/* AI Reasoning */}
          {filing.aiReasoning && (
            <div>
              <h3 className="text-sm font-normal text-[#061b31] mb-2" style={{ fontWeight: 400 }}>AI Reasoning</h3>
              <div className="bg-[#f6f9fc] border border-[#e5edf5] rounded-lg p-4 text-sm text-[#273951] whitespace-pre-wrap">
                {filing.aiReasoning}
              </div>
            </div>
          )}

          {/* Filing Data fields */}
          <div>
            <h3 className="text-sm font-normal text-[#061b31] mb-2" style={{ fontWeight: 400 }}>
              Form Data {dataEntries.length > 0 && `(${dataEntries.length} fields)`}
            </h3>
            {dataEntries.length === 0 ? (
              <p className="text-sm text-[#64748d] italic">No form data collected yet.</p>
            ) : (
              <div className="bg-white border border-[#e5edf5] rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#f6f9fc]">
                      <th className="text-left text-xs font-medium text-[#64748d] uppercase px-4 py-2 w-1/3">
                        Field
                      </th>
                      <th className="text-left text-xs font-medium text-[#64748d] uppercase px-4 py-2">
                        Value
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {dataEntries.map(([key, value]) => (
                      <tr key={key} className="border-t border-[#f6f9fc] align-top">
                        <td className="px-4 py-3 text-sm text-[#64748d] font-medium whitespace-nowrap">
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#061b31]">
                          <PrefillValueCell value={value} />
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
            <h3 className="text-sm font-normal text-[#061b31] mb-2" style={{ fontWeight: 400 }}>
              Documents {documents.length > 0 && `(${documents.length})`}
            </h3>
            {documents.length === 0 ? (
              <p className="text-sm text-[#64748d] italic">No documents attached.</p>
            ) : (
              <div className="space-y-2">
                {documents.map((doc: any) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 p-3 bg-[#f6f9fc] border border-[#e5edf5] rounded-lg"
                  >
                    <FileText size={16} className="text-[#533afd] flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#061b31] truncate">{doc.fileName}</p>
                      <p className="text-xs text-[#64748d]">{doc.mimeType}</p>
                    </div>
                    {doc.confidenceScore != null && (
                      <span className="text-xs text-[#64748d]">
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
            <h3 className="text-sm font-normal text-[#061b31] mb-2" style={{ fontWeight: 400 }}>Key Dates</h3>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <span className="text-[#64748d]">Created:</span>
              <span className="text-[#061b31]">{formatDate(filing.createdAt)}</span>
              <span className="text-[#64748d]">Last Updated:</span>
              <span className="text-[#061b31]">{filing.updatedAt ? formatDate(filing.updatedAt) : '—'}</span>
              {filing.founderApprovedAt && (
                <>
                  <span className="text-[#64748d]">Founder Approved:</span>
                  <span className="text-[#061b31]">{formatDate(filing.founderApprovedAt)}</span>
                </>
              )}
              {filing.submittedAt && (
                <>
                  <span className="text-[#64748d]">Submitted:</span>
                  <span className="text-[#061b31]">{formatDate(filing.submittedAt)}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#e5edf5] flex justify-end">
          <button
            onClick={onClose}
            className="h-9 px-4 bg-[#533afd] text-white rounded-lg text-sm font-medium hover:bg-[#4434d4] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Filing Data Editor ─── */
function FilingDataEditor({
  filingId,
  initialData,
  onClose,
  onSaved,
}: {
  filingId: string
  initialData: Record<string, unknown>
  onClose: () => void
  onSaved: () => void
}) {
  const [rows, setRows] = useState<{ key: string; value: string }[]>(
    Object.entries(initialData).map(([k, v]) => {
      // Handle prefill objects { value, confidence, ... } — extract value field
      if (v && typeof v === 'object' && 'value' in (v as any)) {
        return { key: k, value: String((v as any).value ?? '') }
      }
      if (v && typeof v === 'object') {
        return { key: k, value: JSON.stringify(v) }
      }
      return { key: k, value: String(v ?? '') }
    })
  )
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function addRow() {
    const k = newKey.trim()
    if (!k) return
    if (rows.some(r => r.key === k)) {
      setError(`Field "${k}" already exists — edit it below.`)
      return
    }
    setRows(prev => [...prev, { key: k, value: newValue }])
    setNewKey('')
    setNewValue('')
    setError('')
  }

  function removeRow(key: string) {
    setRows(prev => prev.filter(r => r.key !== key))
  }

  function updateValue(key: string, value: string) {
    setRows(prev => prev.map(r => r.key === key ? { ...r, value } : r))
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      // Build fields from rows — also null out deleted keys so backend merge removes them
      const fields: Record<string, string | null> = {}
      // Mark removed keys as null
      for (const key of Object.keys(initialData)) {
        if (!rows.some(r => r.key === key)) fields[key] = null
      }
      // Set current rows
      for (const r of rows) fields[r.key] = r.value
      await api.updateFilingData(filingId, fields)
      onSaved()
    } catch (e: any) {
      setError(e?.message ?? 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-md shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5edf5]">
          <h2 className="text-base font-normal text-[#061b31]" style={{ fontWeight: 400 }}>Edit Filing Data</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#64748d] hover:bg-[#f6f9fc]">
            <X size={18} />
          </button>
        </div>

        {/* Existing fields */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {rows.length === 0 && (
            <p className="text-sm text-[#64748d] italic">No fields yet. Add one below.</p>
          )}
          {rows.map(row => (
            <div key={row.key} className="flex items-center gap-2">
              <span className="w-36 shrink-0 text-xs font-medium text-[#64748d] truncate" title={row.key}>
                {formatKey(row.key)}
              </span>
              <input
                value={row.value}
                onChange={e => updateValue(row.key, e.target.value)}
                className="flex-1 h-8 text-sm border border-[#e5edf5] rounded-lg px-2 outline-none focus:border-[#533afd]"
              />
              <button onClick={() => removeRow(row.key)} className="p-1 text-[#64748d] hover:text-[#ea2261]">
                <Trash2 size={14} />
              </button>
            </div>
          ))}

          {/* Add new field */}
          <div className="pt-3 border-t border-[#f6f9fc] mt-3">
            <p className="text-xs font-medium text-[#64748d] mb-2">Add new field</p>
            <div className="flex items-center gap-2">
              <input
                value={newKey}
                onChange={e => setNewKey(e.target.value)}
                placeholder="fieldName"
                className="w-36 h-8 text-sm border border-[#e5edf5] rounded-lg px-2 outline-none focus:border-[#533afd]"
              />
              <input
                value={newValue}
                onChange={e => setNewValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addRow()}
                placeholder="value"
                className="flex-1 h-8 text-sm border border-[#e5edf5] rounded-lg px-2 outline-none focus:border-[#533afd]"
              />
              <button
                onClick={addRow}
                disabled={!newKey.trim()}
                className="h-8 w-8 flex items-center justify-center rounded-lg bg-[#533afd] text-white hover:bg-[#4434d4] disabled:opacity-40"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          {error && <p className="text-xs text-[#ea2261] mt-1">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#e5edf5] flex justify-end gap-2">
          <button onClick={onClose} className="h-9 px-4 border border-[#e5edf5] rounded-lg text-sm font-medium text-[#273951] hover:bg-[#f6f9fc]">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="h-9 px-4 bg-[#533afd] text-white rounded-lg text-sm font-medium hover:bg-[#4434d4] disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
