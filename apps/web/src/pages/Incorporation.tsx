// Used in: App.tsx — route /incorporation (assisted incorporation service page)
import { useState } from 'react'
import { ServiceHero } from '@/components/ServiceHero'
import { FAQSection, type FAQItem } from '@/components/FAQSection'
import { ServiceInquiryDialog } from '@/components/ServiceInquiryDialog'

const FAQ_ITEMS: FAQItem[] = [
  {
    question: 'Can India-resident founders use this service?',
    answer:
      'Yes. Inkle specializes in helping India-resident founders establish US entities. We handle cross-border complexities including EIN registration, bank account setup, and compliance requirements.',
  },
  {
    question: 'Do I need a lawyer for incorporation?',
    answer:
      'No. Inkle partners with licensed registered agents and legal professionals to handle incorporation paperwork on your behalf.',
  },
  {
    question: "What's included in the incorporation service?",
    answer:
      'Delaware C-Corp formation, registered agent for 1 year, EIN registration, operating agreement/bylaws, organizational consent, stock certificates, and lifetime document storage.',
  },
  {
    question: 'What are lifetime docs and post-incorporation maintenance?',
    answer:
      'Lifetime docs include your Certificate of Incorporation, bylaws, stock certificates, and formation documents stored securely. Maintenance covers annual franchise tax filing, registered agent renewals, and compliance reminders.',
  },
]

export function IncorporationPage() {
  const [dialogMode, setDialogMode] = useState<null | 'start' | 'call'>(null)
  return (
    <div>
      <h1 className="text-xl sm:text-[24px] md:text-3xl text-[#061b31] mb-6" style={{ fontWeight: 300, letterSpacing: '-0.24px' }}>Incorporation</h1>

      <ServiceHero
        title="Assisted Incorporation"
        price="$999/per incorporation"
        description="Inkle helps startup founders, both in the US and abroad (including specialized support for India), compliantly establish a US Delaware C-Corp through Stripe Atlas or Clerky, with options for parent or subsidiary entities."
        illustration={<IncorporationIllustration />}
        primaryCtaLabel="Get Started"
        secondaryCtaLabel="Unsure of your structure? Book a call"
        onPrimaryClick={() => setDialogMode('start')}
        onSecondaryClick={() => setDialogMode('call')}
      />

      <FAQSection items={FAQ_ITEMS} />

      <ServiceInquiryDialog
        open={dialogMode !== null}
        title={dialogMode === 'call' ? 'Book a call with Inkle' : 'Start your incorporation'}
        serviceName="Assisted Incorporation"
        onClose={() => setDialogMode(null)}
      />
    </div>
  )
}

function IncorporationIllustration() {
  return (
    <svg width="80" height="80" viewBox="0 0 56 57" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M31.263 24.1863L20.3192 34.9805L17.237 31.9404C15.5877 30.3136 15.5877 27.676 17.237 26.0492L25.1944 18.2006C26.8437 16.5738 29.5179 16.5738 31.1673 18.2006L31.263 18.295C32.9123 19.9218 32.9123 22.5594 31.263 24.1863Z"
        fill="url(#paint0_inc)"
      />
      <path
        d="M24.737 33.7747L35.6808 22.9805L38.763 26.0205C40.4123 27.6473 40.4123 30.2849 38.763 31.9118L30.8056 39.7604C29.1563 41.3872 26.4821 41.3872 24.8327 39.7603L24.737 39.6659C23.0877 38.0391 23.0877 35.4015 24.737 33.7747Z"
        fill="url(#paint1_inc)"
      />
      <defs>
        <linearGradient id="paint0_inc" x1="16" y1="25.98" x2="32.5" y2="25.98" gradientUnits="userSpaceOnUse">
          <stop stopColor="#533afd" />
          <stop offset="1" stopColor="#2e2b8c" />
        </linearGradient>
        <linearGradient id="paint1_inc" x1="23.5" y1="31.98" x2="40" y2="31.98" gradientUnits="userSpaceOnUse">
          <stop stopColor="#533afd" />
          <stop offset="1" stopColor="#2e2b8c" />
        </linearGradient>
      </defs>
    </svg>
  )
}
