// Neutral pill badge. Conservative 4px radius per DESIGN.md.
import { cn } from '@/lib/utils'

interface BadgeProps {
  className?: string
  children: React.ReactNode
}

export function Badge({ className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-2 py-0.5 text-[11px]',
        'border border-[#e5edf5] bg-white text-[#061b31]',
        className,
      )}
      style={{ fontWeight: 400 }}
    >
      {children}
    </span>
  )
}
