import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { format } from 'date-fns'

export function AdminUserTracking() {
  const queryClient = useQueryClient()
  const { data: users, isLoading, error } = useQuery({
    queryKey: ['system-users'],
    queryFn: () => api.admin.getSystemUsers(),
  })
  
  const [filter, setFilter] = useState<string>('all')

  const suspendMutation = useMutation({
    mutationFn: (id: string) => api.admin.deleteUser(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['system-users'] })
  })

  // Quick state for create user form modal placeholder (in real scenario use Dialog)
  const [showCreate, setShowCreate] = useState(false)
  const [formData, setFormData] = useState({ name: '', email: '', role: 'founder', password: 'Password123!', orgId: '' })
  
  const createMutation = useMutation({
    mutationFn: (data: any) => api.admin.createUser(data),
    onSuccess: () => {
      setShowCreate(false)
      queryClient.invalidateQueries({ queryKey: ['system-users'] })
    }
  })

  if (isLoading) return <div className="p-6 text-[#6B7280]">Loading users...</div>

  const filteredUsers = users?.filter((user: any) => filter === 'all' || user.role === filter) || []

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto relative">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-[#111827]">User Management</h1>
          <p className="mt-1 text-sm text-[#6B7280]">Full control over founders, team members, and CPAs.</p>
        </div>
        <button 
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-[#6C5CE7] text-white rounded-lg font-medium hover:bg-[#5a4bce] transition-colors"
        >
          + Create User
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        {['all', 'founder', 'team_member', 'cpa', 'admin'].map((role) => (
          <button
            key={role}
            onClick={() => setFilter(role)}
            className={`px-4 py-2 text-sm font-medium rounded-lg ${
              filter === role 
                ? 'bg-[#111827] text-white' 
                : 'bg-white text-[#374151] border border-[#E5E7EB] hover:bg-[#F9FAFB]'
            }`}
          >
            {role === 'all' ? 'All Roles' : role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-[#E5E7EB] bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[#374151]">
            <thead className="bg-[#F9FAFB] text-xs uppercase text-[#6B7280] border-b border-[#E5E7EB]">
              <tr>
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Email</th>
                <th className="px-6 py-4 font-medium">Role</th>
                <th className="px-6 py-4 font-medium">Organization</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {filteredUsers.map((user: any) => (
                <tr key={user.id} className="hover:bg-[#F9FAFB]/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-[#111827]">
                    <Link to={`/admin/users/${user.id}`} className="text-[#6C5CE7] hover:underline">
                      {user.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4">{user.email}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#E0E7FF] text-[#4338CA]">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {user.orgName ? <span className="text-[#374151]">{user.orgName}</span> : <span className="text-[#9CA3AF] italic">Unassigned</span>}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${
                      user.status === 'active' ? 'bg-[#DEF7EC] text-[#03543F]' : 
                      user.status === 'suspended' ? 'bg-[#FDE8E8] text-[#9B1C1C]' : 'bg-[#FDF6B2] text-[#723B13]'
                    }`}>
                      {user.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => suspendMutation.mutate(user.id)}
                      disabled={user.status === 'suspended'}
                      className={`text-xs font-medium px-2 py-1 rounded transition-colors ${
                        user.status === 'suspended' ? 'text-gray-400 bg-gray-100 cursor-not-allowed' : 'text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100'
                      }`}
                    >
                      Suspend
                    </button>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-[#6B7280]">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-[400px]">
            <h2 className="text-xl font-semibold mb-4">Create New User</h2>
            <div className="space-y-4">
              <input type="text" placeholder="Full Name" className="w-full p-2 border rounded" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              <input type="email" placeholder="Email Address" className="w-full p-2 border rounded" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              <select className="w-full p-2 border rounded" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                <option value="founder">Founder</option>
                <option value="team_member">Team Member</option>
                <option value="cpa">CPA</option>
                <option value="admin">Admin</option>
              </select>
              <input type="text" placeholder="Organization ID (Optional)" className="w-full p-2 border rounded" value={formData.orgId} onChange={e => setFormData({...formData, orgId: e.target.value})} />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm bg-gray-100 rounded hover:bg-gray-200">Cancel</button>
              <button onClick={() => createMutation.mutate(formData)} className="px-4 py-2 text-sm bg-[#6C5CE7] text-white rounded hover:bg-[#5a4bce]">Confirm Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
