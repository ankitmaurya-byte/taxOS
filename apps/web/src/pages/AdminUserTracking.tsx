import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { Search, X } from 'lucide-react'
import { Pagination } from '@/components/Pagination'

const PAGE_SIZE = 15

export function AdminUserTracking() {
  const queryClient = useQueryClient()
  const { data: users, isLoading } = useQuery({
    queryKey: ['system-users'],
    queryFn: () => api.admin.getSystemUsers(),
  })

  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const suspendMutation = useMutation({
    mutationFn: (id: string) => api.admin.deleteUser(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['system-users'] })
  })

  const [showInviteCpa, setShowInviteCpa] = useState(false)
  const [cpaEmail, setCpaEmail] = useState('')

  const inviteCpaMutation = useMutation({
    mutationFn: (email: string) => api.admin.createCpa({ email }),
    onSuccess: () => {
      setShowInviteCpa(false)
      setCpaEmail('')
      queryClient.invalidateQueries({ queryKey: ['system-users'] })
    },
  })

  if (isLoading) return <div className="p-6 text-[#64748d]">Loading users...</div>

  let filteredUsers = (users || []) as any[]

  if (filter !== 'all') {
    filteredUsers = filteredUsers.filter((user: any) => user.role === filter)
  }

  if (statusFilter) {
    filteredUsers = filteredUsers.filter((user: any) => user.status === statusFilter)
  }

  if (search.trim()) {
    const q = search.toLowerCase()
    filteredUsers = filteredUsers.filter((user: any) =>
      user.name?.toLowerCase().includes(q) ||
      user.email?.toLowerCase().includes(q) ||
      user.orgName?.toLowerCase().includes(q)
    )
  }

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paginated = filteredUsers.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  function handleSearch(v: string) { setSearch(v); setPage(1) }
  function handleFilter(v: string) { setFilter(v); setPage(1) }
  function handleStatusFilter(v: string | null) { setStatusFilter(v); setPage(1) }

  return (
    <div className="space-y-6 p-3 sm:p-5 md:p-6 lg:p-8 max-w-7xl mx-auto relative">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold text-[#061b31]">User Management</h1>
          <p className="mt-1 text-sm text-[#64748d]">Full control over founders, team members, and CPAs.</p>
        </div>
        <button
          onClick={() => setShowInviteCpa(true)}
          className="px-3 sm:px-4 py-2 bg-[#533afd] text-white rounded-lg font-medium hover:bg-[#5a4bce] transition-colors"
        >
          + Invite CPA
        </button>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748d]" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by name, email, org..."
            className="h-9 w-full rounded-lg border border-[#e5edf5] bg-white pl-9 pr-8 text-sm text-[#061b31] placeholder:text-[#64748d] outline-none focus:ring-2 focus:ring-[#533afd] focus:border-transparent"
          />
          {search && (
            <button onClick={() => handleSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748d] hover:text-[#273951]">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Role filter */}
        <div className="flex flex-wrap gap-1.5">
          {['all', 'founder', 'team_member', 'cpa', 'admin'].map((role) => (
            <button
              key={role}
              onClick={() => handleFilter(role)}
              className={`h-9 px-3 rounded-lg text-xs font-medium transition-colors ${
                filter === role
                  ? 'bg-[#061b31] text-white'
                  : 'bg-white text-[#273951] border border-[#e5edf5] hover:bg-[#f6f9fc]'
              }`}
            >
              {role === 'all' ? 'All Roles' : role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => handleStatusFilter(null)}
            className={`h-9 px-3 rounded-lg text-xs font-medium transition-colors ${
              !statusFilter ? 'bg-[#533afd] text-white' : 'bg-white text-[#273951] border border-[#e5edf5] hover:bg-[#f6f9fc]'
            }`}
          >
            All Status
          </button>
          {['active', 'pending_admin_review', 'suspended'].map((status) => (
            <button
              key={status}
              onClick={() => handleStatusFilter(status)}
              className={`h-9 px-3 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-[#533afd] text-white'
                  : 'bg-white text-[#273951] border border-[#e5edf5] hover:bg-[#f6f9fc]'
              }`}
            >
              {status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <p className="text-xs text-[#64748d]">{filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found</p>


      <div className="rounded-md border border-[#e5edf5] bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[#273951]">
            <thead className="bg-[#f6f9fc] text-xs uppercase text-[#64748d] border-b border-[#e5edf5]">
              <tr>
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Email</th>
                <th className="px-6 py-4 font-medium">Role</th>
                <th className="px-6 py-4 font-medium">Organization</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5edf5]">
              {paginated.map((user: any) => (
                <tr key={user.id} className="hover:bg-[#f6f9fc]/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-[#061b31]">
                    <Link to={`/admin/users/${user.id}`} className="text-[#533afd] hover:underline">
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
                    {user.orgName ? <span className="text-[#273951]">{user.orgName}</span> : <span className="text-[#64748d] italic">Unassigned</span>}
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
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-[#64748d]">
                    {search || filter !== 'all' || statusFilter ? 'No users match your filters.' : 'No users found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination
        page={safePage}
        totalPages={totalPages}
        totalItems={filteredUsers.length}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        itemLabel="users"
      />

      {showInviteCpa && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-5 sm:p-6 rounded-md w-full max-w-[400px] max-w-[calc(100vw-1.5rem)] shadow-xl">
            <h2 className="text-xl font-semibold mb-1">Invite CPA</h2>
            <p className="text-sm text-[#64748d] mb-5">The CPA will receive an email invitation to set up their account.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#273951] mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="cpa@example.com"
                  className="w-full p-2.5 border rounded-lg text-sm"
                  value={cpaEmail}
                  onChange={e => setCpaEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && cpaEmail.trim() && inviteCpaMutation.mutate(cpaEmail.trim())}
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => { setShowInviteCpa(false); setCpaEmail('') }} className="px-4 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
              <button
                onClick={() => inviteCpaMutation.mutate(cpaEmail.trim())}
                disabled={!cpaEmail.trim() || inviteCpaMutation.isPending}
                className="px-4 py-2 text-sm bg-[#533afd] text-white rounded-lg hover:bg-[#5a4bce] disabled:opacity-50"
              >
                {inviteCpaMutation.isPending ? 'Sending...' : 'Send Invite'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
