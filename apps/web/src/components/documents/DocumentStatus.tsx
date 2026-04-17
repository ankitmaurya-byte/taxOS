import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  CloudOff,
  CloudUpload,
  Brain,
} from 'lucide-react'

export interface DocumentStatusProps {
  uploadStatus?: string | null
  extractionStatus?: string | null
  uploadError?: string | null
  extractionError?: string | null
  compact?: boolean
}

type PillTone = 'success' | 'warning' | 'error' | 'info' | 'muted' | 'progress'

function toneClasses(tone: PillTone) {
  switch (tone) {
    case 'success':
      return 'bg-[rgba(21,190,83,0.08)] text-[#108c3d] border-[rgba(21,190,83,0.25)]'
    case 'warning':
      return 'bg-[rgba(155,104,41,0.08)] text-[#9b6829] border-[rgba(155,104,41,0.25)]'
    case 'error':
      return 'bg-[rgba(234,34,97,0.08)] text-[#ea2261] border-[rgba(234,34,97,0.25)]'
    case 'info':
      return 'bg-[rgba(83,58,253,0.08)] text-[#533afd] border-[rgba(83,58,253,0.25)]'
    case 'progress':
      return 'bg-[rgba(83,58,253,0.08)] text-[#533afd] border-[rgba(83,58,253,0.25)]'
    case 'muted':
    default:
      return 'bg-[#f6f9fc] text-[#64748d] border-[#e5edf5]'
  }
}

function Pill({
  tone,
  icon,
  label,
  title,
}: {
  tone: PillTone
  icon: React.ReactNode
  label: string
  title?: string
}) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${toneClasses(tone)}`}
    >
      {icon}
      {label}
    </span>
  )
}

export function UploadStatusPill({
  status,
  error,
}: {
  status?: string | null
  error?: string | null
}) {
  switch (status) {
    case 'uploaded':
      return (
        <Pill
          tone="success"
          icon={<CheckCircle2 size={11} />}
          label="Uploaded"
          title="Stored on Cloudinary."
        />
      )
    case 'uploading':
      return (
        <Pill
          tone="progress"
          icon={<Loader2 size={11} className="animate-spin" />}
          label="Uploading"
          title="Pushing to Cloudinary."
        />
      )
    case 'skipped':
      return (
        <Pill
          tone="muted"
          icon={<CloudOff size={11} />}
          label="Too large"
          title="File is larger than 1 MB — not stored, only extracted as context."
        />
      )
    case 'failed':
      return (
        <Pill
          tone="error"
          icon={<AlertCircle size={11} />}
          label="Upload failed"
          title={error || 'Upload to Cloudinary failed.'}
        />
      )
    case 'pending':
    default:
      return (
        <Pill
          tone="info"
          icon={<CloudUpload size={11} />}
          label="Queued"
          title="Upload queued."
        />
      )
  }
}

export function ExtractionStatusPill({
  status,
  error,
}: {
  status?: string | null
  error?: string | null
}) {
  switch (status) {
    case 'done':
      return (
        <Pill
          tone="success"
          icon={<CheckCircle2 size={11} />}
          label="Extracted"
          title="Context + structured data available."
        />
      )
    case 'extracting':
      return (
        <Pill
          tone="progress"
          icon={<Loader2 size={11} className="animate-spin" />}
          label="Extracting"
          title="Reading file contents."
        />
      )
    case 'processing':
      return (
        <Pill
          tone="progress"
          icon={<Brain size={11} className="animate-pulse" />}
          label="Processing"
          title="Running structured extraction."
        />
      )
    case 'failed':
      return (
        <Pill
          tone="error"
          icon={<AlertCircle size={11} />}
          label="Extract failed"
          title={error || 'Extraction failed.'}
        />
      )
    case 'pending':
    default:
      return (
        <Pill
          tone="info"
          icon={<Brain size={11} />}
          label="Queued"
          title="Extraction queued."
        />
      )
  }
}
