import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Wind } from 'lucide-react'
import { useAuthStore } from '@/stores/auth'
import { StatusBadge } from '@/components/ui/status-badge'
import { HomeBottomSection } from '@/components/HomeBottomSection'
import { formatDate } from '@/lib/utils'
import type { ApiFiling } from 'shared'

function FounderHome() {
  const { user, filings, approvals, fetchFilings, fetchApprovals, filingsLoading, approvalsLoading } = useAuthStore()
  const navigate = useNavigate()
  const [filingTab, setFilingTab] = useState<'not_purchased' | 'all'>('all')
  useEffect(() => {
    fetchFilings()
    fetchApprovals()
  }, [])

  const firstName = user?.name?.split(' ')[0] || 'there'
  const actionItems = approvals.filter((a) => a.status === 'pending')
  const notPurchased = filings.filter((f) => f.status === 'intake')
  const completed = filings.filter((f) => ['submitted', 'archived'].includes(f.status))
  const inProgress = filings.filter((f) => ['ai_prep', 'cpa_review'].includes(f.status))
  const actionPending = filings.filter((f) => f.status === 'founder_approval')
  const visibleFilings = filingTab === 'not_purchased' ? notPurchased : filings

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-[#111827]">Welcome {firstName}</h1>

      <div className="mb-6 rounded-xl border border-[#E5E7EB] bg-white p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#111827]">Founder Action Centre</h2>
          <Link to="/action-centre" className="flex items-center gap-1 text-[13px] font-medium text-[#6C5CE7] hover:text-[#5B4BD5]">View all <ArrowRight size={13} /></Link>
        </div>
        <div className="flex min-h-[200px]">
          <div className="flex flex-1 flex-col items-center justify-center">
            {actionItems.length === 0 ? (
              <div className="text-center">
                <div className="mb-5 space-y-2.5">
                  {[70, 60, 70].map((w, i) => (
                    <div key={i} className="flex items-center justify-center gap-3">
                      <div className="h-2 rounded bg-[#E5E7EB]" style={{ width: `${w}%` }} />
                      <CheckCircle2 size={18} className="text-[#10B981]" />
                    </div>
                  ))}
                </div>
                <p className="text-sm text-[#374151]">No urgent founder approvals right now.</p>
              </div>
            ) : (
              <div className="w-full space-y-2">
                {actionItems.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex cursor-pointer items-center justify-between rounded-lg px-4 py-3 transition-colors hover:bg-[#F9FAFB]" onClick={() => navigate('/approvals')}>
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B]" />
                      <span className="text-sm text-[#111827]">{item.summary}</span>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="mx-6 w-px bg-[#E5E7EB]" />
          <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
            <Wind size={40} className="mb-3 text-[#D1D5DB]" />
            <p className="mb-1 text-[15px] font-medium text-[#111827]">Your filing pipeline is under control</p>
            <p className="mb-3 text-[13px] text-[#6B7280]">Review filings, approvals, and team activity from one place.</p>
            <Link to="/filings" className="flex items-center gap-1 text-[13px] font-medium text-[#6C5CE7] hover:text-[#5B4BD5]">View all filings <ArrowRight size={13} /></Link>
          </div>
        </div>
      </div>

      <div className="mb-6 overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white">
        <div className="border-b border-[#E5E7EB] px-6 py-5"><h2 className="text-base font-semibold text-[#111827]">Filing Status</h2></div>
        <div className="grid lg:grid-cols-[1.05fr_1fr]">
          <div className="border-b border-[#E5E7EB] p-6 lg:border-b-0 lg:border-r">
            <div className="flex min-h-[280px] flex-col items-center justify-center text-center">
              <div className="mb-3 text-5xl font-semibold tracking-tight text-[#2D2850]">{completed.length}/{filings.length}</div>
              <p className="text-[15px] text-[#5B5878]">Filings completed</p>
              <p className="mt-2 text-sm font-medium text-[#15803D]">{filings.length === 0 ? 'Start your first filing to track compliance.' : 'You are on top of compliance.'}</p>
            </div>
            <div className="grid grid-cols-2 gap-y-5 border-t border-[#E5E7EB] pt-6 md:grid-cols-4 md:gap-0">
              {[
                { label: 'Completed', value: completed.length, color: 'text-[#4C9A67]' },
                { label: 'In progress', value: inProgress.length, color: 'text-[#3490DC]' },
                { label: 'Action pending', value: actionPending.length, color: 'text-[#F59E0B]' },
                { label: 'Not purchased', value: notPurchased.length, color: 'text-[#C94B60]' },
              ].map((item) => (
                <div key={item.label} className="text-center md:border-r last:md:border-r-0 md:border-[#EDEAF8]">
                  <div className={`text-[40px] font-semibold leading-none ${item.color}`}>{item.value}</div>
                  <div className="mt-2 text-sm text-[#6B7280]">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="p-6">
            <div className="mb-5 inline-flex rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-1">
              <button onClick={() => setFilingTab('not_purchased')} className={`min-w-[150px] rounded-xl px-5 py-2 text-sm font-medium transition-colors ${filingTab === 'not_purchased' ? 'bg-white text-[#2D2850] shadow-sm' : 'text-[#7B7897] hover:text-[#2D2850]'}`}>Not purchased {notPurchased.length}</button>
              <button onClick={() => setFilingTab('all')} className={`min-w-[120px] rounded-xl px-5 py-2 text-sm font-medium transition-colors ${filingTab === 'all' ? 'bg-white text-[#2D2850] shadow-sm' : 'text-[#7B7897] hover:text-[#2D2850]'}`}>All {filings.length}</button>
            </div>
            {visibleFilings.length === 0 ? (
              <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#E5E7EB] bg-[#FCFCFD] px-6 text-center">
                <Wind size={30} className="mb-3 text-[#D1D5DB]" />
                <p className="text-sm font-medium text-[#374151]">No filings in this view</p>
                <p className="mt-1 text-sm text-[#6B7280]">Create a filing or switch tabs to see the rest of your pipeline.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {visibleFilings.slice(0, 5).map((filing: ApiFiling) => (
                  <button key={filing.id} className="flex w-full items-center justify-between rounded-2xl border border-[#EEEAFB] bg-[#FCFBFF] px-4 py-3 text-left transition-colors hover:border-[#D8D1F7] hover:bg-white" onClick={() => navigate(`/filings/${filing.id}`)}>
                    <div>
                      <p className="text-sm font-semibold text-[#2D2850]">{filing.formType} - {filing.formName}</p>
                      <p className="mt-1 text-xs text-[#6B7280]">Tax Year {filing.taxYear || '2025'} • Updated {formatDate(filing.updatedAt || filing.createdAt)}</p>
                    </div>
                    <StatusBadge status={filing.status} />
                  </button>
                ))}
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
        <h1 className="text-2xl font-semibold text-[#111827]">Welcome back, {user?.name?.split(' ')[0]}</h1>
        <p className="mt-1 text-sm text-[#6B7280]">Your workspace is filtered to the modules your founder enabled for you.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <button key={card.label} onClick={() => navigate(card.action)} className="rounded-xl border border-[#E5E7EB] bg-white p-5 text-left transition-colors hover:border-[#D8D1F7]">
            <p className="text-sm text-[#6B7280]">{card.label}</p>
            <p className="mt-2 text-3xl font-semibold text-[#111827]">{card.value}</p>
            <p className="mt-4 flex items-center gap-1 text-sm font-medium text-[#6C5CE7]">Open <ArrowRight size={14} /></p>
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-[#E5E7EB] bg-white p-6">
        <h2 className="text-lg font-medium text-[#111827]">Permissions available to you</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {Object.entries(user?.permissions || {}).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between rounded-lg bg-[#F9FAFB] px-4 py-3">
              <span className="text-sm text-[#374151]">{key}</span>
              <span className={`text-xs font-medium ${value ? 'text-green-600' : 'text-[#9CA3AF]'}`}>{value ? 'Allowed' : 'Blocked'}</span>
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
