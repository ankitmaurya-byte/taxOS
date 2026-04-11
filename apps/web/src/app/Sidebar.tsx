import { useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import { canAccessPath } from '@/lib/access'
import {
  Home,
  Shield,
  FileText,
  Calculator,
  MapPin,
  FlaskConical,
  Building2,
  BookOpen,
  Trash2,
  LayoutDashboard,
  MessageCircle,
  Zap,
  FolderOpen,
  Users,
  Settings,
  LogOut,
  User,
  ClipboardList,
} from 'lucide-react'
import { LogoIcon, LogoFull, ChevronUpDown } from './icons'
import type { LucideIcon } from 'lucide-react'

interface NavItem {
  icon: LucideIcon
  label: string
  href: string
  badge?: string
}

const NAV_ITEMS: NavItem[] = [
  { icon: Home, label: 'Home', href: '/home' },
  { icon: Shield, label: 'Dashboard', href: '/dashboard' },
  { icon: FileText, label: 'Filings', href: '/filings' },
  { icon: Calculator, label: 'Estimated Tax', href: '/estimated-tax' },
  { icon: MapPin, label: 'Registrations', href: '/registrations' },
  { icon: FlaskConical, label: 'R&D Tax Credits', href: '/rd-tax-credits' },
  { icon: LayoutDashboard, label: 'Command Center', href: '/command-center' },
  { icon: Building2, label: 'My Entities', href: '/entities/overview' },
  { icon: BookOpen, label: 'Address Book', href: '/entities/address-book' },
  { icon: FileText, label: 'Incorporation', href: '/incorporation' },
  { icon: Trash2, label: 'Dissolution', href: '/dissolution' },
  { icon: FileText, label: 'Filing Room', href: '/filings/room' },
  { icon: FolderOpen, label: 'Documents', href: '/documents' },
  { icon: FolderOpen, label: 'Document Vault', href: '/documents/vault' },
  { icon: ClipboardList, label: 'Approvals', href: '/approvals' },
  { icon: Calculator, label: 'Deadlines', href: '/deadlines' },
  { icon: Users, label: 'Founder Applications', href: '/admin/founder-applications' },
  { icon: MessageCircle, label: 'Chat', href: '/chat' },
  { icon: Zap, label: 'Action Centre', href: '/action-centre' },
  { icon: Shield, label: 'Audit Trail', href: '/audit' },
  { icon: User, label: 'Profile', href: '/profile' },
  { icon: Users, label: 'Create Account', href: '/profile/create-account' },
]

interface SidebarProps {
  collapsed: boolean
}

export function Sidebar({ collapsed }: SidebarProps) {
  const { user, logout } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()
  const [showProfileMenu, setShowProfileMenu] = useState(false)

  const filteredNavItems = NAV_ITEMS.filter((item) => canAccessPath(user, item.href))

  const isActive = (href: string) => {
    if (href === '/home') return location.pathname === '/home' || location.pathname === '/'
    return location.pathname.startsWith(href)
  }

  return (
    <aside
      className="flex h-screen flex-col bg-white border-r border-[#E5E7EB] transition-all duration-200"
      style={{ width: collapsed ? 64 : 240, minWidth: collapsed ? 64 : 240 }}
    >
      {/* Logo */}
      <div className="flex justify-between items-center mr-2 group w-full cursor-pointer truncate !border-none px-3 py-2 hover:bg-surface-grey focus-visible:outline-none data-[highlighted]:bg-surface-lighter-grey gap-1.5 group-data-state-open:tex purple rounded">
        {collapsed ? <LogoIcon /> : <LogoFull />}
        <ChevronUpDown />
      </div>

      {/* Main Nav */}
      <nav className="flex-1 py-2 space-y-0.5 overflow-y-auto">
        {filteredNavItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)

          return (
            <NavLink
              key={item.href}
              to={item.href}
              className={
                `flex items-center gap-2.5 rounded-md mx-2 px-3 h-10 text-sm transition-colors ` +
                (active
                  ? 'bg-[#EDE9FD] text-[#6C5CE7] border-l-[3px] border-[#6C5CE7]'
                  : 'text-[#374151] hover:bg-[#F3F4F6] hover:text-[#111827]')
              }
              style={{ width: collapsed ? 40 : undefined }}
            >
              <Icon size={18} className={active ? 'text-[#6C5CE7]' : 'text-[#6B7280]'} />
              {!collapsed && (
                <>
                  <span className="font-normal">{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto text-[10px] font-semibold bg-[#EDE9FD] text-[#6C5CE7] px-1.5 py-0.5 rounded">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* User Profile */}
      <div className="relative border-t border-[#E5E7EB] px-4 py-3">
        {showProfileMenu && !collapsed && (
          <>
            <button
              type="button"
              aria-label="Close profile menu"
              className="fixed inset-0 z-10 cursor-default"
              onClick={() => setShowProfileMenu(false)}
            />
            <div className="absolute bottom-[calc(100%+8px)] right-4 z-20 w-44 rounded-xl border border-[#E5E7EB] bg-white p-1.5 shadow-lg">
              <button
                type="button"
                onClick={() => {
                  setShowProfileMenu(false)
                  navigate('/profile')
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[#374151] hover:bg-[#F3F4F6] hover:text-[#111827]"
              >
                <User size={16} />
                <span>Profile</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowProfileMenu(false)
                  logout()
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[#374151] hover:bg-[#F3F4F6] hover:text-[#111827]"
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          </>
        )}

        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            setShowProfileMenu(false)
            navigate('/profile')
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              setShowProfileMenu(false)
              navigate('/profile')
            }
          }}
          className="flex w-full items-center gap-3 rounded-lg text-left hover:bg-[#F9FAFB] px-2 py-1.5"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E5E7EB] text-[11px] font-medium text-[#374151] flex-shrink-0">
            {user?.name
              ? user.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)
              : 'U'}
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-[#111827]">{user?.name}</p>
                <p className="truncate text-xs text-[#6B7280]">{user?.role}</p>
              </div>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  setShowProfileMenu((prev) => !prev)
                }}
                className="flex h-8 w-8 items-center justify-center rounded-md text-[#9CA3AF] hover:bg-[#F3F4F6] hover:text-[#374151]"
              >
                <Settings size={15} />
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  )
}
