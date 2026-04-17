import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronRight, HelpCircle } from 'lucide-react'
import { api } from '@/lib/api'

function TestimonialPanel() {
  return (
    <div className="relative hidden min-h-screen overflow-hidden bg-[#1c1e54] text-white lg:flex lg:flex-col lg:items-center lg:justify-center lg:px-12">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(83,58,253,0.35),transparent_50%)]" />
      <div className="relative w-full max-w-[300px] rounded-[6px] bg-white px-8 py-10 text-center text-[#273951]" style={{ boxShadow: 'rgba(50,50,93,0.25) 0px 30px 45px -30px, rgba(0,0,0,0.1) 0px 18px 36px -18px' }}>
        <p className="text-[16px] font-light leading-[1.6]">"Inkle went above and beyond, offering prompt assistance. Highly recommended for all startups."</p>
        <div className="mx-auto mt-6 flex h-10 w-10 items-center justify-center rounded-sm bg-[#15be53] text-white">
          <span className="text-[11px] font-normal">RW</span>
        </div>
        <p className="mt-3 text-[14px] font-normal text-[#061b31]">Ryan Wenger</p>
        <p className="mt-0.5 text-[12px] text-[#64748d]">Co-Founder at Inhouse</p>
      </div>
      <p className="relative mt-10 max-w-[360px] text-center text-[13px] font-light leading-6 text-[rgba(255,255,255,0.6)]">Used by 500+ US startups to stay compliant, including over 5% of YC companies.</p>
    </div>
  )
}

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
    if (!acceptedTerms) { setError('Acceptance of terms and conditions is required'); return }
    setError('')
    setLoading(true)
    try {
      await api.auth.registerFounder({ email, password, name, organizationName })
      navigate(`/verify-email?email=${encodeURIComponent(email)}`)
    } catch (err: any) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[1.08fr_0.92fr]">
      <div className="flex min-h-screen flex-col px-4 sm:px-6 py-4 sm:py-6 lg:px-16 lg:py-10">
        <div className="flex items-center justify-between">
          <div className="text-[26px] font-light tracking-[-0.26px] text-[#533afd]">inkle</div>
          <a
            href="mailto:support@inkle.io?subject=TaxOS signup help"
            className="flex items-center gap-1.5 text-[14px] font-normal text-[#64748d] hover:text-[#533afd] transition-colors"
          >
            <HelpCircle size={15} strokeWidth={1.8} /> Help
          </a>
        </div>

        <div className="flex flex-1 items-center">
          <div className="w-full max-w-md">
            <h1 className="text-xl sm:text-[26px] font-light tracking-[-0.26px] text-[#061b31]">Create your founder account</h1>
            <p className="mt-2 text-[14px] text-[#64748d]">
              Already have an account? <Link to="/login" className="font-normal text-[#533afd] hover:underline">Sign in <ChevronRight className="inline" size={13} /></Link>
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <div>
                <label className="mb-1.5 block text-[14px] font-normal text-[#273951]">Full name</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Alex Morgan" className="h-10 w-full rounded-sm border border-[#e5edf5] bg-white px-3 text-[14px] text-[#061b31] outline-none placeholder:text-[#64748d] focus:border-[#533afd] transition-colors" required />
              </div>
              <div>
                <label className="mb-1.5 block text-[14px] font-normal text-[#273951]">Organization name</label>
                <input value={organizationName} onChange={e => setOrganizationName(e.target.value)} placeholder="Acme Technologies" className="h-10 w-full rounded-sm border border-[#e5edf5] bg-white px-3 text-[14px] text-[#061b31] outline-none placeholder:text-[#64748d] focus:border-[#533afd] transition-colors" required />
              </div>
              <div>
                <label className="mb-1.5 block text-[14px] font-normal text-[#273951]">Work email address</label>
                <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="you@company.com" className="h-10 w-full rounded-sm border border-[#e5edf5] bg-white px-3 text-[14px] text-[#061b31] outline-none placeholder:text-[#64748d] focus:border-[#533afd] transition-colors" required />
              </div>
              <div>
                <label className="mb-1.5 block text-[14px] font-normal text-[#273951]">Password</label>
                <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Create a password" className="h-10 w-full rounded-sm border border-[#e5edf5] bg-white px-3 text-[14px] text-[#061b31] outline-none placeholder:text-[#64748d] focus:border-[#533afd] transition-colors" required />
              </div>

              <label className="flex items-start gap-2.5 pt-1 text-[14px] text-[#273951] cursor-pointer">
                <input type="checkbox" checked={acceptedTerms} onChange={e => setAcceptedTerms(e.target.checked)} className="mt-0.5 h-4 w-4 rounded-sm border-[#e5edf5] accent-[#533afd]" />
                <span>I agree to the <span className="text-[#533afd]">Terms of Service</span> and <span className="text-[#533afd]">Privacy Policy</span>.</span>
              </label>

              {error && <p className="text-[13px] text-[#ea2261]">{error}</p>}

              <button disabled={loading} className="flex h-10 w-full items-center justify-center rounded-sm bg-[#533afd] text-[14px] font-normal text-white hover:bg-[#4434d4] disabled:opacity-50 transition-colors">
                {loading ? 'Sending verification...' : 'Continue with verification'}
              </button>
            </form>
          </div>
        </div>
      </div>

      <TestimonialPanel />
    </div>
  )
}
