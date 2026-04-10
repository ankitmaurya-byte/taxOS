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
    <div className="flex items-center gap-2">
      {/* Upgrade */}
      <button onClick={onUpgradeClick} className="flex items-center gap-1.5 border border-[#6C5CE7] text-[#6C5CE7] rounded-full px-3.5 py-1.5 text-[13px] font-medium hover:bg-[#EDE9FD] transition-colors">
        <Rocket size={14} />
        Upgrade
      </button>

      <span className="text-[#E5E7EB]">|</span>

      {/* Inkle AI — opens AI chat panel */}
      <button
        onClick={onInkleAIClick}
        className="flex items-center gap-1.5 border border-[#6C5CE7] bg-[#EDE9FD] text-[#6C5CE7] rounded-full px-3.5 py-1.5 text-[13px] font-medium hover:bg-[#DDD6FE] transition-colors"
      >
        <Sparkles size={14} />
        Inkle AI
      </button>

      {/* Get help — opens help popup */}
      <button
        onClick={onGetHelpClick}
        className="flex items-center gap-1.5 text-[#6B7280] text-[13px] font-normal hover:text-[#374151] px-2 py-1.5 transition-colors"
      >
        <CircleUser size={15} />
        Get help
      </button>

      {/* Cart */}
      <button className="flex items-center justify-center w-9 h-9 rounded-lg text-[#9CA3AF] hover:bg-[#F3F4F6] hover:text-[#374151] transition-colors">
        <ShoppingCart size={18} />
      </button>

      {/* Bell */}
      <button onClick={onNotificationsClick} className="relative flex items-center justify-center w-9 h-9 rounded-lg text-[#9CA3AF] hover:bg-[#F3F4F6] hover:text-[#374151] transition-colors">
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-[#6C5CE7]" />
        )}
      </button>
    </div>
  )
}
