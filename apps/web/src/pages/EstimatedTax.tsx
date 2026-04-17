// Used in: App.tsx — route /estimated-tax (estimated tax overview)
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, BarChart3, CalendarClock, ChevronDown, FileText, Info, Lightbulb } from 'lucide-react'
import type { EstimatedTaxProjection } from 'shared'
import { useAuthStore } from '@/stores/auth'
import { daysUntil, formatCurrency, formatDate } from '@/lib/utils'

const PROJECTION_BASIS_LABELS: Record<EstimatedTaxProjection['basis'], string> = {
  '1120_total_tax': 'Pulled from Form 1120 total tax',
  '7004_estimated_tax': 'Pulled from Form 7004 estimated tax',
  'taxable_income_formula': 'Calculated from taxable income and entity tax rate',
  'default_formula': 'Estimated from active filing load and entity type',
}

export function EstimatedTaxPage() {
  const navigate = useNavigate()
  const [selectedEntityId, setSelectedEntityId] = useState('')
  const [projection, setProjection] = useState<EstimatedTaxProjection | null>(null)
  const currentTaxYear = new Date().getFullYear()

  const entities = useAuthStore(s => s.entities)
  const deadlines = useAuthStore(s => s.deadlines)
  const filings = useAuthStore(s => s.filings)
  const fetchEntities = useAuthStore(s => s.fetchEntities)
  const fetchDeadlines = useAuthStore(s => s.fetchDeadlines)
  const fetchFilings = useAuthStore(s => s.fetchFilings)
  const fetchEstimatedTax = useAuthStore(s => s.fetchEstimatedTax)

  useEffect(() => { fetchEntities() }, [fetchEntities])
  useEffect(() => { fetchFilings() }, [fetchFilings])

  useEffect(() => {
    if (!selectedEntityId && entities.length > 0) {
      setSelectedEntityId(entities[0].id)
    }
  }, [entities, selectedEntityId])

  useEffect(() => {
    if (!selectedEntityId) return
    fetchDeadlines(selectedEntityId)
    fetchEstimatedTax(selectedEntityId, currentTaxYear).then(r => setProjection(r as any))
  }, [selectedEntityId, fetchDeadlines, fetchEstimatedTax, currentTaxYear])

  const selectedEntity = entities.find((entity: any) => entity.id === selectedEntityId)
  const entityFilings = filings.filter((filing: any) => filing.entityId === selectedEntityId)
  const openFilings = entityFilings.filter((filing: any) => !['submitted', 'archived'].includes(filing.status))
  const submittedFilings = entityFilings.filter((filing: any) => filing.status === 'submitted')
  const overdueDeadlines = deadlines.filter((deadline: any) => deadline.status === 'overdue' || daysUntil(deadline.dueDate) < 0)
  const upcomingDeadlines = deadlines
    .filter((deadline: any) => daysUntil(deadline.dueDate) >= 0)
    .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
  const urgentDeadlines = [...deadlines]
    .sort((a: any, b: any) => (b.urgencyScore || 0) - (a.urgencyScore || 0))
    .slice(0, 6)

  const timelineBars = urgentDeadlines.length > 0
    ? urgentDeadlines
    : Array.from({ length: 4 }, (_, index) => ({
        id: `placeholder-${index}`,
        formType: `Q${index + 1}`,
        urgencyScore: 20,
        dueDate: '',
      }))

  const nextDeadline = upcomingDeadlines[0]
  const annualProjectedTax = projection?.annualProjectedTax ?? 0
  const quarterlyPayments = projection?.quarterlyPayments ?? []
  const nextQuarterPayment = quarterlyPayments.find((payment: any) => payment.status === 'upcoming') || quarterlyPayments[0]
  const projectionBasisLabel = PROJECTION_BASIS_LABELS[projection?.basis || 'default_formula']
  const statusTone = overdueDeadlines.length > 0
    ? {
        title: 'Needs attention',
        detail: `${overdueDeadlines.length} deadline${overdueDeadlines.length === 1 ? '' : 's'} need action now.`,
        color: 'text-[#9b6829]',
      }
    : nextDeadline
      ? {
          title: 'On track',
          detail: `Next deadline is ${nextDeadline.formType} on ${formatDate(nextDeadline.dueDate)}.`,
          color: 'text-[#108c3d]',
        }
      : {
          title: 'No active deadlines',
          detail: 'This entity has no estimated-tax related items scheduled yet.',
          color: 'text-[#64748d]',
        }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-normal tracking-tight text-[#061b31]" style={{ fontWeight: 300 }}>Estimated Tax</h1>
          <p className="mt-1 text-sm text-[#64748d]">Track live filing activity and upcoming deadline pressure by entity.</p>
        </div>

        <div className="relative">
          <select
            value={selectedEntityId}
            onChange={(e) => setSelectedEntityId(e.target.value)}
            className="h-9 appearance-none rounded-lg border border-[#e5edf5] bg-white px-3 pr-8 text-sm text-[#273951] focus:outline-none focus:ring-2 focus:ring-[#533afd]"
          >
            {entities.map((entity: any) => (
              <option key={entity.id} value={entity.id}>
                {entity.legalName}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#64748d]" />
        </div>
      </div>

      {!selectedEntity ? (
        <div className="rounded-md border border-dashed border-[#e5edf5] bg-white p-12 text-center">
          <p className="text-sm font-medium text-[#273951]">No entities yet</p>
          <p className="mt-1 text-sm text-[#64748d]">Add an entity first to start tracking estimated tax obligations.</p>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-lg border border-[#e5edf5] bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[#64748d]">Selected entity</p>
                  <h2 className="mt-2 text-xl font-normal text-[#061b31]" style={{ fontWeight: 400 }}>{selectedEntity.legalName}</h2>
                  <p className="mt-1 text-sm text-[#64748d]">
                    {selectedEntity.entityType} • {selectedEntity.stateOfIncorporation} • Fiscal year end {selectedEntity.fiscalYearEnd}
                  </p>
                </div>
                <div className={`rounded-md px-3 py-1 text-xs font-medium ${statusTone.color} bg-[#f6f9fc]`}>
                  {statusTone.title}
                </div>
              </div>

              <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
                {[
                  { label: 'Projected tax', value: formatCurrency(annualProjectedTax), accent: 'text-[#533afd]' },
                  { label: 'Taxable income', value: projection?.taxableIncome != null ? formatCurrency(projection.taxableIncome) : 'N/A', accent: 'text-[#15be53]' },
                  { label: 'Next payment', value: nextQuarterPayment ? formatCurrency(nextQuarterPayment.amount) : '$0', accent: 'text-[#533afd]' },
                  { label: 'Effective rate', value: `${Math.round((projection?.effectiveTaxRate ?? 0) * 100)}%`, accent: 'text-[#9b6829]' },
                ].map((item) => (
                  <div key={item.label} className="rounded-md bg-[#f6f9fc] p-4">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-[#64748d]">{item.label}</p>
                    <p className={`mt-2 text-2xl font-normal font-tnum ${item.accent}`} style={{ fontWeight: 300 }}>{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-lg border border-[#EEEAFB] bg-[linear-gradient(180deg,#FCFBFF_0%,#F7F4FF_100%)] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-normal text-[#061b31]" style={{ fontWeight: 400 }}>Quarterly payment schedule</p>
                    <p className="mt-1 text-sm text-[#64748d]">Projected from live filing data for tax year {projection?.taxYear ?? currentTaxYear}.</p>
                  </div>
                  <BarChart3 size={18} className="text-[#533afd]" />
                </div>

                <div className="flex h-40 items-end gap-3">
                  {(quarterlyPayments.length > 0 ? quarterlyPayments : timelineBars).map((payment: any) => (
                    <div key={payment.quarter || payment.id} className="flex flex-1 flex-col items-center gap-2">
                      <div className="w-full rounded-t-xl bg-[#F1ECFF] px-2 py-1 text-center text-[10px] font-medium text-[#533afd]">
                        {payment.amount ? formatCurrency(payment.amount) : Math.max(payment.urgencyScore || 0, 20)}
                      </div>
                      <div
                        className={`w-full rounded-t-2xl bg-gradient-to-t ${payment.status === 'overdue' ? 'from-[#9b6829] to-[#d4a76a]' : 'from-[#533afd] to-[#b9b9f9]'}`}
                        style={{
                          height: `${quarterlyPayments.length > 0
                            ? Math.max((payment.amount / Math.max(annualProjectedTax, 1)) * 100 * 4, 20)
                            : Math.max(payment.urgencyScore || 0, 20)}%`,
                        }}
                      />
                      <div className="text-center text-[11px] text-[#64748d]">
                        <div className="font-medium text-[#273951]">{payment.quarter || payment.formType}</div>
                        <div>{payment.dueDate ? formatDate(payment.dueDate) : 'No date'}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-xs text-[#64748d]">{projectionBasisLabel}</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-lg border border-[#e5edf5] bg-white p-6 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#EDE9FD] text-[#533afd]">
                    <CalendarClock size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-normal text-[#061b31]" style={{ fontWeight: 400 }}>Next payment due</h3>
                    <p className="mt-1 text-sm text-[#64748d]">{statusTone.detail}</p>
                  </div>
                </div>

                {nextQuarterPayment ? (
                  <button
                    onClick={() => navigate('/deadlines')}
                    className="mt-4 w-full rounded-md border border-[#e5edf5] px-4 py-3 text-left transition-colors hover:border-[#D8D1F7] hover:bg-[#FAFAFF]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[#061b31]">{nextQuarterPayment.quarter} estimated payment</p>
                        <p className="mt-1 text-sm text-[#64748d]">Due {formatDate(nextQuarterPayment.dueDate)}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-[#061b31] font-tnum">{formatCurrency(nextQuarterPayment.amount)}</div>
                        <div className={`text-sm font-medium font-tnum ${daysUntil(nextQuarterPayment.dueDate) <= 7 ? 'text-[#9b6829]' : 'text-[#108c3d]'}`}>
                          {daysUntil(nextQuarterPayment.dueDate) === 0 ? 'Today' : `${daysUntil(nextQuarterPayment.dueDate)}d`}
                        </div>
                      </div>
                    </div>
                  </button>
                ) : (
                  <div className="mt-4 rounded-md border border-dashed border-[#e5edf5] bg-[#FCFCFD] p-4 text-sm text-[#64748d]">
                    No active deadlines scheduled for this entity.
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-[#e5edf5] bg-white p-6 shadow-sm">
                <h3 className="text-base font-normal text-[#061b31]" style={{ fontWeight: 400 }}>What TaxOS is using</h3>
                <div className="mt-4 space-y-4">
                  {[
                    { icon: BarChart3, text: `${deadlines.length} real deadlines linked to this entity` },
                    { icon: FileText, text: projection?.supportingFilingId ? `Projection anchored to filing ${projection.supportingFilingId.slice(0, 8)}.` : `${entityFilings.length} filing records across the active tax year workflow` },
                    { icon: Lightbulb, text: projectionBasisLabel },
                  ].map((item, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EDE9FD] text-[#533afd]">
                        <item.icon size={18} />
                      </div>
                      <p className="pt-1 text-sm text-[#64748d]">{item.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-[#e5edf5] bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-normal text-[#061b31]" style={{ fontWeight: 400 }}>Estimated-tax related activity</h2>
                <p className="mt-1 text-sm text-[#64748d]">Live deadlines and filing records for the selected entity.</p>
              </div>
              <button
                onClick={() => navigate('/filings')}
                className="inline-flex items-center gap-1 text-sm font-medium text-[#533afd] transition-colors hover:text-[#4434d4]"
              >
                View filings <ArrowRight size={14} />
              </button>
            </div>

            {deadlines.length === 0 && entityFilings.length === 0 ? (
              <div className="rounded-md border border-dashed border-[#e5edf5] bg-[#FCFCFD] p-8 text-center">
                <p className="text-sm font-medium text-[#273951]">No activity yet for this entity</p>
                <p className="mt-1 text-sm text-[#64748d]">Create a filing or add upcoming deadlines to populate this view.</p>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {upcomingDeadlines.slice(0, 4).map((deadline: any) => (
                  <div key={deadline.id} className="rounded-md border border-[#e5edf5] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[#061b31]">{deadline.formType} • {deadline.formName}</p>
                        <p className="mt-1 text-sm text-[#64748d]">{deadline.description || 'Upcoming estimated-tax deadline'}</p>
                      </div>
                      <span className="rounded-md bg-[#f6f9fc] px-2.5 py-1 text-xs font-medium text-[#273951]">
                        {deadline.status}
                      </span>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-sm text-[#64748d]">
                      <span>{formatDate(deadline.dueDate)}</span>
                      <span className={daysUntil(deadline.dueDate) <= 7 ? 'font-medium text-[#9b6829]' : 'font-medium text-[#108c3d]'}>
                        {daysUntil(deadline.dueDate) < 0 ? `${Math.abs(daysUntil(deadline.dueDate))} days overdue` : `${daysUntil(deadline.dueDate)} days left`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-[12px] text-[#64748d]">
            <Info size={12} />
            <span>
              This page is driven by entity, filing, and deadline records currently available in TaxOS.
              {' '}
              <button onClick={() => navigate('/deadlines')} className="text-[#533afd] hover:text-[#4434d4]">
                Review deadlines
              </button>
              {' '}if anything looks off.
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
