import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { format } from 'date-fns'

export function AdminOrganizations() {
  const queryClient = useQueryClient()
  const { data: orgs, isLoading } = useQuery({
    queryKey: ['admin-organizations'],
    queryFn: () => api.admin.getOrganizationOverview(),
  })

  const suspendMutation = useMutation({
    mutationFn: (id: string) => api.admin.deleteOrganization(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-organizations'] })
  })

  if (isLoading) return <div className="p-6">Loading organizations...</div>

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-[#111827]">Organizations</h1>
          <p className="mt-1 text-sm text-[#6B7280]">Manage multitenant organizations.</p>
        </div>
      </div>

      <div className="rounded-xl border border-[#E5E7EB] bg-white overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm text-[#374151]">
          <thead className="bg-[#F9FAFB] text-xs uppercase text-[#6B7280] border-b border-[#E5E7EB]">
            <tr>
              <th className="px-6 py-4 font-medium">Name</th>
              <th className="px-6 py-4 font-medium">Founders</th>
              <th className="px-6 py-4 font-medium">Team</th>
              <th className="px-6 py-4 font-medium">CPAs</th>
              <th className="px-6 py-4 font-medium">Created</th>
              <th className="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {orgs?.map((org: any) => (
              <tr key={org.id} className="hover:bg-[#F9FAFB]/50 transition-colors">
                <td className="px-6 py-4 font-medium text-[#111827]">
                  <Link to={`/admin/organizations/${org.id}`} className="text-[#6C5CE7] hover:underline">
                    {org.name}
                  </Link>
                </td>
                <td className="px-6 py-4">{org.founderCount}</td>
                <td className="px-6 py-4">{org.teamMemberCount}</td>
                <td className="px-6 py-4">{org.assignedCpaCount}</td>
                <td className="px-6 py-4">{format(new Date(org.createdAt), 'MMM d, yyyy')}</td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => suspendMutation.mutate(org.id)}
                    className="text-xs font-medium text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-2 py-1 rounded transition-colors"
                  >
                    {org.name.includes('[SUSPENDED]') ? 'Restore' : 'Suspend'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
