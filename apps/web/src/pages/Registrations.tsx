// Used in: App.tsx — route /registrations (state registrations page)
import { ArrowUpRight, AlertTriangle, Home } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useState } from 'react'

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

function sosStatus(entityStatus: string): { label: string; status: string } {
  if (entityStatus === 'active') return { label: 'Incorporated', status: 'green' }
  if (entityStatus === 'inactive') return { label: 'Inactive', status: 'amber' }
  return { label: 'Dissolved', status: 'gray' }
}

function agentStatus(entityStatus: string): { label: string; status: string } {
  if (entityStatus === 'active') return { label: 'Registered', status: 'green' }
  if (entityStatus === 'inactive') return { label: 'Lapsed', status: 'amber' }
  return { label: 'Not registered', status: 'gray' }
}

export function RegistrationsPage() {
  const { data: entities = [], isLoading } = useQuery({
    queryKey: ['entities'],
    queryFn: api.getEntities,
  })

  const [selectedId, setSelectedId] = useState<string>('')

  const entity = selectedId
    ? entities.find((e: any) => e.id === selectedId)
    : entities[0]

  const hasEin = Boolean(entity?.ein)
  const entityStatus: string = entity?.status ?? 'active'

  const federalItems = [
    {
      title: 'EIN Registration',
      department: 'Department: IRS (Internal Revenue Service)',
      registered: hasEin,
    },
    {
      title: 'EFTPS Registration',
      department: 'Department: IRS (Internal Revenue Service)',
      registered: false,
    },
  ]

  const stateRows = entity
    ? [
        {
          name: entity.stateOfIncorporation,
          home: true,
          sos: sosStatus(entityStatus),
          agent: agentStatus(entityStatus),
          payroll: { label: 'Not registered', status: 'gray' },
        },
      ]
    : []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-[#6B7280]">
        Loading registrations…
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-[#111827]">Registrations</h1>
        {entities.length > 1 && (
          <select
            value={selectedId || entities[0]?.id}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-56 border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm text-[#111827] bg-white outline-none focus:border-[#6C5CE7] transition-colors"
          >
            {entities.map((e: any) => (
              <option key={e.id} value={e.id}>
                {e.legalName}
              </option>
            ))}
          </select>
        )}
      </div>

      {!entity ? (
        <p className="text-sm text-[#6B7280]">No entities found. Create an entity to see registration status.</p>
      ) : (
        <>
          {/* Federal */}
          <h2 className="text-base font-semibold text-[#111827] mb-4">Federal Registrations</h2>
          <div className="grid grid-cols-2 gap-4 mb-8">
            {federalItems.map((item) => (
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
            {stateRows.map((state) => (
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
        </>
      )}
    </div>
  )
}
