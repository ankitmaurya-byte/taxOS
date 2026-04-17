import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { HelpCircle, Mail, MonitorSmartphone, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'

export function VerifyEmailPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<'waiting' | 'verifying' | 'success' | 'error'>('waiting')
  const [message, setMessage] = useState('A login link has been sent to your email. Click it to continue setup.')
  const [resent, setResent] = useState(false)
  const email = searchParams.get('email') || ''

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) return
    setStatus('verifying')
    api.auth.verifyEmail(token)
      .then((result) => {
        if (result?.token) {
          localStorage.setItem('taxos_token', result.token)
          useAuthStore.setState({ token: result.token, user: result.user as any ?? null, isLoading: false })
        }
        setStatus('success')
        setMessage('Your email has been verified. Redirecting to onboarding...')
        window.setTimeout(() => navigate('/onboarding', { replace: true }), 900)
      })
      .catch((error: Error) => { setStatus('error'); setMessage(error.message) })
  }, [navigate, searchParams])

  const resend = async () => {
    if (!email) return
    await api.auth.resendVerification(email)
    setResent(true)
    setMessage(`A fresh verification email has been sent to ${email}.`)
    setTimeout(() => setResent(false), 5000)
  }

  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[1.08fr_0.92fr]">
      {/* Left */}
      <div className="flex min-h-screen flex-col px-6 py-8 lg:px-16 lg:py-12">
        <div className="flex items-center justify-between">
          <div className="text-[26px] font-light tracking-[-0.26px] text-[#533afd]">inkle</div>
          <a
            href="mailto:support@inkle.io?subject=TaxOS email verification help"
            className="flex items-center gap-1.5 text-[14px] font-normal text-[#64748d] hover:text-[#533afd] transition-colors"
          >
            <HelpCircle size={15} strokeWidth={1.8} /> Help
          </a>
        </div>

        <div className="flex flex-1 items-center">
          <div className="w-full max-w-lg">
            <p className="text-[13px] font-normal text-[#64748d] mb-3">Step 1 of 4: Email verification</p>
            <h1 className="text-[32px] font-light tracking-[-0.64px] text-[#061b31]">Verify your email address</h1>

            {/* Status indicator */}
            <div className={`mt-6 flex items-start gap-3 rounded-md border p-4 ${
              status === 'error' ? 'border-[#ffd7ef] bg-[rgba(234,34,97,0.04)]' :
              status === 'success' ? 'border-[rgba(21,190,83,0.4)] bg-[rgba(21,190,83,0.06)]' :
              status === 'verifying' ? 'border-[#b9b9f9] bg-[rgba(83,58,253,0.04)]' :
              'border-[#e5edf5] bg-[#f6f9fc]'
            }`}>
              {status === 'verifying' && <Loader2 size={18} className="text-[#533afd] animate-spin mt-0.5 shrink-0" />}
              {status === 'success' && <CheckCircle2 size={18} className="text-[#15be53] mt-0.5 shrink-0" />}
              {status === 'error' && <AlertCircle size={18} className="text-[#ea2261] mt-0.5 shrink-0" />}
              {status === 'waiting' && <Mail size={18} className="text-[#64748d] mt-0.5 shrink-0" />}
              <div>
                <p className={`text-[14px] leading-relaxed ${status === 'error' ? 'text-[#ea2261]' : 'text-[#273951]'}`}>
                  {message}{email && status === 'waiting' ? ` (${email})` : ''}
                </p>
              </div>
            </div>

            {status === 'waiting' && (
              <>
                <p className="mt-6 text-[14px] text-[#64748d]">
                  Can't find the link? Check your spam folder or{' '}
                  <button onClick={resend} disabled={resent} className="font-normal text-[#533afd] hover:underline disabled:opacity-50">
                    {resent ? 'Sent!' : 'resend'}
                  </button>
                </p>

                <div className="mt-6 flex gap-3">
                  <a href="https://mail.google.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 rounded-sm border border-[#e5edf5] bg-white px-4 py-3 text-[14px] font-normal text-[#273951] hover:bg-[#f6f9fc] transition-colors">
                    <Mail size={18} className="text-[#ea2261]" /> Open Gmail
                  </a>
                  <a href="https://outlook.live.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 rounded-sm border border-[#e5edf5] bg-white px-4 py-3 text-[14px] font-normal text-[#273951] hover:bg-[#f6f9fc] transition-colors">
                    <MonitorSmartphone size={18} className="text-[#533afd]" /> Open Outlook
                  </a>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right — testimonial */}
      <div className="relative hidden min-h-screen overflow-hidden bg-[#1c1e54] text-white lg:flex lg:flex-col lg:items-center lg:justify-center lg:px-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(83,58,253,0.35),transparent_50%)]" />
        <div className="relative w-full max-w-[300px] rounded-[6px] bg-white px-8 py-10 text-center text-[#273951]" style={{ boxShadow: 'rgba(50,50,93,0.25) 0px 30px 45px -30px, rgba(0,0,0,0.1) 0px 18px 36px -18px' }}>
          <p className="text-[16px] font-light leading-[1.6]">"Incredible software and an extremely detail-oriented team. Must have for founders wanting to save time."</p>
          <div className="mx-auto mt-6 flex h-10 w-10 items-center justify-center rounded-sm bg-[#15be53] text-white">
            <span className="text-[11px] font-normal">CJ</span>
          </div>
          <p className="mt-3 text-[14px] font-normal text-[#061b31]">Clayton Jacobs</p>
          <p className="mt-0.5 text-[12px] text-[#64748d]">Founder & CEO at CreatorDB</p>
        </div>
        <p className="relative mt-10 max-w-[360px] text-center text-[13px] font-light leading-6 text-[rgba(255,255,255,0.6)]">Used by 500+ US startups to stay compliant, including over 5% of YC companies.</p>
      </div>
    </div>
  )
}
