import { Check, Rocket, Send, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface UpgradePlanModalProps {
  onClose: () => void
}

const FREE_FEATURES = [
  { label: 'Deadlines & Reminders', included: true },
  { label: 'Includes 3 user seats', included: true },
  { label: 'Access to all tax & compliance filings', included: false },
  { label: 'Dedicated support on chat', included: false },
]

const STANDARD_FEATURES = [
  { label: 'Deadlines & Reminders', included: true },
  { label: 'Includes 3 user seats', included: true },
  { label: 'Access to all tax & compliance filings', included: true },
  { label: 'Dedicated support on chat', included: true },
]

export function UpgradePlanModal({ onClose }: UpgradePlanModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/35" onClick={onClose} />

      <div className="relative w-full max-w-[850px] overflow-hidden rounded-[18px] border border-[#e5edf5] bg-white shadow-[0_24px_80px_rgba(17,24,39,0.16)]">
        <div className="flex items-center justify-between border-b border-[#e5edf5] px-10 py-4.5">
          <h2 className="text-[20px] font-semibold text-[#211B4E]">Upgrade Your Plan</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#8C88A8] transition-colors hover:bg-[#f6f9fc] hover:text-[#4434d4]"
            aria-label="Close upgrade modal"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-6 p-10 pt-5 lg:grid-cols-2">
          <PlanCard
            title="Free"
            subtitle="Check deadlines and set reminders"
            price="$0"
            cta="Subscribe"
            disabled
            features={FREE_FEATURES}
            tone="free"
            badge="ACTIVE PLAN"
          />

          <PlanCard
            title="Inkle Tax Standard Plan"
            subtitle="Unlock the Inkle platform and access all filings"
            price="$300/year"
            cta="Upgrade to Standard"
            features={STANDARD_FEATURES}
            tone="standard"
          />
        </div>
      </div>
    </div>
  )
}

function PlanCard({
  title,
  subtitle,
  price,
  cta,
  features,
  tone,
  badge,
  disabled = false,
}: {
  title: string
  subtitle: string
  price: string
  cta: string
  features: Array<{ label: string; included: boolean }>
  tone: 'free' | 'standard'
  badge?: string
  disabled?: boolean
}) {
  const isFree = tone === 'free'

  return (
    <div className={`rounded-[14px] border p-4 ${isFree ? 'border-[#E3F1DE] bg-[linear-gradient(180deg,#F5FBF2_0%,#FFFFFF_20%)]' : 'border-[#E7E1FF] bg-white'}`}>
      {badge && (
        <div className="mb-2 text-center text-[12px] font-medium tracking-wide text-[#5D8E5C]">{badge}</div>
      )}

      <div className="rounded-[14px] border border-[#ECEAF5] bg-white p-5 shadow-[0_10px_30px_rgba(108,92,231,0.05)]">
        <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-full ${isFree ? 'bg-[#EFF8FF] text-[#3BA4F7]' : 'bg-[#F3EEFF] text-[#7C5CFF]'}`}>
          {isFree ? <Send size={22} /> : <Rocket size={22} />}
        </div>

        <h3 className="text-[17px] font-semibold text-[#211B4E]">{title}</h3>
        <p className="mt-1.5 max-w-sm text-[14px] leading-6 text-[#6C668F]">{subtitle}</p>

        <div className="mt-6 text-[17px] font-semibold text-[#31295E]">{price}</div>

        <Button
          variant={isFree ? 'outline' : 'default'}
          disabled={disabled}
          className={`mt-4 h-10 w-full rounded-[10px] text-[13px] ${isFree ? 'border-[#e5edf5] text-[#e5edf5] hover:bg-white' : 'border border-[#533afd] bg-white text-[#4434d4] hover:bg-[#F7F4FF]'}`}
        >
          {cta}
        </Button>

        <div className="my-5 flex items-center gap-4 text-[#D8D3EA]">
          <div className="h-px flex-1 bg-current" />
          <div className="flex items-center gap-2 text-[#C1BCD8]">
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            <span className="h-2.5 w-2.5 rounded-full bg-current" />
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
          </div>
          <div className="h-px flex-1 bg-current" />
        </div>

        <div className="space-y-3">
          {features.map((feature) => (
            <div key={feature.label} className="flex items-center gap-3 text-[14px] text-[#6C668F]">
              <span className={`flex h-[18px] w-[18px] items-center justify-center rounded-full border ${feature.included ? 'border-[#65C466] text-[#65C466]' : 'border-[#A9A5BE] text-[#A9A5BE]'}`}>
                {feature.included ? <Check size={12} /> : <X size={12} />}
              </span>
              <span>{feature.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
