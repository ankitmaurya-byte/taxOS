// Mobile bottom-dock navigation. Rendered by Layout only below the `md`
// breakpoint — the full Sidebar takes over from `md` upward.
import { useMemo, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  Home,
  FileText,
  FolderOpen,
  MessageCircle,
  Menu,
  X,
  LogOut,
  Settings,
  Users,
  Shield,
  ClipboardCheck,
  ClipboardList,
  Inbox,
  Calculator,
  LayoutDashboard,
  Building2,
  Zap,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth'
import { canAccessPath } from '@/lib/access'
import type { LucideIcon } from 'lucide-react'

interface QuickItem {
  icon: LucideIcon
  label: string
  href: string
}

const QUICK_ITEMS: QuickItem[] = [
  { icon: Home, label: 'Home', href: '/home' },
  { icon: FileText, label: 'Filings', href: '/filings' },
  { icon: FolderOpen, label: 'Docs', href: '/documents' },
  { icon: MessageCircle, label: 'Chat', href: '/chat' },
]

// Items shown inside the "More" drawer. Falls back to whichever are
// accessible for the current user.
const MORE_ITEMS: QuickItem[] = [
  { icon: Shield, label: 'Dashboard', href: '/dashboard' },
  { icon: ClipboardCheck, label: 'My Review Queue', href: '/cpa/review' },
  { icon: Inbox, label: 'Claim Filings', href: '/claim-filings' },
  { icon: ClipboardList, label: 'Approvals', href: '/approvals' },
  { icon: Zap, label: 'Action Centre', href: '/action-centre' },
  { icon: Calculator, label: 'Estimated Tax', href: '/estimated-tax' },
  { icon: Calculator, label: 'Deadlines', href: '/deadlines' },
  { icon: LayoutDashboard, label: 'Command Center', href: '/command-center' },
  { icon: Building2, label: 'My Entities', href: '/entities/overview' },
  { icon: Users, label: 'Team', href: '/team' },
  { icon: Settings, label: 'Profile', href: '/profile' },
]

export function BottomNav() {
  const [moreOpen, setMoreOpen] = useState(false)
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)
  const navigate = useNavigate()
  const location = useLocation()

  const accessibleQuick = useMemo(
    () => QUICK_ITEMS.filter(i => canAccessPath(user, i.href)),
    [user],
  )
  const accessibleMore = useMemo(
    () => MORE_ITEMS.filter(i => canAccessPath(user, i.href)),
    [user],
  )

  const navItem = (item: QuickItem, isMore = false) => {
    const active = isMore
      ? false
      : item.href === '/home'
        ? location.pathname === '/home' || location.pathname === '/'
        : location.pathname.startsWith(item.href)
    const Icon = isMore ? Menu : item.icon
    return (
      <NavLink
        key={item.href}
        to={item.href}
        className={`flex flex-1 flex-col items-center justify-center gap-1 py-1.5 text-[10px] font-normal transition-colors ${
          active ? 'text-[#533afd]' : 'text-[#64748d] hover:text-[#273951]'
        }`}
      >
        <Icon size={18} strokeWidth={1.8} />
        <span className="leading-none">{item.label}</span>
      </NavLink>
    )
  }

  return (
    <>
      <nav
        className="md:hidden fixed inset-x-0 bottom-0 z-40 flex items-stretch bg-white border-t border-[#e5edf5]"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom)',
          boxShadow: 'rgba(23,23,23,0.08) 0 -6px 18px 0',
        }}
      >
        {accessibleQuick.map(item => navItem(item))}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={`flex flex-1 flex-col items-center justify-center gap-1 py-1.5 text-[10px] font-normal transition-colors ${
            moreOpen ? 'text-[#533afd]' : 'text-[#64748d] hover:text-[#273951]'
          }`}
        >
          <Menu size={18} strokeWidth={1.8} />
          <span className="leading-none">More</span>
        </button>
      </nav>

      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <button
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMoreOpen(false)}
            aria-label="Close"
          />
          <div
            className="relative bg-white rounded-t-[12px] border-t border-x border-[#e5edf5] max-h-[80vh] flex flex-col"
            style={{
              boxShadow: 'rgba(50,50,93,0.25) 0px 30px 45px -30px, rgba(0,0,0,0.1) 0px 18px 36px -18px',
              paddingBottom: 'env(safe-area-inset-bottom)',
            }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#e5edf5]">
              <p className="text-[15px] font-normal text-[#061b31]" style={{ fontWeight: 400 }}>
                Menu
              </p>
              <button
                onClick={() => setMoreOpen(false)}
                className="p-1 rounded-[4px] text-[#64748d] hover:bg-[#f6f9fc] hover:text-[#273951]"
                aria-label="Close menu"
              >
                <X size={16} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 py-2">
              {accessibleMore.map(item => {
                const Icon = item.icon
                const active = location.pathname.startsWith(item.href)
                return (
                  <button
                    key={item.href}
                    type="button"
                    onClick={() => { setMoreOpen(false); navigate(item.href) }}
                    className={`flex w-full items-center gap-3 px-4 h-11 text-[14px] transition-colors ${
                      active
                        ? 'bg-[rgba(83,58,253,0.08)] text-[#533afd]'
                        : 'text-[#273951] hover:bg-[#f6f9fc]'
                    }`}
                  >
                    <Icon size={16} className={active ? 'text-[#533afd]' : 'text-[#64748d]'} strokeWidth={1.8} />
                    <span className="flex-1 text-left">{item.label}</span>
                  </button>
                )
              })}
              <div className="mx-4 my-2 border-t border-[#e5edf5]" />
              <button
                type="button"
                onClick={() => { setMoreOpen(false); logout() }}
                className="flex w-full items-center gap-3 px-4 h-11 text-[14px] text-[#ea2261] hover:bg-[rgba(234,34,97,0.05)] transition-colors"
              >
                <LogOut size={16} strokeWidth={1.8} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
