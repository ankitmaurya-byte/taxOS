import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronRight, HelpCircle } from 'lucide-react'
import { api } from '@/lib/api'

export function FounderSignupPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!acceptedTerms) {
      setError('Acceptance of terms and conditions is required')
      return
    }
    setError('')
    setLoading(true)
    try {
      await api.auth.registerFounder({ email, password, name, organizationName })
      navigate(`/verify-email?email=${encodeURIComponent(email)}`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-screen bg-[#FCFBFF] lg:grid-cols-[1.08fr_0.92fr]">
      <div className="flex min-h-screen flex-col px-6 py-6 lg:px-16 lg:py-10">
        <div className="flex items-center justify-between">
          <div className="text-3xl font-semibold tracking-[-0.03em] text-[#5B2FFF]">inkle</div>
          <button className="flex items-center gap-1.5 text-sm text-[#6F6A8B]"><HelpCircle size={15} /> Help</button>
        </div>

        <div className="flex flex-1 items-center">
          <div className="w-full max-w-md">
            <h1 className="text-3xl font-semibold tracking-[-0.02em] text-[#1E174A]">Create your founder account</h1>
            <p className="mt-2 text-sm text-[#6F6A8B]">
              Already have an account? <Link to="/login" className="font-medium text-[#5B2FFF]">Sign in <ChevronRight className="inline" size={14} /></Link>
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="h-10 w-full rounded-lg border border-[#DED8EB] bg-white px-3.5 text-sm text-[#312A56] outline-none placeholder:text-[#ABA7BE] focus:ring-2 focus:ring-[#6C5CE7]" required />
              <input value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} placeholder="Organization name" className="h-10 w-full rounded-lg border border-[#DED8EB] bg-white px-3.5 text-sm text-[#312A56] outline-none placeholder:text-[#ABA7BE] focus:ring-2 focus:ring-[#6C5CE7]" required />
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Work email address" className="h-10 w-full rounded-lg border border-[#DED8EB] bg-white px-3.5 text-sm text-[#312A56] outline-none placeholder:text-[#ABA7BE] focus:ring-2 focus:ring-[#6C5CE7]" required />
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Create password" className="h-10 w-full rounded-lg border border-[#DED8EB] bg-white px-3.5 text-sm text-[#312A56] outline-none placeholder:text-[#ABA7BE] focus:ring-2 focus:ring-[#6C5CE7]" required />

              <label className="flex items-start gap-2.5 pt-1 text-sm text-[#4E4970]">
                <input type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-[#DAD4EA]" />
                <span>I agree to the <span className="text-[#5B2FFF]">Terms of Service</span> and <span className="text-[#5B2FFF]">Privacy Policy</span>.</span>
              </label>
              {error && <p className="text-sm text-[#D94A5B]">{error}</p>}

              <button disabled={loading} className="flex h-10 w-full items-center justify-center rounded-lg bg-[linear-gradient(90deg,#5A2CFF_0%,#6F32FF_100%)] text-sm font-medium text-white disabled:opacity-50">
                {loading ? 'Sending verification...' : 'Continue with verification'}
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="hidden min-h-screen bg-[#2D116C] lg:block" />
    </div>
  )
}
