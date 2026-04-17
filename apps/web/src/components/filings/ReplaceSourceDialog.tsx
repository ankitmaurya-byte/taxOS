import { FolderOpen, Upload as UploadIcon, X } from 'lucide-react'
import { useEffect } from 'react'

export interface ReplaceSourceDialogProps {
  open: boolean
  onClose: () => void
  onPickDevice: () => void
  onPickVault: () => void
  title?: string
  message?: string
}

export function ReplaceSourceDialog({
  open,
  onClose,
  onPickDevice,
  onPickVault,
  title = 'Replace document',
  message = 'Pick a source for the new file. The previous upload stays in your documents history.',
}: ReplaceSourceDialogProps) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl border border-[#e5edf5] bg-white shadow-[0_24px_56px_rgba(17,24,39,0.18)] p-5">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1 rounded-lg text-[#64748d] hover:bg-[#f6f9fc] hover:text-[#273951]"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        <p className="text-base font-medium text-[#061b31]">{title}</p>
        <p className="mt-1 text-sm text-[#64748d]">{message}</p>

        <div className="mt-4 grid grid-cols-1 gap-2">
          <button
            onClick={onPickDevice}
            className="flex items-center gap-3 rounded-lg border border-[#e5edf5] bg-white px-4 py-3 text-left hover:border-[#b9b9f9] hover:bg-[rgba(83,58,253,0.04)] transition-colors"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[rgba(83,58,253,0.08)] text-[#533afd]">
              <UploadIcon size={16} strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-sm font-medium text-[#061b31]">Upload from device</p>
              <p className="text-xs text-[#64748d] mt-0.5">Pick a new file from your computer.</p>
            </div>
          </button>

          <button
            onClick={onPickVault}
            className="flex items-center gap-3 rounded-lg border border-[#e5edf5] bg-white px-4 py-3 text-left hover:border-[#b9b9f9] hover:bg-[rgba(83,58,253,0.04)] transition-colors"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[rgba(21,190,83,0.1)] text-[#108c3d]">
              <FolderOpen size={16} strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-sm font-medium text-[#061b31]">Select from vault</p>
              <p className="text-xs text-[#64748d] mt-0.5">Reuse a document already in your org vault.</p>
            </div>
          </button>
        </div>

        <div className="mt-5 flex justify-end">
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
