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
  LogOut,
  ClipboardList,
  ClipboardCheck,
  Inbox,
  MoreHorizontal,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
  Settings,
  Receipt,
  Percent,
  Mail,
  Check,
} from 'lucide-react'
import { LogoIcon, LogoFull, ChevronUpDown } from './icons'
import type { LucideIcon } from 'lucide-react'

interface NavItem {
  icon: LucideIcon
  label: string
  href: string
  badge?: string
}

interface NavGroup {
  icon: LucideIcon
  label: string
  children: NavItem[]
}

type NavEntry = NavItem | { group: NavGroup }

function isGroup(entry: NavEntry): entry is { group: NavGroup } {
  return 'group' in entry
}

// ─── All nav entries (flat items + groups) ────────────────────────────────────

const NAV_ENTRIES: NavEntry[] = [
  { icon: Home, label: 'Home', href: '/home' },
  { icon: Shield, label: 'Dashboard', href: '/dashboard' },
  { icon: ClipboardCheck, label: 'My Review Queue', href: '/cpa/review' },
  { icon: FileText, label: 'Filings', href: '/filings' },
  { icon: Calculator, label: 'Estimated Tax', href: '/estimated-tax' },
  { icon: Calculator, label: 'Deadlines', href: '/deadlines' },
  { icon: LayoutDashboard, label: 'Command Center', href: '/command-center' },
  { icon: Building2, label: 'My Entities', href: '/entities/overview' },
  { icon: Users, label: 'Team', href: '/team' },
  
  // ── Admin Block ─────────────────────────────────────────────────────────────
  { icon: Users, label: 'Admin: Users', href: '/admin/tracking' },
  { icon: Users, label: 'Admin: Orgs', href: '/admin/organizations' },
  { icon: FolderOpen, label: 'Admin: Entities', href: '/admin/entities' },
  { icon: FileText, label: 'Admin: Filings', href: '/admin/filings' },
  { icon: MessageCircle, label: 'Admin: Chat Monitor', href: '/admin/chat-monitor' },
  
  // ── Collapsible "Other Services" group ──────────────────────────────────────
  {
    group: {
      icon: MoreHorizontal,
      label: 'Other',
      children: [
        { icon: Shield, label: 'Audit Trail', href: '/audit' },
        { icon: MapPin, label: 'Registrations', href: '/registrations' },
        { icon: FlaskConical, label: 'R&D Tax Credits', href: '/rd-tax-credits' },
        { icon: BookOpen, label: 'Address Book', href: '/entities/address-book' },
        { icon: FileText, label: 'Incorporation', href: '/incorporation' },
        { icon: Trash2, label: 'Dissolution', href: '/dissolution' },
      ],
    },
  },
]

// Chat + Action Centre are pinned above the profile footer
const BOTTOM_PINNED: NavItem[] = [
  // { icon: Users, label: 'Create Account', href: '/profile/create-account' },
  
  { icon: ClipboardList, label: 'Approvals', href: '/approvals' },
  { icon: Inbox, label: 'Claim Filings', href: '/claim-filings' },
  { icon: Users, label: 'Founder Applications', href: '/admin/founder-applications' },
  { icon: MessageCircle, label: 'Chat', href: '/chat' },
  { icon: Zap, label: 'Action Centre', href: '/action-centre' },
  { icon: FolderOpen, label: 'Documents', href: '/documents' },
]

// ─── Components ───────────────────────────────────────────────────────────────

interface SidebarProps {
  collapsed: boolean
}

