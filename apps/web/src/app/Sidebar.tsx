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
import { notify } from '@/stores/notifications'

const WORKSPACE_STORAGE_KEY = 'taxos_active_workspace'
const WORKSPACES = [
  { id: 'books',     label: 'Books',      icon: BookOpen, available: false },
  { id: 'tax',       label: 'Tax',        icon: Receipt,  available: true  },
  { id: 'sales-tax', label: 'Sales Tax',  icon: Percent,  available: false },
  { id: 'mailroom',  label: 'Mailroom',   icon: Mail,     available: false },
  { id: 'community', label: 'Community',  icon: Users,    available: false },
] as const
type WorkspaceId = typeof WORKSPACES[number]['id']
const DEFAULT_WORKSPACE: WorkspaceId = 'tax'

function loadWorkspace(): WorkspaceId {
  const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(WORKSPACE_STORAGE_KEY) : null
  return WORKSPACES.some(w => w.id === saved) ? (saved as WorkspaceId) : DEFAULT_WORKSPACE
}

/* ─── Types ──────────────────────────────────────────────────────────────── */

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

/* ─── Nav data ───────────────────────────────────────────────────────────── */

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

  // Admin
  { icon: Users, label: 'Admin: Users', href: '/admin/tracking' },
  { icon: Users, label: 'Admin: Orgs', href: '/admin/organizations' },
  { icon: FolderOpen, label: 'Admin: Entities', href: '/admin/entities' },
  { icon: FileText, label: 'Admin: Filings', href: '/admin/filings' },
  { icon: MessageCircle, label: 'Admin: Chat Monitor', href: '/admin/chat-monitor' },

  // Other Services
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

const BOTTOM_PINNED: NavItem[] = [
  { icon: ClipboardList, label: 'Approvals', href: '/approvals' },
  { icon: Inbox, label: 'Claim Filings', href: '/claim-filings' },
  { icon: Users, label: 'Founder Applications', href: '/admin/founder-applications' },
  { icon: MessageCircle, label: 'Chat', href: '/chat' },
  { icon: Zap, label: 'Action Centre', href: '/action-centre' },
  { icon: FolderOpen, label: 'Documents', href: '/documents' },
]

/* ─── Sidebar ────────────────────────────────────────────────────────────── */

interface SidebarProps {
  collapsed: boolean
}

