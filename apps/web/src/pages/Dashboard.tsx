import { useEffect } from 'react'
import { useAuthStore } from '@/stores/auth'
import type { ApiFiling, ApiFounderApplication, ApiCpa } from 'shared'

export function DashboardPage() {
  const user = useAuthStore((state) => state.user)
  const filings = useAuthStore((state) => state.filings) as ApiFiling[]
  const founderApplications = useAuthStore((state) => state.founderApplications) as ApiFounderApplication[]
  const cpas = useAuthStore((state) => state.cpas) as ApiCpa[]
  const adminOrganizations = useAuthStore((state) => state.adminOrganizations) as any[]
  const { fetchFilings, fetchFounderApplications, fetchCpas, fetchAdminOrganizations, founderApplicationsLoading, cpasLoading, filingsLoading } = useAuthStore()

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchFounderApplications()
      fetchCpas()
      fetchAdminOrganizations()
    }
    if (user?.role === 'cpa') {
      fetchFilings()
    }
  }, [])

  const isAdmin = user?.role === 'admin'
  const isCpa = user?.role === 'cpa'

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#111827]">Dashboard</h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          {isAdmin ? 'Platform oversight for founders, team members, and CPA coverage.' : isCpa ? 'Your assigned filing workload and review state.' : 'Role dashboard.'}
        </p>
      </div>

      {isAdmin && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-[#E5E7EB] bg-white p-5">
              <p className="text-sm text-[#6B7280]">Pending founder applications</p>
              <p className="mt-2 text-3xl font-semibold text-[#111827]">
                {founderApplications.filter((item: ApiFounderApplication) => item.status === 'pending').length}
              </p>
            </div>
            <div className="rounded-xl border border-[#E5E7EB] bg-white p-5">
              <p className="text-sm text-[#6B7280]">Active CPAs</p>
              <p className="mt-2 text-3xl font-semibold text-[#111827]">              {cpas.filter((c: ApiCpa) => c.role === 'cpa').length}</p>
            </div>
            <div className="rounded-xl border border-[#E5E7EB] bg-white p-5">
              <p className="text-sm text-[#6B7280]">Organizations tracked</p>
              <p className="mt-2 text-3xl font-semibold text-[#111827]">
                {adminOrganizations.length}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-[#E5E7EB] bg-white p-5">
            <h2 className="text-lg font-medium text-[#111827]">Founder review queue</h2>
            <div className="mt-4 space-y-3">
              {founderApplications.slice(0, 5).map((item: ApiFounderApplication) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg border border-[#E5E7EB] p-4">
                  <div>
                    <p className="font-medium text-[#111827]">{item.organizationName}</p>
                    <p className="text-sm text-[#6B7280]">{item.name} · {item.email}</p>
                  </div>
                  <span className="rounded-full bg-[#F3F4F6] px-3 py-1 text-xs text-[#374151]">{item.status}</span>
                </div>
              ))}
              {founderApplicationsLoading && <p className="text-sm text-[#6B7280]">Loading...</p>}
            </div>
          </div>

          <div className="rounded-xl border border-[#E5E7EB] bg-white p-5">
            <h2 className="text-lg font-medium text-[#111827]">Platform organization overview</h2>
            <div className="mt-4 space-y-3">
              {adminOrganizations.slice(0, 6).map((organization) => (
                <div key={organization.id} className="flex items-center justify-between rounded-lg border border-[#E5E7EB] p-4">
                  <div>
                    <p className="font-medium text-[#111827]">{organization.name}</p>
                    <p className="text-sm text-[#6B7280]">
                      {organization.founderCount} founder{organization.founderCount === 1 ? '' : 's'} · {organization.teamMemberCount} team member{organization.teamMemberCount === 1 ? '' : 's'} · {organization.assignedCpaCount} CPA assignment{organization.assignedCpaCount === 1 ? '' : 's'}
                    </p>
                  </div>
                  <span className="rounded-full bg-[#F3F4F6] px-3 py-1 text-xs text-[#374151]">
                    {organization.founderNames?.join(', ') || 'No founder'}
                  </span>
                </div>
              ))}
              {!adminOrganizations.length && !cpasLoading && !founderApplicationsLoading && <p className="text-sm text-[#6B7280]">No organizations found.</p>}
            </div>
          </div>
        </>
      )}

      {isCpa && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-[#E5E7EB] bg-white p-5">
              <p className="text-sm text-[#6B7280]">Assigned filings</p>
              <p className="mt-2 text-3xl font-semibold text-[#111827]">{filings.length}</p>
            </div>
            <div className="rounded-xl border border-[#E5E7EB] bg-white p-5">
              <p className="text-sm text-[#6B7280]">Locked by you</p>
              <p className="mt-2 text-3xl font-semibold text-[#111827]">
                {filings.filter((filing: ApiFiling) => filing.reviewLock?.cpaUserId === user?.id).length}
              </p>
            </div>
            <div className="rounded-xl border border-[#E5E7EB] bg-white p-5">
              <p className="text-sm text-[#6B7280]">Ready for founder review</p>
              <p className="mt-2 text-3xl font-semibold text-[#111827]">
                {filings.filter((filing: ApiFiling) => filing.status === 'founder_approval').length}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-[#E5E7EB] bg-white p-5">
            <h2 className="text-lg font-medium text-[#111827]">Assigned filings</h2>
            <div className="mt-4 space-y-3">
              {filings.map((filing: ApiFiling) => (
                <div key={filing.id} className="rounded-lg border border-[#E5E7EB] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-[#111827]">{filing.formName}</p>
                      <p className="text-sm text-[#6B7280]">{filing.status}</p>
                    </div>
                    {filing.reviewLock && <span className="rounded-full bg-[#FEF3C7] px-3 py-1 text-xs text-[#92400E]">Locked</span>}
                  </div>
                </div>
              ))}
              {!filings.length && !filingsLoading && <p className="text-sm text-[#6B7280]">No filings assigned.</p>}
              {filingsLoading && <p className="text-sm text-[#6B7280]">Loading...</p>}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
