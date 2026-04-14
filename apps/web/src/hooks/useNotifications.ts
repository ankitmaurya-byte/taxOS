/**
 * useNotifications
 *
 * Opens an SSE connection to /api/sse/notifications and dispatches toast
 * notifications for filing-workflow events. Call this once at the app root.
 *
 * Chat messages are delivered via WebSocket (see ChatRoom.tsx) — they no
 * longer generate SSE toasts here.
 *
 * Toasts are suppressed entirely when the user is on a chat page
 * (/chat or /chat-hub) because the messages are already visible inline.
 *
 * Supported events:
 *   - filing_assigned          → new CPA escalation
 *   - cpa_approved             → another CPA approved first
 *   - filing_rejection_override→ top-match CPAs invited to override rejection
 *   - filing_status_changed    → generic status update
 */

import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { api } from '@/lib/api'
import { notify } from '@/stores/notifications'
import { useAuthStore } from '@/stores/auth'

const CHAT_PATHS = ['/chat', '/chat-hub']

export function useNotifications() {
  const user = useAuthStore(s => s.user)
  const esRef = useRef<EventSource | null>(null)
  const location = useLocation()

  useEffect(() => {
    if (!user) return

    const es = api.notifications.subscribe()
    esRef.current = es

    es.addEventListener('message', (e: MessageEvent) => {
      try {
        const event = JSON.parse(e.data) as { type: string; data: Record<string, unknown> }

        // Suppress all toasts while the user is on a chat page
        const onChatPage = CHAT_PATHS.some(p => location.pathname.startsWith(p))
        if (onChatPage) return

        switch (event.type) {
          case 'filing_assigned':
            notify({
              title: 'Filing Assigned',
              message: event.data.message as string ?? `New filing (${event.data.formType}) escalated to CPA review.`,
              tone: 'info',
            })
            break

          case 'cpa_approved':
            notify({
              title: 'Filing Already Approved',
              message: event.data.message as string ?? 'Another CPA has already approved this filing.',
              tone: 'info',
            })
            break

          case 'filing_rejection_override':
            notify({
              title: 'Override Opportunity',
              message: event.data.message as string ?? 'A filing was rejected with an understanding issue. You can review it.',
              tone: 'info',
            })
            break

          case 'filing_status_changed':
            notify({
              title: 'Filing Updated',
              message: event.data.message as string ?? 'A filing status has changed.',
              tone: 'info',
            })
            break

          default:
            break
        }
      } catch {
        // ignore malformed events
      }
    })

    es.onerror = () => {
      // Browser will auto-reconnect; ignore transient errors
    }

    return () => {
      es.close()
      esRef.current = null
    }
  }, [user?.id])
}
