// Used in: App.tsx — route /registrations (state registrations page)
import { ArrowUpRight, AlertTriangle, Home } from 'lucide-react'

const FEDERAL = [
  {
    title: 'EIN Registration',
    department: 'Department: IRS (Internal Revenue Service)',
    registered: true,
  },
  {
    title: 'EFTPS Registration',
    department: 'Department: IRS (Internal Revenue Service)',
    registered: false,
  },
]

const STATES = [
  {
    name: 'Arizona',
    home: false,
    sos: { label: 'Foreign Qualified', status: 'green' },
    agent: { label: 'Registered', status: 'green' },
    payroll: { label: 'Not registered', status: 'gray' },
  },
  {
    name: 'California',
    home: false,
    sos: { label: 'Foreign Qualified', status: 'green' },
    agent: { label: 'Registered', status: 'green' },
    payroll: { label: 'Registered', status: 'green' },
  },
  {
    name: 'Delaware',
    home: true,
    sos: { label: 'Incorporated', status: 'green' },
    agent: { label: 'Registered', status: 'green' },
    payroll: { label: 'Not registered', status: 'gray' },
  },
  {
    name: 'Illinois',
    home: false,
    sos: { label: 'Foreign Qualification required', status: 'amber' },
    agent: { label: 'Not registered', status: 'gray' },
    payroll: { label: 'Not registered', status: 'gray' },
  },
]

function RegBadge({ label, status }: { label: string; status: string }) {
  const styles =
    status === 'green'
      ? 'text-[#065F46]'
      : status === 'amber'
        ? 'text-[#92400E]'
        : 'text-[#6B7280]'
  const dot =
    status === 'green'
      ? 'bg-[#10B981]'
      : status === 'amber'
        ? 'bg-[#F59E0B]'
        : 'bg-[#9CA3AF]'

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5">
        {status === 'amber' ? (
          <AlertTriangle size={12} className="text-[#F59E0B]" />
        ) : (
          <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
        )}
        <span className={`text-[13px] ${styles}`}>{label}</span>
      </div>
      <ArrowUpRight size={14} className="text-[#9CA3AF] ml-auto" />
    </div>
  )
}

export function RegistrationsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-[#111827] mb-6">Registrations</h1>

      {/* Federal */}
      <h2 className="text-base font-semibold text-[#111827] mb-4">Federal Registrations</h2>
      <div className="grid grid-cols-2 gap-4 mb-8">
        {FEDERAL.map((item) => (
          <div
            key={item.title}
            className="bg-white border border-[#E5E7EB] rounded-[10px] p-5 relative"
          >
            <button className="absolute top-4 right-4 text-[#9CA3AF] hover:text-[#374151]">
              <ArrowUpRight size={16} />
            </button>
            <h3 className="text-sm font-medium text-[#111827] mb-1">{item.title}</h3>
            <p className="text-xs text-[#6B7280] mb-4">{item.department}</p>
            <div className="flex items-center gap-1.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  item.registered ? 'bg-[#10B981]' : 'bg-[#9CA3AF]'
                }`}
              />
              <span
                className={`text-xs font-medium ${
                  item.registered ? 'text-[#065F46]' : 'text-[#6B7280]'
                }`}
              >
                {item.registered ? 'Registered' : 'Not registered'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* State */}
      <h2 className="text-base font-semibold text-[#111827] mb-4">State Registrations</h2>
      <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-4 px-4 py-2.5 border-b border-[#E5E7EB]">
          {['State', 'Secretary of State', 'Registered Agent', 'Payroll'].map((h) => (
            <span
              key={h}
              className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider"
            >
              {h}
            </span>
          ))}
        </div>

        {/* Rows */}
        {STATES.map((state) => (
          <div
            key={state.name}
            className="grid grid-cols-4 px-4 py-3 border-b border-[#F3F4F6] hover:bg-[#F9FAFB] transition-colors"
          >
            <div className="flex items-center gap-1.5 text-sm font-medium text-[#111827]">
              {state.name}
              {state.home && <Home size={14} className="text-[#9CA3AF]" />}
            </div>
            <RegBadge {...state.sos} />
            <RegBadge {...state.agent} />
            <RegBadge {...state.payroll} />
          </div>
        ))}
      </div>
    </div>
  )
}
