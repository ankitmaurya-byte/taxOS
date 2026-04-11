import { FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '@/lib/api'

export function AcceptInvitePage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [invite, setInvite] = useState<any>(null)
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const token = searchParams.get('token') || ''

  useEffect(() => {
    if (!token) {
      setError('Invalid invite link. No token provided.')
      setIsLoading(false)
      return
    }
    api.getInvite(token)
      .then(setInvite)
      .catch((err) => setError(err.message || 'The invite link is invalid or has expired.'))
      .finally(() => setIsLoading(false))
  }, [token])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      const result = await api.acceptInvite({ token, name, password }) as { message: string; token?: string; user?: any }
      if (result.token) {
        localStorage.setItem('taxos_token', result.token)
        // Redirect based on role
        const role = result.user?.role
        navigate(role === 'cpa' ? '/dashboard' : '/home', { replace: true })
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const roleLabel = invite?.role === 'cpa' ? 'CPA' : invite?.role === 'team_member' ? 'Team Member' : invite?.role || 'member'

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F9FAFB] p-6">
      <div className="w-full max-w-md rounded-xl border border-[#E5E7EB] bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-[#111827]">Accept Invite</h1>
        {invite && (
          <p className="mt-2 text-sm text-[#6B7280]">
            You've been invited to join <strong>{invite.organizationName}</strong> as a <strong>{roleLabel}</strong>.
            <br />
            <span className="text-xs text-[#9CA3AF]">This link expires in 1 hour of issue.</span>
          </p>
        )}

        {isLoading ? (
          <p className="mt-4 text-sm text-[#6B7280]">Validating your invite...</p>
        ) : (!invite || error) ? (
          <div className="mt-4 space-y-4">
            <div className="rounded-lg bg-[#FEE2E2] px-4 py-3 text-sm text-[#991B1B]">
              <p className="font-semibold">Unable to accept invite</p>
              <p className="mt-1">{error || 'This invite link is invalid or has already been used.'}</p>
            </div>
            <Link to="/login" className="inline-block text-[#6C5CE7] hover:underline text-sm font-medium">Return to Sign In</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {error && (
              <div className="rounded-lg bg-[#FEE2E2] px-3 py-2 text-sm text-[#991B1B]">{error}</div>
            )}
            <input
              value={invite?.email || ''}
              readOnly
              className="h-11 w-full rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 text-sm text-[#6B7280]"
            />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Your full name"
              className="h-11 w-full rounded-lg border border-[#E5E7EB] px-3 text-sm"
            />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              type="password"
              minLength={6}
              placeholder="Create a password (min. 6 characters)"
              className="h-11 w-full rounded-lg border border-[#E5E7EB] px-3 text-sm"
            />
            <input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              type="password"
              placeholder="Confirm password"
              className="h-11 w-full rounded-lg border border-[#E5E7EB] px-3 text-sm"
            />
            <button
              disabled={submitting}
              className="w-full rounded-lg bg-[#6C5CE7] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {submitting ? 'Setting up account...' : 'Accept & Create Account'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
