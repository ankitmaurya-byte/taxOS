import { FormEvent, useEffect, useState } from 'react'
import { LogOut, HelpCircle, Building2, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { useAuthStore } from '@/stores/auth'

const ENTITY_OPTIONS = [
  { value: 'C-Corp', title: 'C Corp', subtitle: 'Delaware C Corps and US-incorporated C Corporations' },
  { value: 'LLC', title: 'LLC', subtitle: "We'll ask about your tax treatment in the next step" },
  { value: 'S-Corp', title: 'S Corp', subtitle: 'Pass-through taxation with shareholder restrictions' },
  { value: 'Non-profit 501(c)(3)', title: 'Non-profit 501(c)(3)', subtitle: 'Tax-exempt charitable, educational, or religious org' },
  { value: 'Sole Proprietorship', title: 'Sole Proprietorship', subtitle: 'Unincorporated business owned and run by one individual' },
] as const

function Frame({ children, quote, author, role, bottomText }: { children: React.ReactNode; quote: string; author: string; role: string; bottomText: string }) {
  const logout = useAuthStore((state) => state.logout)

  return (
    <div className="min-h-screen bg-[#F8F7FD]">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <div className="flex flex-col bg-[#FCFBFF] px-6 py-8 lg:px-24 lg:py-18">
          <div className="mb-16 flex items-center justify-between">
            <div className="text-[54px] font-semibold tracking-[-0.04em] text-[#5B2FFF]">inkle</div>
            <div className="flex items-center gap-8 text-[#6F6A8B]">
              <button className="flex items-center gap-2 text-[15px]"><HelpCircle size={18} /> Help</button>
              <button onClick={logout} className="flex items-center gap-2 text-[15px]"><LogOut size={18} /> Logout</button>
            </div>
          </div>
          <div className="flex flex-1 items-center">{children}</div>
        </div>

        <div className="relative hidden overflow-hidden bg-[#2D116C] text-white lg:flex lg:flex-col lg:items-center lg:justify-between lg:px-16 lg:py-22">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(125,77,255,0.45),transparent_34%)]" />
          <div className="relative ml-auto mr-auto mt-6 w-full max-w-[360px] rounded-[34px] bg-white px-14 py-16 text-center text-[#4A4566] shadow-[18px_18px_0_rgba(125,91,255,0.25),30px_30px_0_rgba(125,91,255,0.12)]">
            <p className="text-[25px] font-medium leading-[1.42]">"{quote}"</p>
            <div className="mx-auto mt-8 flex h-16 w-16 items-center justify-center rounded-full bg-[#7FD77F] text-white">
              <span className="text-lg font-semibold">{author.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span>
            </div>
            <p className="mt-4 text-[18px] font-medium text-[#4F4A72]">{author}</p>
            <p className="mt-1 text-[14px] text-[#9994B2]">{role}</p>
          </div>
          <p className="relative mb-10 max-w-[520px] text-center text-[15px] font-medium leading-8 text-[#F6E570]">{bottomText}</p>
        </div>
      </div>
    </div>
  )
}

function PendingReview({ organizationName }: { organizationName: string }) {
  return (
    <Frame
      quote="Incredible software & an extremely detail-oriented team. Must have for founders wanting to save time without sacrificing quality."
      author="Clayton Jacobs"
      role="Founder & CEO at CreatorDB"
      bottomText="Used by 500+ US startups to stay compliant, including over 5% of YC companies."
    >
      <div className="mx-auto w-full max-w-[700px]">
        <div className="max-w-[700px] rounded-[18px] border border-[#E1DDF0] bg-white px-10 py-12 shadow-[0_12px_40px_rgba(37,21,84,0.06)]">
          <div className="text-[54px] font-semibold tracking-[-0.04em] text-[#5B2FFF]">inkle</div>
          <h1 className="mt-14 text-[52px] font-semibold leading-[1.06] tracking-[-0.03em] text-[#1E174A]">Setting up your account</h1>
          <p className="mt-5 max-w-[540px] text-[17px] leading-8 text-[#716B8F]">Please give us a moment to set up your workspace and verify your entity details for {organizationName}. While email verification is complete, an admin still needs to approve your incorporation details.</p>
          <div className="mt-10 space-y-7">
            {[
              { label: 'Creating your account', done: true },
              { label: 'Setting up your workspace', done: true },
              { label: 'Verifying your entity details', done: false },
            ].map(({ label, done }) => (
              <div key={label} className="flex items-center gap-5">
                <div className={`flex h-11 w-11 items-center justify-center rounded-full ${done ? 'bg-[#4FA468]' : 'border-2 border-[#8E72FF] bg-[#F4F0FF]'}`}>
                  {done ? <CheckCircle2 size={22} className="text-white" /> : <div className="h-5 w-5 rounded-full border-2 border-[#8E72FF] bg-white" />}
                </div>
                <span className="text-[20px] font-medium text-[#241B54]">{label}</span>
              </div>
            ))}
          </div>
          <div className="mt-10 border-t border-dashed border-[#DDD8EE] pt-8">
            <p className="mb-4 text-[15px] text-[#716B8F]">While we set up for you</p>
            <button className="rounded-[12px] bg-[#5B2FFF] px-5 py-3 text-[15px] font-medium text-white">Meet our expert</button>
          </div>
        </div>
      </div>
    </Frame>
  )
}

