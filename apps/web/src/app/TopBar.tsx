// Used in: Layout.tsx — top navigation bar with Upgrade, Inkle AI, Get Help, Cart, Bell
// Opens: GetHelpPanel (popup), InkleAIPanel (slide-over chat)
import { Rocket, Sparkles, CircleUser, ShoppingCart, Bell } from 'lucide-react'
import { useNotificationStore } from '@/stores/notifications'

interface TopBarProps {
  onUpgradeClick: () => void
  onGetHelpClick: () => void
  onInkleAIClick: () => void
  onNotificationsClick: () => void
}

export function TopBar({ onUpgradeClick, onGetHelpClick, onInkleAIClick, onNotificationsClick }: TopBarProps) {
  const unreadCount = useNotificationStore((state) => state.unreadCount())

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      {/* Upgrade — icon-only below sm, icon+label from sm */}
      <button
        onClick={onUpgradeClick}
        title="Upgrade"
        className="inline-flex items-center justify-center gap-1.5 h-8 border border-[#b9b9f9] text-[#533afd] rounded-[4px] px-2 sm:px-3.5 text-[13px] font-normal hover:bg-[rgba(83,58,253,0.05)] transition-colors"
      >
        <Rocket size={14} />
        <span className="hidden sm:inline">Upgrade</span>
      </button>

      <span className="hidden sm:inline text-[#e5edf5]">|</span>

      {/* Inkle AI */}
      <button
        onClick={onInkleAIClick}
        title="Inkle AI"
        className="inline-flex items-center justify-center gap-1.5 h-8 border border-[#b9b9f9] bg-[rgba(83,58,253,0.08)] text-[#533afd] rounded-[4px] px-2 sm:px-3.5 text-[13px] font-normal hover:bg-[rgba(83,58,253,0.12)] transition-colors"
      >
        <Sparkles size={14} />
        <span className="hidden sm:inline">Inkle AI</span>
      </button>

      {/* Get help — hidden on very small screens */}
      <button
        onClick={onGetHelpClick}
        title="Get help"
        className="hidden sm:inline-flex items-center gap-1.5 text-[#64748d] text-[13px] font-normal hover:text-[#273951] px-2 py-1.5 transition-colors"
      >
        <CircleUser size={15} />
        <span>Get help</span>
      </button>

      {/* Cart — hidden on mobile to save room */}
      <button
        className="hidden sm:inline-flex items-center justify-center w-9 h-9 rounded-[6px] text-[#64748d] hover:bg-[#f6f9fc] hover:text-[#273951] transition-colors"
        title="Cart"
      >
        <ShoppingCart size={18} />
      </button>

      {/* Bell */}
      <button
        onClick={onNotificationsClick}
        title="Notifications"
        className="relative flex items-center justify-center w-9 h-9 rounded-[6px] text-[#64748d] hover:bg-[#f6f9fc] hover:text-[#273951] transition-colors"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-[#533afd]" />
        )}
      </button>
    </div>
  )
}
