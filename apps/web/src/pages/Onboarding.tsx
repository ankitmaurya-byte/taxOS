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

const TESTIMONIALS = [
  { quote: 'Inkle went above and beyond, offering prompt assistance. Highly recommended for all startups.', author: 'Ryan Wenger', role: 'Co-Founder at Inhouse', initials: 'RW' },
  { quote: 'Incredible software & an extremely detail-oriented team. Must have for founders.', author: 'Clayton Jacobs', role: 'Founder & CEO at CreatorDB', initials: 'CJ' },
  { quote: 'Nothing comes close to what Inkle offers for US Taxes and Compliance.', author: 'Nikolay Boney', role: 'Co-Founder & CTO at Shelf', initials: 'NB' },
]

/* ─── Shared Frame ────────────────────────────────────────────────────────── */
function Frame({ children, testimonialIndex = 0 }: { children: React.ReactNode; testimonialIndex?: number }) {
  const logout = useAuthStore((state) => state.logout)
  const t = TESTIMONIALS[testimonialIndex] || TESTIMONIALS[0]

  return (
    <div className="min-h-screen bg-white">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        {/* Left */}
        <div className="flex flex-col bg-white px-6 py-6 lg:px-16 lg:py-10">
          <div className="mb-10 flex items-center justify-between">
            <div className="text-[26px] font-light tracking-[-0.26px] text-[#533afd]">inkle</div>
            <div className="flex items-center gap-5 text-[#64748d]">
              <a
                href="mailto:support@inkle.io?subject=TaxOS onboarding help"
                className="flex items-center gap-1.5 text-[14px] font-normal hover:text-[#533afd] transition-colors"
              >
                <HelpCircle size={15} strokeWidth={1.8} /> Help
              </a>
              <button onClick={logout} className="flex items-center gap-1.5 text-[14px] font-normal"><LogOut size={15} strokeWidth={1.8} /> Logout</button>
            </div>
          </div>
          <div className="flex flex-1 items-center">{children}</div>
        </div>

        {/* Right — testimonial */}
        <div className="relative hidden overflow-hidden bg-[#1c1e54] text-white lg:flex lg:flex-col lg:items-center lg:justify-center lg:px-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(83,58,253,0.35),transparent_50%)]" />
          <div className="relative w-full max-w-[300px] rounded-[6px] bg-white px-8 py-10 text-center text-[#273951]" style={{ boxShadow: 'rgba(50,50,93,0.25) 0px 30px 45px -30px, rgba(0,0,0,0.1) 0px 18px 36px -18px' }}>
            <p className="text-[16px] font-light leading-[1.6]">"{t.quote}"</p>
            <div className="mx-auto mt-6 flex h-10 w-10 items-center justify-center rounded-sm bg-[#15be53] text-white">
              <span className="text-[11px] font-normal">{t.initials}</span>
            </div>
            <p className="mt-3 text-[14px] font-normal text-[#061b31]">{t.author}</p>
            <p className="mt-0.5 text-[12px] text-[#64748d]">{t.role}</p>
          </div>
          <p className="relative mt-10 max-w-[360px] text-center text-[13px] font-light leading-6 text-[rgba(255,255,255,0.6)]">Used by 500+ US startups to stay compliant, including over 5% of YC companies.</p>
        </div>
      </div>
    </div>
  )
}

