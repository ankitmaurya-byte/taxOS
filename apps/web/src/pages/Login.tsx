import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { HelpCircle, ChevronRight } from 'lucide-react'
import { useAuthStore } from '@/stores/auth'
import { getPostLoginPath } from '@/lib/access'

function MarketingPanel() {
  return (
    <div className="relative hidden min-h-screen overflow-hidden bg-[#2D116C] px-16 py-18 text-white lg:flex lg:flex-col lg:justify-between">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(125,77,255,0.5),transparent_32%)]" />
      <div className="relative ml-auto max-w-[520px] pt-10">
        <h2 className="text-[46px] font-semibold leading-[1.1] tracking-[-0.03em] text-[#F39BE5]">Instant business insights with Inkle AI</h2>
        <p className="mt-6 text-[18px] leading-9 text-white/90">It calculates your burn rate, cash flow and more. No more manual tracking or number crunching. You get a complete health check of your business in one place.</p>
      </div>
      <div className="relative mx-auto mb-12 mt-10 h-[410px] w-[86%] rounded-[32px] border border-white/15 bg-white/95 p-6 shadow-[0_40px_120px_rgba(0,0,0,0.25)]">
        <div className="text-[30px] font-semibold text-[#1E174A]">Business Insights</div>
        <div className="mt-6 grid gap-5 md:grid-cols-[1.3fr_1fr]">
          <div className="rounded-[22px] border border-[#ECE7FB] bg-[#FBFAFF] p-5">
            <div className="text-[15px] font-medium text-[#1E174A]">Cash Flow</div>
            <div className="mt-5 grid grid-cols-3 gap-4 text-[#4E476F]">
              {['Revenue', 'Expense', 'Profit'].map((label, index) => (
                <div key={label}>
                  <p className="text-xs text-[#8C86A6]">{label}</p>
                  <p className="mt-2 text-[26px] font-semibold">{['$240,000', '$140,000', '$100,000'][index]}</p>
                </div>
              ))}
            </div>
            <div className="mt-7 flex h-[140px] items-end justify-between gap-3">
              {[56, 42, 58, 44, 50, 70].map((height, index) => (
                <div key={index} className="flex flex-1 items-end gap-1">
                  <div className="w-1/2 rounded-t-md bg-[#B8A7FF]" style={{ height }} />
                  <div className="w-1/2 rounded-t-md bg-[#D6D1E6]" style={{ height: height * 0.72 }} />
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[22px] border border-[#ECE7FB] bg-[#FFFFFF] p-5">
            <div className="text-[15px] font-medium text-[#1E174A]">Financial Health</div>
            <div className="mt-7 space-y-8 text-[#4E476F]">
              <div>
                <p className="text-xs text-[#8C86A6]">Net Burn Rate</p>
                <p className="mt-2 text-[38px] font-semibold">-$1.1M</p>
              </div>
              <div>
                <p className="text-xs text-[#8C86A6]">Runway</p>
                <p className="mt-2 text-[38px] font-semibold">Infinite</p>
                <p className="mt-1 text-sm text-[#8C86A6]">You&apos;re profitable!</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function LoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore((state) => state.login)
  const [email, setEmail] = useState('demo@taxos.ai')
  const [password, setPassword] = useState('demo1234')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate(getPostLoginPath(useAuthStore.getState().user))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-screen bg-[#FCFBFF] lg:grid-cols-[1.08fr_0.92fr]">
      <div className="flex min-h-screen flex-col px-6 py-8 lg:px-24 lg:py-18">
        <div className="flex items-center justify-between">
          <div className="text-[54px] font-semibold tracking-[-0.04em] text-[#5B2FFF]">inkle</div>
          <button className="flex items-center gap-2 text-[15px] text-[#6F6A8B]"><HelpCircle size={18} /> Help</button>
        </div>

        <div className="flex flex-1 items-center">
          <div className="w-full max-w-[760px]">
            <h1 className="text-[56px] font-semibold tracking-[-0.04em] text-[#1E174A]">Sign in</h1>
            <p className="mt-3 text-[18px] text-[#6F6A8B]">Don&apos;t have an account? <Link to="/onboarding/start" className="font-medium text-[#5B2FFF]">Sign up <ChevronRight className="inline" size={18} /></Link></p>

            <form onSubmit={handleSubmit} className="mt-14 max-w-[760px]">
              <label className="mb-3 block text-[18px] font-medium text-[#4E4970]">Work email address</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required placeholder="Email address" className="h-[62px] w-full rounded-2xl border border-[#DED8EB] bg-white px-6 text-[22px] text-[#312A56] outline-none placeholder:text-[#ABA7BE]" />

              <label className="mb-3 mt-6 block text-[18px] font-medium text-[#4E4970]">Password</label>
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required placeholder="Password" className="h-[62px] w-full rounded-2xl border border-[#DED8EB] bg-white px-6 text-[22px] text-[#312A56] outline-none placeholder:text-[#ABA7BE]" />

              {error && <p className="mt-4 text-[15px] text-[#D94A5B]">{error}</p>}

              <button disabled={loading} className="mt-8 flex h-[62px] w-full items-center justify-center rounded-2xl bg-[linear-gradient(90deg,#5A2CFF_0%,#6F32FF_100%)] text-[28px] font-medium text-white disabled:opacity-50">
                {loading ? 'Signing in...' : 'Sign in'}
              </button>

              <p className="mt-6 text-sm text-[#8B84A8]">Demo founder: `demo@taxos.ai / demo1234` and admin: `admin@taxos.ai / admin1234`.</p>
            </form>
          </div>
        </div>
      </div>

      <MarketingPanel />
    </div>
  )
}
