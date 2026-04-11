import { FormEvent, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '@/lib/api'

export function AcceptInvitePage() {
  const [searchParams] = useSearchParams()
  const [invite, setInvite] = useState<any>(null)
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const token = searchParams.get('token') || ''

  useEffect(() => {
    if (!token) return
    api.getInvite(token).then(setInvite).catch((err) => setError(err.message))
  }, [token])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    try {
      await api.acceptInvite({ token, name, password })
      setSuccess('Invite accepted. Your account is active and ready to sign in.')
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F9FAFB] p-6">
      <div className="w-full max-w-md rounded-xl border border-[#E5E7EB] bg-white p-8">
        <h1 className="text-2xl font-semibold text-[#111827]">Accept Invite</h1>
        {invite && <p className="mt-2 text-sm text-[#6B7280]">Join {invite.organizationName} as a {invite.role}.</p>}
        {error && <p className="mt-4 rounded-lg bg-[#FEE2E2] px-3 py-2 text-sm text-[#991B1B]">{error}</p>}
        {success ? (
          <div className="mt-4 space-y-4">
            <p className="rounded-lg bg-[#DCFCE7] px-3 py-2 text-sm text-[#166534]">{success}</p>
            <Link to="/login" className="inline-flex rounded-lg bg-[#6C5CE7] px-4 py-2 text-sm font-medium text-white">Go to Sign In</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <input value={invite?.email || ''} readOnly className="h-11 w-full rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 text-sm" />
            <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Full name" className="h-11 w-full rounded-lg border border-[#E5E7EB] px-3 text-sm" />
            <input value={password} onChange={(e) => setPassword(e.target.value)} required type="password" placeholder="Set password" className="h-11 w-full rounded-lg border border-[#E5E7EB] px-3 text-sm" />
            <button className="w-full rounded-lg bg-[#6C5CE7] px-4 py-2 text-sm font-medium text-white">Accept Invite</button>
          </form>
        )}
      </div>
    </div>
  )
}
