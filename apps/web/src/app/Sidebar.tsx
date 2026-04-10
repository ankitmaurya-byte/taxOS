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
  MoreHorizontal,
  MessageCircle,
  Zap,
  FolderOpen,
  LayoutDashboard,
  ChevronDown,
  ChevronRight,
  Settings,
  LogOut,
  User,
} from 'lucide-react'
import { LogoIcon, LogoFull, ChevronUpDown } from './icons'
import type { LucideIcon } from 'lucide-react'

interface NavItem {
  icon: LucideIcon
  label: string
  href: string
  badge?: string
  children?: { label: string; href: string }[]
}

const NAV_ITEMS: NavItem[] = [
  { icon: Home, label: 'Home', href: '/home' },
  { icon: Shield, label: 'Dashboard', href: '/dashboard' },
  { icon: Shield, label: 'Profile', href: '/profile' },
  { icon: Shield, label: 'Create Account', href: '/profile/create-account' },
  { icon: FileText, label: 'Filings', href: '/filings' },
  { icon: Calculator, label: 'Estimated Tax', href: '/estimated-tax' },
  { icon: MapPin, label: 'Registrations', href: '/registrations', badge: 'Beta' },
  { icon: FlaskConical, label: 'R&D Tax Credits', href: '/rd-tax-credits' },
  { icon: LayoutDashboard, label: 'Command Center', href: '/command-center' },
  {
    icon: Shield,
    label: 'Admin',
    href: '/admin',
    children: [
      { label: 'Founder Applications', href: '/admin/founder-applications' },
    ],
  },
  {
    icon: Building2,
    label: 'My Entities',
    href: '/entities',
    children: [
      { label: 'Overview', href: '/entities/overview' },
      { label: 'Address Book', href: '/entities/address-book' },
    ],
  },
  {
    icon: MoreHorizontal,
    label: 'Others',
    href: '/others',
    children: [
      { label: 'Incorporation', href: '/incorporation' },
      { label: 'Dissolution', href: '/dissolution' },
      { label: 'AI Advisor', href: '/advisor' },
      { label: 'Filing Room', href: '/filings/room' },
      { label: 'Document Vault', href: '/documents/vault' },
      { label: 'Approvals', href: '/approvals' },
      { label: 'Audit Trail', href: '/audit' },
      { label: 'Deadlines', href: '/deadlines' },
    ],
  },
]

const BOTTOM_NAV: NavItem[] = [
  { icon: MessageCircle, label: 'Chat', href: '/chat' },
  { icon: Zap, label: 'Action Centre', href: '/action-centre' },
  { icon: FolderOpen, label: 'Documents', href: '/documents' },
]

interface SidebarProps {
  collapsed: boolean
}

export function Sidebar({ collapsed }: SidebarProps) {
  const { user, logout } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({
    'My Entities': true,
  })
  const [showProfileMenu, setShowProfileMenu] = useState(false)

  const filteredNavItems = NAV_ITEMS.reduce<NavItem[]>((items, item) => {
    if (!canAccessPath(user, item.href) && !item.children?.length) {
      return items
    }

    if (item.children?.length) {
      const children = item.children.filter((child) => canAccessPath(user, child.href))

      if (!children.length) return items
      items.push({ ...item, children })
      return items
    }

    items.push(item)
    return items
  }, [])

  const filteredBottomNav = BOTTOM_NAV.filter((item) => canAccessPath(user, item.href))

  const toggleExpand = (label: string) => {
    setExpandedItems((prev) => ({ ...prev, [label]: !prev[label] }))
  }

  const isActive = (href: string) => {
    if (href === '/home') return location.pathname === '/home' || location.pathname === '/'
    return location.pathname.startsWith(href)
  }

  const isChildActive = (item: NavItem) => {
    return item.children?.some((c) => location.pathname === c.href) ?? false
  }

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon
    const hasChildren = item.children && item.children.length > 0
    const expanded = expandedItems[item.label]
    const active = isActive(item.href) || isChildActive(item)

    if (hasChildren) {
      return (
        <div key={item.label}>
          <button
            onClick={() => toggleExpand(item.label)}
            className={`flex w-full items-center gap-2.5 rounded-md mx-2 px-3 h-10 text-sm transition-colors ${active
              ? 'bg-[#EDE9FD] text-[#6C5CE7] border-l-[3px] border-[#6C5CE7]'
              : 'text-[#374151] hover:bg-[#F3F4F6] hover:text-[#111827]'
              }`}
            style={{ width: collapsed ? 40 : 'calc(100% - 16px)' }}
          >
            <Icon size={18} className={active ? 'text-[#6C5CE7]' : 'text-[#6B7280]'} />
            {!collapsed && (
              <>
                <span className="flex-1 text-left font-normal">{item.label}</span>
                {item.badge && (
                  <span className="text-[10px] font-semibold bg-[#EDE9FD] text-[#6C5CE7] px-1.5 py-0.5 rounded">
                    {item.badge}
                  </span>
                )}
                {expanded ? (
                  <ChevronDown size={14} className="text-[#9CA3AF]" />
                ) : (
                  <ChevronRight size={14} className="text-[#9CA3AF]" />
                )}
              </>
            )}
          </button>
          {!collapsed && expanded && item.children && (
            <div className="mt-0.5">
              {item.children.map((child) => (
                <NavLink
                  key={child.href}
                  to={child.href}
                  className={() =>
                    `flex items-center h-9 pl-[52px] pr-3 mx-2 rounded-md text-[13px] transition-colors ${location.pathname === child.href
                      ? 'bg-[#EDE9FD] text-[#6C5CE7] font-medium'
                      : 'text-[#374151] hover:bg-[#F3F4F6] hover:text-[#111827]'
                    }`
                  }
                >
                  {child.label}
                </NavLink>
              ))}
            </div>
          )}
        </div>
      )
    }

    return (
      <NavLink
        key={item.href}
        to={item.href}
        className={() =>
          `flex items-center gap-2.5 rounded-md mx-2 px-3 h-10 text-sm transition-colors ${active
            ? 'bg-[#EDE9FD] text-[#6C5CE7] border-l-[3px] border-[#6C5CE7]'
            : 'text-[#374151] hover:bg-[#F3F4F6] hover:text-[#111827]'
          }`
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
  }

  const initials = user?.name
    ? user.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
    : 'U'

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
         {filteredNavItems.map(renderNavItem)}

        {/* Bottom separator */}
        <div className="border-t border-[#E5E7EB] my-2 mx-4" />

        {filteredBottomNav.map(renderNavItem)}
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
            {initials}
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
