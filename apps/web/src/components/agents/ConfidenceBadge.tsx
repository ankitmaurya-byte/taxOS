// AI confidence badge. Spec palette + conservative 4px radius (DESIGN.md).
import { CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react'

export function ConfidenceBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100)

  if (score >= 0.85) {
    return (
      <Badge
        icon={<CheckCircle size={12} />}
        label={`AI confident (${pct}%)`}
        bg="rgba(21,190,83,0.2)"
        text="#108c3d"
        border="rgba(21,190,83,0.4)"
      />
    )
  }
  if (score >= 0.75) {
    return (
      <Badge
        icon={<AlertTriangle size={12} />}
        label={`CPA review recommended (${pct}%)`}
        bg="rgba(155,104,41,0.12)"
        text="#7a4f1f"
        border="rgba(155,104,41,0.25)"
      />
    )
  }
  return (
    <Badge
      icon={<AlertCircle size={12} />}
      label={`CPA must verify (${pct}%)`}
      bg="rgba(234,34,97,0.1)"
      text="#a3123e"
      border="rgba(234,34,97,0.25)"
    />
  )
}

interface BadgeProps {
  icon: React.ReactNode
  label: string
  bg: string
  text: string
  border: string
}

function Badge({ icon, label, bg, text, border }: BadgeProps) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px]"
      style={{ background: bg, color: text, borderColor: border, fontWeight: 400 }}
    >
      {icon}
      {label}
    </span>
  )
}
