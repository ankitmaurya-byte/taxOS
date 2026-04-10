// Used in: App.tsx — route /incorporation (assisted incorporation service page)
// Navigated from: Sidebar → Others → Incorporation
import { ChevronRight } from 'lucide-react'
import { useState } from 'react'

const FAQ_ITEMS = [
  {
    question: 'Can India-resident founders use this service?',
    answer:
      'Yes! Inkle specializes in helping India-resident founders establish US entities. We handle all the cross-border complexities including EIN registration, bank account setup, and compliance requirements.',
  },
  {
    question: 'Do I need a lawyer for incorporation?',
    answer:
      'No, you do not need a separate lawyer. Inkle partners with licensed registered agents and legal professionals to handle all incorporation paperwork on your behalf.',
  },
  {
    question: "What's included in the incorporation service?",
    answer:
      'The service includes: Delaware C-Corp formation, registered agent for 1 year, EIN registration, operating agreement/bylaws, organizational consent, stock certificates, and lifetime document storage.',
  },
  {
    question: 'What are lifetime docs and post-incorporation maintenance?',
    answer:
      'Lifetime docs include your Certificate of Incorporation, bylaws, stock certificates, and all formation documents stored securely. Post-incorporation maintenance includes annual franchise tax filing, registered agent renewals, and compliance reminders.',
  },
]

export function IncorporationPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-[#111827] mb-6">Incorporation</h1>

      {/* Hero Card */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-8 mb-6 flex items-center gap-8">
        <div className="flex-1">
          <h2 className="text-xl font-bold text-[#111827] mb-2">Assisted Incorporation</h2>
          <p className="text-sm font-semibold text-[#6C5CE7] mb-3">$999/per incorporation</p>
          <p className="text-sm text-[#6B7280] leading-relaxed mb-5 max-w-lg">
            Inkle helps startup founders, both in the US and abroad (including specialized support
            for India), to compliantly establish a US Delaware C-Corp through Stripe Atlas or
            Clerky, with options for parent or subsidiary entities.
          </p>
          <div className="flex items-center gap-4">
            <button className="h-10 px-6 bg-[#6C5CE7] text-white rounded-lg text-sm font-semibold hover:bg-[#5B4BD5] transition-colors">
              Get Started
            </button>
            <button className="text-sm font-medium text-[#6C5CE7] hover:underline">
              Unsure of your structure? Book a call
            </button>
          </div>
        </div>
        {/* Decorative illustration placeholder */}
        <div className="w-64 h-40 bg-gradient-to-br from-[#F3F0FF] to-[#EDE9FD] rounded-xl flex items-center justify-center flex-shrink-0">
          <svg
            width="80"
            height="80"
            viewBox="0 0 56 57"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
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
                <stop stopColor="#8B08FD" />
                <stop offset="1" stopColor="#5622FF" />
              </linearGradient>
              <linearGradient id="paint1_inc" x1="23.5" y1="31.98" x2="40" y2="31.98" gradientUnits="userSpaceOnUse">
                <stop stopColor="#8B08FD" />
                <stop offset="1" stopColor="#5622FF" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-8">
        <div className="flex gap-8">
          <div className="w-56 flex-shrink-0">
            <h2 className="text-lg font-bold text-[#111827] mb-3">Frequently Asked Questions</h2>
            <button className="px-4 py-2 border border-[#E5E7EB] rounded-lg text-sm font-medium text-[#111827] hover:bg-gray-50">
              Know more
            </button>
          </div>
          <div className="flex-1">
            {FAQ_ITEMS.map((item, i) => (
              <FaqItem key={i} question={item.question} answer={item.answer} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Used in: IncorporationPage — expandable FAQ item
function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-b border-[#E5E7EB] last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 py-4 text-left"
      >
        <ChevronRight
          size={16}
          className={`text-[#9CA3AF] transition-transform flex-shrink-0 ${open ? 'rotate-90' : ''}`}
        />
        <span className="text-sm font-medium text-[#111827]">{question}</span>
      </button>
      {open && (
        <div className="pl-7 pb-4 text-sm text-[#6B7280] leading-relaxed">{answer}</div>
      )}
    </div>
  )
}
