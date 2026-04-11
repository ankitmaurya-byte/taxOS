import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { useState } from 'react'
import { api } from '@/lib/api'

export function AdminUserDetails() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  
  const { data: user, isLoading } = useQuery({
    queryKey: ['admin-user', id],
    queryFn: () => api.admin.getUser(id!),
    enabled: !!id,
  })

  // Quick edit state (using a simplistic approach for rapid MVP implementation)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', email: '', role: '', status: '' })

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.admin.updateUser(id!, data),
    onSuccess: () => {
      setIsEditing(false)
      queryClient.invalidateQueries({ queryKey: ['admin-user', id] })
    }
  })

  if (isLoading) return <div className="p-6">Loading user details...</div>
  if (!user) return <div className="p-6 text-red-500">User not found</div>

  const handleEditInit = () => {
    setEditForm({ name: user.name, email: user.email, role: user.role, status: user.status })
    setIsEditing(true)
  }

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <Link to="/admin/tracking" className="text-sm text-[#6C5CE7] hover:underline mb-2 inline-block">
          &larr; Back to Users
        </Link>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-[#111827]">{user.name}</h1>
            <p className="mt-1 text-sm text-[#6B7280]">{user.email} • {user.role}</p>
          </div>
          <button onClick={handleEditInit} className="px-4 py-2 border border-[#E5E7EB] rounded bg-white hover:bg-gray-50 text-sm font-medium">
            Edit Details
          </button>
        </div>
      </div>

      {isEditing && (
        <div className="mb-6 bg-white border p-4 rounded-xl space-y-3">
          <h2 className="text-sm font-bold">Edit User Details</h2>
          <div className="flex gap-2">
            <input className="border p-2 rounded text-sm w-full" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
            <input className="border p-2 rounded text-sm w-full" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} />
            <select className="border p-2 rounded text-sm w-full" value={editForm.role} onChange={e => setEditForm({...editForm, role: e.target.value})}>
              <option value="founder">Founder</option><option value="team_member">Team Member</option><option value="cpa">CPA</option><option value="admin">Admin</option>
            </select>
            <select className="border p-2 rounded text-sm w-full" value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})}>
              <option value="active">Active</option><option value="suspended">Suspended</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setIsEditing(false)} className="px-3 py-1 bg-gray-100 rounded text-xs hover:bg-gray-200">Cancel</button>
            <button onClick={() => updateMutation.mutate(editForm)} className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700">Save</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4 text-[#111827]">Organization Association</h2>
          {user.organization ? (
            <div className="p-4 bg-[#F8FAFC] rounded border">
              <Link to={`/admin/organizations/${user.organization.id}`} className="font-semibold text-lg text-[#6C5CE7] hover:underline">
                {user.organization.name}
              </Link>
              <p className="text-sm text-[#6B7280]">Plan: {user.organization.plan}</p>
            </div>
          ) : (
            <p className="text-sm text-[#9CA3AF]">Not natively attached to an organization.</p>
          )}

          {user.role === 'cpa' && user.cpaOrganizations?.length > 0 && (
             <div className="mt-4">
               <h3 className="text-sm font-medium mb-2">Assigned Organizations (CPA Access)</h3>
               {user.cpaOrganizations.map((o: any) => (
                 <div key={o.id} className="bg-indigo-50 p-2 text-sm text-indigo-900 border border-indigo-100 rounded mb-1">
                   <Link to={`/admin/organizations/${o.id}`} className="hover:underline">{o.name}</Link>
                 </div>
               ))}
             </div>
          )}
        </div>

        {user.role === 'cpa' && (
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4 text-[#111827]">Assigned Filings</h2>
            <div className="space-y-3">
              {user.assignedFilings?.map((f: any) => (
                <div key={f.id} className="p-3 bg-orange-50 border border-orange-100 rounded">
                  <p className="font-medium text-orange-900">{f.formName}</p>
                  <p className="text-xs text-orange-700">Status: {f.status}</p>
                </div>
              ))}
              {user.assignedFilings?.length === 0 && <p className="text-sm text-gray-500">No active assigned filings.</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