/* ─── Pending Review ──────────────────────────────────────────────────────── */
function PendingReview({ organizationName }: { organizationName: string }) {
  return (
    <Frame>
      <div className="mx-auto w-full max-w-lg">
        <div className="rounded-md border border-[#e5edf5] bg-white px-6 py-8" style={{ boxShadow: 'rgba(23,23,23,0.08) 0px 15px 35px' }}>
          <div className="text-[22px] font-light tracking-[-0.22px] text-[#533afd]">inkle</div>
          <h1 className="mt-8 text-[22px] font-light tracking-[-0.22px] text-[#061b31]">Setting up your account</h1>
          <p className="mt-3 max-w-sm text-[14px] leading-6 text-[#64748d]">
            We're verifying your entity details for {organizationName}. An admin still needs to approve your incorporation details.
          </p>

          <div className="mt-6 space-y-4">
            {[
              { label: 'Creating your account', done: true },
              { label: 'Setting up your workspace', done: true },
              { label: 'Verifying your entity details', done: false },
            ].map(({ label, done }) => (
              <div key={label} className="flex items-center gap-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-sm ${done ? 'bg-[#15be53]' : 'border-2 border-[#b9b9f9] bg-[rgba(83,58,253,0.04)]'}`}>
                  {done ? <CheckCircle2 size={14} className="text-white" /> : <div className="h-2.5 w-2.5 rounded-full border-2 border-[#533afd] bg-white" />}
                </div>
                <span className={`text-[14px] font-normal ${done ? 'text-[#061b31]' : 'text-[#64748d]'}`}>{label}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 border-t border-[#e5edf5] pt-5">
            <p className="mb-3 text-[12px] text-[#64748d]">While we set up for you</p>
            <a
              href="https://calendly.com/inkle-support"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex rounded-sm bg-[#533afd] px-4 py-2 text-[14px] font-normal text-white hover:bg-[#4434d4] transition-colors"
            >Meet our expert</a>
          </div>
        </div>
      </div>
    </Frame>
  )
}

/* ─── Main Onboarding ─────────────────────────────────────────────────────── */
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
    if (!onboardingStatus) useAuthStore.getState().fetchOnboardingStatus()
  }, [onboardingStatus])

  const application = onboardingStatus?.application
  const organization = onboardingStatus?.organization
  const parsed = application?.parsedCertificateData || {} as Record<string, unknown>

  useEffect(() => {
    if (organization?.name && !organizationName) setOrganizationName(organization.name)
    if (application?.brandName && !brandName) setBrandName(application.brandName)
  }, [application?.brandName, brandName, organization?.name, organizationName])

  if (onboardingStatusLoading) return <div className="flex min-h-screen items-center justify-center bg-white text-[14px] text-[#64748d]">Loading onboarding...</div>
  if (user?.status === 'pending_admin_review') return <PendingReview organizationName={organization?.name || 'your organization'} />

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (step < 3) { setStep(v => v + 1); return }
    setSubmitting(true)
    try { await completeFounderOnboarding({ entityType, brandName, organizationName, country, stateOrJurisdiction: state, certificate }) }
    finally { setSubmitting(false) }
  }

  const inputCls = "h-10 w-full rounded-sm border border-[#e5edf5] px-3 text-[14px] text-[#061b31] outline-none focus:border-[#533afd] transition-colors"

  return (
    <Frame testimonialIndex={step - 1}>
      <div className="w-full max-w-lg">
        <p className="text-[13px] font-normal text-[#64748d] mb-2">Step {step + 1} of 4: {step === 1 ? 'Entity type' : step === 2 ? 'Brand details' : 'Entity details'}</p>
        <h1 className="text-[26px] font-light tracking-[-0.26px] text-[#061b31]">
          {step === 1 ? "Let's set up your account" : step === 2 ? 'Add your brand details' : 'Add entity details'}
        </h1>
        <p className="mt-2 max-w-md text-[14px] leading-6 text-[#64748d]">
          {step === 1 ? 'Tell us about your business entity so we can make sure Inkle is the right fit.'
            : step === 2 ? 'Enter the brand name you operate under. This helps us personalize your workspace.'
            : 'Upload the Certificate of Incorporation so we can parse legal details before admin review.'}
        </p>

        <form onSubmit={submit} className="mt-6">
          {/* Step 1: Entity type */}
          {step === 1 && (
            <div className="space-y-2">
              {ENTITY_OPTIONS.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  onClick={() => setEntityType(option.value)}
                  className={`flex w-full items-start gap-3 rounded-sm border px-4 py-3 text-left transition-colors ${
                    entityType === option.value
                      ? 'border-[#533afd] bg-[rgba(83,58,253,0.04)]'
                      : 'border-[#e5edf5] bg-white hover:border-[#b9b9f9]'
                  }`}
                >
                  <div className={`mt-0.5 h-4 w-4 rounded-full border flex-shrink-0 ${
                    entityType === option.value
                      ? 'border-[#533afd] bg-[#533afd] shadow-[inset_0_0_0_3px_white]'
                      : 'border-[#e5edf5] bg-white'
                  }`} />
                  <div>
                    <div className="text-[14px] font-normal text-[#061b31]">{option.title}</div>
                    <div className="mt-0.5 text-[12px] text-[#64748d]">{option.subtitle}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Brand name */}
          {step === 2 && (
            <div className="max-w-md">
              <label className="mb-1.5 block text-[14px] font-normal text-[#273951]">Brand name <span className="text-[#ea2261]">*</span></label>
              <div className="flex h-10 items-center rounded-sm border border-[#e5edf5] bg-white px-3 focus-within:border-[#533afd] transition-colors">
                <input value={brandName} onChange={e => { setBrandName(e.target.value); if (!organizationName) setOrganizationName(e.target.value) }} placeholder="Your brand name" className="h-full w-full bg-transparent text-[14px] text-[#061b31] outline-none placeholder:text-[#64748d]" />
                {brandName && <CheckCircle2 size={15} className="text-[#15be53] flex-shrink-0" />}
              </div>
              <p className="mt-2 text-[12px] text-[#15be53]">Use the name you operate under, not the legal entity name</p>
            </div>
          )}

          {/* Step 3: Entity details */}
          {step === 3 && (
            <div className="rounded-md border border-[#e5edf5] bg-white p-5" style={{ boxShadow: 'rgba(23,23,23,0.06) 0px 3px 6px' }}>
              <div className="flex items-center gap-3 mb-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-[rgba(83,58,253,0.08)] text-[#533afd]"><Building2 size={16} strokeWidth={1.8} /></div>
                <span className="text-[14px] font-normal text-[#061b31]">New entity</span>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[12px] font-normal text-[#64748d]">Country <span className="text-[#ea2261]">*</span></label>
                  <input value={country} onChange={e => setCountry(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="mb-1.5 block text-[12px] font-normal text-[#64748d]">State <span className="text-[#ea2261]">*</span></label>
                  <input value={String(parsed.stateOrJurisdiction || state)} onChange={e => setState(e.target.value)} className={inputCls} />
                </div>
              </div>

              <div className="mt-4">
                <label className="mb-1.5 block text-[12px] font-normal text-[#64748d]">Formation type <span className="text-[#ea2261]">*</span></label>
                <input value={String(parsed.entityType || entityType)} onChange={e => setEntityType(e.target.value)} className={inputCls} />
              </div>

              <div className="mt-4">
                <label className="mb-1.5 block text-[12px] font-normal text-[#64748d]">Entity name <span className="text-[#ea2261]">*</span></label>
                <input value={String(parsed.legalCompanyName || organizationName)} onChange={e => setOrganizationName(e.target.value)} className={inputCls} />
              </div>

              <div className="mt-4">
                <label className="mb-1.5 block text-[12px] font-normal text-[#64748d]">Certificate of Incorporation</label>
                <label className="flex h-10 cursor-pointer items-center justify-between rounded-sm border border-[#e5edf5] px-3 text-[14px] text-[#061b31] hover:bg-[#f6f9fc] transition-colors">
                  <span className="truncate text-[#64748d]">{certificate?.name || application?.certificateFileName || 'Upload certificate'}</span>
                  <input type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={e => setCertificate(e.target.files?.[0] || null)} />
                  <span className="text-[12px] font-normal text-[#533afd] shrink-0 ml-2">Browse</span>
                </label>
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between">
            <button type="button" onClick={() => setStep(v => Math.max(1, v - 1))} className="flex items-center gap-1.5 text-[14px] font-normal text-[#64748d] hover:text-[#273951] transition-colors disabled:opacity-40" disabled={step === 1}>
              <ArrowLeft size={15} strokeWidth={1.8} /> Go back
            </button>
            <button disabled={(step === 2 && !brandName) || (step === 3 && !certificate) || submitting} className="rounded-sm bg-[#533afd] px-6 py-2 text-[14px] font-normal text-white hover:bg-[#4434d4] disabled:opacity-40 transition-colors">
              {step < 3 ? 'Continue' : submitting ? 'Finishing...' : 'Finish setup'}
            </button>
          </div>
        </form>
      </div>
    </Frame>
  )
}
