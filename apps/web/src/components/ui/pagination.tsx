import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null

  const pages: (number | '...')[] = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (currentPage > 3) pages.push('...')
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pages.push(i)
    }
    if (currentPage < totalPages - 2) pages.push('...')
    pages.push(totalPages)
  }

  return (
    <div className="flex items-center justify-center gap-1 mt-6">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB] disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronLeft size={14} />
      </button>
      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`dots-${i}`} className="px-1 text-xs text-[#9CA3AF]">...</span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`flex h-8 min-w-[32px] items-center justify-center rounded-lg px-2 text-xs font-medium transition-colors ${
              p === currentPage
                ? 'bg-[#6C5CE7] text-white'
                : 'border border-[#E5E7EB] text-[#374151] hover:bg-[#F9FAFB]'
            }`}
          >
            {p}
          </button>
        )
      )}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB] disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronRight size={14} />
      </button>
    </div>
  )
}

export function usePagination<T>(items: T[], pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  return {
    totalPages,
    getPage: (page: number) => items.slice((page - 1) * pageSize, page * pageSize),
    totalItems: items.length,
  }
}
