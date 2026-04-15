// Used in: App.tsx — route /filings (filings list page)
import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/auth'
import { StatusBadge } from '@/components/ui/status-badge'
import { CreateFilingModal } from '@/components/filings/CreateFilingModal'
import { formatDate } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'
import {
  Calendar,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  Info,
  Eye,
  Upload,
  FolderOpen,
  FileText,
  Plus,
} from 'lucide-react'

export function FilingsPage() {
  const navigate = useNavigate()
  const filings = useAuthStore(s => s.filings)
  const fetchFilings = useAuthStore(s => s.fetchFilings)

  useEffect(() => { fetchFilings() }, [fetchFilings])
  const [pendingOnMe, setPendingOnMe] = useState(false)
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [expandedYears, setExpandedYears] = useState<Record<number, boolean>>({ 2025: true, 2024: true })
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showYearDropdown, setShowYearDropdown] = useState(false)
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [showStatusFilter, setShowStatusFilter] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Available years from filings data
  const availableYears = Array.from(new Set(filings.map((f: any) => f.taxYear || 2025))).sort(
    (a: number, b: number) => b - a,
  )

  const STATUS_OPTIONS = [
    { key: 'intake', label: 'Intake' },
    { key: 'ai_prep', label: 'AI Prep' },
    { key: 'cpa_review', label: 'CPA Review' },
    { key: 'founder_approval', label: 'Needs Approval' },
    { key: 'submitted', label: 'Submitted' },
    { key: 'archived', label: 'Archived' },
  ]

  // Apply all filters in sequence
  let displayFilings = filings

  // 1. "Pending on me" — only filings that need founder action
  if (pendingOnMe) {
    displayFilings = displayFilings.filter((f: any) => f.status === 'founder_approval')
  }

  // 2. Year filter from dropdown
  if (selectedYear !== null) {
    displayFilings = displayFilings.filter((f: any) => (f.taxYear || 2025) === selectedYear)
  }

  // 3. Status filter from filter dropdown
  if (statusFilter) {
    displayFilings = displayFilings.filter((f: any) => f.status === statusFilter)
  }

  // 4. Search filter
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase()
    displayFilings = displayFilings.filter(
      (f: any) =>
        f.formType?.toLowerCase().includes(q) ||
        f.formName?.toLowerCase().includes(q),
    )
  }

  // 5. Stat card filter
  const completed = displayFilings.filter((f: any) => f.status === 'submitted' || f.status === 'archived')
  const processing = displayFilings.filter((f: any) => ['ai_prep', 'cpa_review', 'founder_approval'].includes(f.status))
  const addDetails = displayFilings.filter((f: any) => f.status === 'intake')

  const stats = [
    { label: 'All', count: displayFilings.length, key: 'all' },
    { label: 'Completed', count: completed.length, key: 'completed' },
    { label: 'Processing', count: processing.length, key: 'processing' },
    { label: 'Add Details', count: addDetails.length, key: 'add_details' },
  ]

  const filteredFilings =
    activeFilter === 'completed'
      ? completed
      : activeFilter === 'processing'
        ? processing
        : activeFilter === 'add_details'
          ? addDetails
          : displayFilings

  // Group by tax year
  const grouped: Record<number, typeof filings> = {}
  filteredFilings.forEach((f: any) => {
    const year = f.taxYear || 2025
    if (!grouped[year]) grouped[year] = []
    grouped[year].push(f)
  })
  const sortedYears = Object.keys(grouped)
    .map(Number)
    .sort((a, b) => b - a)

  const toggleYear = (year: number) => {
    setExpandedYears((prev) => ({ ...prev, [year]: !prev[year] }))
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[#111827] mb-5">Filings</h1>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          {/* Year dropdown filter */}
          <div className="relative">
            <button
              onClick={() => {
                setShowYearDropdown(!showYearDropdown)
                setShowStatusFilter(false)
              }}
              className={`flex items-center gap-1.5 h-9 px-3 border rounded-lg text-sm transition-colors ${
                selectedYear !== null
                  ? 'border-[#6C5CE7] text-[#6C5CE7] bg-[#EDE9FD]'
                  : 'border-[#E5E7EB] text-[#374151] hover:bg-[#F3F4F6]'
              }`}
            >
              <Calendar size={14} className={selectedYear !== null ? 'text-[#6C5CE7]' : 'text-[#9CA3AF]'} />
              <span>{selectedYear ?? 'All years'}</span>
              <ChevronDown size={12} className={selectedYear !== null ? 'text-[#6C5CE7]' : 'text-[#9CA3AF]'} />
            </button>
            {showYearDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowYearDropdown(false)} />
                <div className="absolute left-0 top-full mt-1 bg-white border border-[#E5E7EB] rounded-lg shadow-lg z-20 min-w-[120px]">
                  <button
                    onClick={() => {
                      setSelectedYear(null)
                      setShowYearDropdown(false)
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-[#F3F0FF] ${
                      selectedYear === null ? 'text-[#6C5CE7] font-medium' : 'text-[#111827]'
                    }`}
                  >
                    All years
                  </button>
                  {availableYears.map((year: number) => (
                    <button
                      key={year}
                      onClick={() => {
                        setSelectedYear(year)
                        setShowYearDropdown(false)
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-[#F3F0FF] ${
                        selectedYear === year ? 'text-[#6C5CE7] font-medium' : 'text-[#111827]'
                      }`}
                    >
                      {year}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Search toggle + input */}
          {showSearch ? (
            <div className="flex items-center gap-1">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search filings..."
                  autoFocus
                  className="h-9 pl-8 pr-3 border border-[#E5E7EB] rounded-lg text-sm w-48 focus:outline-none focus:ring-2 focus:ring-[#6C5CE7] focus:border-transparent"
                />
              </div>
              <button
                onClick={() => {
                  setShowSearch(false)
                  setSearchQuery('')
                }}
                className="flex items-center justify-center w-9 h-9 text-[#9CA3AF] hover:text-[#374151] transition-colors"
              >
                &times;
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setShowSearch(true)
                setShowStatusFilter(false)
              }}
              className="flex items-center justify-center w-9 h-9 border border-[#E5E7EB] rounded-lg text-[#9CA3AF] hover:bg-[#F3F4F6] hover:text-[#374151] transition-colors"
            >
              <Search size={16} />
            </button>
          )}

          {/* Status filter dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowStatusFilter(!showStatusFilter)
                setShowYearDropdown(false)
              }}
              className={`flex items-center justify-center w-9 h-9 border rounded-lg transition-colors ${
                statusFilter
                  ? 'border-[#6C5CE7] text-[#6C5CE7] bg-[#EDE9FD]'
                  : 'border-[#E5E7EB] text-[#9CA3AF] hover:bg-[#F3F4F6] hover:text-[#374151]'
              }`}
            >
              <Filter size={16} />
            </button>
            {showStatusFilter && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowStatusFilter(false)} />
                <div className="absolute left-0 top-full mt-1 bg-white border border-[#E5E7EB] rounded-lg shadow-lg z-20 min-w-[160px]">
                  <button
                    onClick={() => {
                      setStatusFilter(null)
                      setShowStatusFilter(false)
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-[#F3F0FF] ${
                      statusFilter === null ? 'text-[#6C5CE7] font-medium' : 'text-[#111827]'
                    }`}
                  >
                    All statuses
                  </button>
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => {
                        setStatusFilter(opt.key)
                        setShowStatusFilter(false)
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-[#F3F0FF] ${
                        statusFilter === opt.key ? 'text-[#6C5CE7] font-medium' : 'text-[#111827]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Pending on me toggle — filters to founder_approval status only */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/filings/room')}
            className="flex items-center gap-1.5 h-9 px-4 border border-[#E5E7EB] text-[#374151] rounded-lg text-sm font-medium hover:bg-[#F3F4F6] transition-colors"
          >
            Workflow View
          </button>
          <button
            onClick={() => setPendingOnMe(!pendingOnMe)}
            className={`flex items-center gap-2 h-9 px-4 rounded-full text-sm font-medium border transition-colors ${
              pendingOnMe
                ? 'bg-[#EDE9FD] text-[#6C5CE7] border-[#6C5CE7]'
                : 'bg-[#F3F4F6] text-[#374151] border-[#E5E7EB]'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${pendingOnMe ? 'bg-[#6C5CE7]' : 'bg-[#9CA3AF]'}`}
            />
            Pending on me
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 h-9 px-4 bg-[#6C5CE7] text-white rounded-lg text-sm font-medium hover:bg-[#5B4BD5] transition-colors"
          >
            <Plus size={16} />
            Create filing
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {stats.map((stat) => (
          <button
            key={stat.key}
            onClick={() => setActiveFilter(stat.key)}
            className={`text-left bg-white border rounded-[10px] px-5 py-4 transition-colors ${
              activeFilter === stat.key
                ? 'border-2 border-[#6C5CE7] bg-[#FAFAFA]'
                : 'border-[#E5E7EB] hover:border-[#D1D5DB]'
            }`}
          >
            <p className="text-xs font-medium text-[#6B7280] mb-1">{stat.label}</p>
            <p className="text-2xl font-bold text-[#111827]">{stat.count}</p>
          </button>
        ))}
      </div>

      {/* Filing Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl">
        {/* Header */}
        <div className="flex items-center px-4 py-2.5 border-b border-[#E5E7EB]">
          <div className="flex-1 text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">
            Filing
          </div>
          <div className="w-40 text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">
            Deadline
          </div>
          <div className="w-60 text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider text-right">
            Status
          </div>
        </div>

        {/* Grouped rows */}
        {sortedYears.map((year) => (
          <div key={year}>
            {/* Year separator */}
            <button
              onClick={() => toggleYear(year)}
              className="flex items-center gap-2 w-full px-4 py-2.5 text-[13px] font-semibold text-[#111827] hover:bg-[#F9FAFB] transition-colors"
            >
              {expandedYears[year] ? (
                <ChevronDown size={14} className="text-[#9CA3AF]" />
              ) : (
                <ChevronRight size={14} className="text-[#9CA3AF]" />
              )}
              Tax year {year}
            </button>

            {expandedYears[year] &&
              grouped[year].map((filing) => (
                <div
                  key={filing.id}
                  className="group flex items-center px-4 py-3 border-b border-[#F3F4F6] hover:bg-[#F9FAFB] cursor-pointer transition-colors"
                  onClick={() => navigate(`/filings/${filing.id}`)}
                >
                  {/* Filing name */}
                  <div className="flex-1 flex items-center gap-1.5">
                    <span className="text-sm font-medium text-[#6C5CE7]">
                      {filing.formType} — {filing.formName}
                    </span>
                    <div
                      className="relative group/info"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Info
                        size={14}
                        className="cursor-pointer text-[#9CA3AF] transition-colors group-hover/info:text-[#6C5CE7]"
                      />
                      {/* Tooltip */}
                      <div className="pointer-events-none absolute left-0 bottom-full mb-3 z-50 w-72 rounded-xl border border-[#2D3748] bg-[#1A202C] shadow-2xl opacity-0 invisible -translate-y-1 group-hover/info:opacity-100 group-hover/info:visible group-hover/info:translate-y-0 transition-all duration-200 ease-out">
                        {/* Header */}
                        <div className="flex items-center gap-2 border-b border-[#2D3748] px-3.5 py-2.5">
                          <span className="inline-flex items-center rounded-md bg-[#6C5CE7]/20 px-2 py-0.5 text-[10px] font-bold tracking-widest text-[#A78BFA] uppercase">
                            {filing.formType}
                          </span>
                          {(filing as any).taxYear && (
                            <span className="text-[11px] text-[#4A5568]">Tax Year {(filing as any).taxYear}</span>
                          )}
                        </div>
                        {/* Body */}
                        <div className="px-3.5 py-3">
                          <p className="text-[12.5px] leading-relaxed text-[#E2E8F0]">
                            {(filing as any).aiSummary || filing.formName}
                          </p>
                        </div>
                        {/* Arrow */}
                        <div className="absolute left-5 top-full size-0 border-x-[5px] border-t-[5px] border-x-transparent border-t-[#2D3748]" />
                        <div className="absolute left-[21px] top-full size-0 border-x-[4px] border-t-[4px] border-x-transparent border-t-[#1A202C]" />
                      </div>
                    </div>
                  </div>

                  {/* Deadline */}
                  <div className="w-40 flex items-center gap-1.5 text-[13px] text-[#111827]">
                    <Calendar size={14} className="text-[#9CA3AF]" />
                    {filing.createdAt ? formatDate(filing.createdAt) : '—'}
                  </div>

                  {/* Status + hover quick actions */}
                  <div className="w-64 flex items-center justify-end gap-2">
                    <div className="hidden group-hover:flex items-center gap-0.5">
                      <button
                        title="View filing"
                        onClick={(e) => { e.stopPropagation(); navigate(`/filings/${filing.id}`) }}
                        className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-[#6B7280] hover:text-[#6C5CE7] hover:bg-[#EDE9FD] transition-colors"
                      >
                        <Eye size={13} /> View
                      </button>
                      <button
                        title="Upload document"
                        onClick={(e) => { e.stopPropagation(); navigate(`/documents`) }}
                        className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-[#6B7280] hover:text-[#6C5CE7] hover:bg-[#EDE9FD] transition-colors"
                      >
                        <Upload size={13} /> Upload
                      </button>
                      <button
                        title="Open filing room"
                        onClick={(e) => { e.stopPropagation(); navigate(`/filings/room/${filing.id}`) }}
                        className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-[#6B7280] hover:text-[#6C5CE7] hover:bg-[#EDE9FD] transition-colors"
                      >
                        <FolderOpen size={13} /> Room
                      </button>
                    </div>
                    <StatusBadge status={filing.status} />
                  </div>
                </div>
              ))}
          </div>
        ))}

        {filteredFilings.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText size={32} className="text-[#D1D5DB] mb-3" />
            <p className="text-sm text-[#6B7280]">No filings found</p>
          </div>
        )}
      </div>

      <CreateFilingModal open={showCreateModal} onClose={() => setShowCreateModal(false)} />
    </div>
  )
}
