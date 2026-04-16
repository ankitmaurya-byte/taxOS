import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react'
import { useNotificationStore } from '@/stores/notifications'

const TONE_STYLES = {
  success: {
    icon: CheckCircle2,
    iconClass: 'text-[#16A34A]',
    accentClass: 'border-[#DCFCE7] bg-white',
  },
  error: {
    icon: TriangleAlert,
    iconClass: 'text-[#DC2626]',
    accentClass: 'border-[#FEE2E2] bg-white',
  },
  info: {
    icon: Info,
    iconClass: 'text-[#533afd]',
    accentClass: 'border-[#E9E5FF] bg-white',
  },
} as const

export function ToastViewport() {
  const { toasts, dismissToast } = useNotificationStore()

  return (
    <div className="pointer-events-none fixed right-6 top-20 z-[80] flex w-[360px] max-w-[calc(100vw-32px)] flex-col gap-3">
      {toasts.map((toast) => {
        const tone = TONE_STYLES[toast.tone]
        const Icon = tone.icon

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-lg border px-4 py-3 shadow-[0_12px_32px_rgba(17,24,39,0.12)] ${tone.accentClass}`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-full bg-[#F8FAFC] p-1.5">
                <Icon size={16} className={tone.iconClass} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[#061b31]">{toast.title}</p>
                <p className="mt-1 text-sm leading-6 text-[#64748d]">{toast.message}</p>
              </div>
              <button
                onClick={() => dismissToast(toast.id)}
                className="rounded-lg p-1 text-[#64748d] transition-colors hover:bg-[#f6f9fc] hover:text-[#273951]"
                aria-label="Dismiss toast"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
