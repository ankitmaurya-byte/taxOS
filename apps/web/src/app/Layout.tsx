// Used in: App.tsx — wraps all authenticated routes with sidebar, topbar, and overlay panels
import { useState, useEffect, useCallback } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { PanelLeft } from 'lucide-react'
import { GetHelpPanel } from '@/components/GetHelpPanel'
import { InkleAIPanel } from '@/components/InkleAIPanel'
import { UpgradePlanModal } from '@/components/UpgradePlanModal'
import { NotificationsPanel } from '@/components/notifications/NotificationsPanel'
import { ToastViewport } from '@/components/notifications/ToastViewport'
import { DialogViewport } from '@/components/notifications/DialogViewport'

export function Layout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showGetHelp, setShowGetHelp] = useState(false)
  const [showInkleAI, setShowInkleAI] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)

  // Escape key closes any open panel
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (showInkleAI) setShowInkleAI(false)
      else if (showGetHelp) setShowGetHelp(false)
      else if (showNotifications) setShowNotifications(false)
      else if (showUpgradeModal) setShowUpgradeModal(false)
    }
  }, [showInkleAI, showGetHelp, showNotifications, showUpgradeModal])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <Sidebar collapsed={sidebarCollapsed} />

      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Top bar row */}
        <div className="flex items-center justify-between h-14 px-8 bg-white border-b border-border relative">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="flex items-center justify-center w-7 h-7 rounded-sm border border-border bg-white hover:bg-[#f6f9fc] text-body hover:text-heading transition-colors"
          >
            <PanelLeft size={14} />
          </button>
          <div className="relative">
            <TopBar
              onUpgradeClick={() => {
                setShowUpgradeModal(true)
                setShowGetHelp(false)
                setShowInkleAI(false)
                setShowNotifications(false)
              }}
              onGetHelpClick={() => {
                setShowGetHelp(!showGetHelp)
                setShowInkleAI(false)
                setShowNotifications(false)
              }}
              onInkleAIClick={() => {
                setShowInkleAI(!showInkleAI)
                setShowGetHelp(false)
                setShowNotifications(false)
              }}
              onNotificationsClick={() => {
                setShowNotifications(!showNotifications)
                setShowGetHelp(false)
                setShowInkleAI(false)
              }}
            />
            {showGetHelp && <GetHelpPanel onClose={() => setShowGetHelp(false)} />}
            {showNotifications && <NotificationsPanel onClose={() => setShowNotifications(false)} />}
          </div>
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-8 bg-[#f6f9fc]">
          <Outlet />
        </main>
      </div>

      {/* Inkle AI backdrop + slide-over panel */}
      {showInkleAI && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity"
            onClick={() => setShowInkleAI(false)}
          />
          <InkleAIPanel onClose={() => setShowInkleAI(false)} />
        </>
      )}
      {showUpgradeModal && <UpgradePlanModal onClose={() => setShowUpgradeModal(false)} />}
      <ToastViewport />
      <DialogViewport />
    </div>
  )
}
