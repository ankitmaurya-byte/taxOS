import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { HelpCircle, Mail, MonitorSmartphone } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'

export function VerifyEmailPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<'waiting' | 'verifying' | 'success' | 'error'>('waiting')
  const [message, setMessage] = useState('A login link has been sent to your email. Click it or use the link to continue setup.')
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
        setMessage('Your email has been verified. Redirecting you to onboarding...')
        window.setTimeout(() => navigate('/onboarding', { replace: true }), 900)
      })
      .catch((error: Error) => {
        setStatus('error')
        setMessage(error.message)
      })
  }, [navigate, searchParams])

  const resend = async () => {
    if (!email) return
    await api.auth.resendVerification(email)
    setMessage(`A fresh verification email has been sent to ${email}.`)
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
            <div className="text-[24px] font-semibold text-[#A39EB8]">Step 1 of 4: Email verification</div>
            <h1 className="mt-10 text-[56px] font-semibold tracking-[-0.04em] text-[#1E174A]">Verify your email address</h1>
            <p className={`mt-5 max-w-[700px] text-[18px] leading-9 ${status === 'error' ? 'text-[#D94A5B]' : 'text-[#6F6A8B]'}`}>{message}{email ? ` ${email}.` : ''}</p>

            {/* <div className="mt-14 flex gap-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-[72px] w-[72px] rounded-2xl border border-[#DED8EB] bg-white" />
              ))}
            </div> */}

            <p className="mt-6 text-[16px] italic text-[#6F6A8B]">Can&apos;t find link? Check your spam folder or <button onClick={resend} className="font-medium text-[#5B2FFF]">resend</button></p>

            <div className="mt-8 flex gap-4">
              <button className="flex items-center gap-3 rounded-2xl border border-[#DED8EB] bg-white px-5 py-4 text-[18px] font-medium text-[#3B355D]"><Mail size={20} className="text-[#EA4335]" /> Open Gmail</button>
              <button className="flex items-center gap-3 rounded-2xl border border-[#DED8EB] bg-white px-5 py-4 text-[18px] font-medium text-[#3B355D]"><MonitorSmartphone size={20} className="text-[#2563EB]" /> Open Outlook</button>
            </div>
          </div>
        </div>
      </div>

      <div className="relative hidden min-h-screen overflow-hidden bg-[#2D116C] text-white lg:flex lg:flex-col lg:items-center lg:justify-between lg:px-16 lg:py-22">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(125,77,255,0.5),transparent_32%)]" />
        <div className="relative ml-auto mr-auto mt-6 w-full max-w-[360px] rounded-[34px] bg-white px-14 py-16 text-center text-[#4A4566] shadow-[18px_18px_0_rgba(125,91,255,0.25),30px_30px_0_rgba(125,91,255,0.12)]">
          <p className="text-[25px] font-medium leading-[1.42]">"Inkle went above and beyond, offering prompt assistance. Highly recommended for all startups looking for cost-effective solution with exceptional customer support."</p>
          <div className="mx-auto mt-8 flex h-16 w-16 items-center justify-center rounded-full bg-[#7FD77F] text-white"><span className="text-lg font-semibold">RW</span></div>
          <p className="mt-4 text-[18px] font-medium text-[#4F4A72]">Ryan Wenger</p>
          <p className="mt-1 text-[14px] text-[#9994B2]">Co-Founder at Inhouse</p>
        </div>
        <p className="relative mb-10 max-w-[520px] text-center text-[15px] font-medium leading-8 text-[#F6E570]">Used by 500+ US startups to stay compliant, including over 5% of YC companies.</p>
      </div>
    </div>
  )
}
