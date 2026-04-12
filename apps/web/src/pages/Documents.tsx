// Used in: App.tsx — route /documents (document management and upload)
import { useState, useCallback, useEffect } from 'react'
import { useAuthStore } from '@/stores/auth'
import { ConfidenceBadge } from '@/components/agents/ConfidenceBadge'
import { formatDate } from '@/lib/utils'
import {
  Search,
  Plus,
  Upload,
  FileText,
  FileSpreadsheet,
  Image,
  CheckCircle2,
  Download,
  MoreHorizontal,
  Grid3X3,
  List,
  FolderOpen,
  ChevronDown,
  X,
  Eye,
} from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import { useNavigate } from 'react-router-dom'

const FILE_ICONS: Record<string, { icon: typeof FileText; color: string; bg: string; label: string }> = {
  'application/pdf': { icon: FileText, color: 'text-red-500', bg: 'bg-red-50', label: 'PDF' },
  'text/csv': { icon: FileSpreadsheet, color: 'text-green-600', bg: 'bg-green-50', label: 'CSV' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { icon: FileSpreadsheet, color: 'text-green-600', bg: 'bg-green-50', label: 'XLS' },
  'image/png': { icon: Image, color: 'text-blue-500', bg: 'bg-blue-50', label: 'PNG' },
  'image/jpeg': { icon: Image, color: 'text-blue-500', bg: 'bg-blue-50', label: 'JPG' },
}

const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/api\/?$/, '')

function resolveDocumentUrl(storageUrl: string) {
  if (!storageUrl) return '#'
  if (storageUrl.startsWith('http://') || storageUrl.startsWith('https://')) return storageUrl
  return `${API_BASE}${storageUrl}`
}

