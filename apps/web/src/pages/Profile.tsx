import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'

export function ProfilePage() {
  const { profile, profileLoading, fetchProfile } = useAuthStore()

  useEffect(() => {
    if (!profile && !profileLoading) {
      fetchProfile()
    }
  }, [profile, profileLoading])

  if (profileLoading) {
    return <div className="p-6 text-sm text-[#6B7280]">Loading profile...</div>
  }

  if (!profile) {
    return <div className="p-6 text-sm text-[#6B7280]">Profile not available.</div>
  }

  return (
    <div className="space-y-6 p-6">
      <div className="rounded-xl border border-[#E5E7EB] bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-[#111827]">Profile</h1>
            <p className="mt-1 text-sm text-[#6B7280]">Role, organization, and permission summary.</p>
          </div>
          {profile.canCreateAccount && (
            <Link to="/profile/create-account" className="rounded-lg bg-[#6C5CE7] px-4 py-2 text-sm font-medium text-white">
              {profile.role === 'admin' ? 'Create CPA' : 'Create Account'}
            </Link>
          )}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-[#6B7280]">Name</p>
            <p className="mt-1 text-sm text-[#111827]">{profile.name}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-[#6B7280]">Email</p>
            <p className="mt-1 text-sm text-[#111827]">{profile.email}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-[#6B7280]">Role</p>
            <p className="mt-1 text-sm text-[#111827]">{profile.role}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-[#6B7280]">Organization</p>
            <p className="mt-1 text-sm text-[#111827]">{profile.organization?.name || 'Not assigned'}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[#E5E7EB] bg-white p-6">
        <h2 className="text-lg font-medium text-[#111827]">Permissions</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {Object.entries(profile.permissions || {}).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between rounded-lg bg-[#F9FAFB] px-4 py-3">
              <span className="text-sm text-[#374151]">{key}</span>
              <span className={`text-xs font-medium ${value ? 'text-green-600' : 'text-[#9CA3AF]'}`}>
                {value ? 'Allowed' : 'Blocked'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