export function Sidebar({ collapsed }: SidebarProps) {
  const { user, logout } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false)
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceId>(() => loadWorkspace())
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})

  const selectWorkspace = (id: WorkspaceId) => {
    const target = WORKSPACES.find(w => w.id === id)!
    setShowWorkspaceMenu(false)
    if (!target.available) {
      notify({
        title: `${target.label} is coming soon`,
        message: `The ${target.label} workspace is not yet available in TaxOS. We'll let you know when it launches.`,
        tone: 'info',
      })
      return
    }
    setActiveWorkspace(id)
    try { localStorage.setItem(WORKSPACE_STORAGE_KEY, id) } catch { /* ignore */ }
  }

  const toggleGroup = (label: string) =>
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }))

  const isActive = (href: string) => {
    if (href === '/home') return location.pathname === '/home' || location.pathname === '/'
    if (href === '/filings') return location.pathname === '/filings' || /^\/filings\/[^/]+$/.test(location.pathname)
    if (href === '/documents') return location.pathname === '/documents'
    return location.pathname.startsWith(href)
  }

  const isGroupActive = (group: NavGroup) =>
    group.children.some((child) => location.pathname.startsWith(child.href))

  const canRenderGroup = (group: NavGroup) =>
    group.children.some((child) => canAccessPath(user, child.href))

  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  /* ── Shared item class ─────────────────────────────────────────────────── */
  const itemCls = (active: boolean) =>
    `flex items-center gap-2.5 mx-2 px-3 h-9 text-[14px] font-normal transition-colors select-none rounded-[4px] ` +
    (active
      ? 'bg-[rgba(83,58,253,0.08)] text-[#533afd]'
      : 'text-[#273951] hover:bg-[#f6f9fc] hover:text-[#061b31]')

  return (
    <aside
      className="flex h-screen flex-col bg-white border-r border-[#e5edf5] transition-all duration-200"
      style={{ width: collapsed ? 64 : 240, minWidth: collapsed ? 64 : 240 }}
    >
      {/* ── Logo + Workspace Switcher ──────────────────────────────────────── */}
      <div className="relative px-2 pt-3 pb-1">
        <button
          onMouseEnter={() => !collapsed && setShowWorkspaceMenu(true)}
          onMouseLeave={() => setShowWorkspaceMenu(false)}
          onClick={() => !collapsed && setShowWorkspaceMenu(v => !v)}
          className="flex w-full items-center justify-between gap-1.5 rounded-[6px] px-2 py-2 hover:bg-[#f6f9fc] transition-colors cursor-pointer"
        >
          {collapsed ? <LogoIcon /> : <LogoFull />}
          {!collapsed && <ChevronUpDown />}
        </button>

        {/* Workspace dropdown */}
        {showWorkspaceMenu && !collapsed && (
          <div
            onMouseEnter={() => setShowWorkspaceMenu(true)}
            onMouseLeave={() => setShowWorkspaceMenu(false)}
            className="absolute left-2 right-2 top-[calc(100%-2px)] z-50 rounded-[6px] bg-white border border-[#e5edf5] py-1 overflow-hidden"
            style={{ boxShadow: 'rgba(50,50,93,0.25) 0px 30px 45px -30px, rgba(0,0,0,0.1) 0px 18px 36px -18px' }}
          >
            {WORKSPACES.map(({ id, label, icon: Icon, available }) => {
              const active = activeWorkspace === id
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => selectWorkspace(id)}
                  className={`flex w-full items-center gap-2.5 px-3 py-2 text-[14px] font-normal transition-colors rounded-[4px] mx-auto ${
                    active ? 'text-[#533afd] bg-[rgba(83,58,253,0.06)]' : 'text-[#273951] hover:bg-[#f6f9fc]'
                  }`}
                  style={{ width: 'calc(100% - 8px)', marginLeft: 4 }}
                  title={available ? undefined : `${label} workspace coming soon`}
                >
                  <Icon size={16} className={active ? 'text-[#533afd]' : 'text-[#64748d]'} strokeWidth={1.8} />
                  <span className="flex-1 text-left">{label}</span>
                  {!available && (
                    <span className="text-[10px] text-[#64748d]" style={{ fontWeight: 300 }}>soon</span>
                  )}
                  {active && <Check size={14} className="text-[#533afd] flex-shrink-0" strokeWidth={2} />}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Main Nav ───────────────────────────────────────────────────────── */}
      <nav className="flex-1 py-2 space-y-px overflow-y-auto">
        {NAV_ENTRIES.map((entry) => {
          if (isGroup(entry)) {
            const { group } = entry
            if (!canRenderGroup(group)) return null
            const groupActive = isGroupActive(group)
            const isOpen = openGroups[group.label] ?? groupActive
            const Icon = group.icon
            const accessibleChildren = group.children.filter((child) => canAccessPath(user, child.href))

            return (
              <div key={group.label}>
                <button
                  type="button"
                  onClick={() => !collapsed && toggleGroup(group.label)}
                  title={collapsed ? group.label : undefined}
                  className={
                    `w-full flex items-center gap-2.5 mx-2 px-3 h-9 text-[14px] font-normal transition-colors rounded-[4px] ` +
                    (groupActive
                      ? 'text-[#533afd] bg-[rgba(83,58,253,0.06)]'
                      : 'text-[#273951] hover:bg-[#f6f9fc] hover:text-[#061b31]')
                  }
                  style={{ width: collapsed ? 40 : 'calc(100% - 16px)' }}
                >
                  <Icon size={17} className={groupActive ? 'text-[#533afd]' : 'text-[#64748d]'} strokeWidth={1.8} />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{group.label}</span>
                      <span className="ml-auto text-[#64748d]">
                        {isOpen ? <ChevronDown size={13} /> : <ChevronRightIcon size={13} />}
                      </span>
                    </>
                  )}
                </button>

                {!collapsed && isOpen && (
                  <div className="mt-px space-y-px">
                    {accessibleChildren.map((child) => {
                      const ChildIcon = child.icon
                      const childActive = isActive(child.href)
                      return (
                        <NavLink
                          key={child.href}
                          to={child.href}
                          className={
                            `flex items-center gap-2.5 ml-7 mr-2 px-3 h-8 text-[13px] font-normal transition-colors rounded-[4px] ` +
                            (childActive
                              ? 'bg-[rgba(83,58,253,0.08)] text-[#533afd]'
                              : 'text-[#64748d] hover:bg-[#f6f9fc] hover:text-[#061b31]')
                          }
                        >
                          <ChildIcon size={14} className={childActive ? 'text-[#533afd]' : 'text-[#64748d]'} strokeWidth={1.8} />
                          <span>{child.label}</span>
                        </NavLink>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          }

          // Flat item
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
              <Icon size={17} className={active ? 'text-[#533afd]' : 'text-[#64748d]'} strokeWidth={1.8} />
              {!collapsed && (
                <>
                  <span>{entry.label}</span>
                  {entry.badge && (
                    <span className="ml-auto text-[10px] font-normal bg-[rgba(83,58,253,0.1)] text-[#533afd] px-1.5 py-0.5 rounded-[4px]">
                      {entry.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* ── Bottom pinned ──────────────────────────────────────────────────── */}
      {BOTTOM_PINNED.some((item) => canAccessPath(user, item.href)) && (
        <div className="border-t border-[#e5edf5] px-2 py-2">
          {collapsed ? (
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
                      `flex h-8 w-8 items-center justify-center rounded-[4px] transition-colors ` +
                      (active ? 'bg-[rgba(83,58,253,0.08)] text-[#533afd]' : 'text-[#64748d] hover:bg-[#f6f9fc] hover:text-[#273951]')
                    }
                  >
                    <Icon size={16} strokeWidth={1.8} />
                  </NavLink>
                )
              })}
            </div>
          ) : (
            <div className="space-y-px">
              {BOTTOM_PINNED.filter((item) => canAccessPath(user, item.href)).map((item) => {
                const Icon = item.icon
                const active = location.pathname.startsWith(item.href)
                return (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    className={
                      `flex items-center gap-2.5 px-3 h-8 text-[13px] font-normal transition-colors w-full rounded-[4px] ` +
                      (active
                        ? 'bg-[rgba(83,58,253,0.08)] text-[#533afd]'
                        : 'text-[#273951] hover:bg-[#f6f9fc] hover:text-[#061b31]')
                    }
                  >
                    <Icon size={16} className={active ? 'text-[#533afd]' : 'text-[#64748d]'} strokeWidth={1.8} />
                    <span>{item.label}</span>
                  </NavLink>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Profile footer ─────────────────────────────────────────────────── */}
      <div
        className="relative border-t border-[#e5edf5] px-3 py-3"
        onMouseEnter={() => !collapsed && setShowProfileMenu(true)}
        onMouseLeave={() => setShowProfileMenu(false)}
      >
        {/* Profile dropdown */}
        {showProfileMenu && !collapsed && (
          <div
            role="menu"
            aria-label="Profile menu"
            className="absolute bottom-[calc(90%)] left-3 z-20 w-[260px] rounded-[6px] border border-[#e5edf5] bg-white py-1"
            style={{ boxShadow: 'rgba(50,50,93,0.25) 0px 30px 45px -30px, rgba(0,0,0,0.1) 0px 18px 36px -18px' }}
          >
            {/* Profile header */}
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-[4px] bg-[rgba(83,58,253,0.08)] text-[11px] font-normal text-[#533afd] flex-shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[14px] font-normal text-[#061b31]">{user?.name}</p>
                <p className="truncate text-[12px] text-[#64748d]">{user?.email}</p>
              </div>
            </div>

            <div className="mx-3 border-t border-[#e5edf5] my-1" />

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
                className="flex w-full items-center gap-3 rounded-[4px] px-4 py-2 text-left text-[14px] font-normal text-[#273951] hover:bg-[#f6f9fc] hover:text-[#061b31] transition-colors"
              >
                <item.icon size={16} className="text-[#64748d]" strokeWidth={1.8} />
                <span>{item.label}</span>
              </button>
            ))}

            <div className="mx-3 border-t border-[#e5edf5] my-1" />

            <button
              type="button"
              role="menuitem"
              onClick={() => { setShowProfileMenu(false); logout() }}
              className="flex w-full items-center gap-3 rounded-[4px] px-4 py-2 text-left text-[14px] font-normal text-[#ea2261] hover:bg-[rgba(234,34,97,0.05)] transition-colors"
            >
              <LogOut size={16} strokeWidth={1.8} />
              <span>Logout</span>
            </button>
          </div>
        )}

        {/* Collapsed/expanded profile trigger */}
        <div className="flex w-full items-center gap-3 rounded-[4px] text-left hover:bg-[#f6f9fc] px-2 py-1.5 cursor-pointer transition-colors">
          <div className="flex h-8 w-8 items-center justify-center rounded-[4px] bg-[rgba(83,58,253,0.08)] text-[11px] font-normal text-[#533afd] flex-shrink-0">
            {initials}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="truncate text-[14px] font-normal text-[#061b31]">{user?.name}</p>
              <p className="truncate text-[12px] text-[#64748d] capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
