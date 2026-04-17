import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Wind, AlertTriangle, Clock, FilePlus } from 'lucide-react'
import { useAuthStore } from '@/stores/auth'
import { StatusBadge } from '@/components/ui/status-badge'
import { HomeBottomSection } from '@/components/HomeBottomSection'
import { formatDate } from '@/lib/utils'
import type { ApiFiling } from 'shared'

function FounderHome() {
  const { user, filings, approvals, fetchFilings, fetchApprovals, filingsLoading } = useAuthStore()
  const navigate = useNavigate()
  const [filingTab, setFilingTab] = useState<'not_started' | 'all' | 'archived'>('all')
  useEffect(() => {
    fetchFilings()
    fetchApprovals()
  }, [])

  const firstName = user?.name?.split(' ')[0] || 'there'
  const actionItems = approvals.filter((a) => a.status === 'pending')
  const notStarted = filings.filter((f) => f.status === 'intake')
  const archivedFilings = filings.filter((f) => f.status === 'archived')
  const completed = filings.filter((f) => ['submitted', 'archived'].includes(f.status))
  const inProgress = filings.filter((f) => ['ai_prep', 'cpa_review'].includes(f.status))
  const actionPending = filings.filter((f) => f.status === 'founder_approval')
  const activeFilings = filings.filter((f) => f.status !== 'archived')
  const visibleFilings =
    filingTab === 'not_started' ? notStarted :
    filingTab === 'archived'   ? archivedFilings :
    activeFilings

  return (
    <div>
      <h1 className="mb-6 text-2xl font-normal text-[#061b31]" style={{ fontWeight: 300 }}>Welcome {firstName}</h1>

      <div className="mb-6 rounded-md border border-[#e5edf5] bg-white p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-normal text-[#061b31]" style={{ fontWeight: 400 }}>Founder Action Centre</h2>
          <Link to="/action-centre" className="flex items-center gap-1 text-[13px] font-medium text-[#533afd] hover:text-[#4434d4]">View all <ArrowRight size={13} /></Link>
        </div>
        <div className="flex min-h-[200px]">
          <div className="flex flex-1 flex-col items-center justify-center">
            {actionItems.length === 0 ? (
              <div className="text-center">
                <div className="mb-5 space-y-2.5">
                  {[70, 60, 70].map((w, i) => (
                    <div key={i} className="flex items-center justify-center gap-3">
                      <div className="h-2 rounded bg-[#e5edf5]" style={{ width: `${w}%` }} />
                      <CheckCircle2 size={18} className="text-[#15be53]" />
                    </div>
                  ))}
                </div>
                <p className="text-sm text-[#273951]">No urgent founder approvals right now.</p>
              </div>
            ) : (
              <div className="w-full space-y-2">
                {actionItems.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex cursor-pointer items-center justify-between rounded-lg px-4 py-3 transition-colors hover:bg-[#f6f9fc]" onClick={() => navigate('/approvals')}>
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#9b6829]" />
                      <span className="text-sm text-[#061b31]">{item.summary}</span>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="mx-6 w-px bg-[#e5edf5]" />
          <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
            {filingsLoading ? (
              <p className="text-sm text-[#64748d]">Loading pipeline…</p>
            ) : filings.length === 0 ? (
              <>
                <FilePlus size={36} className="mb-3 text-[#e5edf5]" />
                <p className="mb-1 text-[15px] font-medium text-[#061b31]">No filings yet</p>
                <p className="mb-3 text-[13px] text-[#64748d]">Create your first filing to start tracking compliance.</p>
                <Link to="/filings" className="flex items-center gap-1 text-[13px] font-medium text-[#533afd] hover:text-[#4434d4]">Create a filing <ArrowRight size={13} /></Link>
              </>
            ) : actionPending.length > 0 ? (
              <>
                <AlertTriangle size={36} className="mb-3 text-[#9b6829]" />
                <p className="mb-1 text-[15px] font-medium text-[#061b31]">
                  {actionPending.length} filing{actionPending.length > 1 ? 's' : ''} need{actionPending.length === 1 ? 's' : ''} your approval
                </p>
                <p className="mb-3 text-[13px] text-[#64748d]">Review and approve to move to submission.</p>
                <div className="mb-3 w-full space-y-1.5">
                  {actionPending.slice(0, 3).map((f) => (
                    <button key={f.id} onClick={() => navigate(`/filings/${f.id}`)} className="w-full rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2 text-left text-[12px] font-medium text-[#92400E] hover:bg-[#FEF3C7] transition-colors">
                      {f.formType} — {f.formName}
                    </button>
                  ))}
                </div>
                <Link to="/approvals" className="flex items-center gap-1 text-[13px] font-medium text-[#533afd] hover:text-[#4434d4]">Go to approvals <ArrowRight size={13} /></Link>
              </>
            ) : inProgress.length > 0 ? (
              <>
                <Clock size={36} className="mb-3 text-[#533afd]" />
                <p className="mb-1 text-[15px] font-medium text-[#061b31]">
                  {inProgress.length} filing{inProgress.length > 1 ? 's' : ''} in review
                </p>
                <p className="mb-3 text-[13px] text-[#64748d]">
                  {inProgress.filter((f) => f.status === 'cpa_review').length > 0
                    ? 'Your CPA is actively reviewing your filings.'
                    : 'AI is preparing your filings for CPA review.'}
                </p>
                <div className="mb-3 w-full space-y-1.5">
                  {inProgress.slice(0, 3).map((f) => (
                    <button key={f.id} onClick={() => navigate(`/filings/${f.id}`)} className="w-full rounded-lg border border-[#b9b9f9] bg-[#EDE9FD] px-3 py-2 text-left text-[12px] font-medium text-[#533afd] hover:bg-[#ddd5fc] transition-colors">
                      {f.formType} — {f.formName}
                    </button>
                  ))}
                </div>
                <Link to="/filings" className="flex items-center gap-1 text-[13px] font-medium text-[#533afd] hover:text-[#4434d4]">View all filings <ArrowRight size={13} /></Link>
              </>
            ) : (
              <>
                <Wind size={40} className="mb-3 text-[#e5edf5]" />
                <p className="mb-1 text-[15px] font-medium text-[#061b31]">Your filing pipeline is under control</p>
                <p className="mb-3 text-[13px] text-[#64748d]">
                  {completed.length > 0
                    ? `${completed.length} filing${completed.length > 1 ? 's' : ''} completed. Review filings and team activity from one place.`
                    : 'Review filings, approvals, and team activity from one place.'}
                </p>
                <Link to="/filings" className="flex items-center gap-1 text-[13px] font-medium text-[#533afd] hover:text-[#4434d4]">View all filings <ArrowRight size={13} /></Link>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mb-6 overflow-hidden rounded-lg border border-[#e5edf5] bg-white">
        <div className="border-b border-[#e5edf5] px-6 py-5"><h2 className="text-base font-normal text-[#061b31]" style={{ fontWeight: 400 }}>Filing Status</h2></div>
        <div className="grid lg:grid-cols-[1.05fr_1fr]">
          <div className="border-b border-[#e5edf5] p-6 lg:border-b-0 lg:border-r">
            <div className="flex min-h-[280px] flex-col items-center justify-center text-center">
              <div className="mb-3 text-5xl font-normal tracking-tight text-[#2D2850] font-tnum" style={{ fontWeight: 300 }}>{completed.length}/{filings.length}</div>
              <p className="text-[15px] text-[#5B5878]">Filings completed</p>
              <p className="mt-2 text-sm font-medium text-[#108c3d]">{filings.length === 0 ? 'Start your first filing to track compliance.' : 'You are on top of compliance.'}</p>
            </div>
            <div className="grid grid-cols-2 gap-y-5 border-t border-[#e5edf5] pt-6 md:grid-cols-4 md:gap-0">
              {[
                { label: 'Completed', value: completed.length, color: 'text-[#108c3d]' },
                { label: 'In progress', value: inProgress.length, color: 'text-[#533afd]' },
                { label: 'Action pending', value: actionPending.length, color: 'text-[#9b6829]' },
                { label: 'Not started', value: notStarted.length, color: 'text-[#ea2261]' },
              ].map((item) => (
                <div key={item.label} className="text-center md:border-r last:md:border-r-0 md:border-[#EDEAF8]">
                  <div className={`text-[40px] font-normal leading-none font-tnum ${item.color}`} style={{ fontWeight: 300 }}>{item.value}</div>
                  <div className="mt-2 text-sm text-[#64748d]">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="p-6">
            <div className="mb-5 inline-flex rounded-lg border border-[#e5edf5] bg-[#f6f9fc] p-1">
              <button onClick={() => setFilingTab('not_started')} className={`min-w-[130px] rounded-md px-4 py-2 text-sm font-medium transition-colors ${filingTab === 'not_started' ? 'bg-white text-[#2D2850] shadow-sm' : 'text-[#7B7897] hover:text-[#2D2850]'}`}>Not started {notStarted.length}</button>
              <button onClick={() => setFilingTab('all')} className={`min-w-[100px] rounded-md px-4 py-2 text-sm font-medium transition-colors ${filingTab === 'all' ? 'bg-white text-[#2D2850] shadow-sm' : 'text-[#7B7897] hover:text-[#2D2850]'}`}>All {activeFilings.length}</button>
              <button onClick={() => setFilingTab('archived')} className={`min-w-[110px] rounded-md px-4 py-2 text-sm font-medium transition-colors ${filingTab === 'archived' ? 'bg-white text-[#2D2850] shadow-sm' : 'text-[#7B7897] hover:text-[#2D2850]'}`}>Archived {archivedFilings.length}</button>
            </div>
            {visibleFilings.length === 0 ? (
              <div className="flex min-h-[280px] flex-col items-center justify-center rounded-lg border border-dashed border-[#e5edf5] bg-[#FCFCFD] px-6 text-center">
                <Wind size={30} className="mb-3 text-[#e5edf5]" />
                <p className="text-sm font-medium text-[#273951]">No filings in this view</p>
                <p className="mt-1 text-sm text-[#64748d]">Create a filing or switch tabs to see the rest of your pipeline.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {visibleFilings.slice(0, 5).map((filing: ApiFiling) => (
                  <button key={filing.id} className="flex w-full items-center justify-between rounded-lg border border-[#EEEAFB] bg-[#FCFBFF] px-4 py-3 text-left transition-colors hover:border-[#D8D1F7] hover:bg-white" onClick={() => navigate(`/filings/${filing.id}`)}>
                    <div>
                      <p className="text-sm font-medium text-[#2D2850]">{filing.formType} - {filing.formName}</p>
                      <p className="mt-1 text-xs text-[#64748d]">Tax Year {filing.taxYear || '2025'} • Updated {formatDate(filing.updatedAt || filing.createdAt)}</p>
                    </div>
                    <StatusBadge status={filing.status} />
                  </button>
                ))}
                {visibleFilings.length > 5 && (
                  <button
                    onClick={() => navigate('/filings/room')}
                    className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-[#D8D1F7] py-2.5 text-[13px] font-medium text-[#533afd] hover:bg-[#f6f9fc] transition-colors"
                  >
                    View {visibleFilings.length - 5} more <ArrowRight size={13} />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <HomeBottomSection />
    </div>
  )
}

function TeamMemberHome() {
  const { user, filings, documents, approvals, fetchFilings, fetchDocuments, fetchApprovals } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (user?.permissions?.canViewFilings) fetchFilings()
    if (user?.permissions?.canViewDocuments) fetchDocuments()
    if (user?.permissions?.canApproveFilings) fetchApprovals()
  }, [])

  const cards = [
    { label: 'Visible filings', value: filings.length, action: '/filings', enabled: user?.permissions?.canViewFilings },
    { label: 'Documents', value: documents.length, action: '/documents', enabled: user?.permissions?.canViewDocuments },
    { label: 'Approvals', value: approvals.filter((item) => item.status === 'pending').length, action: '/approvals', enabled: user?.permissions?.canApproveFilings },
  ].filter((card) => card.enabled)

  return (
    <div className="space-y-6 p-1">
      <div>
        <h1 className="text-2xl font-normal text-[#061b31]" style={{ fontWeight: 300 }}>Welcome back, {user?.name?.split(' ')[0]}</h1>
        <p className="mt-1 text-sm text-[#64748d]">Your workspace is filtered to the modules your founder enabled for you.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <button key={card.label} onClick={() => navigate(card.action)} className="rounded-md border border-[#e5edf5] bg-white p-5 text-left transition-colors hover:border-[#D8D1F7]">
            <p className="text-sm text-[#64748d]">{card.label}</p>
            <p className="mt-2 text-3xl font-normal text-[#061b31] font-tnum" style={{ fontWeight: 300 }}>{card.value}</p>
            <p className="mt-4 flex items-center gap-1 text-sm font-medium text-[#533afd]">Open <ArrowRight size={14} /></p>
          </button>
        ))}
      </div>

      <div className="rounded-md border border-[#e5edf5] bg-white p-6">
        <h2 className="text-lg font-medium text-[#061b31]">Permissions available to you</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {Object.entries(user?.permissions || {}).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between rounded-lg bg-[#f6f9fc] px-4 py-3">
              <span className="text-sm text-[#273951]">{key}</span>
              <span className={`text-xs font-medium ${value ? 'text-[#108c3d]' : 'text-[#64748d]'}`}>{value ? 'Allowed' : 'Blocked'}</span>
            </div>
          ))}
        </div>
      </div>

      <HomeBottomSection />
    </div>
  )
}

export function HomePage() {
  const user = useAuthStore((state) => state.user)

  if (user?.role === 'admin' || user?.role === 'cpa') {
    return <Navigate to="/dashboard" replace />
  }

  if (user?.role === 'team_member') {
    return <TeamMemberHome />
  }

  return <FounderHome />
}
