// Used in: App.tsx — route /documents (document management and upload)
import { useState, useCallback, useEffect, useRef } from 'react'
import { useAuthStore } from '@/stores/auth'
import { ConfidenceBadge } from '@/components/agents/ConfidenceBadge'
import { formatDate } from '@/lib/utils'
import { notify } from '@/stores/notifications'
import { api } from '@/lib/api'
import {
  UploadStatusPill,
  ExtractionStatusPill,
} from '@/components/documents/DocumentStatus'
import {
  Search,
  Plus,
  Upload,
  FileText,
  FileSpreadsheet,
  Image,
  Download,
  MoreHorizontal,
  Grid3X3,
  List,
  FolderOpen,
  ChevronDown,
  X,
  Eye,
  RefreshCw,
  Trash2,
  Loader2,
  CloudUpload,
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

const MAX_BYTES = 25 * 1024 * 1024

interface UploadTicket {
  id: string // local id
  fileName: string
  size: number
  progress: number
  phase: 'uploading' | 'queued' | 'done' | 'failed'
  error?: string
  file: File
  filingId?: string
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function DocumentsPage() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [showNewMenu, setShowNewMenu] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [actionMenuId, setActionMenuId] = useState<string | null>(null)
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
  const [retryExtractIds, setRetryExtractIds] = useState<Set<string>>(new Set())
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  // Per-file upload progress tracking
  const [uploadTickets, setUploadTickets] = useState<UploadTicket[]>([])
  const retryUploadInputRef = useRef<HTMLInputElement | null>(null)
  const retryExtractInputRef = useRef<HTMLInputElement | null>(null)
  const retryTargetId = useRef<string | null>(null)

  const documents = useAuthStore(s => s.documents)
  const fetchDocuments = useAuthStore(s => s.fetchDocuments)
  const uploadDocument = useAuthStore(s => s.uploadDocument)
  const retryDocumentUpload = useAuthStore(s => s.retryDocumentUpload)
  const retryDocumentExtract = useAuthStore(s => s.retryDocumentExtract)
  const deleteDocument = useAuthStore(s => s.deleteDocument)

  useEffect(() => { fetchDocuments() }, [fetchDocuments])

  // Poll while any doc is mid-flight so status pills update without refresh.
  useEffect(() => {
    const activeOnServer = (documents as any[]).some(
      d =>
        d.uploadStatus === 'uploading'
        || d.extractionStatus === 'extracting'
        || d.extractionStatus === 'processing'
        || d.extractionStatus === 'pending',
    )
    if (!activeOnServer) return
    const handle = window.setInterval(() => { fetchDocuments() }, 2000)
    return () => window.clearInterval(handle)
  }, [documents, fetchDocuments])

  const selectedDocument = selectedDocumentId ? (documents as any[]).find(d => d.id === selectedDocumentId) : undefined

  // ─── Upload handling ────────────────────────────────────────────────────
  const runUpload = useCallback(async (ticket: UploadTicket) => {
    setUploadTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, phase: 'uploading', progress: 0 } : t))
    try {
      await uploadDocument(ticket.file, ticket.filingId, {
        onProgress: (pct) => {
          setUploadTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, progress: pct } : t))
        },
      })
      setUploadTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, phase: 'done', progress: 100 } : t))
      // Auto-clear successful ticket after a short delay — server doc now owns the row.
      window.setTimeout(() => {
        setUploadTickets(prev => prev.filter(t => t.id !== ticket.id))
      }, 2000)
    } catch (err: any) {
      setUploadTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, phase: 'failed', error: err?.message || 'Upload failed' } : t))
    }
  }, [uploadDocument])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      if (file.size > MAX_BYTES) {
        notify({ title: 'File too large', message: `${file.name} exceeds the 25 MB limit.`, tone: 'error' })
        continue
      }
      const ticket: UploadTicket = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        fileName: file.name,
        size: file.size,
        progress: 0,
        phase: 'queued',
        file,
      }
      setUploadTickets(prev => [...prev, ticket])
      runUpload(ticket)
    }
  }, [runUpload])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'], 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'],
      'text/csv': ['.csv'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/plain': ['.txt'], 'application/json': ['.json'],
      'application/msword': ['.doc'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxSize: MAX_BYTES,
  })

  const filteredDocs = searchQuery
    ? (documents as any[]).filter((d: any) => d.fileName.toLowerCase().includes(searchQuery.toLowerCase()) || d.aiTags?.some((t: string) => t.toLowerCase().includes(searchQuery.toLowerCase())))
    : (documents as any[])

  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(filteredDocs.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paginatedDocs = filteredDocs.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  useEffect(() => { setPage(1) }, [searchQuery])

  const recentDocs = [...(documents as any[])].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5)

  const getFileConfig = (mimeType: string) => FILE_ICONS[mimeType] || { icon: FileText, color: 'text-[#64748d]', bg: 'bg-[#f6f9fc]', label: 'FILE' }

  // Selection
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

  // ─── Open in new tab (view) ────────────────────────────────────────────
  const canOpen = (doc: any) => Boolean(doc?.storageUrl && doc.uploadStatus === 'uploaded')
  const handleOpen = (doc: any) => {
    if (!canOpen(doc)) {
      notify({ title: 'Not available', message: 'This file was not stored (larger than 1 MB). Only extracted context is available.', tone: 'info' })
      return
    }
    window.open(doc.storageUrl, '_blank', 'noopener,noreferrer')
  }

  // ─── Single-file download ──────────────────────────────────────────────
  const handleDownload = async (doc: any) => {
    if (downloadingId) {
      notify({ title: 'Another download in progress', message: 'Please wait for the current download to finish.', tone: 'info' })
      return
    }
    if (!canOpen(doc)) {
      notify({ title: 'Not available', message: 'This file was not stored on Cloudinary.', tone: 'info' })
      return
    }
    setDownloadingId(doc.id)
    try {
      const { url, fileName } = await api.documents.getDownload(doc.id)
      const anchor = window.document.createElement('a')
      anchor.href = url
      anchor.download = fileName
      anchor.rel = 'noopener noreferrer'
      anchor.click()
    } catch (err: any) {
      notify({ title: 'Download failed', message: err?.message || 'Could not fetch download URL.', tone: 'error' })
    } finally {
      // small delay so the browser kicks off the download before we allow the next one
      window.setTimeout(() => setDownloadingId(null), 500)
    }
  }

  // ─── Retry flows ───────────────────────────────────────────────────────
  const triggerRetryUpload = (docId: string) => {
    retryTargetId.current = docId
    retryUploadInputRef.current?.click()
  }

  const handleRetryUploadPicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const docId = retryTargetId.current
    e.target.value = ''
    retryTargetId.current = null
    if (!file || !docId) return
    try {
      await retryDocumentUpload(docId, file)
      notify({ title: 'Retrying upload', message: `${file.name} is being re-uploaded.`, tone: 'success' })
    } catch (err: any) {
      notify({ title: 'Retry failed', message: err?.message || 'Could not retry upload.', tone: 'error' })
    }
  }

  const handleRetryExtractNoFile = async (docId: string) => {
    setRetryExtractIds(prev => new Set(prev).add(docId))
    try {
      await retryDocumentExtract(docId)
      notify({ title: 'Retrying extraction', message: 'Extraction restarted.', tone: 'success' })
    } catch (err: any) {
      // server said we need a file — fall back to the file picker
      if (err?.response?.status === 400) {
        retryTargetId.current = docId
        retryExtractInputRef.current?.click()
      } else {
        notify({ title: 'Retry failed', message: err?.message || 'Could not retry extraction.', tone: 'error' })
      }
    } finally {
      setRetryExtractIds(prev => { const n = new Set(prev); n.delete(docId); return n })
    }
  }

  const handleRetryExtractPicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const docId = retryTargetId.current
    e.target.value = ''
    retryTargetId.current = null
    if (!file || !docId) return
    setRetryExtractIds(prev => new Set(prev).add(docId))
    try {
      await retryDocumentExtract(docId, file)
      notify({ title: 'Retrying extraction', message: `${file.name} is being re-processed.`, tone: 'success' })
    } catch (err: any) {
      notify({ title: 'Retry failed', message: err?.message || 'Could not retry extraction.', tone: 'error' })
    } finally {
      setRetryExtractIds(prev => { const n = new Set(prev); n.delete(docId); return n })
    }
  }

  const handleDismissTicket = (id: string) => {
    setUploadTickets(prev => prev.filter(t => t.id !== id))
  }

  const handleRetryTicket = (ticket: UploadTicket) => {
    runUpload(ticket)
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Hidden file inputs for retry flows */}
      <input ref={retryUploadInputRef} type="file" className="hidden" onChange={handleRetryUploadPicked} />
      <input ref={retryExtractInputRef} type="file" className="hidden" onChange={handleRetryExtractPicked} />

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
            <button onClick={handleBulkDelete} className="flex h-9 items-center gap-1.5 rounded-sm border border-[#ffd7ef] bg-white px-3 text-[13px] font-normal text-[#ea2261] hover:bg-[rgba(234,34,97,0.05)] transition-colors"><Trash2 size={14} strokeWidth={1.8} /> Delete ({selectedIds.size})</button>
          )}
          <div className="relative">
            <button onClick={() => setShowNewMenu(!showNewMenu)} className="flex h-9 items-center gap-1.5 rounded-sm bg-[#533afd] px-4 text-[14px] font-normal text-white hover:bg-[#4434d4] transition-colors"><Plus size={15} /> New <ChevronDown size={11} /></button>
            {showNewMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowNewMenu(false)} />
                <div className="absolute right-0 top-full mt-1 w-48 rounded-sm border border-[#e5edf5] bg-white py-1 z-20" style={{ boxShadow: 'rgba(50,50,93,0.25) 0px 30px 45px -30px, rgba(0,0,0,0.1) 0px 18px 36px -18px' }}>
                  <label className="flex w-full items-center gap-2 px-4 py-2 text-[14px] text-[#273951] hover:bg-[#f6f9fc] cursor-pointer">
                    <Upload size={15} className="text-[#64748d]" strokeWidth={1.8} /> Upload File
                    <input type="file" className="hidden" multiple onChange={(e) => { const files = e.target.files; if (!files) return; setShowNewMenu(false); onDrop(Array.from(files)); e.target.value = '' }} />
                  </label>
                  <button onClick={() => { setShowNewMenu(false); navigate('/documents/vault') }} className="flex w-full items-center gap-2 px-4 py-2 text-[14px] text-[#273951] hover:bg-[#f6f9fc]"><FolderOpen size={15} className="text-[#64748d]" strokeWidth={1.8} /> Open Vault</button>
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
        <p className="text-[14px] text-[#64748d]">{isDragActive ? 'Drop files here...' : 'Drag and drop files here or click to upload'}</p>
        <p className="text-[12px] text-[#64748d] mt-1">Up to 25 MB. Files ≤ 1 MB are stored on Cloudinary; larger files are extracted as context only.</p>
      </div>

      {/* In-flight upload tickets */}
      {uploadTickets.length > 0 && (
        <div className="mb-6 space-y-2">
          {uploadTickets.map(ticket => (
            <div key={ticket.id} className="rounded-md border border-[#e5edf5] bg-white p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <CloudUpload size={18} className="text-[#533afd] flex-shrink-0" strokeWidth={1.8} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-[#061b31] truncate">{ticket.fileName}</p>
                    <p className="text-[11px] text-[#64748d]">
                      {formatBytes(ticket.size)} ·{' '}
                      {ticket.phase === 'uploading' && `Uploading… ${ticket.progress}%`}
                      {ticket.phase === 'queued' && 'Queued'}
                      {ticket.phase === 'done' && 'Uploaded — server is extracting'}
                      {ticket.phase === 'failed' && (ticket.error || 'Upload failed')}
                    </p>
                    {(ticket.phase === 'uploading' || ticket.phase === 'queued') && (
                      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-[#f6f9fc]">
                        <div
                          className="h-full bg-[#533afd] transition-all"
                          style={{ width: `${ticket.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {ticket.phase === 'failed' && (
                    <button
                      onClick={() => handleRetryTicket(ticket)}
                      className="inline-flex h-7 items-center gap-1 rounded-sm border border-[#b9b9f9] bg-white px-2 text-[12px] font-medium text-[#533afd] hover:bg-[rgba(83,58,253,0.05)]"
                    >
                      <RefreshCw size={12} /> Retry
                    </button>
                  )}
                  {ticket.phase !== 'uploading' && (
                    <button
                      onClick={() => handleDismissTicket(ticket.id)}
                      className="p-1 text-[#64748d] hover:text-[#061b31]"
                      title="Dismiss"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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
                  <th className="px-4 py-3 text-[12px] font-normal text-[#64748d] uppercase tracking-wide">Upload</th>
                  <th className="px-4 py-3 text-[12px] font-normal text-[#64748d] uppercase tracking-wide">Extraction</th>
                  <th className="px-4 py-3 text-[12px] font-normal text-[#64748d] uppercase tracking-wide">Confidence</th>
                  <th className="px-4 py-3 w-36" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5edf5]">
                {paginatedDocs.map((doc: any) => {
                  const config = getFileConfig(doc.mimeType)
                  const Icon = config.icon
                  const canOpenDoc = canOpen(doc)
                  const isDownloading = downloadingId === doc.id
                  const uploadFailed = doc.uploadStatus === 'failed'
                  const extractFailed = doc.extractionStatus === 'failed'
                  const extractRetrying = retryExtractIds.has(doc.id)
                  return (
                    <tr key={doc.id} onClick={() => setSelectedDocumentId(doc.id)} className="hover:bg-[#f6f9fc] cursor-pointer transition-colors">
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}><input type="checkbox" checked={selectedIds.has(doc.id)} onChange={() => toggleSelect(doc.id)} className="h-3.5 w-3.5 rounded-sm border-[#e5edf5] accent-[#533afd] cursor-pointer" /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-8 w-8 items-center justify-center rounded-sm flex-shrink-0 ${config.bg}`}><Icon size={16} className={config.color} strokeWidth={1.8} /></div>
                          <div className="min-w-0">
                            <p className="text-[13px] font-normal text-[#061b31] truncate">{doc.fileName}</p>
                            <p className="text-[11px] text-[#64748d]">{config.label}{doc.fileSize ? ` · ${formatBytes(doc.fileSize)}` : ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-[#64748d] font-tnum">{formatDate(doc.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <UploadStatusPill status={doc.uploadStatus} error={doc.uploadError} />
                          {uploadFailed && (
                            <button
                              onClick={(e) => { e.stopPropagation(); triggerRetryUpload(doc.id) }}
                              className="inline-flex h-6 items-center gap-1 rounded-sm border border-[#b9b9f9] px-1.5 text-[11px] font-medium text-[#533afd] hover:bg-[rgba(83,58,253,0.05)]"
                              title={doc.uploadError || 'Retry upload'}
                            >
                              <RefreshCw size={10} /> Retry upload
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <ExtractionStatusPill status={doc.extractionStatus} error={doc.extractionError} />
                          {extractFailed && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleRetryExtractNoFile(doc.id) }}
                              disabled={extractRetrying}
                              className="inline-flex h-6 items-center gap-1 rounded-sm border border-[#b9b9f9] px-1.5 text-[11px] font-medium text-[#533afd] hover:bg-[rgba(83,58,253,0.05)] disabled:opacity-60"
                              title={doc.extractionError || 'Retry extraction'}
                            >
                              {extractRetrying ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
                              Retry extract
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">{doc.confidenceScore != null && doc.confidenceScore !== -1 ? <ConfidenceBadge score={doc.confidenceScore} /> : <span className="text-[12px] text-[#64748d]">—</span>}</td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-end gap-1 relative">
                          <button
                            onClick={() => handleOpen(doc)}
                            disabled={!canOpenDoc}
                            title={canOpenDoc ? 'Open file' : 'File not stored (> 1 MB)'}
                            className="p-1 text-[#64748d] hover:text-[#061b31] rounded-sm hover:bg-[#f6f9fc] disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Eye size={14} strokeWidth={1.8} />
                          </button>
                          <button
                            onClick={() => handleDownload(doc)}
                            disabled={!canOpenDoc || isDownloading || Boolean(downloadingId && downloadingId !== doc.id)}
                            title={canOpenDoc ? (downloadingId && downloadingId !== doc.id ? 'Another download in progress' : 'Download') : 'File not stored (> 1 MB)'}
                            className="p-1 text-[#64748d] hover:text-[#061b31] rounded-sm hover:bg-[#f6f9fc] disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {isDownloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} strokeWidth={1.8} />}
                          </button>
                          <button onClick={() => setActionMenuId(actionMenuId === doc.id ? null : doc.id)} className="p-1 text-[#64748d] hover:text-[#061b31] rounded-sm hover:bg-[#f6f9fc]"><MoreHorizontal size={14} strokeWidth={1.8} /></button>
                          {actionMenuId === doc.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setActionMenuId(null)} />
                              <div className="absolute right-0 top-full mt-1 w-44 rounded-sm border border-[#e5edf5] bg-white py-1 z-20" style={{ boxShadow: 'rgba(50,50,93,0.25) 0px 30px 45px -30px, rgba(0,0,0,0.1) 0px 18px 36px -18px' }}>
                                <button
                                  onClick={() => { setActionMenuId(null); handleOpen(doc) }}
                                  disabled={!canOpenDoc}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-[#273951] hover:bg-[#f6f9fc] disabled:opacity-40"
                                >
                                  <Eye size={13} strokeWidth={1.8} /> Open
                                </button>
                                <button
                                  onClick={() => { setActionMenuId(null); handleDownload(doc) }}
                                  disabled={!canOpenDoc}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-[#273951] hover:bg-[#f6f9fc] disabled:opacity-40"
                                >
                                  <Download size={13} strokeWidth={1.8} /> Download
                                </button>
                                <button
                                  onClick={() => { setActionMenuId(null); handleRetryExtractNoFile(doc.id) }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-[#533afd] hover:bg-[#f6f9fc]"
                                >
                                  <RefreshCw size={13} strokeWidth={1.8} /> Retry extraction
                                </button>
                                <button
                                  onClick={() => { setActionMenuId(null); triggerRetryUpload(doc.id) }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-[#533afd] hover:bg-[#f6f9fc]"
                                >
                                  <CloudUpload size={13} strokeWidth={1.8} /> Retry upload (pick file)
                                </button>
                                <div className="mx-2 my-1 border-t border-[#e5edf5]" />
                                <button
                                  onClick={() => { setActionMenuId(null); handleDelete(doc.id) }}
                                  disabled={deletingIds.has(doc.id)}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-[#ea2261] hover:bg-[rgba(234,34,97,0.05)] disabled:opacity-50"
                                >
                                  <Trash2 size={13} strokeWidth={1.8} />
                                  {deletingIds.has(doc.id) ? 'Deleting...' : 'Delete'}
                                </button>
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
              const uploadFailed = doc.uploadStatus === 'failed'
              const extractFailed = doc.extractionStatus === 'failed'
              const extractRetrying = retryExtractIds.has(doc.id)
              const canOpenDoc = canOpen(doc)
              const isDownloading = downloadingId === doc.id
              return (
                <div key={doc.id} onClick={() => setSelectedDocumentId(doc.id)} className="group bg-white border border-[#e5edf5] rounded-md p-4 cursor-pointer transition-all hover:shadow-standard">
                  <div className={`h-20 rounded-sm ${config.bg} flex items-center justify-center mb-3`}><Icon size={24} className={config.color} strokeWidth={1.5} /></div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="text-[13px] font-normal text-[#061b31] truncate">{doc.fileName}</p>
                      <p className="text-[11px] text-[#64748d] mt-0.5 font-tnum">{formatDate(doc.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    <UploadStatusPill status={doc.uploadStatus} error={doc.uploadError} />
                    <ExtractionStatusPill status={doc.extractionStatus} error={doc.extractionError} />
                  </div>
                  <div className="flex items-center justify-between">
                    {doc.confidenceScore != null && doc.confidenceScore !== -1 && <ConfidenceBadge score={doc.confidenceScore} />}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleOpen(doc) }}
                      disabled={!canOpenDoc}
                      className="flex items-center gap-1 rounded-sm border border-[#e5edf5] px-2 py-1 text-[12px] font-normal text-[#273951] hover:bg-[#f6f9fc] disabled:opacity-40"
                    >
                      <Eye size={12} /> Open
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDownload(doc) }}
                      disabled={!canOpenDoc || isDownloading || Boolean(downloadingId && downloadingId !== doc.id)}
                      className="flex items-center gap-1 rounded-sm border border-[#e5edf5] px-2 py-1 text-[12px] font-normal text-[#273951] hover:bg-[#f6f9fc] disabled:opacity-40"
                    >
                      {isDownloading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />} Download
                    </button>
                    {uploadFailed && (
                      <button
                        onClick={(e) => { e.stopPropagation(); triggerRetryUpload(doc.id) }}
                        className="flex items-center gap-1 rounded-sm border border-[#b9b9f9] px-2 py-1 text-[12px] font-medium text-[#533afd] hover:bg-[rgba(83,58,253,0.05)]"
                      >
                        <RefreshCw size={12} /> Retry upload
                      </button>
                    )}
                    {extractFailed && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRetryExtractNoFile(doc.id) }}
                        disabled={extractRetrying}
                        className="flex items-center gap-1 rounded-sm border border-[#b9b9f9] px-2 py-1 text-[12px] font-medium text-[#533afd] hover:bg-[rgba(83,58,253,0.05)] disabled:opacity-60"
                      >
                        {extractRetrying ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Retry extract
                      </button>
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
                  <p className="text-[13px] text-[#64748d]">
                    {selectedDocument.mimeType}
                    {selectedDocument.fileSize ? ` · ${formatBytes(selectedDocument.fileSize)}` : ''} · {formatDate(selectedDocument.createdAt)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {selectedDocument.confidenceScore != null && selectedDocument.confidenceScore !== -1 && (
                  <ConfidenceBadge score={selectedDocument.confidenceScore} />
                )}
                <button onClick={() => setSelectedDocumentId(null)} className="p-1 text-[#64748d] hover:text-[#061b31] rounded-sm"><X size={16} /></button>
              </div>
            </div>

            <div className="px-6 py-5 max-h-[60vh] overflow-y-auto space-y-5">
              <div className="flex flex-wrap gap-2">
                <UploadStatusPill status={selectedDocument.uploadStatus} error={selectedDocument.uploadError} />
                <ExtractionStatusPill status={selectedDocument.extractionStatus} error={selectedDocument.extractionError} />
              </div>

              {(selectedDocument.uploadError || selectedDocument.extractionError) && (
                <div className="rounded-sm border border-[#ffd7ef] bg-[rgba(234,34,97,0.04)] p-3 text-[12px] text-[#ea2261] space-y-1">
                  {selectedDocument.uploadError && <p><strong>Upload:</strong> {selectedDocument.uploadError}</p>}
                  {selectedDocument.extractionError && <p><strong>Extraction:</strong> {selectedDocument.extractionError}</p>}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleOpen(selectedDocument)}
                  disabled={!canOpen(selectedDocument)}
                  className="rounded-sm border border-[#b9b9f9] px-4 py-2 text-[14px] font-normal text-[#533afd] hover:bg-[rgba(83,58,253,0.05)] disabled:opacity-40 transition-colors"
                >
                  Open File
                </button>
                <button
                  onClick={() => handleDownload(selectedDocument)}
                  disabled={!canOpen(selectedDocument) || Boolean(downloadingId)}
                  className="rounded-sm border border-[#e5edf5] px-4 py-2 text-[14px] font-normal text-[#273951] hover:bg-[#f6f9fc] disabled:opacity-40 transition-colors flex items-center gap-2"
                >
                  {downloadingId === selectedDocument.id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  Download
                </button>
                {selectedDocument.uploadStatus === 'failed' && (
                  <button
                    onClick={() => triggerRetryUpload(selectedDocument.id)}
                    className="rounded-sm bg-[#533afd] px-4 py-2 text-[14px] font-medium text-white hover:bg-[#4434d4] transition-colors flex items-center gap-2"
                  >
                    <RefreshCw size={14} /> Retry upload
                  </button>
                )}
                {selectedDocument.extractionStatus === 'failed' && (
                  <button
                    onClick={() => handleRetryExtractNoFile(selectedDocument.id)}
                    disabled={retryExtractIds.has(selectedDocument.id)}
                    className="rounded-sm border border-[#b9b9f9] px-4 py-2 text-[14px] font-medium text-[#533afd] hover:bg-[rgba(83,58,253,0.05)] disabled:opacity-50 transition-colors flex items-center gap-2"
                  >
                    {retryExtractIds.has(selectedDocument.id) ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                    Retry extraction
                  </button>
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
                  {selectedDocument.extractedData ? <pre className="whitespace-pre-wrap">{JSON.stringify(selectedDocument.extractedData, null, 2)}</pre> : <p className="text-[#64748d]">No extraction has been completed yet.</p>}
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
