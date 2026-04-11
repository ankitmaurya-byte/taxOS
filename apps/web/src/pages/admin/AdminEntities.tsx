import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'

export function AdminEntities() {
  const { data: entities, isLoading } = useQuery({
    queryKey: ['admin-global-entities'],
    queryFn: () => api.admin.getGlobalEntities(),
  })

  if (isLoading) return <div className="p-6">Loading global entities...</div>

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold text-[#111827]">Global Entities</h1>
        <p className="mt-1 text-sm text-[#6B7280]">Observe structured corporate subsidiaries and branches.</p>
      </div>

      <div className="rounded-xl border border-[#E5E7EB] bg-white overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm text-[#374151]">
          <thead className="bg-[#F9FAFB] text-xs uppercase text-[#6B7280] border-b border-[#E5E7EB]">
            <tr>
              <th className="px-6 py-4">Legal Name</th>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4">State</th>
              <th className="px-6 py-4">EIN</th>
              <th className="px-6 py-4">Parent Organization</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {entities?.map((e: any) => (
              <tr key={e.id} className="hover:bg-[#F9FAFB]/50">
                <td className="px-6 py-4 font-medium text-[#111827]">{e.legalName}</td>
                <td className="px-6 py-4">{e.entityType}</td>
                <td className="px-6 py-4">{e.stateOfIncorporation}</td>
                <td className="px-6 py-4 font-mono text-xs">{e.ein || 'Pending'}</td>
                <td className="px-6 py-4 text-[#6C5CE7] hover:underline">
                  <Link to={`/admin/organizations/${e.orgId}`}>{e.orgName}</Link>
                </td>
              </tr>
            ))}
            {entities?.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-gray-500">No entities found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
