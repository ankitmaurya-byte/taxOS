import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'

export function AdminFilings() {
  const { data: filings, isLoading } = useQuery({
    queryKey: ['admin-global-filings'],
    queryFn: () => api.admin.getGlobalFilings(),
  })

  if (isLoading) return <div className="p-6">Loading global filings...</div>

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold text-[#111827]">Global Filings</h1>
        <p className="mt-1 text-sm text-[#6B7280]">View all IRS filings securely mapped across the entire system.</p>
      </div>

      <div className="rounded-xl border border-[#E5E7EB] bg-white overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm text-[#374151]">
          <thead className="bg-[#F9FAFB] text-xs uppercase text-[#6B7280] border-b border-[#E5E7EB]">
            <tr>
              <th className="px-6 py-4">Filing</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Organization</th>
              <th className="px-6 py-4">Entity</th>
              <th className="px-6 py-4">CPA Assigned</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {filings?.map((f: any) => (
              <tr key={f.id} className="hover:bg-[#F9FAFB]/50">
                <td className="px-6 py-4 font-medium text-[#111827]">{f.formName} ({f.formType})</td>
                <td className="px-6 py-4">
                   <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#E0E7FF] text-[#4338CA]">
                      {f.status}
                   </span>
                </td>
                <td className="px-6 py-4 text-[#6C5CE7] hover:underline">
                  <Link to={`/admin/organizations/${f.orgId}`}>{f.orgName}</Link>
                </td>
                <td className="px-6 py-4 italic">{f.legalName}</td>
                <td className="px-6 py-4 {f.cpaAssignedId ? 'text-[#111827]' : 'text-gray-400'}">{f.cpaName}</td>
              </tr>
            ))}
            {filings?.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-gray-500">No filings found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
