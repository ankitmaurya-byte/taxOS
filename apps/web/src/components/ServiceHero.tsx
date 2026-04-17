import { ReactNode } from 'react'

interface ServiceHeroProps {
  title: string
  price: string
  description: string
  illustration: ReactNode
  primaryCtaLabel: string
  secondaryCtaLabel?: string
  onPrimaryClick: () => void
  onSecondaryClick?: () => void
}

export function ServiceHero({
  title,
  price,
  description,
  illustration,
  primaryCtaLabel,
  secondaryCtaLabel,
  onPrimaryClick,
  onSecondaryClick,
}: ServiceHeroProps) {
  return (
    <div className="bg-white border border-[#e5edf5] rounded-md p-4 sm:p-8 mb-6 flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-8 shadow-[rgba(23,23,23,0.06)_0px_3px_6px]">
      <div className="flex-1">
        <h2 className="text-[22px] text-[#061b31] mb-2" style={{ fontWeight: 300, letterSpacing: '-0.22px' }}>{title}</h2>
        <p className="text-sm text-[#533afd] mb-3" style={{ fontWeight: 400 }}>{price}</p>
        <p className="text-sm text-[#64748d] leading-relaxed mb-5 max-w-lg" style={{ fontWeight: 300 }}>
          {description}
        </p>
        <div className="flex items-center gap-4 flex-wrap">
          <button
            type="button"
            onClick={onPrimaryClick}
            className="h-10 px-6 bg-[#533afd] text-white rounded text-sm transition-colors hover:bg-[#4434d4]"
            style={{ fontWeight: 400 }}
          >
            {primaryCtaLabel}
          </button>
          {secondaryCtaLabel && onSecondaryClick && (
            <button
              type="button"
              onClick={onSecondaryClick}
              className="text-sm text-[#533afd] hover:underline"
              style={{ fontWeight: 400 }}
            >
              {secondaryCtaLabel}
            </button>
          )}
        </div>
      </div>
      <div className="w-full md:w-64 h-40 bg-gradient-to-br from-[#f6f9fc] to-[#EDE9FD] rounded-md flex items-center justify-center flex-shrink-0">
        {illustration}
      </div>
    </div>
  )
}
