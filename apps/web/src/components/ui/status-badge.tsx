// Used in: EntitiesOverview.tsx, FilingDetail.tsx, Filings.tsx, Home.tsx, FilingRoom.tsx, CommandCenter.tsx
const STATUS_CONFIG: Record<string, { dot: string; bg: string; text: string; label: string }> = {
  intake:           { dot: '#9CA3AF', bg: '#F3F4F6', text: '#374151', label: 'Intake' },
  ai_prep:          { dot: '#3B82F6', bg: '#DBEAFE', text: '#1E40AF', label: 'AI Prep' },
  cpa_review:       { dot: '#F59E0B', bg: '#FEF3C7', text: '#92400E', label: 'CPA Review' },
  founder_approval: { dot: '#F97316', bg: '#FED7AA', text: '#9A3412', label: 'Needs Approval' },
  submitted:        { dot: '#10B981', bg: '#D1FAE5', text: '#065F46', label: 'Submitted' },
  archived:         { dot: '#9CA3AF', bg: '#F3F4F6', text: '#6B7280', label: 'Archived' },
  active:           { dot: '#10B981', bg: '#D1FAE5', text: '#065F46', label: 'Active' },
  processing:       { dot: '#3B82F6', bg: '#DBEAFE', text: '#1E40AF', label: 'Processing' },
  overdue:          { dot: '#EF4444', bg: '#FEE2E2', text: '#991B1B', label: 'Overdue' },
  not_purchased:    { dot: '#9CA3AF', bg: '#F3F4F6', text: '#6B7280', label: 'Not purchased' },
  in_progress:      { dot: '#F59E0B', bg: '#FEF3C7', text: '#92400E', label: 'In Progress' },
  completed:        { dot: '#10B981', bg: '#D1FAE5', text: '#065F46', label: 'Completed' },
  filed:            { dot: '#10B981', bg: '#D1FAE5', text: '#065F46', label: 'Filed' },
  upcoming:         { dot: '#3B82F6', bg: '#DBEAFE', text: '#1E40AF', label: 'Upcoming' },
  extended:         { dot: '#F59E0B', bg: '#FEF3C7', text: '#92400E', label: 'Extended' },
  pending:          { dot: '#F59E0B', bg: '#FEF3C7', text: '#92400E', label: 'Pending' },
}

export function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.intake
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: config.bg, color: config.text }}
    >
      <span
        className="rounded-full flex-shrink-0"
        style={{ background: config.dot, width: 6, height: 6 }}
      />
      {config.label}
    </span>
  )
}
