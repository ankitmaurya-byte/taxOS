import { useState } from 'react'
import { ChevronRight } from 'lucide-react'

export interface FAQItem {
  question: string
  answer: string
}

interface FAQSectionProps {
  title?: string
  items: FAQItem[]
  onKnowMore?: () => void
  knowMoreLabel?: string
  emptyMessage?: string
}

export function FAQSection({
  title = 'Frequently Asked Questions',
  items,
  onKnowMore,
  knowMoreLabel = 'Know more',
  emptyMessage = 'No questions yet.',
}: FAQSectionProps) {
  return (
    <div className="bg-white border border-[#e5edf5] rounded-md p-4 sm:p-8 shadow-[rgba(23,23,23,0.06)_0px_3px_6px]">
      <div className="flex flex-col md:flex-row gap-4 md:gap-8">
        <div className="md:w-56 flex-shrink-0">
          <h2 className="text-[18px] text-[#061b31] mb-3" style={{ fontWeight: 300, letterSpacing: '-0.18px' }}>{title}</h2>
          {onKnowMore && (
            <button
              type="button"
              onClick={onKnowMore}
              className="px-4 py-2 border border-[#e5edf5] rounded text-sm text-[#273951] transition-colors hover:bg-[#f6f9fc]"
              style={{ fontWeight: 400 }}
            >
              {knowMoreLabel}
            </button>
          )}
        </div>
        <div className="flex-1">
          {items.length === 0
            ? <p className="text-sm text-[#64748d]" style={{ fontWeight: 300 }}>{emptyMessage}</p>
            : items.map((item, i) => <FaqItem key={i} question={item.question} answer={item.answer} />)
          }
        </div>
      </div>
    </div>
  )
}

function FaqItem({ question, answer }: FAQItem) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-[#e5edf5] last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 py-4 text-left"
      >
        <ChevronRight
          size={16}
          className={`text-[#64748d] transition-transform flex-shrink-0 ${open ? 'rotate-90' : ''}`}
        />
        <span className="text-sm text-[#061b31]" style={{ fontWeight: 400 }}>{question}</span>
      </button>
      {open && (
        <div className="pl-7 pb-4 text-sm text-[#64748d] leading-relaxed" style={{ fontWeight: 300 }}>{answer}</div>
      )}
    </div>
  )
}