export function Sidebar({ collapsed }: SidebarProps) {
  const { user, logout } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false)
  const [activeWorkspace, setActiveWorkspace] = useState('Tax')
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})

  const toggleGroup = (label: string) =>
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }))

  const isActive = (href: string) => {
    if (href === '/home') return location.pathname === '/home' || location.pathname === '/'
    // Exact match for routes that have sub-routes (e.g. /filings vs /filings/room)
    if (href === '/filings') return location.pathname === '/filings' || /^\/filings\/[^/]+$/.test(location.pathname)
    if (href === '/documents') return location.pathname === '/documents'
    return location.pathname.startsWith(href)
  }

  const isGroupActive = (group: NavGroup) =>
    group.children.some((child) => location.pathname.startsWith(child.href))

  // Only render group if at least one child is accessible
  const canRenderGroup = (group: NavGroup) =>
    group.children.some((child) => canAccessPath(user, child.href))

  const itemCls = (active: boolean) =>
    `flex items-center gap-2.5 rounded-md mx-2 px-3 h-10 text-sm transition-colors select-none ` +
    (active
      ? 'bg-[#EDE9FD] text-[#6C5CE7] border-l-[3px] border-[#6C5CE7]'
      : 'text-[#374151] hover:bg-[#F3F4F6] hover:text-[#111827]')

  return (
    <aside
      className="flex h-screen flex-col bg-white border-r border-[#E5E7EB] transition-all duration-200"
      style={{ width: collapsed ? 64 : 240, minWidth: collapsed ? 64 : 240 }}
    >
      {/* Logo + Workspace Switcher */}
      <div className="relative px-2 pt-2 pb-1">
        <button
          onMouseEnter={() => !collapsed && setShowWorkspaceMenu(true)}
          onMouseLeave={() => setShowWorkspaceMenu(false)}
          onClick={() => !collapsed && setShowWorkspaceMenu(v => !v)}
          className="flex w-full items-center justify-between gap-1.5 rounded-lg px-2 py-2 hover:bg-[#F3F4F6] transition-colors cursor-pointer"
        >
          {collapsed ? <LogoIcon /> : <LogoFull />}
          {!collapsed && <ChevronUpDown />}
        </button>

        {/* Workspace dropdown */}
        {showWorkspaceMenu && !collapsed && (
          <div
            onMouseEnter={() => setShowWorkspaceMenu(true)}
            onMouseLeave={() => setShowWorkspaceMenu(false)}
            className="absolute left-2 right-2 top-[calc(100%-4px)] z-50 rounded-2xl bg-[#F7F7F8] shadow-[0_8px_30px_rgba(0,0,0,0.10)] border border-[#EBEBED] py-1.5 overflow-hidden"
          >
            {[
              { label: 'Books -',      icon: BookOpen  },
              { label: 'Tax -',        icon: Receipt   },
              { label: 'Sales Tax -',  icon: Percent   },
              { label: 'Mailroom -',   icon: Mail      },
              { label: 'Community',  icon: Users     },
            ].map(({ label, icon: Icon }) => {
              const active = activeWorkspace === label
              return (
                <button
                  key={label}
                  onClick={() => { setActiveWorkspace(label); setShowWorkspaceMenu(false) }}
                  className={`
                    group flex w-full items-center gap-2.5 px-3 py-2 text-sm font-medium
                    transition-colors duration-150 rounded-lg mx-auto
                    ${active
                      ? 'text-[#6C5CE7] bg-[#EDEAFD]'
                      : 'text-[#374151] hover:bg-[#EDEDEF] hover:text-[#111827]'
                    }
                  `}
                  style={{ width: 'calc(100% - 8px)', marginLeft: 4 }}
                >
                  <Icon
                    size={16}
                    className={active ? 'text-[#6C5CE7]' : 'text-[#9CA3AF] group-hover:text-[#6B7280]'}
                    strokeWidth={active ? 2.2 : 1.8}
                  />
                  <span className="flex-1 text-left tracking-[-0.01em]">{label}</span>
                  {active && (
                    <Check size={14} className="text-[#6C5CE7] flex-shrink-0" strokeWidth={2.5} />
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Main Nav */}
      <nav className="flex-1 py-2 space-y-0.5 overflow-y-auto">
        {NAV_ENTRIES.map((entry) => {
          if (isGroup(entry)) {
            const { group } = entry
            if (!canRenderGroup(group)) return null
            const groupActive = isGroupActive(group)
            const isOpen = openGroups[group.label] ?? groupActive // auto-open if a child is active
            const Icon = group.icon
            const accessibleChildren = group.children.filter((child) => canAccessPath(user, child.href))

            return (
              <div key={group.label}>
                {/* Group header trigger */}
                <button
                  type="button"
                  onClick={() => !collapsed && toggleGroup(group.label)}
                  title={collapsed ? group.label : undefined}
                  className={
                    `w-full flex items-center gap-2.5 rounded-md mx-2 px-3 h-10 text-sm transition-colors ` +
                    (groupActive
                      ? 'text-[#6C5CE7] bg-[#F5F3FF]'
                      : 'text-[#374151] hover:bg-[#F3F4F6] hover:text-[#111827]')
                  }
                  style={{ width: collapsed ? 40 : 'calc(100% - 16px)' }}
                >
                  <Icon size={18} className={groupActive ? 'text-[#6C5CE7]' : 'text-[#6B7280]'} />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left font-normal">{group.label}</span>
                      <span className="ml-auto text-[#9CA3AF]">
                        {isOpen
                          ? <ChevronDown size={14} />
                          : <ChevronRightIcon size={14} />}
                      </span>
                    </>
                  )}
                </button>

                {/* Sub-items (only shown when expanded and not collapsed) */}
                {!collapsed && isOpen && (
                  <div className="mt-0.5 space-y-0.5">
                    {accessibleChildren.map((child) => {
                      const ChildIcon = child.icon
                      const childActive = isActive(child.href)
                      return (
                        <NavLink
                          key={child.href}
                          to={child.href}
                          className={
                            `flex items-center gap-2.5 rounded-md ml-6 mr-2 px-3 h-9 text-sm transition-colors ` +
                            (childActive
                              ? 'bg-[#EDE9FD] text-[#6C5CE7] border-l-[3px] border-[#6C5CE7]'
                              : 'text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]')
                          }
                        >
                          <ChildIcon size={15} className={childActive ? 'text-[#6C5CE7]' : 'text-[#9CA3AF]'} />
                          <span>{child.label}</span>
                        </NavLink>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          }

          // Regular flat item
          if (!canAccessPath(user, entry.href)) return null
          const Icon = entry.icon
          const active = isActive(entry.href)

          return (
            <NavLink
              key={entry.href}
              to={entry.href}
              title={collapsed ? entry.label : undefined}
              className={itemCls(active)}
              style={{ width: collapsed ? 40 : undefined }}
            >
              <Icon size={18} className={active ? 'text-[#6C5CE7]' : 'text-[#6B7280]'} />
              {!collapsed && (
                <>
                  <span className="font-normal">{entry.label}</span>
                  {entry.badge && (
                    <span className="ml-auto text-[10px] font-semibold bg-[#EDE9FD] text-[#6C5CE7] px-1.5 py-0.5 rounded">
                      {entry.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* ── Pinned Bottom: Chat + Action Centre ──────────────────────────────── */}
      {BOTTOM_PINNED.some((item) => canAccessPath(user, item.href)) && (
        <div className="border-t border-[#E5E7EB] px-2 py-2">
          {collapsed ? (
            // Icon-only row when sidebar is collapsed
            <div className="flex flex-col items-center gap-1">
              {BOTTOM_PINNED.filter((item) => canAccessPath(user, item.href)).map((item) => {
                const Icon = item.icon
                const active = location.pathname.startsWith(item.href)
                return (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    title={item.label}
                    className={
                      `flex h-9 w-9 items-center justify-center rounded-lg transition-colors ` +
                      (active ? 'bg-[#EDE9FD] text-[#6C5CE7]' : 'text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#374151]')
                    }
                  >
                    <Icon size={17} />
                  </NavLink>
                )
              })}
            </div>
          ) : (
            // Full rows when expanded
            <div className="space-y-0.5">
              {BOTTOM_PINNED.filter((item) => canAccessPath(user, item.href)).map((item) => {
                const Icon = item.icon
                const active = location.pathname.startsWith(item.href)
                return (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    className={
                      `flex items-center gap-2.5 rounded-lg px-3 h-9 text-sm transition-colors w-full ` +
                      (active
                        ? 'bg-[#EDE9FD] text-[#6C5CE7] font-medium'
                        : 'text-[#374151] hover:bg-[#F3F4F6] hover:text-[#111827]')
                    }
                  >
                    <Icon size={17} className={active ? 'text-[#6C5CE7]' : 'text-[#6B7280]'} />
                    <span>{item.label}</span>
                  </NavLink>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* User Profile Footer */}
      <div
        className="relative border-t border-[#E5E7EB] px-4 py-3"
        onMouseEnter={() => !collapsed && setShowProfileMenu(true)}
        onMouseLeave={() => setShowProfileMenu(false)}
      >
        {showProfileMenu && !collapsed && (
          <div
            role="menu"
            aria-label="Profile menu"
            className="absolute bottom-[calc(90%)] left-4 z-20 w-[280px] rounded-2xl border border-gray-200 bg-white py-2 shadow-lg"
          >
            {/* Profile header in dropdown */}
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EDE9FD] text-xs font-semibold text-[#6C5CE7] flex-shrink-0">
                {user?.name
                  ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
                  : 'U'}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#111827]">{user?.name}</p>
                <p className="truncate text-xs text-[#6B7280]">{user?.email}</p>
              </div>
            </div>

            <div className="mx-3 border-t border-gray-100 my-1" />

            {/* Menu items */}
            {[
              { icon: Settings, label: 'Profile Settings', href: '/profile' },
              { icon: Users, label: 'Team Settings', href: '/profile/create-account' },
              { icon: Shield, label: 'Audit Logs', href: '/audit' },
            ]
              .filter(item => canAccessPath(user, item.href))
              .map((item) => (
              <button
                key={item.href}
                type="button"
                role="menuitem"
                onClick={() => { setShowProfileMenu(false); navigate(item.href) }}
                className="flex w-full items-center gap-3 rounded-lg px-4 py-2 text-left text-sm font-medium text-[#374151] hover:bg-[#F3F4F6] hover:text-[#111827] transition-colors"
              >
                <item.icon size={18} className="text-gray-500" />
                <span>{item.label}</span>
              </button>
            ))}

            <div className="mx-3 border-t border-gray-100 my-1" />

            {/* Logout */}
            <button
              type="button"
              role="menuitem"
              onClick={() => { setShowProfileMenu(false); logout() }}
              className="flex w-full items-center gap-3 rounded-lg px-4 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        )}

        <div
          className="flex w-full items-center gap-3 rounded-lg text-left hover:bg-[#F9FAFB] px-2 py-1.5 cursor-pointer"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EDE9FD] text-[11px] font-semibold text-[#6C5CE7] flex-shrink-0">
            {user?.name
              ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
              : 'U'}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-[#111827]">{user?.name}</p>
              <p className="truncate text-xs text-[#6B7280] capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
