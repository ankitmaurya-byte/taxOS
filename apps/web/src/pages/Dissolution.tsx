// Used in: App.tsx — route /dissolution (assisted dissolution service page)
import { useState } from 'react'
import { ServiceHero } from '@/components/ServiceHero'
import { FAQSection, type FAQItem } from '@/components/FAQSection'
import { ServiceInquiryDialog } from '@/components/ServiceInquiryDialog'

const FAQ_ITEMS: FAQItem[] = [
  {
    question: 'When should I dissolve my US entity?',
    answer:
      'Dissolve once operations have fully wound down, employees and vendors are paid, and all outstanding tax returns can be filed. Dissolving early can simplify franchise-tax and filing obligations.',
  },
  {
    question: 'Do I still owe Delaware franchise tax after dissolution?',
    answer:
      'You must pay franchise tax up to the dissolution date and file a final annual report. Once the Certificate of Dissolution is accepted, franchise tax stops accruing.',
  },
  {
    question: 'What happens to the IRS tax account?',
    answer:
      'Inkle files final federal returns (1120, 966, and employment forms if applicable), then closes your EIN account with the IRS so there are no lingering filing obligations.',
  },
]

export function DissolutionPage() {
  const [dialogMode, setDialogMode] = useState<null | 'start' | 'call'>(null)
  return (
    <div>
      <h1 className="text-[24px] text-[#061b31] mb-6" style={{ fontWeight: 300, letterSpacing: '-0.24px' }}>Dissolution</h1>

      <ServiceHero
        title="Assisted Dissolution"
        price="$350/per dissolution"
        description="Inkle files your Dissolution Certificate with the Delaware Secretary of State, prepares Stockholder Consent and Board Resolutions, closes your IRS tax account, and provides a wind-down checklist for all other activities and accounts."
        illustration={<DissolutionIllustration />}
        primaryCtaLabel="Get Started"
        secondaryCtaLabel="Not sure if it's time? Book a call"
        onPrimaryClick={() => setDialogMode('start')}
        onSecondaryClick={() => setDialogMode('call')}
      />

      <FAQSection items={FAQ_ITEMS} />

      <ServiceInquiryDialog
        open={dialogMode !== null}
        title={dialogMode === 'call' ? 'Book a call with Inkle' : 'Start your dissolution'}
        serviceName="Assisted Dissolution"
        onClose={() => setDialogMode(null)}
      />
    </div>
  )
}

function DissolutionIllustration() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="40" r="28" fill="url(#paint_diss_circle)" />
      <path d="M12 45C12 45 22 38 40 38C58 38 68 45 68 45" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <path d="M14 52C14 52 24 46 40 46C56 46 66 52 66 52" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <path d="M18 59C18 59 26 54 40 54C54 54 62 59 62 59" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <defs>
        <linearGradient id="paint_diss_circle" x1="12" y1="12" x2="68" y2="68" gradientUnits="userSpaceOnUse">
          <stop stopColor="#533afd" />
          <stop offset="1" stopColor="#2e2b8c" />
        </linearGradient>
      </defs>
    </svg>
  )
}
