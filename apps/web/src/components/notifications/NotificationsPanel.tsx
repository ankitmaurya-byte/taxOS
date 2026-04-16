import { BellOff } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { useNotificationStore } from '@/stores/notifications'

interface NotificationsPanelProps {
  onClose: () => void
}

const TONE_DOT = {
  success: 'bg-[#22C55E]',
  error: 'bg-[#EF4444]',
  info: 'bg-[#8B5CF6]',
} as const

export function NotificationsPanel({ onClose }: NotificationsPanelProps) {
  const notifications = useNotificationStore((state) => state.notifications)
  const markAllRead = useNotificationStore((state) => state.markAllRead)
  const hasNotifications = notifications.length > 0

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />

      <div className="absolute right-0 top-full z-50 mt-3 w-[460px] overflow-hidden rounded-[18px] border border-[#e5edf5] bg-white shadow-[0_20px_50px_rgba(17,24,39,0.16)]">
        <div className="flex items-center justify-between border-b border-[#e5edf5] px-5 py-4">
          <h3 className="text-[18px] font-semibold text-[#2F2C4A]">Notifications</h3>
          <button
            onClick={markAllRead}
            disabled={!hasNotifications}
            className="rounded-md bg-[#F5F4F8] px-4 py-2 text-sm font-medium text-[#B8B6C8] disabled:cursor-not-allowed"
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
                  className={`rounded-lg border px-4 py-3 ${item.read ? 'border-[#F1F1F5] bg-white' : 'border-[#EEE9FF] bg-[#FCFBFF]'}`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`mt-2 h-2.5 w-2.5 flex-shrink-0 rounded-full ${TONE_DOT[item.tone]}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-[#1F2937]">{item.title}</p>
                        <span className="text-xs text-[#64748d]">{formatDate(item.createdAt)}</span>
                      </div>
                      <p className="mt-1 text-sm leading-6 text-[#64748d]">{item.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex min-h-[500px] flex-col items-center justify-center px-10 text-center">
            <div className="mb-6 rounded-full bg-[#F4F3F8] p-6 text-[#C8C6D5]">
              <BellOff size={54} strokeWidth={1.7} />
            </div>
            <p className="max-w-[280px] text-[18px] leading-8 text-[#6E6A8D]">
              It looks like you don't have any notifications at the moment.
            </p>
          </div>
        )}
      </div>
    </>
  )
}
