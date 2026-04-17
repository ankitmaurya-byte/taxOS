// Status pill with a semantic coloured dot. Uses DESIGN.md palette only.
// tokens: success green #15be53/#108c3d, amber/lemon #9b6829, purple #533afd,
// ruby #ea2261, slate #64748d/#273951.

interface StatusConfig {
  dot: string
  bg: string
  text: string
  border: string
  label: string
}

const SUCCESS:   StatusConfig = { dot: '#15be53', bg: 'rgba(21,190,83,0.2)',  text: '#108c3d', border: 'rgba(21,190,83,0.4)',  label: '' }
const INFO:      StatusConfig = { dot: '#533afd', bg: 'rgba(83,58,253,0.1)',  text: '#2e2b8c', border: 'rgba(83,58,253,0.25)', label: '' }
const WARNING:   StatusConfig = { dot: '#9b6829', bg: 'rgba(155,104,41,0.12)', text: '#7a4f1f', border: 'rgba(155,104,41,0.25)', label: '' }
const DANGER:    StatusConfig = { dot: '#ea2261', bg: 'rgba(234,34,97,0.1)',  text: '#a3123e', border: 'rgba(234,34,97,0.25)', label: '' }
const NEUTRAL:   StatusConfig = { dot: '#64748d', bg: '#f6f9fc',              text: '#273951', border: '#e5edf5',              label: '' }

const STATUS_CONFIG: Record<string, StatusConfig> = {
  intake:           { ...NEUTRAL, label: 'Intake' },
  ai_prep:          { ...INFO, label: 'AI Prep' },
  cpa_review:       { ...WARNING, label: 'CPA Review' },
  founder_approval: { ...WARNING, label: 'Needs Approval' },
  submitted:        { ...SUCCESS, label: 'Submitted' },
  archived:         { ...NEUTRAL, label: 'Archived' },
  active:           { ...SUCCESS, label: 'Active' },
  processing:       { ...INFO, label: 'Processing' },
  overdue:          { ...DANGER, label: 'Overdue' },
  not_purchased:    { ...NEUTRAL, label: 'Not purchased' },
  in_progress:      { ...WARNING, label: 'In Progress' },
  completed:        { ...SUCCESS, label: 'Completed' },
  filed:            { ...SUCCESS, label: 'Filed' },
  upcoming:         { ...INFO, label: 'Upcoming' },
  extended:         { ...WARNING, label: 'Extended' },
  pending:          { ...WARNING, label: 'Pending' },
}

export function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.intake
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[10px]"
      style={{ background: config.bg, color: config.text, borderColor: config.border, fontWeight: 300 }}
    >
      <span
        className="rounded-full flex-shrink-0"
        style={{ background: config.dot, width: 6, height: 6 }}
      />
      {config.label}
    </span>
  )
}
