import { create } from 'zustand'

export type NotificationTone = 'success' | 'error' | 'info'

export interface NotificationItem {
  id: string
  title: string
  message: string
  tone: NotificationTone
  createdAt: string
  read: boolean
}

export interface ToastItem extends NotificationItem {
  duration: number
}

interface NotifyInput {
  title: string
  message: string
  tone?: NotificationTone
  toast?: boolean
  persist?: boolean
  duration?: number
}

interface NotificationState {
  notifications: NotificationItem[]
  toasts: ToastItem[]
  notify: (input: NotifyInput) => string
  dismissToast: (id: string) => void
  markAllRead: () => void
  unreadCount: () => number
}

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  toasts: [],
  notify: ({ title, message, tone = 'info', toast = true, persist = true, duration = 4000 }) => {
    const id = createId()
    const item: NotificationItem = {
      id,
      title,
      message,
      tone,
      createdAt: new Date().toISOString(),
      read: false,
    }

    if (persist) {
      set((state) => ({ notifications: [item, ...state.notifications].slice(0, 40) }))
    }

    if (toast) {
      const toastItem: ToastItem = { ...item, duration }
      set((state) => ({ toasts: [...state.toasts, toastItem] }))
      window.setTimeout(() => {
        get().dismissToast(id)
      }, duration)
    }

    return id
  },
  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
  markAllRead: () => set((state) => ({
    notifications: state.notifications.map((item) => ({ ...item, read: true })),
  })),
  unreadCount: () => get().notifications.filter((item) => !item.read).length,
}))

export function notify(input: NotifyInput) {
  return useNotificationStore.getState().notify(input)
}
