import { Check, Rocket, Send, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { notify } from '@/stores/notifications'

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
  const handleUpgrade = () => {
    notify({
      title: 'Upgrade request received',
      message: 'A teammate will reach out about the Standard plan within one business day.',
      tone: 'success',
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#061b31]/35" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-[850px] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-lg border border-[#e5edf5] bg-white max-h-[calc(100dvh-2rem)] overflow-y-auto"
        style={{ boxShadow: 'rgba(50,50,93,0.25) 0px 30px 45px -30px, rgba(0,0,0,0.1) 0px 18px 36px -18px' }}
      >
        <div className="flex items-center justify-between border-b border-[#e5edf5] px-4 sm:px-10 py-4">
          <h2 className="text-[20px] text-[#061b31]" style={{ fontWeight: 300, letterSpacing: '-0.2px' }}>Upgrade Your Plan</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded text-[#64748d] transition-colors hover:bg-[#f6f9fc] hover:text-[#061b31]"
            aria-label="Close upgrade modal"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-4 sm:gap-6 p-4 sm:p-10 sm:pt-5 grid-cols-1 lg:grid-cols-2">
          <PlanCard
            title="Free"
            subtitle="Check deadlines and set reminders"
            price="$0"
            cta="Current plan"
            disabled
            features={FREE_FEATURES}
            tone="free"
            badge="ACTIVE PLAN"
            onCta={() => undefined}
          />

          <PlanCard
            title="Inkle Tax Standard Plan"
            subtitle="Unlock the Inkle platform and access all filings"
            price="$300/year"
            cta="Upgrade to Standard"
            features={STANDARD_FEATURES}
            tone="standard"
            onCta={handleUpgrade}
          />
        </div>
      </div>
    </div>
  )
}

interface PlanCardProps {
  title: string
  subtitle: string
  price: string
  cta: string
  features: Array<{ label: string; included: boolean }>
  tone: 'free' | 'standard'
  onCta: () => void
  badge?: string
  disabled?: boolean
}

function PlanCard({ title, subtitle, price, cta, features, tone, badge, disabled = false, onCta }: PlanCardProps) {
  const isFree = tone === 'free'
  return (
    <div className={`rounded-lg border p-4 ${isFree ? 'border-[#e5edf5] bg-[linear-gradient(180deg,#f6f9fc_0%,#FFFFFF_20%)]' : 'border-[#d6d9fc] bg-white'}`}>
      {badge && (
        <div className="mb-2 text-center text-[12px] tracking-wide text-[#108c3d]" style={{ fontWeight: 400 }}>{badge}</div>
      )}

      <div
        className="rounded-md border border-[#e5edf5] bg-white p-5"
        style={{ boxShadow: 'rgba(50,50,93,0.25) 0px 30px 45px -30px, rgba(0,0,0,0.1) 0px 18px 36px -18px' }}
      >
        <div
          className="mb-4 flex h-11 w-11 items-center justify-center rounded-md"
          style={{
            background: isFree ? '#f6f9fc' : '#EDE9FD',
            color: isFree ? '#64748d' : '#533afd',
          }}
        >
          {isFree ? <Send size={22} /> : <Rocket size={22} />}
        </div>

        <h3 className="text-[17px] text-[#061b31]" style={{ fontWeight: 300 }}>{title}</h3>
        <p className="mt-1.5 max-w-sm text-[14px] leading-6 text-[#64748d]" style={{ fontWeight: 300 }}>{subtitle}</p>

        <div className="mt-6 text-[17px] text-[#061b31] font-tnum" style={{ fontWeight: 400 }}>{price}</div>

        <Button
          variant={isFree ? 'outline' : 'default'}
          disabled={disabled}
          onClick={onCta}
          className={`mt-4 h-10 w-full rounded text-[13px] ${
            isFree
              ? 'border-[#e5edf5] text-[#64748d] hover:bg-[#f6f9fc]'
              : 'border border-[#533afd] bg-[#533afd] text-white hover:bg-[#4434d4]'
          }`}
        >
          {cta}
        </Button>

        <div className="my-5 flex items-center gap-4 text-[#e5edf5]" aria-hidden="true">
          <div className="h-px flex-1 bg-current" />
          <div className="flex items-center gap-2 text-[#b9b9f9]">
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            <span className="h-2.5 w-2.5 rounded-full bg-current" />
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
          </div>
          <div className="h-px flex-1 bg-current" />
        </div>

        <div className="space-y-3">
          {features.map((feature) => (
            <div key={feature.label} className="flex items-center gap-3 text-[14px] text-[#64748d]" style={{ fontWeight: 300 }}>
              <span
                className="flex h-[18px] w-[18px] items-center justify-center rounded border"
                style={{
                  borderColor: feature.included ? 'rgba(21,190,83,0.5)' : '#e5edf5',
                  color: feature.included ? '#108c3d' : '#64748d',
                }}
              >
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
