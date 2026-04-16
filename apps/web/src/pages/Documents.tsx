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
  RefreshCw,
  AlertCircle,
  Trash2,
  ClipboardCheck,
} from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import { useNavigate } from 'react-router-dom'
import { Pagination } from '@/components/Pagination'

const PAGE_SIZE = 20

const FILE_ICONS: Record<string, { icon: typeof FileText; color: string; bg: string; label: string }> = {
  'application/pdf': { icon: FileText, color: 'text-[#ea2261]', bg: 'bg-[rgba(234,34,97,0.06)]', label: 'PDF' },
  'text/csv': { icon: FileSpreadsheet, color: 'text-[#15be53]', bg: 'bg-[rgba(21,190,83,0.06)]', label: 'CSV' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { icon: FileSpreadsheet, color: 'text-[#15be53]', bg: 'bg-[rgba(21,190,83,0.06)]', label: 'XLS' },
  'image/png': { icon: Image, color: 'text-[#533afd]', bg: 'bg-[rgba(83,58,253,0.06)]', label: 'PNG' },
  'image/jpeg': { icon: Image, color: 'text-[#533afd]', bg: 'bg-[rgba(83,58,253,0.06)]', label: 'JPG' },
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
  const [retryingDocId, setRetryingDocId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [actionMenuId, setActionMenuId] = useState<string | null>(null)
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())

  const documents = useAuthStore(s => s.documents)
  const fetchDocuments = useAuthStore(s => s.fetchDocuments)
  const uploadDocument = useAuthStore(s => s.uploadDocument)
  const extractDocument = useAuthStore(s => s.extractDocument)
  const markDocumentReviewed = useAuthStore(s => s.markDocumentReviewed)
  const deleteDocument = useAuthStore(s => s.deleteDocument)
  const fetchApprovals = useAuthStore(s => s.fetchApprovals)
  const fetchAuditLog = useAuthStore(s => s.fetchAuditLog)

  useEffect(() => { fetchDocuments() }, [fetchDocuments])

  const selectedDocument = selectedDocumentId ? documents.find(d => d.id === selectedDocumentId) : undefined

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      setUploadLoading(true)
      try { await uploadDocument(file) } finally { setUploadLoading(false) }
    }
  }, [uploadDocument])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'], 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'],
      'text/csv': ['.csv'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/plain': ['.txt'], 'application/json': ['.json'],
      'application/msword': ['.doc'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxSize: 50 * 1024 * 1024,
  })

  const filteredDocs = searchQuery
    ? documents.filter((d: any) => d.fileName.toLowerCase().includes(searchQuery.toLowerCase()) || d.aiTags?.some((t: string) => t.toLowerCase().includes(searchQuery.toLowerCase())))
    : documents

  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(filteredDocs.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paginatedDocs = filteredDocs.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  // Reset page on search change
  useEffect(() => { setPage(1) }, [searchQuery])

  const recentDocs = [...documents].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5)

  const getFileConfig = (mimeType: string) => FILE_ICONS[mimeType] || { icon: FileText, color: 'text-[#64748d]', bg: 'bg-[#f6f9fc]', label: 'FILE' }

  // Selection helpers
  const toggleSelect = (id: string) => setSelectedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next })
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredDocs.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(filteredDocs.map((d: any) => d.id)))
  }
  const allSelected = filteredDocs.length > 0 && selectedIds.size === filteredDocs.length

  const handleDelete = async (id: string) => {
    setDeletingIds(prev => new Set(prev).add(id))
    try { await deleteDocument(id); selectedIds.delete(id); setSelectedIds(new Set(selectedIds)) } finally { setDeletingIds(prev => { const n = new Set(prev); n.delete(id); return n }) }
  }

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds)
    for (const id of ids) {
      setDeletingIds(prev => new Set(prev).add(id))
      try { await deleteDocument(id) } catch {}
      setDeletingIds(prev => { const n = new Set(prev); n.delete(id); return n })
    }
    setSelectedIds(new Set())
  }

  const handleDownload = (doc: any) => {
    const url = resolveDocumentUrl(doc.storageUrl)
    const a = document.createElement('a'); a.href = url; a.download = doc.fileName; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.click()
  }

  const handleBulkDownload = () => {
    const selected = filteredDocs.filter((d: any) => selectedIds.has(d.id))
    for (const doc of selected) handleDownload(doc)
  }

  // Shared status renderer
  function DocStatus({ doc }: { doc: any }) {
    if (doc.reviewedByHuman) return <span className="inline-flex items-center gap-1 text-[10px] font-light text-[#108c3d]"><CheckCircle2 size={11} /> Reviewed</span>
    if (doc.extractedData) return <span className="inline-flex items-center gap-1 text-[10px] font-light text-[#108c3d]"><CheckCircle2 size={11} /> Complete</span>
    if (doc.confidenceScore === -1) return (
      <button onClick={async (e) => { e.stopPropagation(); setRetryingDocId(doc.id); try { await extractDocument(doc.id); await fetchDocuments() } finally { setRetryingDocId(null) } }} disabled={retryingDocId === doc.id} className="inline-flex items-center gap-1 text-[10px] text-[#ea2261] hover:text-[#c81d52]">
        {retryingDocId === doc.id ? <><RefreshCw size={10} className="animate-spin" /> Retrying...</> : <><AlertCircle size={10} /> Failed</>}
      </button>
    )
    if (doc.confidenceScore != null) return <span className="inline-flex items-center gap-1 text-[10px] text-[#9b6829]"><span className="w-1.5 h-1.5 rounded-full bg-[#9b6829] animate-pulse" /> Extracting</span>
    return <span className="inline-flex items-center gap-1 text-[10px] text-[#533afd]"><span className="w-1.5 h-1.5 rounded-full bg-[#533afd] animate-pulse" /> Processing</span>
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[26px] font-light tracking-[-0.26px] text-[#061b31]">Documents</h1>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-sm border border-[#e5edf5] bg-white">
            <button onClick={() => setViewMode('grid')} className={`flex items-center justify-center w-8 h-8 rounded-l-sm transition-colors ${viewMode === 'grid' ? 'bg-[rgba(83,58,253,0.08)] text-[#533afd]' : 'text-[#64748d] hover:text-[#273951]'}`}><Grid3X3 size={15} strokeWidth={1.8} /></button>
            <button onClick={() => setViewMode('list')} className={`flex items-center justify-center w-8 h-8 rounded-r-sm transition-colors ${viewMode === 'list' ? 'bg-[rgba(83,58,253,0.08)] text-[#533afd]' : 'text-[#64748d] hover:text-[#273951]'}`}><List size={15} strokeWidth={1.8} /></button>
          </div>
          <button onClick={() => navigate('/documents/vault')} className="flex h-9 items-center gap-1.5 rounded-sm border border-[#b9b9f9] bg-white px-3 text-[14px] font-normal text-[#533afd] hover:bg-[rgba(83,58,253,0.05)] transition-colors"><FolderOpen size={15} strokeWidth={1.8} /> Vault</button>
          {selectedIds.size > 0 && (
            <>
              <button onClick={handleBulkDownload} className="flex h-9 items-center gap-1.5 rounded-sm border border-[#e5edf5] bg-white px-3 text-[13px] font-normal text-[#273951] hover:bg-[#f6f9fc] transition-colors"><Download size={14} strokeWidth={1.8} /> Download ({selectedIds.size})</button>
              <button onClick={handleBulkDelete} className="flex h-9 items-center gap-1.5 rounded-sm border border-[#ffd7ef] bg-white px-3 text-[13px] font-normal text-[#ea2261] hover:bg-[rgba(234,34,97,0.05)] transition-colors"><Trash2 size={14} strokeWidth={1.8} /> Delete ({selectedIds.size})</button>
            </>
          )}
          <div className="relative">
            <button onClick={() => setShowNewMenu(!showNewMenu)} className="flex h-9 items-center gap-1.5 rounded-sm bg-[#533afd] px-4 text-[14px] font-normal text-white hover:bg-[#4434d4] transition-colors"><Plus size={15} /> New <ChevronDown size={11} /></button>
            {showNewMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowNewMenu(false)} />
                <div className="absolute right-0 top-full mt-1 w-48 rounded-sm border border-[#e5edf5] bg-white py-1 z-20" style={{ boxShadow: 'rgba(50,50,93,0.25) 0px 30px 45px -30px, rgba(0,0,0,0.1) 0px 18px 36px -18px' }}>
                  <label className="flex w-full items-center gap-2 px-4 py-2 text-[14px] text-[#273951] hover:bg-[#f6f9fc] cursor-pointer">
                    <Upload size={15} className="text-[#64748d]" strokeWidth={1.8} /> Upload File
                    <input type="file" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; setShowNewMenu(false); setUploadLoading(true); try { await uploadDocument(file) } finally { setUploadLoading(false) } }} />
                  </label>
                  <button onClick={() => setShowNewMenu(false)} className="flex w-full items-center gap-2 px-4 py-2 text-[14px] text-[#273951] hover:bg-[#f6f9fc]"><FolderOpen size={15} className="text-[#64748d]" strokeWidth={1.8} /> New Folder</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748d]" />
        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search documents..." className="h-10 w-full rounded-sm border border-[#e5edf5] bg-white pl-10 pr-10 text-[14px] text-[#061b31] placeholder:text-[#64748d] outline-none focus:border-[#533afd] transition-colors" />
        {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748d] hover:text-[#061b31]"><X size={14} /></button>}
      </div>

      {/* Drop zone */}
      <div {...getRootProps()} className={`rounded-sm border-2 border-dashed p-8 text-center mb-6 cursor-pointer transition-colors ${isDragActive ? 'border-[#362baa] bg-[rgba(83,58,253,0.04)]' : 'border-[#e5edf5] hover:border-[#b9b9f9] bg-white'}`}>
        <input {...getInputProps()} />
        <Upload size={36} className="text-[#b9b9f9] mx-auto mb-3" strokeWidth={1.5} />
        <p className="text-[14px] text-[#64748d]">{isDragActive ? 'Drop files here...' : uploadLoading ? 'Uploading...' : 'Drag and drop files here or click to upload'}</p>
        <p className="text-[12px] text-[#64748d] mt-1">PDF, PNG, JPG, CSV, XLSX, TXT, JSON, DOC up to 50 MB</p>
      </div>

      {/* Recent */}
      {recentDocs.length > 0 && !searchQuery && (
        <div className="mb-8">
          <h2 className="text-[14px] font-normal text-[#273951] mb-3">Recently opened</h2>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {recentDocs.map((doc: any) => {
              const config = getFileConfig(doc.mimeType)
              const Icon = config.icon
              return (
                <div key={doc.id} onClick={() => setSelectedDocumentId(doc.id)} className="w-[240px] flex-shrink-0 rounded-md border border-[#e5edf5] bg-white p-4 cursor-pointer transition-all hover:shadow-standard">
                  <div className={`h-24 rounded-sm ${config.bg} flex items-center justify-center mb-3`}><Icon size={32} className={config.color} strokeWidth={1.5} /></div>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`inline-flex items-center px-[6px] py-[1px] rounded-sm text-[10px] font-light ${config.bg} ${config.color}`}>{config.label}</span>
                    <p className="text-[13px] font-normal text-[#061b31] truncate">{doc.fileName}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Documents */}
      <div>
        <h2 className="text-[14px] font-normal text-[#273951] mb-3">{searchQuery ? `Search results (${filteredDocs.length})` : 'All documents'}</h2>

        {filteredDocs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center rounded-md border border-[#e5edf5] bg-white">
            <FileText size={28} className="text-[#b9b9f9] mb-3" strokeWidth={1.5} />
            <p className="text-[14px] text-[#64748d]">{searchQuery ? 'No documents match your search.' : 'No documents uploaded yet.'}</p>
          </div>
        ) : viewMode === 'list' ? (
          <div className="rounded-md border border-[#e5edf5] bg-white overflow-hidden" style={{ boxShadow: 'rgba(23,23,23,0.08) 0px 15px 35px' }}>
            <table className="w-full text-left text-sm">
              <thead className="bg-[#f6f9fc] border-b border-[#e5edf5]">
                <tr>
                  <th className="w-8 px-4 py-3"><input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="h-3.5 w-3.5 rounded-sm border-[#e5edf5] accent-[#533afd] cursor-pointer" /></th>
                  <th className="px-4 py-3 text-[12px] font-normal text-[#64748d] uppercase tracking-wide">Name</th>
                  <th className="px-4 py-3 text-[12px] font-normal text-[#64748d] uppercase tracking-wide">Created</th>
                  <th className="px-4 py-3 text-[12px] font-normal text-[#64748d] uppercase tracking-wide">Tags</th>
                  <th className="px-4 py-3 text-[12px] font-normal text-[#64748d] uppercase tracking-wide">Confidence</th>
                  <th className="px-4 py-3 text-[12px] font-normal text-[#64748d] uppercase tracking-wide text-center">Status</th>
                  <th className="px-4 py-3 w-16" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5edf5]">
                {paginatedDocs.map((doc: any) => {
                  const config = getFileConfig(doc.mimeType)
                  const Icon = config.icon
                  return (
                    <tr key={doc.id} onClick={() => setSelectedDocumentId(doc.id)} className="hover:bg-[#f6f9fc] cursor-pointer transition-colors">
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}><input type="checkbox" checked={selectedIds.has(doc.id)} onChange={() => toggleSelect(doc.id)} className="h-3.5 w-3.5 rounded-sm border-[#e5edf5] accent-[#533afd] cursor-pointer" /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-8 w-8 items-center justify-center rounded-sm flex-shrink-0 ${config.bg}`}><Icon size={16} className={config.color} strokeWidth={1.8} /></div>
                          <div className="min-w-0">
                            <p className="text-[13px] font-normal text-[#061b31] truncate">{doc.fileName}</p>
                            <p className="text-[11px] text-[#64748d]">{config.label}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-[#64748d] font-tnum">{formatDate(doc.createdAt)}</td>
                      <td className="px-4 py-3">
                        {doc.aiTags?.length > 0
                          ? <span className="inline-flex px-[6px] py-[1px] rounded-sm text-[10px] font-light bg-[rgba(83,58,253,0.08)] text-[#533afd]">{doc.aiTags[0]}{doc.aiTags.length > 1 ? ` +${doc.aiTags.length - 1}` : ''}</span>
                          : <span className="text-[12px] text-[#64748d]">—</span>}
                      </td>
                      <td className="px-4 py-3">{doc.confidenceScore != null && doc.confidenceScore !== -1 ? <ConfidenceBadge score={doc.confidenceScore} /> : <span className="text-[12px] text-[#64748d]">—</span>}</td>
                      <td className="px-4 py-3 text-center"><DocStatus doc={doc} /></td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-end gap-1 relative">
                          <button onClick={() => window.open(resolveDocumentUrl(doc.storageUrl), '_blank', 'noopener,noreferrer')} title="View file" className="p-1 text-[#64748d] hover:text-[#061b31] rounded-sm hover:bg-[#f6f9fc]"><Eye size={14} strokeWidth={1.8} /></button>
                          <button onClick={() => setActionMenuId(actionMenuId === doc.id ? null : doc.id)} className="p-1 text-[#64748d] hover:text-[#061b31] rounded-sm hover:bg-[#f6f9fc]"><MoreHorizontal size={14} strokeWidth={1.8} /></button>
                          {actionMenuId === doc.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setActionMenuId(null)} />
                              <div className="absolute right-0 top-full mt-1 w-40 rounded-sm border border-[#e5edf5] bg-white py-1 z-20" style={{ boxShadow: 'rgba(50,50,93,0.25) 0px 30px 45px -30px, rgba(0,0,0,0.1) 0px 18px 36px -18px' }}>
                                <button onClick={() => { window.open(resolveDocumentUrl(doc.storageUrl), '_blank', 'noopener,noreferrer'); setActionMenuId(null) }} className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-[#273951] hover:bg-[#f6f9fc]"><Eye size={13} strokeWidth={1.8} /> View</button>
                                <button onClick={() => { handleDownload(doc); setActionMenuId(null) }} className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-[#273951] hover:bg-[#f6f9fc]"><Download size={13} strokeWidth={1.8} /> Download</button>
                                {!doc.reviewedByHuman && (
                                  <button onClick={async () => { setActionMenuId(null); setReviewLoading(true); try { await markDocumentReviewed(doc.id) } finally { setReviewLoading(false) } }} className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-[#273951] hover:bg-[#f6f9fc]"><ClipboardCheck size={13} strokeWidth={1.8} /> Mark Reviewed</button>
                                )}
                                {!doc.extractedData && (
                                  <button onClick={async () => { setActionMenuId(null); setExtractLoading(true); try { await extractDocument(doc.id); await fetchApprovals(); await fetchAuditLog() } finally { setExtractLoading(false) } }} className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-[#533afd] hover:bg-[#f6f9fc]"><RefreshCw size={13} strokeWidth={1.8} /> Extract</button>
                                )}
                                <div className="mx-2 my-1 border-t border-[#e5edf5]" />
                                <button onClick={() => { setActionMenuId(null); handleDelete(doc.id) }} disabled={deletingIds.has(doc.id)} className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-[#ea2261] hover:bg-[rgba(234,34,97,0.05)] disabled:opacity-50"><Trash2 size={13} strokeWidth={1.8} /> {deletingIds.has(doc.id) ? 'Deleting...' : 'Delete'}</button>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paginatedDocs.map((doc: any) => {
              const config = getFileConfig(doc.mimeType)
              const Icon = config.icon
              return (
                <div key={doc.id} onClick={() => setSelectedDocumentId(doc.id)} className="group bg-white border border-[#e5edf5] rounded-md p-4 cursor-pointer transition-all hover:shadow-standard">
                  <div className={`h-20 rounded-sm ${config.bg} flex items-center justify-center mb-3`}><Icon size={24} className={config.color} strokeWidth={1.5} /></div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="text-[13px] font-normal text-[#061b31] truncate">{doc.fileName}</p>
                      <p className="text-[11px] text-[#64748d] mt-0.5 font-tnum">{formatDate(doc.createdAt)}</p>
                    </div>
                    <button onClick={e => e.stopPropagation()} className="p-1 text-[#64748d] hover:text-[#061b31] opacity-0 group-hover:opacity-100 rounded-sm"><MoreHorizontal size={14} strokeWidth={1.8} /></button>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {doc.aiTags?.slice(0, 3).map((tag: string, i: number) => (
                      <span key={i} className="inline-flex px-[6px] py-[1px] rounded-sm text-[10px] font-light bg-[rgba(83,58,253,0.08)] text-[#533afd]">{tag}</span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    {doc.confidenceScore != null && doc.confidenceScore !== -1 && <ConfidenceBadge score={doc.confidenceScore} />}
                    <DocStatus doc={doc} />
                  </div>
                  <div className="mt-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!doc.extractedData && (
                      <button onClick={async (e) => { e.stopPropagation(); setExtractLoading(true); try { await extractDocument(doc.id); await fetchApprovals(); await fetchAuditLog() } finally { setExtractLoading(false) } }} disabled={extractLoading} className="rounded-sm border border-[#b9b9f9] px-3 py-1 text-[12px] font-normal text-[#533afd] hover:bg-[rgba(83,58,253,0.05)] disabled:opacity-50 transition-colors">Extract</button>
                    )}
                    {!doc.reviewedByHuman && (
                      <button onClick={async (e) => { e.stopPropagation(); setReviewLoading(true); try { await markDocumentReviewed(doc.id) } finally { setReviewLoading(false) } }} disabled={reviewLoading} className="rounded-sm border border-[#e5edf5] px-3 py-1 text-[12px] font-normal text-[#273951] hover:bg-[#f6f9fc] disabled:opacity-50 transition-colors">Mark Reviewed</button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {filteredDocs.length > PAGE_SIZE && (
        <div className="mt-4">
          <Pagination page={safePage} totalPages={totalPages} totalItems={filteredDocs.length} pageSize={PAGE_SIZE} onPageChange={setPage} itemLabel="documents" />
        </div>
      )}

      {/* Detail Modal */}
      {selectedDocument && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setSelectedDocumentId(null)} />
          <div className="relative w-full max-w-2xl rounded-md bg-white" style={{ boxShadow: 'rgba(3,3,39,0.25) 0px 14px 21px -14px, rgba(0,0,0,0.1) 0px 8px 17px -8px' }}>
            <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-[#e5edf5]">
              <div className="flex items-center gap-3">
                {(() => { const c = getFileConfig(selectedDocument.mimeType); const I = c.icon; return <div className={`flex h-10 w-10 items-center justify-center rounded-sm ${c.bg}`}><I size={20} className={c.color} strokeWidth={1.8} /></div> })()}
                <div>
                  <h2 className="text-[18px] font-light text-[#061b31]">{selectedDocument.fileName}</h2>
                  <p className="text-[13px] text-[#64748d]">{selectedDocument.mimeType} · {formatDate(selectedDocument.createdAt)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {selectedDocument.confidenceScore != null && <ConfidenceBadge score={selectedDocument.confidenceScore} />}
                {selectedDocument.reviewedByHuman && <span className="inline-flex items-center gap-1 rounded-sm bg-[rgba(21,190,83,0.2)] border border-[rgba(21,190,83,0.4)] px-[6px] py-[1px] text-[10px] font-light text-[#108c3d]"><CheckCircle2 size={11} /> Reviewed</span>}
                <button onClick={() => setSelectedDocumentId(null)} className="p-1 text-[#64748d] hover:text-[#061b31] rounded-sm"><X size={16} /></button>
              </div>
            </div>

            <div className="px-6 py-5 max-h-[60vh] overflow-y-auto space-y-5">
              <div className="flex flex-wrap gap-2">
                <button onClick={() => window.open(resolveDocumentUrl(selectedDocument.storageUrl), '_blank', 'noopener,noreferrer')} className="rounded-sm border border-[#b9b9f9] px-4 py-2 text-[14px] font-normal text-[#533afd] hover:bg-[rgba(83,58,253,0.05)] transition-colors">Open File</button>
                {!selectedDocument.extractedData && (
                  <button onClick={async () => { setExtractLoading(true); try { await extractDocument(selectedDocument.id); await fetchApprovals(); await fetchAuditLog() } finally { setExtractLoading(false) } }} disabled={extractLoading} className="rounded-sm bg-[#533afd] px-4 py-2 text-[14px] font-normal text-white hover:bg-[#4434d4] disabled:opacity-50 transition-colors">{extractLoading ? 'Extracting...' : 'Run Extraction'}</button>
                )}
                {!selectedDocument.reviewedByHuman && (
                  <button onClick={async () => { setReviewLoading(true); try { await markDocumentReviewed(selectedDocument.id) } finally { setReviewLoading(false) } }} disabled={reviewLoading} className="rounded-sm border border-[#e5edf5] px-4 py-2 text-[14px] font-normal text-[#273951] hover:bg-[#f6f9fc] disabled:opacity-50 transition-colors">Mark Reviewed</button>
                )}
              </div>

              <div>
                <h3 className="mb-2 text-[13px] font-normal text-[#273951]">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {(selectedDocument.aiTags || []).length === 0
                    ? <p className="text-[13px] text-[#64748d]">No AI tags yet.</p>
                    : selectedDocument.aiTags.map((tag: string) => <span key={tag} className="rounded-sm bg-[rgba(83,58,253,0.08)] px-2 py-0.5 text-[12px] font-light text-[#533afd]">{tag}</span>)}
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-[13px] font-normal text-[#273951]">Extracted Data</h3>
                <div className="max-h-60 overflow-auto rounded-sm bg-[#f6f9fc] border border-[#e5edf5] p-4 text-[12px] font-mono text-[#273951]">
                  {selectedDocument.extractedData ? <pre className="whitespace-pre-wrap">{JSON.stringify(selectedDocument.extractedData, null, 2)}</pre> : <p className="text-[#64748d]">No extraction has been run yet.</p>}
                </div>
              </div>
            </div>

            <div className="flex justify-end px-6 py-4 border-t border-[#e5edf5]">
              <button onClick={() => setSelectedDocumentId(null)} className="h-9 rounded-sm bg-[#533afd] px-4 text-[14px] font-normal text-white hover:bg-[#4434d4] transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
