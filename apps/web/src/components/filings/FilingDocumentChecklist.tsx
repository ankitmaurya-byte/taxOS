import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CheckCircle2,
  Circle,
  Download,
  Eye,
  FileText,
  FolderOpen,
  Loader2,
  RefreshCw,
  SkipForward,
  Undo2,
  Upload as UploadIcon,
  X,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { promptDialog } from '@/stores/dialogs'
import { notify } from '@/stores/notifications'
import {
  UploadStatusPill,
  ExtractionStatusPill,
} from '@/components/documents/DocumentStatus'
import { VaultDocumentPicker } from './VaultDocumentPicker'
import { ReplaceSourceDialog } from './ReplaceSourceDialog'

interface Requirement {
  id: string
  slotKey: string
  label: string
  description?: string | null
  required: boolean
  sortOrder: number
  skipped: boolean
  skipReason?: string | null
  viewedByCpa: boolean
  viewedAt?: string | null
  viewedByUserId?: string | null
  document?: any | null
}

interface Props {
  filingId: string
  requirements: Requirement[]
  isTerminal: boolean
  isFrozen: boolean
  onChange: () => void
}

function formatBytes(bytes?: number | null) {
  if (!bytes && bytes !== 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function FilingDocumentChecklist({ filingId, requirements, isTerminal, isFrozen, onChange }: Props) {
  const user = useAuthStore(s => s.user)
  const role = user?.role
  const isFounderOrTeam = role === 'founder' || role === 'team_member'
  const isCpa = role === 'cpa'

  const [busySlot, setBusySlot] = useState<string | null>(null)
  const [busyKind, setBusyKind] = useState<string | null>(null)
  const [downloadingSlot, setDownloadingSlot] = useState<string | null>(null)
  const [markAllLoading, setMarkAllLoading] = useState(false)
  const [vaultPickerSlot, setVaultPickerSlot] = useState<string | null>(null)
  const [replaceSlot, setReplaceSlot] = useState<string | null>(null)

  // Per-slot hidden inputs — one uploader, target slot tracked in a ref.
  const uploadInputRef = useRef<HTMLInputElement | null>(null)
  const replaceInputRef = useRef<HTMLInputElement | null>(null)
  const retryUploadInputRef = useRef<HTMLInputElement | null>(null)
  const targetSlotRef = useRef<string | null>(null)

  // Poll while any requirement's doc is mid-flight
  const hasActive = useMemo(
    () => requirements.some(r => r.document && (
      r.document.uploadStatus === 'uploading'
      || r.document.extractionStatus === 'extracting'
      || r.document.extractionStatus === 'processing'
      || r.document.extractionStatus === 'pending'
    )),
    [requirements],
  )
  useEffect(() => {
    if (!hasActive) return
    const h = window.setInterval(() => onChange(), 3000)
    return () => window.clearInterval(h)
  }, [hasActive, onChange])

  const busy = (slot: string, kind: string) => busySlot === slot && busyKind === kind
  const canEdit = isFounderOrTeam && !isTerminal && !isFrozen

  async function handleUploadFresh(slot: string, file: File) {
    setBusySlot(slot); setBusyKind('upload')
    try {
      await api.filings.uploadRequirement(filingId, slot, file)
      notify({ title: 'Uploading', message: `${file.name} is being processed.`, tone: 'success' })
      onChange()
    } catch (err: any) {
      notify({ title: 'Upload failed', message: err?.message || 'Could not upload.', tone: 'error' })
    } finally {
      setBusySlot(null); setBusyKind(null)
    }
  }

  // Replace flow: a new upload swaps the slot's linked document. The previous
  // document stays in the DB + Cloudinary so auditors / vault users retain it.
  async function handleReplace(slot: string, file: File) {
    await handleUploadFresh(slot, file)
  }

  async function handleRetryUpload(slot: string, file: File) {
    setBusySlot(slot); setBusyKind('retry-upload')
    try {
      await api.filings.retryRequirementUpload(filingId, slot, file)
      notify({ title: 'Retrying upload', message: file.name, tone: 'success' })
      onChange()
    } catch (err: any) {
      notify({ title: 'Retry failed', message: err?.message || 'Could not retry upload.', tone: 'error' })
    } finally {
      setBusySlot(null); setBusyKind(null)
    }
  }

  async function handleRetryExtract(slot: string) {
    setBusySlot(slot); setBusyKind('retry-extract')
    try {
      await api.filings.retryRequirementExtract(filingId, slot)
      notify({ title: 'Retrying extraction', message: 'Restarted.', tone: 'success' })
      onChange()
    } catch (err: any) {
      notify({ title: 'Retry failed', message: err?.message || 'Could not retry extraction.', tone: 'error' })
    } finally {
      setBusySlot(null); setBusyKind(null)
    }
  }

  async function handleSkip(slot: string) {
    const reason = await promptDialog({
      title: 'Skip this document?',
      message: 'Share why this requirement is not being uploaded. CPAs see your remark during review.',
      placeholder: 'Remark',
      multiline: true,
      required: true,
      confirmLabel: 'Skip',
    })
    if (!reason) return
    setBusySlot(slot); setBusyKind('skip')
    try {
      await api.filings.skipRequirement(filingId, slot, reason)
      onChange()
    } catch (err: any) {
      notify({ title: 'Skip failed', message: err?.message || 'Could not skip.', tone: 'error' })
    } finally {
      setBusySlot(null); setBusyKind(null)
    }
  }

  async function handleUnskip(slot: string) {
    setBusySlot(slot); setBusyKind('unskip')
    try {
      await api.filings.unskipRequirement(filingId, slot)
      onChange()
    } finally {
      setBusySlot(null); setBusyKind(null)
    }
  }

  function handleImportFromVault(slot: string) {
    setVaultPickerSlot(slot)
  }

  async function handleVaultPick(doc: any) {
    const slot = vaultPickerSlot
    if (!slot) return
    setVaultPickerSlot(null)
    setBusySlot(slot); setBusyKind('import')
    try {
      await api.filings.importRequirementFromVault(filingId, slot, doc.id)
      notify({ title: 'Imported from vault', message: doc.fileName, tone: 'success' })
      onChange()
    } catch (err: any) {
      notify({ title: 'Import failed', message: err?.message || 'Could not import.', tone: 'error' })
    } finally {
      setBusySlot(null); setBusyKind(null)
    }
  }

  async function handleView(slot: string) {
    setBusySlot(slot); setBusyKind('view')
    try {
      await api.filings.markRequirementViewed(filingId, slot)
      onChange()
    } catch (err: any) {
      notify({ title: 'Failed', message: err?.message || 'Could not mark viewed.', tone: 'error' })
    } finally {
      setBusySlot(null); setBusyKind(null)
    }
  }

  async function handleMarkAll() {
    setMarkAllLoading(true)
    try {
      await api.filings.markAllRequirementsViewed(filingId)
      onChange()
    } catch (err: any) {
      notify({ title: 'Failed', message: err?.message || 'Could not mark all viewed.', tone: 'error' })
    } finally {
      setMarkAllLoading(false)
    }
  }

  async function handleDownload(slot: string, doc: any) {
    if (downloadingSlot) {
      notify({ title: 'Another download in progress', message: 'Please wait.', tone: 'info' })
      return
    }
    if (!doc?.storageUrl || doc.uploadStatus !== 'uploaded') {
      notify({ title: 'Not available', message: 'File was not stored on Cloudinary.', tone: 'info' })
      return
    }
    setDownloadingSlot(slot)
    try {
      const { url, fileName } = await api.documents.getDownload(doc.id)
      const a = window.document.createElement('a')
      a.href = url
      a.download = fileName
      a.rel = 'noopener noreferrer'
      a.click()
    } catch (err: any) {
      notify({ title: 'Download failed', message: err?.message || 'Could not download.', tone: 'error' })
    } finally {
      window.setTimeout(() => setDownloadingSlot(null), 500)
    }
  }

  function openPicker(ref: React.RefObject<HTMLInputElement | null>, slot: string) {
    targetSlotRef.current = slot
    ref.current?.click()
  }

  function handleInputChange(
    e: React.ChangeEvent<HTMLInputElement>,
    action: (slot: string, file: File) => Promise<void>,
  ) {
    const file = e.target.files?.[0]
    const slot = targetSlotRef.current
    e.target.value = ''
    targetSlotRef.current = null
    if (file && slot) action(slot, file)
  }

  const requiredCount = requirements.filter(r => r.required).length
  const satisfiedRequired = requirements.filter(r => r.required && (r.skipped || r.document)).length
  const reviewable = requirements.filter(r => r.required || r.document)
  const viewedCount = reviewable.filter(r => r.skipped || r.viewedByCpa).length

  return (
    <div className="mb-8 w-full max-w-4xl rounded-md border border-[#e5edf5] bg-white">
      {/* Hidden file inputs shared across rows */}
      <input ref={uploadInputRef} type="file" className="hidden" onChange={(e) => handleInputChange(e, handleUploadFresh)} />
      <input ref={replaceInputRef} type="file" className="hidden" onChange={(e) => handleInputChange(e, handleReplace)} />
      <input ref={retryUploadInputRef} type="file" className="hidden" onChange={(e) => handleInputChange(e, handleRetryUpload)} />

      <div className="flex items-center justify-between px-4 py-3 border-b border-[#e5edf5]">
        <div>
          <h3 className="text-sm font-normal text-[#061b31]" style={{ fontWeight: 400 }}>Document Checklist</h3>
          <p className="text-xs text-[#64748d] mt-0.5">
            {satisfiedRequired}/{requiredCount} required satisfied
            {isCpa && reviewable.length > 0 && ` · ${viewedCount}/${reviewable.length} reviewed`}
          </p>
        </div>
        {isCpa && reviewable.length > 0 && (
          <button
            onClick={handleMarkAll}
            disabled={markAllLoading || viewedCount === reviewable.length}
            className="h-8 px-3 rounded-sm border border-[#b9b9f9] text-[12px] font-medium text-[#533afd] hover:bg-[rgba(83,58,253,0.05)] disabled:opacity-50 flex items-center gap-1.5"
          >
            {markAllLoading ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
            Mark all viewed
          </button>
        )}
      </div>

      <ul className="divide-y divide-[#f6f9fc]">
        {requirements.map((r) => {
          const doc = r.document
          const uploaded = doc && doc.uploadStatus === 'uploaded'
          const isSatisfied = r.skipped || Boolean(doc)
          return (
            <li key={r.id} className="px-4 py-3 flex flex-col gap-2">
              <div className="flex items-start gap-3">
                <div className="pt-0.5">
                  {r.skipped
                    ? <SkipForward size={16} className="text-[#9b6829]" />
                    : doc
                      ? <CheckCircle2 size={16} className="text-[#108c3d]" />
                      : <Circle size={16} className="text-[#64748d]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[13px] font-medium text-[#061b31]">{r.label}</p>
                    {r.required
                      ? <span className="text-[10px] uppercase rounded-sm bg-[rgba(234,34,97,0.08)] text-[#ea2261] px-1.5 py-0.5">Required</span>
                      : <span className="text-[10px] uppercase rounded-sm bg-[#f6f9fc] text-[#64748d] px-1.5 py-0.5">Optional</span>}
                    {r.skipped && <span className="text-[10px] uppercase rounded-sm bg-[rgba(155,104,41,0.08)] text-[#9b6829] px-1.5 py-0.5">Skipped</span>}
                    {r.viewedByCpa && <span className="inline-flex items-center gap-1 text-[10px] uppercase rounded-sm bg-[rgba(21,190,83,0.08)] text-[#108c3d] px-1.5 py-0.5"><CheckCircle2 size={10} /> Viewed</span>}
                  </div>
                  {r.description && <p className="text-[11px] text-[#64748d] mt-0.5">{r.description}</p>}
                  {r.skipped && r.skipReason && (
                    <p className="mt-1 text-[11px] text-[#9b6829] italic">Remark: {r.skipReason}</p>
                  )}
                  {doc && (
                    <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                      <FileText size={12} className="text-[#533afd]" />
                      <span className="text-[12px] text-[#273951]">{doc.fileName}</span>
                      {doc.fileSize && <span className="text-[11px] text-[#64748d]">· {formatBytes(doc.fileSize)}</span>}
                      <UploadStatusPill status={doc.uploadStatus} error={doc.uploadError} />
                      <ExtractionStatusPill status={doc.extractionStatus} error={doc.extractionError} />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 pl-7">
                {canEdit && !isSatisfied && !r.skipped && (
                  <>
                    <button
                      onClick={() => openPicker(uploadInputRef, r.slotKey)}
                      disabled={busy(r.slotKey, 'upload')}
                      className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-sm bg-[#533afd] text-white text-[12px] font-medium hover:bg-[#4434d4] disabled:opacity-50"
                    >
                      {busy(r.slotKey, 'upload') ? <Loader2 size={12} className="animate-spin" /> : <UploadIcon size={12} />}
                      Upload {r.label.toLowerCase()}
                    </button>
                    <button
                      onClick={() => handleImportFromVault(r.slotKey)}
                      disabled={busy(r.slotKey, 'import')}
                      className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-sm border border-[#b9b9f9] text-[#533afd] text-[12px] font-medium hover:bg-[rgba(83,58,253,0.05)] disabled:opacity-50"
                    >
                      {busy(r.slotKey, 'import') ? <Loader2 size={12} className="animate-spin" /> : <FolderOpen size={12} />}
                      Import from vault
                    </button>
                    <button
                      onClick={() => handleSkip(r.slotKey)}
                      disabled={busy(r.slotKey, 'skip')}
                      className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-sm border border-[#e5edf5] text-[#273951] text-[12px] font-medium hover:bg-[#f6f9fc] disabled:opacity-50"
                    >
                      {busy(r.slotKey, 'skip') ? <Loader2 size={12} className="animate-spin" /> : <SkipForward size={12} />}
                      Skip
                    </button>
                  </>
                )}

                {canEdit && r.skipped && (
                  <button
                    onClick={() => handleUnskip(r.slotKey)}
                    disabled={busy(r.slotKey, 'unskip')}
                    className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-sm border border-[#e5edf5] text-[#273951] text-[12px] font-medium hover:bg-[#f6f9fc] disabled:opacity-50"
                  >
                    {busy(r.slotKey, 'unskip') ? <Loader2 size={12} className="animate-spin" /> : <Undo2 size={12} />}
                    Un-skip
                  </button>
                )}

                {doc && (
                  <>
                    {uploaded && (
                      <>
                        <button
                          onClick={() => window.open(doc.storageUrl, '_blank', 'noopener,noreferrer')}
                          className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-sm border border-[#e5edf5] text-[#273951] text-[12px] font-medium hover:bg-[#f6f9fc]"
                        >
                          <Eye size={12} /> Preview
                        </button>
                        <button
                          onClick={() => handleDownload(r.slotKey, doc)}
                          disabled={downloadingSlot === r.slotKey || Boolean(downloadingSlot && downloadingSlot !== r.slotKey)}
                          className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-sm border border-[#e5edf5] text-[#273951] text-[12px] font-medium hover:bg-[#f6f9fc] disabled:opacity-50"
                        >
                          {downloadingSlot === r.slotKey ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                          Download
                        </button>
                      </>
                    )}
                    {canEdit && (
                      <button
                        onClick={() => setReplaceSlot(r.slotKey)}
                        className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-sm border border-[#e5edf5] text-[#273951] text-[12px] font-medium hover:bg-[#f6f9fc]"
                      >
                        <RefreshCw size={12} /> Replace
                      </button>
                    )}
                    {canEdit && doc.uploadStatus === 'failed' && (
                      <button
                        onClick={() => openPicker(retryUploadInputRef, r.slotKey)}
                        className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-sm border border-[#b9b9f9] text-[#533afd] text-[12px] font-medium hover:bg-[rgba(83,58,253,0.05)]"
                      >
                        <RefreshCw size={12} /> Retry upload
                      </button>
                    )}
                    {canEdit && doc.extractionStatus === 'failed' && (
                      <button
                        onClick={() => handleRetryExtract(r.slotKey)}
                        disabled={busy(r.slotKey, 'retry-extract')}
                        className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-sm border border-[#b9b9f9] text-[#533afd] text-[12px] font-medium hover:bg-[rgba(83,58,253,0.05)] disabled:opacity-50"
                      >
                        {busy(r.slotKey, 'retry-extract') ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                        Retry extract
                      </button>
                    )}
                  </>
                )}

                {isCpa && (r.skipped || doc) && !r.viewedByCpa && (
                  <button
                    onClick={() => handleView(r.slotKey)}
                    disabled={busy(r.slotKey, 'view')}
                    className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-sm bg-[#108c3d] text-white text-[12px] font-medium hover:bg-[#0a6b2e] disabled:opacity-50"
                  >
                    {busy(r.slotKey, 'view') ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                    Mark viewed
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      <VaultDocumentPicker
        open={vaultPickerSlot !== null}
        onClose={() => setVaultPickerSlot(null)}
        onSelect={handleVaultPick}
        title="Import from vault"
        selectLabel="Use"
      />

      <ReplaceSourceDialog
        open={replaceSlot !== null}
        onClose={() => setReplaceSlot(null)}
        onPickDevice={() => {
          const slot = replaceSlot
          setReplaceSlot(null)
          if (slot) openPicker(replaceInputRef, slot)
        }}
        onPickVault={() => {
          const slot = replaceSlot
          setReplaceSlot(null)
          if (slot) setVaultPickerSlot(slot)
        }}
      />
    </div>
  )
}
