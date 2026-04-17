import { BellOff } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { useNotificationStore } from '@/stores/notifications'

interface NotificationsPanelProps {
  onClose: () => void
}

// Spec-compliant tones: success green, ruby danger, purple info.
const TONE_DOT = {
  success: 'bg-[#15be53]',
  error: 'bg-[#ea2261]',
  info: 'bg-[#533afd]',
} as const

export function NotificationsPanel({ onClose }: NotificationsPanelProps) {
  const notifications = useNotificationStore((state) => state.notifications)
  const markAllRead = useNotificationStore((state) => state.markAllRead)
  const hasNotifications = notifications.length > 0

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />

      <div
        className="absolute right-0 top-full z-50 mt-3 w-[460px] overflow-hidden rounded-lg border border-[#e5edf5] bg-white"
        style={{ boxShadow: 'rgba(50,50,93,0.25) 0px 30px 45px -30px, rgba(0,0,0,0.1) 0px 18px 36px -18px' }}
      >
        <div className="flex items-center justify-between border-b border-[#e5edf5] px-5 py-4">
          <h3 className="text-[18px] text-[#061b31]" style={{ fontWeight: 300, letterSpacing: '-0.18px' }}>Notifications</h3>
          <button
            type="button"
            onClick={markAllRead}
            disabled={!hasNotifications}
            className="rounded border border-[#e5edf5] bg-white px-3 py-1.5 text-sm text-[#273951] transition-colors hover:bg-[#f6f9fc] disabled:cursor-not-allowed disabled:opacity-50"
            style={{ fontWeight: 400 }}
          >
            Mark all as read
          </button>
        </div>

        {hasNotifications ? (
          <div className="max-h-[520px] overflow-y-auto p-3">
            <div className="space-y-2">
              {notifications.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-md border px-4 py-3 ${item.read ? 'border-[#e5edf5] bg-white' : 'border-[#d6d9fc] bg-[#f6f9fc]'}`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`mt-2 h-2.5 w-2.5 flex-shrink-0 rounded-full ${TONE_DOT[item.tone]}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm text-[#061b31]" style={{ fontWeight: 400 }}>{item.title}</p>
                        <span className="text-xs text-[#64748d]">{formatDate(item.createdAt)}</span>
                      </div>
                      <p className="mt-1 text-sm leading-6 text-[#64748d]" style={{ fontWeight: 300 }}>{item.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex min-h-[500px] flex-col items-center justify-center px-10 text-center">
            <div className="mb-6 rounded-md bg-[#f6f9fc] p-6 text-[#64748d]">
              <BellOff size={54} strokeWidth={1.6} />
            </div>
            <p className="max-w-[280px] text-[16px] leading-7 text-[#64748d]" style={{ fontWeight: 300 }}>
              It looks like you don't have any notifications at the moment.
            </p>
          </div>
        )}
      </div>
    </>
  )
}
