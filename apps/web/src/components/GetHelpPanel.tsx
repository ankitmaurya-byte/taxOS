// Used in: Layout.tsx — popup panel triggered by "Get help" button in TopBar
import { Phone, Calendar, Globe, User, FileText, LayoutGrid } from 'lucide-react'
import { notify } from '@/stores/notifications'

interface GetHelpPanelProps {
  onClose: () => void
}

const SUPPORT_EMAIL = 'support@inkle.io'
const SUPPORT_PHONE = '+1-415-555-0134'
const CEO_EMAIL = 'ceo@inkle.io'

export function GetHelpPanel({ onClose }: GetHelpPanelProps) {
  const handleScheduleSupport = () => {
    window.open('https://calendly.com/inkle-support', '_blank', 'noopener,noreferrer')
    onClose()
  }
  const handleComingSoon = (label: string) => {
    notify({
      title: `${label} not available yet`,
      message: 'Upgrade to Inkle Standard to unlock this concierge channel.',
      tone: 'info',
    })
  }
  const handleMailto = (email: string) => {
    window.location.href = `mailto:${email}`
  }
  const handleTel = (phone: string) => {
    window.location.href = `tel:${phone.replace(/\s|-/g, '')}`
  }

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />

      <div
        role="dialog"
        aria-label="Get help"
        className="absolute right-0 top-full mt-2 w-[520px] bg-white border border-[#e5edf5] rounded-md z-50 overflow-hidden"
        style={{ boxShadow: 'rgba(50,50,93,0.25) 0px 30px 45px -30px, rgba(0,0,0,0.1) 0px 18px 36px -18px' }}
      >
        <div className="flex border-b border-[#e5edf5]">
          <HelpCard
            icon={<User size={22} className="text-[#64748d]" strokeWidth={1.8} />}
            iconBg="#f6f9fc"
            title="Account manager"
            subtitle="Not assigned yet"
            actions={[{ icon: <Phone size={12} />, label: 'Call', onClick: () => handleTel(SUPPORT_PHONE), tone: 'muted' }]}
          />
          <div className="border-l border-[#e5edf5]" />
          <HelpCard
            icon={<User size={22} className="text-[#533afd]" strokeWidth={1.8} />}
            iconBg="#EDE9FD"
            title="Support team"
            subtitle="Mon–Fri, 9am–6pm PT"
            actions={[
              { icon: <Calendar size={12} />, label: 'Schedule', onClick: handleScheduleSupport, tone: 'primary' },
              { icon: <Phone size={12} />, label: 'Call', onClick: () => handleTel(SUPPORT_PHONE), tone: 'muted' },
            ]}
          />
        </div>

        <HelpRow
          icon={<FileText size={22} className="text-[#64748d]" strokeWidth={1.8} />}
          iconBg="#f6f9fc"
          title="Tax preparer"
          subtitle="An active subscription is required to enable a call with our tax expert."
          actions={[{ icon: <Globe size={12} />, label: 'Upgrade for access', onClick: () => handleComingSoon('Tax preparer'), tone: 'primary' }]}
        />

        <HelpRow
          icon={<LayoutGrid size={22} className="text-[#64748d]" strokeWidth={1.8} />}
          iconBg="#f6f9fc"
          title="Bookkeeping expert"
          subtitle="An active bookkeeping service is required to enable a call with our bookkeeping expert."
          actions={[{ icon: <Globe size={12} />, label: 'Upgrade for access', onClick: () => handleComingSoon('Bookkeeping expert'), tone: 'primary' }]}
          border={false}
        />

        <div className="border-t border-[#e5edf5]" />

        <div className="p-5 flex items-start gap-3">
          <div className="relative flex-shrink-0">
            <div
              className="w-12 h-12 rounded-md bg-gradient-to-br from-[#533afd] to-[#2e2b8c] flex items-center justify-center text-white text-sm"
              style={{ fontWeight: 400 }}
            >
              AK
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#15be53] border-2 border-white rounded-full" />
          </div>
          <div>
            <h3 className="text-sm text-[#061b31]" style={{ fontWeight: 400 }}>CEO</h3>
            <p className="text-xs text-[#64748d] mb-2">Anand Krishna</p>
            <div className="flex items-center gap-3">
              <button type="button" onClick={handleScheduleSupport} className="flex items-center gap-1 text-xs text-[#533afd] hover:underline" style={{ fontWeight: 400 }}>
                <Calendar size={12} />
                Schedule
              </button>
              <span className="text-[#e5edf5]">|</span>
              <button type="button" onClick={() => handleMailto(CEO_EMAIL)} className="flex items-center gap-1 text-xs text-[#533afd] hover:underline" style={{ fontWeight: 400 }}>
                <Phone size={12} />
                Email
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

interface HelpAction {
  icon: React.ReactNode
  label: string
  onClick: () => void
  tone: 'primary' | 'muted'
}

interface HelpCardContent {
  icon: React.ReactNode
  iconBg: string
  title: string
  subtitle: string
  actions: HelpAction[]
}

function HelpCard({ icon, iconBg, title, subtitle, actions }: HelpCardContent) {
  return (
    <div className="flex-1 p-5 flex items-start gap-3">
      <div className="w-12 h-12 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: iconBg }}>
        {icon}
      </div>
      <div>
        <h3 className="text-sm text-[#061b31]" style={{ fontWeight: 400 }}>{title}</h3>
        <p className="text-xs text-[#64748d] mb-2">{subtitle}</p>
        <HelpActions actions={actions} />
      </div>
    </div>
  )
}

function HelpRow(props: HelpCardContent & { border?: boolean }) {
  const { icon, iconBg, title, subtitle, actions, border = true } = props
  return (
    <div className={`p-5 flex items-start gap-3 ${border ? 'border-b border-[#e5edf5]' : ''}`}>
      <div className="w-12 h-12 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: iconBg }}>
        {icon}
      </div>
      <div>
        <h3 className="text-sm text-[#061b31]" style={{ fontWeight: 400 }}>{title}</h3>
        <p className="text-xs text-[#64748d] mb-2">{subtitle}</p>
        <HelpActions actions={actions} />
      </div>
    </div>
  )
}

function HelpActions({ actions }: { actions: HelpAction[] }) {
  return (
    <div className="flex items-center gap-3">
      {actions.map((a, i) => (
        <button
          key={i}
          type="button"
          onClick={a.onClick}
          className={`flex items-center gap-1 text-xs hover:underline ${a.tone === 'primary' ? 'text-[#533afd]' : 'text-[#64748d] hover:text-[#273951]'}`}
          style={{ fontWeight: 400 }}
        >
          {a.icon}
          {a.label}
        </button>
      ))}
    </div>
  )
}
