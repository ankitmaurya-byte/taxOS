import { useQuery } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { api } from '@/lib/api'

export function AdminOrganizationDetails() {
  const { id } = useParams<{ id: string }>()
  const { data: org, isLoading } = useQuery({
    queryKey: ['admin-org', id],
    queryFn: () => api.admin.getOrganization(id!),
    enabled: !!id,
  })

  if (isLoading) return <div className="p-6">Loading organization details...</div>
  if (!org) return <div className="p-6 text-red-500">Organization not found</div>

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <Link to="/admin/organizations" className="text-sm text-[#6C5CE7] hover:underline mb-2 inline-block">
          &larr; Back to Organizations
        </Link>
        <h1 className="text-3xl font-bold text-[#111827]">{org.name}</h1>
        <p className="mt-1 text-sm text-[#6B7280]">Legal: {org.legalName || 'N/A'} • Plan: {org.plan}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4 text-[#111827]">Associated Users</h2>
          <div className="space-y-3">
            {org.users?.map((u: any) => (
              <div key={u.id} className="flex justify-between items-center p-3 bg-[#F9FAFB] rounded-lg">
                <div>
                  <Link to={`/admin/users/${u.id}`} className="font-medium text-[#6C5CE7] hover:underline">{u.name}</Link>
                  <p className="text-xs text-[#6B7280]">{u.email}</p>
                </div>
                <span className="px-2 py-1 text-xs font-medium bg-[#E0E7FF] text-[#4338CA] rounded">{u.role}</span>
              </div>
            ))}
            {org.users?.length === 0 && <p className="text-sm text-[#6B7280]">No users found.</p>}
          </div>
        </div>

        <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4 text-[#111827]">Entities & Filings</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-[#374151] mb-2 uppercase tracking-wider">Entities</h3>
              {org.entities?.map((e: any) => (
                <div key={e.id} className="mb-2 p-3 bg-[#F0FDF4] rounded-lg border border-[#BBF7D0]">
                  <p className="font-medium text-[#166534]">{e.legalName}</p>
                  <p className="text-xs text-[#15803D]">{e.entityType} • {e.stateOfIncorporation}</p>
                </div>
              ))}
              {org.entities?.length === 0 && <p className="text-xs text-[#6B7280]">No entities.</p>}
            </div>
            
            <div className="mt-4">
              <h3 className="text-sm font-medium text-[#374151] mb-2 uppercase tracking-wider">Filings</h3>
              {org.filings?.map((f: any) => (
                <div key={f.id} className="mb-2 p-3 bg-[#FFFBEB] rounded-lg border border-[#FEF3C7]">
                  <p className="font-medium text-[#92400E]">{f.formName} ({f.formType})</p>
                  <p className="text-xs text-[#B45309]">Status: {f.status}</p>
                </div>
              ))}
              {org.filings?.length === 0 && <p className="text-xs text-[#6B7280]">No filings.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
