import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import { StatusBadge } from '@/components/ui/status-badge'
import { formatDate } from '@/lib/utils'
import { FileText, FolderOpen } from 'lucide-react'
import type { ApiFiling, ApiFounderApplication, ApiCpa } from 'shared'

export function DashboardPage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const filings = useAuthStore((state) => state.filings) as ApiFiling[]
  const documents = useAuthStore((state) => state.documents) as any[]
  const founderApplications = useAuthStore((state) => state.founderApplications) as ApiFounderApplication[]
  const cpas = useAuthStore((state) => state.cpas) as ApiCpa[]
  const adminOrganizations = useAuthStore((state) => state.adminOrganizations) as any[]
  const { fetchFilings, fetchDocuments, fetchFounderApplications, fetchCpas, fetchAdminOrganizations, founderApplicationsLoading, cpasLoading, filingsLoading } = useAuthStore()

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchFounderApplications()
      fetchCpas()
      fetchAdminOrganizations()
    }
    if (user?.role === 'cpa' || user?.role === 'team_member') {
      fetchFilings()
      fetchDocuments()
    }
  }, [])

  const isAdmin = user?.role === 'admin'
  const isCpa = user?.role === 'cpa'
  const isTeamMember = user?.role === 'team_member'
  const canViewFilings = !isTeamMember || Boolean(user?.permissions?.canViewFilings)
  const canViewDocuments = !isTeamMember || Boolean(user?.permissions?.canViewDocuments)

  // Recent documents sorted by creation date (newest first)
  const recentDocs = [...documents]
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#111827]">Dashboard</h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          {isAdmin
            ? 'Platform oversight for founders, team members, and CPA coverage.'
            : isCpa
              ? 'Your assigned filing workload and review state.'
              : isTeamMember
                ? 'Your filings and recent document activity.'
                : 'Role dashboard.'}
        </p>
      </div>

      {isAdmin && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <div
              onClick={() => navigate('/admin/founder-applications')}
              className="rounded-xl border border-[#E5E7EB] bg-white p-5 cursor-pointer hover:border-[#D1D5DB] transition-colors"
            >
              <p className="text-sm text-[#6B7280]">Pending founder applications</p>
              <p className="mt-2 text-3xl font-semibold text-[#111827]">
                {founderApplications.filter((item: ApiFounderApplication) => item.status === 'pending').length}
              </p>
            </div>
            <div
              onClick={() => navigate('/admin/tracking')}
              className="rounded-xl border border-[#E5E7EB] bg-white p-5 cursor-pointer hover:border-[#D1D5DB] transition-colors"
            >
              <p className="text-sm text-[#6B7280]">Active CPAs</p>
              <p className="mt-2 text-3xl font-semibold text-[#111827]">{cpas.filter((c: ApiCpa) => c.role === 'cpa').length}</p>
            </div>
            <div
              onClick={() => navigate('/admin/organizations')}
              className="rounded-xl border border-[#E5E7EB] bg-white p-5 cursor-pointer hover:border-[#D1D5DB] transition-colors"
            >
              <p className="text-sm text-[#6B7280]">Organizations tracked</p>
              <p className="mt-2 text-3xl font-semibold text-[#111827]">
                {adminOrganizations.length}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-[#E5E7EB] bg-white p-5">
            <h2 className="text-lg font-medium text-[#111827] mb-4">Founder review queue</h2>
            <div className="space-y-3">
              {founderApplications.slice(0, 5).map((item: ApiFounderApplication) => (
                <div
                  key={item.id}
                  onClick={() => navigate('/admin/founder-applications')}
                  className="flex items-center justify-between rounded-lg border border-[#E5E7EB] p-4 cursor-pointer hover:bg-[#F9FAFB] transition-colors"
                >
                  <div>
                    <p className="font-medium text-[#111827]">{item.organizationName}</p>
                    <p className="text-sm text-[#6B7280]">{item.name} · {item.email}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${item.status === 'pending' ? 'bg-[#FEF3C7] text-[#92400E]' : item.status === 'approved' ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#FEE2E2] text-[#991B1B]'}`}>{item.status}</span>
                </div>
              ))}
              {founderApplicationsLoading && <p className="text-sm text-[#6B7280]">Loading...</p>}
            </div>
            {founderApplications.length > 5 && (
              <div className="mt-4 border-t border-[#E5E7EB] pt-3 text-center">
                <button
                  onClick={() => navigate('/admin/founder-applications')}
                  className="text-sm font-medium text-[#6C5CE7] hover:text-[#5A4BD1] transition-colors"
                >
                  View all applications &rarr;
                </button>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-[#E5E7EB] bg-white p-5">
            <h2 className="text-lg font-medium text-[#111827] mb-4">Platform organization overview</h2>
            <div className="space-y-3">
              {adminOrganizations.slice(0, 5).map((organization) => (
                <div
                  key={organization.id}
                  onClick={() => navigate(`/admin/organizations/${organization.id}`)}
                  className="flex items-center justify-between rounded-lg border border-[#E5E7EB] p-4 cursor-pointer hover:bg-[#F9FAFB] transition-colors"
                >
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
            {adminOrganizations.length > 5 && (
              <div className="mt-4 border-t border-[#E5E7EB] pt-3 text-center">
                <button
                  onClick={() => navigate('/admin/organizations')}
                  className="text-sm font-medium text-[#6C5CE7] hover:text-[#5A4BD1] transition-colors"
                >
                  View all organizations &rarr;
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {(isCpa || isTeamMember) && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            {canViewFilings && (
              <div
                onClick={() => navigate('/filings')}
                className="rounded-xl border border-[#E5E7EB] bg-white p-5 cursor-pointer hover:border-[#D1D5DB] transition-colors"
              >
                <p className="text-sm text-[#6B7280]">{isCpa ? 'Assigned filings' : 'Total filings'}</p>
                <p className="mt-2 text-3xl font-semibold text-[#111827]">{filings.length}</p>
              </div>
            )}
            {isCpa && (
              <div
                onClick={() => navigate('/cpa/review')}
                className="rounded-xl border border-[#E5E7EB] bg-white p-5 cursor-pointer hover:border-[#D1D5DB] transition-colors"
              >
                <p className="text-sm text-[#6B7280]">Needs CPA review</p>
                <p className="mt-2 text-3xl font-semibold text-[#111827]">
                  {filings.filter((f: ApiFiling) => f.status === 'cpa_review').length}
                </p>
              </div>
            )}
            {canViewDocuments && (
              <div
                onClick={() => navigate('/documents')}
                className="rounded-xl border border-[#E5E7EB] bg-white p-5 cursor-pointer hover:border-[#D1D5DB] transition-colors"
              >
                <p className="text-sm text-[#6B7280]">Documents</p>
                <p className="mt-2 text-3xl font-semibold text-[#111827]">{documents.length}</p>
              </div>
            )}
            {canViewFilings && (
              <div className="rounded-xl border border-[#E5E7EB] bg-white p-5">
                <p className="text-sm text-[#6B7280]">Ready for founder review</p>
                <p className="mt-2 text-3xl font-semibold text-[#111827]">
                  {filings.filter((f: ApiFiling) => f.status === 'founder_approval').length}
                </p>
              </div>
            )}
          </div>

          {/* Recent Documents */}
          {canViewDocuments && (
            <div className="rounded-xl border border-[#E5E7EB] bg-white p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-[#111827]">Recent Documents</h2>
                <button
                  onClick={() => navigate('/documents')}
                  className="text-sm text-[#6C5CE7] hover:underline"
                >
                  View all
                </button>
              </div>
              <div className="space-y-3">
                {recentDocs.length === 0 && !filingsLoading && (
                  <p className="text-sm text-[#6B7280]">No documents uploaded yet.</p>
                )}
                {recentDocs.map((doc: any) => (
                  <div
                    key={doc.id}
                    onClick={() => navigate('/documents')}
                    className="flex items-center gap-3 rounded-lg border border-[#E5E7EB] p-4 cursor-pointer hover:bg-[#F9FAFB] transition-colors"
                  >
                    <FolderOpen size={18} className="text-[#6C5CE7] flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[#111827] truncate">{doc.fileName}</p>
                      <p className="text-xs text-[#6B7280]">{doc.mimeType} · {formatDate(doc.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {doc.confidenceScore != null && (
                        <span className="text-xs text-[#6B7280]">{Math.round(doc.confidenceScore * 100)}%</span>
                      )}
                      {doc.reviewedByHuman && (
                        <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700">Reviewed</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filings list */}
          {canViewFilings && (
            <div className="rounded-xl border border-[#E5E7EB] bg-white p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-[#111827]">{isCpa ? 'Assigned filings' : 'Filings'}</h2>
                <button
                  onClick={() => navigate('/filings')}
                  className="text-sm text-[#6C5CE7] hover:underline"
                >
                  View all
                </button>
              </div>
              <div className="space-y-3">
                {filings.slice(0, 8).map((filing: ApiFiling) => (
                  <div
                    key={filing.id}
                    onClick={() => navigate(`/filings/${filing.id}`)}
                    className="flex items-center gap-3 rounded-lg border border-[#E5E7EB] p-4 cursor-pointer hover:bg-[#F9FAFB] transition-colors"
                  >
                    <FileText size={18} className="text-[#6C5CE7] flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[#111827]">{filing.formType} — {filing.formName}</p>
                      <p className="text-xs text-[#6B7280]">Tax year {filing.taxYear || '—'}</p>
                    </div>
                    <StatusBadge status={filing.status} />
                  </div>
                ))}
                {!filings.length && !filingsLoading && <p className="text-sm text-[#6B7280]">No filings assigned.</p>}
                {filingsLoading && <p className="text-sm text-[#6B7280]">Loading...</p>}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
