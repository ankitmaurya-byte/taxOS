import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, HelpCircle, Info, X } from 'lucide-react'
import { useDialogStore, type Dialog, type DialogTone } from '@/stores/dialogs'

const TONE_STYLES: Record<DialogTone, {
  iconClass: string
  iconBg: string
  confirmClass: string
  Icon: typeof HelpCircle
}> = {
  default: {
    iconClass: 'text-[#533afd]',
    iconBg: 'bg-[#EDE9FD]',
    confirmClass: 'bg-[#533afd] hover:bg-[#4434d4] text-white',
    Icon: HelpCircle,
  },
  info: {
    iconClass: 'text-[#533afd]',
    iconBg: 'bg-[#EDE9FD]',
    confirmClass: 'bg-[#533afd] hover:bg-[#4434d4] text-white',
    Icon: Info,
  },
  danger: {
    iconClass: 'text-[#ea2261]',
    iconBg: 'bg-[#ffd7ef]',
    confirmClass: 'bg-[#ea2261] hover:bg-[#c51a52] text-white',
    Icon: AlertTriangle,
  },
}

export function DialogViewport() {
  const { dialogs, resolveDialog } = useDialogStore()
  if (dialogs.length === 0) return null
  const top = dialogs[dialogs.length - 1]

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => resolveDialog(top.id, top.kind === 'confirm' ? false : null)}
      />
      <div className="relative w-full max-w-md">
        {top.kind === 'confirm' ? (
          <ConfirmCard dialog={top} onResolve={(v) => resolveDialog(top.id, v)} />
        ) : (
          <PromptCard dialog={top} onResolve={(v) => resolveDialog(top.id, v)} />
        )}
      </div>
    </div>
  )
}

function ConfirmCard({
  dialog,
  onResolve,
}: {
  dialog: Extract<Dialog, { kind: 'confirm' }>
  onResolve: (v: boolean) => void
}) {
  const tone = TONE_STYLES[dialog.tone ?? 'default']
  const Icon = tone.Icon

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onResolve(false)
      if (e.key === 'Enter') onResolve(true)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onResolve])

  return (
    <div className="rounded-xl border border-[#e5edf5] bg-white p-6 shadow-[0_24px_56px_rgba(17,24,39,0.18)]">
      <button
        onClick={() => onResolve(false)}
        className="absolute right-4 top-4 rounded-lg p-1 text-[#64748d] hover:bg-[#f6f9fc] hover:text-[#273951]"
        aria-label="Close"
      >
        <X size={16} />
      </button>
      <div className="flex items-start gap-3">
        <div className={`rounded-lg ${tone.iconBg} p-2`}>
          <Icon size={20} className={tone.iconClass} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-medium text-[#061b31]">{dialog.title}</p>
          {dialog.message && (
            <p className="mt-1 text-sm leading-6 text-[#64748d]">{dialog.message}</p>
          )}
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button
          onClick={() => onResolve(false)}
          className="h-10 rounded-lg border border-[#e5edf5] px-4 text-sm font-medium text-[#273951] hover:bg-[#f6f9fc]"
        >
          {dialog.cancelLabel ?? 'Cancel'}
        </button>
        <button
          onClick={() => onResolve(true)}
          className={`h-10 rounded-lg px-4 text-sm font-medium ${tone.confirmClass}`}
          autoFocus
        >
          {dialog.confirmLabel ?? 'Confirm'}
        </button>
      </div>
    </div>
  )
}

function PromptCard({
  dialog,
  onResolve,
}: {
  dialog: Extract<Dialog, { kind: 'prompt' }>
  onResolve: (v: string | null) => void
}) {
  const [value, setValue] = useState(dialog.defaultValue ?? '')
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)
  const tone = TONE_STYLES[dialog.tone ?? 'default']
  const Icon = tone.Icon

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onResolve(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onResolve])

  const submit = () => {
    const trimmed = value.trim()
    if (dialog.required && !trimmed) return
    onResolve(value)
  }

  return (
    <div className="rounded-xl border border-[#e5edf5] bg-white p-6 shadow-[0_24px_56px_rgba(17,24,39,0.18)]">
      <button
        onClick={() => onResolve(null)}
        className="absolute right-4 top-4 rounded-lg p-1 text-[#64748d] hover:bg-[#f6f9fc] hover:text-[#273951]"
        aria-label="Close"
      >
        <X size={16} />
      </button>
      <div className="flex items-start gap-3">
        <div className={`rounded-lg ${tone.iconBg} p-2`}>
          <Icon size={20} className={tone.iconClass} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-medium text-[#061b31]">{dialog.title}</p>
          {dialog.message && (
            <p className="mt-1 text-sm leading-6 text-[#64748d]">{dialog.message}</p>
          )}
        </div>
      </div>
      <div className="mt-4">
        {dialog.multiline ? (
          <textarea
            ref={(el) => { inputRef.current = el }}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={dialog.placeholder}
            rows={4}
            className="w-full rounded-lg border border-[#e5edf5] p-3 text-sm text-[#061b31] outline-none focus:border-[#533afd] resize-y"
          />
        ) : (
          <input
            ref={(el) => { inputRef.current = el }}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder={dialog.placeholder}
            className="h-10 w-full rounded-lg border border-[#e5edf5] px-3 text-sm text-[#061b31] outline-none focus:border-[#533afd]"
          />
        )}
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button
          onClick={() => onResolve(null)}
          className="h-10 rounded-lg border border-[#e5edf5] px-4 text-sm font-medium text-[#273951] hover:bg-[#f6f9fc]"
        >
          {dialog.cancelLabel ?? 'Cancel'}
        </button>
        <button
          onClick={submit}
          disabled={dialog.required && !value.trim()}
          className={`h-10 rounded-lg px-4 text-sm font-medium disabled:opacity-50 ${tone.confirmClass}`}
        >
          {dialog.confirmLabel ?? 'Confirm'}
        </button>
      </div>
    </div>
  )
}
