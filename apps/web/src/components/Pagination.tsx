import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  page: number
  totalPages: number
  totalItems: number
  pageSize: number
  onPageChange: (p: number) => void
  itemLabel?: string
}

export function Pagination({ page, totalPages, totalItems, pageSize, onPageChange, itemLabel = 'items' }: PaginationProps) {
  if (totalItems === 0) return null

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, totalItems)

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce<(number | '…')[]>((acc, p, i, arr) => {
      if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('…')
      acc.push(p)
      return acc
    }, [])

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-[#6B7280]">
        Showing <span className="font-medium text-[#111827]">{from}–{to}</span> of{' '}
        <span className="font-medium text-[#111827]">{totalItems}</span> {itemLabel}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="flex items-center justify-center h-8 w-8 rounded-lg border border-[#E5E7EB] bg-white text-[#374151] hover:bg-[#F9FAFB] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={15} />
        </button>

        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`e${i}`} className="w-8 text-center text-xs text-[#9CA3AF]">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p as number)}
              className={`h-8 w-8 rounded-lg text-xs font-medium transition-colors ${
                page === p
                  ? 'bg-[#6C5CE7] text-white'
                  : 'border border-[#E5E7EB] bg-white text-[#374151] hover:bg-[#F9FAFB]'
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="flex items-center justify-center h-8 w-8 rounded-lg border border-[#E5E7EB] bg-white text-[#374151] hover:bg-[#F9FAFB] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  )
}