export function OnboardingPage() {
  const { user, onboardingStatus, onboardingStatusLoading, completeFounderOnboarding } = useAuthStore()
  const [step, setStep] = useState(1)
  const [entityType, setEntityType] = useState('C-Corp')
  const [brandName, setBrandName] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [certificate, setCertificate] = useState<File | null>(null)
  const [country, setCountry] = useState('India')
  const [state, setState] = useState('Andhra Pradesh')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!onboardingStatus) {
      useAuthStore.getState().fetchOnboardingStatus()
    }
  }, [onboardingStatus])

  const application = onboardingStatus?.application
  const organization = onboardingStatus?.organization
  const parsed = application?.parsedCertificateData || {} as Record<string, unknown>

  useEffect(() => {
    if (organization?.name && !organizationName) setOrganizationName(organization.name)
    if (application?.brandName && !brandName) setBrandName(application.brandName)
  }, [application?.brandName, brandName, organization?.name, organizationName])

  if (onboardingStatusLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#F8F7FD] text-[#6F6A8B]">Loading onboarding...</div>
  }

  if (user?.status === 'pending_admin_review') {
    return <PendingReview organizationName={organization?.name || 'your organization'} />
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (step < 3) {
      setStep((value) => value + 1)
      return
    }
    setSubmitting(true)
    try {
      await completeFounderOnboarding({ entityType, brandName, organizationName, country, stateOrJurisdiction: state, certificate })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Frame
      quote={step === 1 ? 'Inkle went above and beyond, offering prompt assistance. Highly recommended for all startups looking for cost-effective solution with exceptional customer support.' : step === 2 ? 'Incredible software & an extremely detail-oriented team. Must have for founders wanting to save time without sacrificing quality.' : 'Nothing comes close to what Inkle offers for US Taxes and Compliance. Their product has a simple and easy-to-use UI with streamlined processes.'}
      author={step === 1 ? 'Ryan Wenger' : step === 2 ? 'Clayton Jacobs' : 'Nikolay Boney'}
      role={step === 1 ? 'Co-Founder at Inhouse' : step === 2 ? 'Founder & CEO at CreatorDB' : 'Co-Founder & CTO at Shelf'}
      bottomText="Used by 500+ US startups to stay compliant, including over 5% of YC companies."
    >
      <div className="w-full max-w-[760px]">
        <div className="mb-6 text-[22px] font-semibold text-[#9A95B2]">Step {step + 1} of 4: {step === 1 ? 'Entity type' : step === 2 ? 'Brand details' : 'Entity details'}</div>
        <h1 className="text-[58px] font-semibold leading-[1.02] tracking-[-0.04em] text-[#1E174A]">{step === 1 ? "Let's set up your account" : step === 2 ? 'Add your brand details' : 'Add entity details'}</h1>
        <p className="mt-4 max-w-[640px] text-[18px] leading-8 text-[#716B8F]">{step === 1 ? 'First, tell us about your business entity so we can make sure Inkle is the right fit for you.' : step === 2 ? 'Enter the brand name you operate under. This helps us personalize your workspace.' : 'Upload the Certificate of Incorporation so we can parse legal details before admin review.'}</p>

        <form onSubmit={submit} className="mt-12">
          {step === 1 && (
            <div className="space-y-4">
              {ENTITY_OPTIONS.map((option) => (
                <button type="button" key={option.value} onClick={() => setEntityType(option.value)} className={`flex w-full items-start gap-4 rounded-2xl border px-5 py-5 text-left transition-colors ${entityType === option.value ? 'border-[#7A5BFF] bg-[#F7F4FF]' : 'border-[#E4DFF1] bg-white hover:border-[#CFC5EC]'}`}>
                  <div className={`mt-1 h-5 w-5 rounded-full border ${entityType === option.value ? 'border-[#7A5BFF] bg-[#7A5BFF] shadow-[inset_0_0_0_4px_white]' : 'border-[#D0CAE5] bg-white'}`} />
                  <div>
                    <div className="text-[18px] font-medium text-[#1E174A]">{option.title}</div>
                    <div className="mt-1 text-[14px] text-[#7B7598]">{option.subtitle}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="max-w-[760px]">
              <label className="mb-3 block text-[15px] font-medium text-[#4E4970]">Enter brand name <span className="text-[#D94A5B]">*</span></label>
              <div className="flex h-[74px] items-center rounded-2xl border border-[#DDD8EA] bg-white px-6 text-[36px] text-[#A19DB8] shadow-[0_1px_0_rgba(30,23,74,0.03)]">
                <input value={brandName} onChange={(e) => { setBrandName(e.target.value); if (!organizationName) setOrganizationName(e.target.value) }} placeholder="dafafs" className="h-full w-full bg-transparent text-[18px] text-[#3E375F] outline-none" />
                <CheckCircle2 size={22} className="text-[#3EA867]" />
              </div>
              <p className="mt-3 text-[14px] italic text-[#3EA867]">Use the name you operate under, not the legal entity name</p>
            </div>
          )}

          {step === 3 && (
            <div className="rounded-[24px] border border-[#E4DFF1] bg-white p-8 shadow-[0_6px_30px_rgba(37,21,84,0.04)]">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F5F2FD] text-[#281A58]"><Building2 size={20} /></div>
                <div className="text-[17px] font-semibold text-[#1E174A]">New entity</div>
              </div>

              <div className="mt-8 grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-[15px] font-medium text-[#6A6488]">Select country <span className="text-[#D94A5B]">*</span></label>
                  <input value={country} onChange={(e) => setCountry(e.target.value)} className="h-14 w-full rounded-xl border border-[#DED8EB] px-4 text-[18px] text-[#2F2855] outline-none" />
                </div>
                <div>
                  <label className="mb-2 block text-[15px] font-medium text-[#6A6488]">Select state <span className="text-[#D94A5B]">*</span></label>
                  <input value={String(parsed.stateOrJurisdiction || state)} onChange={(e) => setState(e.target.value)} className="h-14 w-full rounded-xl border border-[#DED8EB] px-4 text-[18px] text-[#2F2855] outline-none" />
                </div>
              </div>

              <div className="mt-5">
                <label className="mb-2 block text-[15px] font-medium text-[#6A6488]">Formation type <span className="text-[#D94A5B]">*</span></label>
                <input value={String(parsed.entityType || entityType)} onChange={(e) => setEntityType(e.target.value)} className="h-14 w-full rounded-xl border border-[#DED8EB] px-4 text-[18px] text-[#2F2855] outline-none" />
              </div>

              <div className="mt-5">
                <label className="mb-2 block text-[15px] font-medium text-[#6A6488]">Entity name <span className="text-[#D94A5B]">*</span></label>
                <input value={String(parsed.legalCompanyName || organizationName)} onChange={(e) => setOrganizationName(e.target.value)} className="h-14 w-full rounded-xl border border-[#DED8EB] px-4 text-[18px] text-[#2F2855] outline-none" />
              </div>

              <div className="mt-5">
                <label className="mb-2 block text-[15px] font-medium text-[#6A6488]">Certificate of Incorporation</label>
                <label className="flex h-14 cursor-pointer items-center justify-between rounded-xl border border-[#DED8EB] px-4 text-[18px] text-[#2F2855]">
                  <span className="truncate">{certificate?.name || application?.certificateFileName || 'Upload Certificate of Incorporation'}</span>
                  <input type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={(e) => setCertificate(e.target.files?.[0] || null)} />
                  <span className="text-[#8B84A8]">Upload</span>
                </label>
              </div>
            </div>
          )}

          <div className="mt-10 flex items-center justify-between">
            <button type="button" onClick={() => setStep((value) => Math.max(1, value - 1))} className="flex items-center gap-2 text-[15px] font-medium text-[#6E688A]" disabled={step === 1}><ArrowLeft size={18} /> Go back</button>
            <button disabled={(step === 2 && !brandName) || (step === 3 && !certificate) || submitting} className="rounded-[12px] bg-[#6D42FF] px-10 py-4 text-[16px] font-medium text-white disabled:cursor-not-allowed disabled:bg-[#E2DFF0] disabled:text-[#B8B3C9]">{step < 3 ? 'Continue' : submitting ? 'Finishing...' : 'Finish setup'}</button>
          </div>
        </form>
      </div>
    </Frame>
  )
}
