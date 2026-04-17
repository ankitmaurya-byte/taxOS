// Used in: App.tsx — wraps all authenticated routes with sidebar, topbar, and overlay panels
import { useState, useEffect, useCallback } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { BottomNav } from './BottomNav'
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
    <div className="flex h-[100dvh] overflow-hidden bg-white">
      {/* Sidebar — hidden below md, BottomNav takes over on mobile */}
      <Sidebar collapsed={sidebarCollapsed} className="hidden md:flex" />

      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Top bar row */}
        <div className="flex items-center justify-between h-12 sm:h-14 px-3 sm:px-5 md:px-8 bg-white border-b border-[#e5edf5] relative">
          {/* Sidebar toggle only visible when the real sidebar is mounted */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden md:flex items-center justify-center w-7 h-7 rounded-[4px] border border-[#e5edf5] bg-white hover:bg-[#f6f9fc] text-[#64748d] hover:text-[#273951] transition-colors"
            aria-label="Toggle sidebar"
          >
            <PanelLeft size={14} />
          </button>
          {/* On mobile, reserve same width so the top bar is balanced */}
          <span className="md:hidden w-0" />

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

        {/* Main content — padding scales with viewport, bottom padding reserves
            space for the mobile BottomNav so nothing hides behind it. */}
        <main
          className="flex-1 overflow-y-auto overflow-x-hidden bg-[#f6f9fc]
                     px-3 py-3 sm:px-5 sm:py-5 md:px-6 md:py-6 lg:px-8 lg:py-8
                     pb-[calc(72px+env(safe-area-inset-bottom))] md:pb-6 lg:pb-8"
        >
          <Outlet />
        </main>
      </div>

      {/* Bottom dock — only rendered on small screens */}
      <BottomNav />

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
