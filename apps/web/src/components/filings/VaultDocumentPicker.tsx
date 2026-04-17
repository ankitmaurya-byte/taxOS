import { useEffect, useMemo, useState } from 'react'
import {
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Loader2,
  Search,
  X,
} from 'lucide-react'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { notify } from '@/stores/notifications'

export interface VaultDocumentPickerProps {
  open: boolean
  onClose: () => void
  onSelect: (doc: any) => void
  title?: string
  selectLabel?: string
}

const FILE_ICON: Record<string, { icon: typeof FileText; color: string; bg: string; label: string }> = {
  'application/pdf': { icon: FileText, color: 'text-[#ea2261]', bg: 'bg-[rgba(234,34,97,0.06)]', label: 'PDF' },
  'text/csv': { icon: FileSpreadsheet, color: 'text-[#15be53]', bg: 'bg-[rgba(21,190,83,0.06)]', label: 'CSV' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { icon: FileSpreadsheet, color: 'text-[#15be53]', bg: 'bg-[rgba(21,190,83,0.06)]', label: 'XLS' },
  'image/png': { icon: ImageIcon, color: 'text-[#533afd]', bg: 'bg-[rgba(83,58,253,0.06)]', label: 'PNG' },
  'image/jpeg': { icon: ImageIcon, color: 'text-[#533afd]', bg: 'bg-[rgba(83,58,253,0.06)]', label: 'JPG' },
}

function formatBytes(bytes?: number | null) {
  if (!bytes && bytes !== 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function fileConfig(mimeType: string) {
  return FILE_ICON[mimeType] || { icon: FileText, color: 'text-[#64748d]', bg: 'bg-[#f6f9fc]', label: 'FILE' }
}

export function VaultDocumentPicker({
  open,
  onClose,
  onSelect,
  title = 'Import from Vault',
  selectLabel = 'Select',
}: VaultDocumentPickerProps) {
  const [docs, setDocs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    api.documents.getAll()
      .then((data) => setDocs(data as any[]))
      .catch((err) => notify({ title: 'Failed to load documents', message: err?.message || 'Unknown error', tone: 'error' }))
      .finally(() => setLoading(false))
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return docs
    return docs.filter(d =>
      d.fileName?.toLowerCase().includes(q)
      || d.aiTags?.some((t: string) => t.toLowerCase().includes(q))
      || d.mimeType?.toLowerCase().includes(q),
    )
  }, [docs, query])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl rounded-xl border border-[#e5edf5] bg-white shadow-[0_24px_56px_rgba(17,24,39,0.18)] flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e5edf5]">
          <div>
            <h2 className="text-base font-medium text-[#061b31]">{title}</h2>
            <p className="text-xs text-[#64748d] mt-0.5">
              Pick a document from your org vault. Double-click a row or use the {selectLabel} button.
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-[#64748d] hover:bg-[#f6f9fc] hover:text-[#273951]" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-[#e5edf5]">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748d]" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by filename, tag, or type…"
              className="h-9 w-full rounded-lg border border-[#e5edf5] pl-8 pr-3 text-sm text-[#061b31] placeholder:text-[#64748d] outline-none focus:border-[#533afd]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-sm text-[#64748d] gap-2">
              <Loader2 size={14} className="animate-spin" /> Loading documents…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <FileText size={24} className="text-[#b9b9f9] mb-2" />
              <p className="text-sm text-[#273951]">
                {query ? 'No documents match your search.' : 'No documents in this org yet.'}
              </p>
              <p className="text-xs text-[#64748d] mt-1">
                Upload documents from the Documents page to use them here.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-[#f6f9fc] border-b border-[#e5edf5] z-10">
                <tr>
                  <th className="px-4 py-2.5 text-[11px] font-medium text-[#64748d] uppercase tracking-wide">Name</th>
                  <th className="px-4 py-2.5 text-[11px] font-medium text-[#64748d] uppercase tracking-wide">Uploaded</th>
                  <th className="px-4 py-2.5 text-[11px] font-medium text-[#64748d] uppercase tracking-wide">Tags</th>
                  <th className="px-4 py-2.5 w-28" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f6f9fc]">
                {filtered.map((doc: any) => {
                  const cfg = fileConfig(doc.mimeType)
                  const Icon = cfg.icon
                  const isActive = activeId === doc.id
                  const canOpen = Boolean(doc.storageUrl && doc.uploadStatus === 'uploaded')
                  return (
                    <tr
                      key={doc.id}
                      onClick={() => setActiveId(doc.id)}
                      onDoubleClick={() => onSelect(doc)}
                      className={`group cursor-pointer transition-colors ${isActive ? 'bg-[rgba(83,58,253,0.06)]' : 'hover:bg-[#f6f9fc]'}`}
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-8 w-8 items-center justify-center rounded-sm flex-shrink-0 ${cfg.bg}`}>
                            <Icon size={14} className={cfg.color} strokeWidth={1.8} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13px] text-[#061b31] truncate">{doc.fileName}</p>
                            <p className="text-[11px] text-[#64748d]">
                              {cfg.label}{doc.fileSize ? ` · ${formatBytes(doc.fileSize)}` : ''}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-[12px] text-[#64748d] font-tnum">{formatDate(doc.createdAt)}</td>
                      <td className="px-4 py-2.5">
                        {doc.aiTags?.length > 0 ? (
                          <span className="inline-flex px-[6px] py-[1px] rounded-sm text-[10px] font-light bg-[rgba(83,58,253,0.08)] text-[#533afd]">
                            {doc.aiTags[0]}{doc.aiTags.length > 1 ? ` +${doc.aiTags.length - 1}` : ''}
                          </span>
                        ) : <span className="text-[12px] text-[#64748d]">—</span>}
                      </td>
                      <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {canOpen && (
                            <button
                              onClick={() => window.open(doc.storageUrl, '_blank', 'noopener,noreferrer')}
                              title="View file"
                              className="p-1.5 rounded-sm text-[#64748d] opacity-0 group-hover:opacity-100 hover:bg-[#f6f9fc] hover:text-[#273951] transition-opacity"
                            >
                              <ExternalLink size={13} />
                            </button>
                          )}
                          <button
                            onClick={() => onSelect(doc)}
                            className="inline-flex items-center h-7 px-2.5 rounded-sm bg-[#533afd] text-white text-[12px] font-medium hover:bg-[#4434d4]"
                          >
                            {selectLabel}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-5 py-3 border-t border-[#e5edf5] flex items-center justify-between">
          <span className="text-[11px] text-[#64748d]">
            {filtered.length} document{filtered.length === 1 ? '' : 's'}
          </span>
          <button
            onClick={onClose}
            className="h-9 px-4 rounded-lg border border-[#e5edf5] text-sm font-medium text-[#273951] hover:bg-[#f6f9fc]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
