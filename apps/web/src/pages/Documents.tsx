// Used in: App.tsx — route /documents (document management and upload)
import { useState, useCallback, useEffect } from 'react'
import { useAuthStore } from '@/stores/auth'
import { ConfidenceBadge } from '@/components/agents/ConfidenceBadge'
import { formatDate } from '@/lib/utils'
import {
  Search,
  Filter,
  Plus,
  Upload,
  FileText,
  FileSpreadsheet,
  Image,
  CheckCircle2,
  Download,
  Trash2,
} from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import { useNavigate } from 'react-router-dom'

const FILE_ICONS: Record<string, { icon: typeof FileText; color: string }> = {
  'application/pdf': { icon: FileText, color: 'text-red-500' },
  'text/csv': { icon: FileSpreadsheet, color: 'text-green-600' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
    icon: FileSpreadsheet,
    color: 'text-green-600',
  },
  'image/png': { icon: Image, color: 'text-blue-500' },
  'image/jpeg': { icon: Image, color: 'text-blue-500' },
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
        d.fileName.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : documents

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[#111827] mb-5">Documents</h1>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="flex items-center h-9 px-3 bg-white border border-[#E5E7EB] rounded-lg gap-2">
            <Search size={14} className="text-[#9CA3AF]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents..."
              className="bg-transparent text-sm text-[#111827] placeholder:text-[#9CA3AF] outline-none w-48"
            />
          </div>
          <button className="flex items-center justify-center w-9 h-9 border border-[#E5E7EB] rounded-lg text-[#9CA3AF] hover:bg-[#F3F4F6] hover:text-[#374151] transition-colors">
            <Filter size={16} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/documents/vault')}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-[#E5E7EB] px-4 text-sm font-medium text-[#374151] hover:bg-[#F3F4F6] transition-colors"
          >
            Vault View
          </button>
          <label className="flex items-center gap-1.5 h-9 px-4 bg-[#6C5CE7] text-white rounded-lg text-sm font-medium hover:bg-[#5B4BD5] transition-colors cursor-pointer">
            <Plus size={16} />
            Upload
            <input type="file" className="hidden" onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              setUploadLoading(true)
              try { await uploadDocument(file) } finally { setUploadLoading(false) }
            }} />
          </label>
        </div>
      </div>

      {/* Upload zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-10 text-center mb-6 cursor-pointer transition-colors ${
          isDragActive
            ? 'border-[#6C5CE7] bg-[#EDE9FD]'
            : 'border-[#E5E7EB] hover:border-[#D1D5DB] bg-white'
        }`}
      >
        <input {...getInputProps()} />
        <Upload size={48} className="text-[#D1D5DB] mx-auto mb-3" />
        <p className="text-sm text-[#6B7280]">
          {isDragActive ? 'Drop files here...' : 'Drag and drop files here or click to upload'}
        </p>
        <p className="text-xs text-[#9CA3AF] mt-1">PDF, PNG, JPG, XLSX up to 50MB</p>
      </div>

      {/* Document grid */}
      {filteredDocs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText size={32} className="text-[#D1D5DB] mb-3" />
          <p className="text-sm text-[#6B7280]">No documents uploaded yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc: any) => {
            const fileConfig = FILE_ICONS[doc.mimeType] || {
              icon: FileText,
              color: 'text-[#9CA3AF]',
            }
            const Icon = fileConfig.icon

            return (
              <div
                key={doc.id}
                className="group bg-white border border-[#E5E7EB] rounded-xl p-4 hover:border-[#D1D5DB] transition-colors"
                onClick={() => setSelectedDocumentId(doc.id)}
              >
                <div className="flex items-start justify-between mb-3">
                  <Icon size={28} className={fileConfig.color} />
                  <div className="hidden group-hover:flex items-center gap-1">
                    <button
                      className="p-1 text-[#9CA3AF] hover:text-[#374151]"
                      onClick={(e) => {
                        e.stopPropagation()
                        window.open(resolveDocumentUrl(doc.storageUrl), '_blank', 'noopener,noreferrer')
                      }}
                    >
                      <Download size={14} />
                    </button>
                    <button className="p-1 text-[#9CA3AF] hover:text-[#EF4444]">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <p className="text-sm font-medium text-[#111827] mb-1 truncate">{doc.fileName}</p>
                <p className="text-xs text-[#6B7280] mb-2">{formatDate(doc.createdAt)}</p>

                <div className="flex flex-wrap gap-1.5 mb-2">
                  {doc.aiTags?.map((tag: string, i: number) => (
                    <span
                      key={i}
                      className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#EDE9FD] text-[#6C5CE7]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  {doc.confidenceScore != null && (
                    <ConfidenceBadge score={doc.confidenceScore} />
                  )}
                  {doc.reviewedByHuman && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#065F46]">
                      <CheckCircle2 size={12} /> Reviewed
                    </span>
                  )}
                </div>

                <div className="mt-3 flex gap-2">
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

      {selectedDocument && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button className="absolute inset-0 bg-black/40" onClick={() => setSelectedDocumentId(null)} />
          <div className="relative w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-[#111827]">{selectedDocument.fileName}</h2>
                <p className="mt-1 text-sm text-[#6B7280]">{selectedDocument.mimeType} • Uploaded {formatDate(selectedDocument.createdAt)}</p>
              </div>
              <div className="flex items-center gap-2">
                {selectedDocument.confidenceScore != null && (
                  <ConfidenceBadge score={selectedDocument.confidenceScore} />
                )}
                {selectedDocument.reviewedByHuman && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                    <CheckCircle2 size={12} /> Reviewed
                  </span>
                )}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
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

            <div className="mt-6 space-y-4">
              <div>
                <h3 className="mb-2 text-sm font-semibold text-[#111827]">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {(selectedDocument.aiTags || []).length === 0 ? (
                    <p className="text-sm text-[#6B7280]">No AI tags yet.</p>
                  ) : (
                    selectedDocument.aiTags.map((tag: string) => (
                      <span key={tag} className="rounded-full bg-[#EDE9FD] px-2 py-1 text-xs font-medium text-[#6C5CE7]">
                        {tag}
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold text-[#111827]">Extracted Data</h3>
                <div className="max-h-80 overflow-auto rounded-lg bg-[#F9FAFB] p-4 text-sm text-[#374151]">
                  {selectedDocument.extractedData ? (
                    <pre className="whitespace-pre-wrap">{JSON.stringify(selectedDocument.extractedData, null, 2)}</pre>
                  ) : (
                    <p>No extraction has been run yet.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
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