export function DocumentsPage() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [extractLoading, setExtractLoading] = useState(false)
  const [reviewLoading, setReviewLoading] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [showNewMenu, setShowNewMenu] = useState(false)

  const documents = useAuthStore(s => s.documents)
  const fetchDocuments = useAuthStore(s => s.fetchDocuments)
  const uploadDocument = useAuthStore(s => s.uploadDocument)
  const extractDocument = useAuthStore(s => s.extractDocument)
  const markDocumentReviewed = useAuthStore(s => s.markDocumentReviewed)
  const fetchApprovals = useAuthStore(s => s.fetchApprovals)
  const fetchAuditLog = useAuthStore(s => s.fetchAuditLog)

  useEffect(() => { fetchDocuments() }, [fetchDocuments])

  const selectedDocument = selectedDocumentId
    ? documents.find(d => d.id === selectedDocumentId)
    : undefined

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      for (const file of acceptedFiles) {
        setUploadLoading(true)
        try { await uploadDocument(file) } finally { setUploadLoading(false) }
      }
    },
    [uploadDocument],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxSize: 50 * 1024 * 1024,
  })

  const filteredDocs = searchQuery
    ? documents.filter((d: any) =>
        d.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.aiTags?.some((t: string) => t.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : documents

  // Recently opened — last 5 docs sorted by date
  const recentDocs = [...documents]
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)

  const getFileConfig = (mimeType: string) =>
    FILE_ICONS[mimeType] || { icon: FileText, color: 'text-[#9CA3AF]', bg: 'bg-[#F3F4F6]', label: 'FILE' }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-[#111827]">Documents</h1>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center rounded-lg border border-[#E5E7EB] bg-white">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center justify-center w-9 h-9 rounded-l-lg transition-colors ${
                viewMode === 'grid' ? 'bg-[#EDE9FD] text-[#6C5CE7]' : 'text-[#9CA3AF] hover:text-[#374151]'
              }`}
              aria-label="Grid view"
            >
              <Grid3X3 size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center justify-center w-9 h-9 rounded-r-lg transition-colors ${
                viewMode === 'list' ? 'bg-[#EDE9FD] text-[#6C5CE7]' : 'text-[#9CA3AF] hover:text-[#374151]'
              }`}
              aria-label="List view"
            >
              <List size={16} />
            </button>
          </div>

          {/* Vault view */}
          <button
            onClick={() => navigate('/documents/vault')}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm text-[#374151] hover:bg-[#F3F4F6] transition-colors"
          >
            <FolderOpen size={15} />
            Vault
          </button>

          {/* Download */}
          <button
            className="flex h-9 items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm text-[#374151] hover:bg-[#F3F4F6] transition-colors"
            aria-label="Download"
          >
            <Download size={15} />
          </button>

          {/* New button */}
          <div className="relative">
            <button
              onClick={() => setShowNewMenu(!showNewMenu)}
              className="flex h-9 items-center gap-1.5 rounded-lg bg-[#6C5CE7] px-4 text-sm font-medium text-white hover:bg-[#5B4BD5] transition-colors"
            >
              <Plus size={15} />
              New
              <ChevronDown size={12} />
            </button>
            {showNewMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowNewMenu(false)} />
                <div className="absolute right-0 top-full mt-1 w-48 rounded-xl border border-[#E5E7EB] bg-white shadow-lg z-20 py-1">
                  <label className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-[#374151] hover:bg-[#F3F4F6] cursor-pointer">
                    <Upload size={15} className="text-[#6B7280]" />
                    Upload File
                    <input type="file" className="hidden" onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      setShowNewMenu(false)
                      setUploadLoading(true)
                      try { await uploadDocument(file) } finally { setUploadLoading(false) }
                    }} />
                  </label>
                  <button
                    onClick={() => setShowNewMenu(false)}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-[#374151] hover:bg-[#F3F4F6]"
                  >
                    <FolderOpen size={15} className="text-[#6B7280]" />
                    New Folder
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative mb-6">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search Documents"
          className="h-11 w-full rounded-lg border border-[#E5E7EB] bg-white pl-11 pr-10 text-sm text-[#111827] placeholder:text-[#9CA3AF] outline-none focus:ring-2 focus:ring-[#6C5CE7] focus:border-transparent"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#374151]">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Upload zone */}
      <div
        {...getRootProps()}
        className={`rounded-xl border-2 border-dashed p-8 text-center mb-6 cursor-pointer transition-colors ${
          isDragActive
            ? 'border-[#6C5CE7] bg-[#EDE9FD]'
            : 'border-[#E5E7EB] hover:border-[#D1D5DB] bg-white'
        }`}
      >
        <input {...getInputProps()} />
        <Upload size={40} className="text-[#D1D5DB] mx-auto mb-3" />
        <p className="text-sm text-[#6B7280]">
          {isDragActive ? 'Drop files here...' : uploadLoading ? 'Uploading...' : 'Drag and drop files here or click to upload'}
        </p>
        <p className="text-xs text-[#9CA3AF] mt-1">PDF, PNG, JPG, CSV, XLSX up to 50MB</p>
      </div>

      {/* Recently Opened */}
      {recentDocs.length > 0 && !searchQuery && (
        <div className="mb-8">
          <h2 className="text-sm font-medium text-[#374151] mb-3">Recently Opened</h2>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {recentDocs.map((doc: any) => {
              const config = getFileConfig(doc.mimeType)
              const Icon = config.icon
              return (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDocumentId(doc.id)}
                  className="w-[260px] flex-shrink-0 rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                >
                  {/* File preview area */}
                  <div className={`h-28 rounded-lg ${config.bg} flex items-center justify-center mb-3`}>
                    <Icon size={36} className={config.color} />
                  </div>
                  {/* File info */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${config.bg} ${config.color}`}>
                        {config.label}
                      </span>
                      <p className="text-sm font-medium text-[#111827] truncate">{doc.fileName}</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation() }}
                      className="p-1 text-[#9CA3AF] hover:text-[#374151] flex-shrink-0"
                    >
                      <MoreHorizontal size={16} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Folders and Files */}
      <div>
        <h2 className="text-sm font-medium text-[#374151] mb-3">
          {searchQuery ? `Search results (${filteredDocs.length})` : 'All Documents'}
        </h2>

        {filteredDocs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-[#E5E7EB] bg-white">
            <FileText size={32} className="text-[#D1D5DB] mb-3" />
            <p className="text-sm text-[#6B7280]">{searchQuery ? 'No documents match your search.' : 'No documents uploaded yet.'}</p>
          </div>
        ) : viewMode === 'list' ? (
          /* ─── Table / List View ─── */
          <div className="rounded-xl border border-[#E5E7EB] bg-white overflow-hidden shadow-sm">
            {/* Table header */}
            <div className="flex items-center px-4 py-3 bg-[#F9FAFB] border-b border-[#E5E7EB] text-xs font-medium uppercase text-[#6B7280] tracking-wider">
              <div className="w-8 flex-shrink-0">
                <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-[#6C5CE7] focus:ring-[#6C5CE7]" />
              </div>
              <div className="flex-1 min-w-0">Name</div>
              <div className="w-32">Created On</div>
              <div className="w-24">Tags</div>
              <div className="w-24">Confidence</div>
              <div className="w-24 text-center">Status</div>
              <div className="w-16 text-right">Actions</div>
            </div>

            {/* Table rows */}
            {filteredDocs.map((doc: any) => {
              const config = getFileConfig(doc.mimeType)
              const Icon = config.icon
              return (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDocumentId(doc.id)}
                  className="flex items-center px-4 py-3 border-b border-[#F3F4F6] hover:bg-[#F9FAFB] cursor-pointer transition-colors"
                >
                  <div className="w-8 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-[#6C5CE7] focus:ring-[#6C5CE7]" />
                  </div>
                  <div className="flex-1 min-w-0 flex items-center gap-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0 ${config.bg}`}>
                      <Icon size={18} className={config.color} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#111827] truncate">{doc.fileName}</p>
                      <p className="text-xs text-[#9CA3AF]">{config.label}</p>
                    </div>
                  </div>
                  <div className="w-32 text-sm text-[#6B7280]">
                    {formatDate(doc.createdAt)}
                  </div>
                  <div className="w-24">
                    {doc.aiTags?.length > 0 ? (
                      <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#EDE9FD] text-[#6C5CE7]">
                        {doc.aiTags[0]}{doc.aiTags.length > 1 ? ` +${doc.aiTags.length - 1}` : ''}
                      </span>
                    ) : (
                      <span className="text-xs text-[#9CA3AF]">—</span>
                    )}
                  </div>
                  <div className="w-24">
                    {doc.confidenceScore != null ? (
                      <ConfidenceBadge score={doc.confidenceScore} />
                    ) : (
                      <span className="text-xs text-[#9CA3AF]">—</span>
                    )}
                  </div>
                  <div className="w-24 text-center">
                    {doc.reviewedByHuman ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#065F46]">
                        <CheckCircle2 size={12} /> Reviewed
                      </span>
                    ) : doc.extractedData ? (
                      <span className="text-[11px] text-[#6B7280]">Extracted</span>
                    ) : (
                      <span className="text-[11px] text-[#9CA3AF]">Pending</span>
                    )}
                  </div>
                  <div className="w-16 flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => window.open(resolveDocumentUrl(doc.storageUrl), '_blank', 'noopener,noreferrer')}
                      className="p-1 text-[#9CA3AF] hover:text-[#374151]"
                      aria-label="View file"
                    >
                      <Eye size={14} />
                    </button>
                    <button className="p-1 text-[#9CA3AF] hover:text-[#374151]" aria-label="More actions">
                      <MoreHorizontal size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* ─── Grid View ─── */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredDocs.map((doc: any) => {
              const config = getFileConfig(doc.mimeType)
              const Icon = config.icon
              return (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDocumentId(doc.id)}
                  className="group bg-white border border-[#E5E7EB] rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className={`h-24 rounded-lg ${config.bg} flex items-center justify-center mb-3`}>
                    <Icon size={28} className={config.color} />
                  </div>

                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#111827] truncate">{doc.fileName}</p>
                      <p className="text-xs text-[#6B7280] mt-0.5">{formatDate(doc.createdAt)}</p>
                    </div>
                    <button onClick={(e) => e.stopPropagation()} className="p-1 text-[#9CA3AF] hover:text-[#374151] opacity-0 group-hover:opacity-100">
                      <MoreHorizontal size={16} />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {doc.aiTags?.slice(0, 3).map((tag: string, i: number) => (
                      <span key={i} className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#EDE9FD] text-[#6C5CE7]">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between">
                    {doc.confidenceScore != null && <ConfidenceBadge score={doc.confidenceScore} />}
                    {doc.reviewedByHuman && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#065F46]">
                        <CheckCircle2 size={12} /> Reviewed
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!doc.extractedData && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation()
                          setExtractLoading(true)
                          try { await extractDocument(doc.id); await fetchApprovals(); await fetchAuditLog() } finally { setExtractLoading(false) }
                        }}
                        disabled={extractLoading}
                        className="rounded-lg border border-[#D8D3FF] px-3 py-1.5 text-xs font-medium text-[#6C5CE7] hover:bg-[#F3F0FF] disabled:opacity-50"
                      >
                        Extract
                      </button>
                    )}
                    {!doc.reviewedByHuman && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation()
                          setReviewLoading(true)
                          try { await markDocumentReviewed(doc.id) } finally { setReviewLoading(false) }
                        }}
                        disabled={reviewLoading}
                        className="rounded-lg border border-[#E5E7EB] px-3 py-1.5 text-xs font-medium text-[#374151] hover:bg-[#F9FAFB] disabled:opacity-50"
                      >
                        Mark Reviewed
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Document Detail Modal */}
      {selectedDocument && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button className="absolute inset-0 bg-black/40" onClick={() => setSelectedDocumentId(null)} />
          <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-[#E5E7EB]">
              <div className="flex items-center gap-3">
                {(() => {
                  const config = getFileConfig(selectedDocument.mimeType)
                  const Icon = config.icon
                  return (
                    <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${config.bg}`}>
                      <Icon size={22} className={config.color} />
                    </div>
                  )
                })()}
                <div>
                  <h2 className="text-lg font-semibold text-[#111827]">{selectedDocument.fileName}</h2>
                  <p className="text-sm text-[#6B7280]">{selectedDocument.mimeType} · Uploaded {formatDate(selectedDocument.createdAt)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {selectedDocument.confidenceScore != null && <ConfidenceBadge score={selectedDocument.confidenceScore} />}
                {selectedDocument.reviewedByHuman && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                    <CheckCircle2 size={12} /> Reviewed
                  </span>
                )}
                <button onClick={() => setSelectedDocumentId(null)} className="p-1 text-[#9CA3AF] hover:text-[#374151]">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 max-h-[60vh] overflow-y-auto space-y-5">
              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => window.open(resolveDocumentUrl(selectedDocument.storageUrl), '_blank', 'noopener,noreferrer')}
                  className="rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm font-medium text-[#374151] hover:bg-[#F9FAFB]"
                >
                  Open File
                </button>
                {!selectedDocument.extractedData && (
                  <button
                    onClick={async () => {
                      setExtractLoading(true)
                      try { await extractDocument(selectedDocument.id); await fetchApprovals(); await fetchAuditLog() } finally { setExtractLoading(false) }
                    }}
                    disabled={extractLoading}
                    className="rounded-lg bg-[#6C5CE7] px-3 py-2 text-sm font-medium text-white hover:bg-[#5B4BD5] disabled:opacity-50"
                  >
                    {extractLoading ? 'Extracting...' : 'Run Extraction'}
                  </button>
                )}
                {!selectedDocument.reviewedByHuman && (
                  <button
                    onClick={async () => {
                      setReviewLoading(true)
                      try { await markDocumentReviewed(selectedDocument.id) } finally { setReviewLoading(false) }
                    }}
                    disabled={reviewLoading}
                    className="rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm font-medium text-[#374151] hover:bg-[#F9FAFB] disabled:opacity-50"
                  >
                    Mark Reviewed
                  </button>
                )}
              </div>

              {/* Tags */}
              <div>
                <h3 className="mb-2 text-sm font-semibold text-[#111827]">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {(selectedDocument.aiTags || []).length === 0 ? (
                    <p className="text-sm text-[#6B7280]">No AI tags yet.</p>
                  ) : (
                    selectedDocument.aiTags.map((tag: string) => (
                      <span key={tag} className="rounded-full bg-[#EDE9FD] px-2.5 py-1 text-xs font-medium text-[#6C5CE7]">{tag}</span>
                    ))
                  )}
                </div>
              </div>

              {/* Extracted Data */}
              <div>
                <h3 className="mb-2 text-sm font-semibold text-[#111827]">Extracted Data</h3>
                <div className="max-h-60 overflow-auto rounded-lg bg-[#F9FAFB] p-4 text-sm text-[#374151]">
                  {selectedDocument.extractedData ? (
                    <pre className="whitespace-pre-wrap">{JSON.stringify(selectedDocument.extractedData, null, 2)}</pre>
                  ) : (
                    <p className="text-[#6B7280]">No extraction has been run yet.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end px-6 py-4 border-t border-[#E5E7EB]">
              <button
                onClick={() => setSelectedDocumentId(null)}
                className="h-9 rounded-lg bg-[#6C5CE7] px-4 text-sm font-medium text-white hover:bg-[#5B4BD5]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
