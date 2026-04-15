import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/auth'
import { Pagination, usePagination } from '@/components/ui/pagination'
import {
  Search,
  X,
  Plus,
  ChevronDown,
  Shield,
  UserPlus,
  Mail,
  Check,
  AlertCircle,
} from 'lucide-react'

const PAGE_SIZE = 15

const PERMISSION_LABELS: Record<string, string> = {
  canViewDashboard: 'View Dashboard',
  canViewFilings: 'View Filings',
  canEditFilings: 'Edit Filings',
  canApproveFilings: 'Approve Filings',
  canViewDocuments: 'View Documents',
  canEditDocuments: 'Edit Documents',
  canManageTeam: 'Manage Team',
  canCreateAccounts: 'Create Accounts',
  canManageTemplates: 'Manage Templates',
  canManageOrganization: 'Manage Organization',
}

const PERMISSION_KEYS = Object.keys(PERMISSION_LABELS)

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-[#DCFCE7] text-[#166534]',
  pending_admin_review: 'bg-[#FEF3C7] text-[#92400E]',
  pending_email_verification: 'bg-[#FEF3C7] text-[#92400E]',
  suspended: 'bg-[#FEE2E2] text-[#991B1B]',
  rejected: 'bg-[#FEE2E2] text-[#991B1B]',
}

export function TeamManagementPage() {
  const user = useAuthStore(s => s.user)
  const members = useAuthStore(s => s.members)
  const templates = useAuthStore(s => s.templates)
  const membersLoading = useAuthStore(s => s.membersLoading)
  const fetchMembers = useAuthStore(s => s.fetchMembers)
  const fetchTemplates = useAuthStore(s => s.fetchTemplates)
  const inviteMember = useAuthStore(s => s.inviteMember)
  const updateMemberPermissions = useAuthStore(s => s.updateMemberPermissions)
  const createTemplate = useAuthStore(s => s.createTemplate)

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [memberPage, setMemberPage] = useState(1)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null)
  const [showTemplateModal, setShowTemplateModal] = useState(false)

  useEffect(() => {
    fetchMembers()
    fetchTemplates()
  }, [fetchMembers, fetchTemplates])

  // Filter members
  let filtered = members.filter((m: any) => m.id !== user?.id) // exclude self
  if (roleFilter !== 'all') {
    filtered = filtered.filter((m: any) => m.role === roleFilter)
  }
  if (search.trim()) {
    const q = search.toLowerCase()
    filtered = filtered.filter((m: any) =>
      m.name?.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q)
    )
  }

  const teamMembers = members.filter((m: any) => m.role === 'team_member')
  const activeCount = members.filter((m: any) => m.status === 'active' && m.id !== user?.id).length
  const pendingCount = members.filter((m: any) => ['pending_admin_review', 'pending_email_verification'].includes(m.status)).length
  const canEdit = user?.role === 'founder' || (user?.role === 'team_member' && Boolean(user?.permissions?.canManageTeam))

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#111827]">Team Management</h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            Invite members, manage permissions, and configure role templates.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTemplateModal(true)}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-[#E5E7EB] px-4 text-sm font-medium text-[#374151] hover:bg-[#F3F4F6] transition-colors"
          >
            <Shield size={15} />
            Templates
          </button>
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-[#6C5CE7] px-4 text-sm font-medium text-white hover:bg-[#5B4BD5] transition-colors"
          >
            <UserPlus size={15} />
            Invite Member
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
          <p className="text-xs text-[#6B7280]">Total members</p>
          <p className="mt-1 text-2xl font-semibold text-[#111827]">{members.length - 1}</p>
        </div>
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
          <p className="text-xs text-[#6B7280]">Active</p>
          <p className="mt-1 text-2xl font-semibold text-[#15803D]">{activeCount}</p>
        </div>
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
          <p className="text-xs text-[#6B7280]">Team members</p>
          <p className="mt-1 text-2xl font-semibold text-[#111827]">{teamMembers.length}</p>
        </div>
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
          <p className="text-xs text-[#6B7280]">Pending invites</p>
          <p className="mt-1 text-2xl font-semibold text-[#F59E0B]">{pendingCount}</p>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="h-9 w-full rounded-lg border border-[#E5E7EB] bg-white pl-9 pr-8 text-sm text-[#111827] placeholder:text-[#9CA3AF] outline-none focus:ring-2 focus:ring-[#6C5CE7] focus:border-transparent"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#374151]">
              <X size={14} />
            </button>
          )}
        </div>
        <div className="flex gap-1.5">
          {['all', 'team_member', 'founder'].map((role) => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`h-9 px-3 rounded-lg text-xs font-medium transition-colors ${
                roleFilter === role
                  ? 'bg-[#111827] text-white'
                  : 'bg-white text-[#374151] border border-[#E5E7EB] hover:bg-[#F9FAFB]'
              }`}
            >
              {role === 'all' ? 'All' : role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </button>
          ))}
        </div>
      </div>

      {/* Members list */}
      {membersLoading ? (
        <p className="text-sm text-[#6B7280]">Loading team members...</p>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-[#E5E7EB] bg-white">
          <UserPlus size={32} className="text-[#D1D5DB] mb-3" />
          <p className="text-sm text-[#6B7280]">{search || roleFilter !== 'all' ? 'No members match your filters.' : 'No team members yet. Invite someone to get started.'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {usePagination(filtered, PAGE_SIZE).getPage(memberPage).map((member: any) => (
            <MemberCard
              key={member.id}
              member={member}
              templates={templates}
              canEdit={canEdit}
              isExpanded={editingMemberId === member.id}
              onToggle={() => setEditingMemberId(editingMemberId === member.id ? null : member.id)}
              onUpdatePermissions={updateMemberPermissions}
            />
          ))}
          <Pagination currentPage={memberPage} totalPages={Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))} onPageChange={setMemberPage} />
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <InviteModal
          templates={templates}
          onClose={() => setShowInviteModal(false)}
          onInvite={inviteMember}
        />
      )}

      {/* Template Manager Modal */}
      {showTemplateModal && (
        <TemplateModal
          templates={templates}
          onClose={() => setShowTemplateModal(false)}
          onCreate={createTemplate}
        />
      )}
    </div>
  )
}

/* ─── Member Card ─── */
function MemberCard({
  member,
  templates,
  canEdit,
  isExpanded,
  onToggle,
  onUpdatePermissions,
}: {
  member: any
  templates: any[]
  canEdit: boolean
  isExpanded: boolean
  onToggle: () => void
  onUpdatePermissions: (id: string, data: { templateId?: string; permissions?: Record<string, boolean> }) => Promise<void>
}) {
  const perms = member.permissionRecord?.permissions || {}
  const template = templates.find((t: any) => t.id === member.permissionRecord?.templateId)
  const [editPerms, setEditPerms] = useState<Record<string, boolean>>({ ...perms })
  const [saving, setSaving] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(member.permissionRecord?.templateId || '')

  const handleSave = async () => {
    setSaving(true)
    try {
      await onUpdatePermissions(member.id, {
        templateId: selectedTemplateId || undefined,
        permissions: editPerms,
      })
    } finally {
      setSaving(false)
    }
  }

  const handleApplyTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId)
    const tpl = templates.find((t: any) => t.id === templateId)
    if (tpl?.permissions) {
      setEditPerms({ ...tpl.permissions })
    }
  }

  const enabledCount = Object.values(perms).filter(Boolean).length

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white overflow-hidden">
      {/* Header row */}
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-[#F9FAFB] transition-colors"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EDE9FD] text-xs font-semibold text-[#6C5CE7] flex-shrink-0">
          {member.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || '??'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-[#111827] truncate">{member.name}</p>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${STATUS_STYLES[member.status] || 'bg-[#F3F4F6] text-[#374151]'}`}>
              {member.status?.replace(/_/g, ' ')}
            </span>
          </div>
          <p className="text-xs text-[#6B7280] truncate">{member.email}</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#E0E7FF] text-[#4338CA] capitalize">
            {member.role?.replace('_', ' ')}
          </span>
          {template && (
            <span className="text-xs text-[#6B7280]">{template.name}</span>
          )}
          <span className="text-xs text-[#9CA3AF]">{enabledCount}/{PERMISSION_KEYS.length} perms</span>
          <ChevronDown size={16} className={`text-[#9CA3AF] transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Expanded permissions editor */}
      {isExpanded && canEdit && member.role === 'team_member' && (
        <div className="border-t border-[#E5E7EB] px-5 py-4 bg-[#FAFAFA]">
          {/* Template selector */}
          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-medium text-[#6B7280] uppercase tracking-wide">Apply Template</label>
            <div className="flex gap-2 flex-wrap">
              {templates.map((t: any) => (
                <button
                  key={t.id}
                  onClick={() => handleApplyTemplate(t.id)}
                  className={`h-8 px-3 rounded-lg text-xs font-medium transition-colors ${
                    selectedTemplateId === t.id
                      ? 'bg-[#6C5CE7] text-white'
                      : 'bg-white text-[#374151] border border-[#E5E7EB] hover:bg-[#F3F4F6]'
                  }`}
                >
                  {t.name}
                  {t.isSystemTemplate && <span className="ml-1 opacity-60">(system)</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Permission toggles */}
          <div className="grid grid-cols-2 gap-2">
            {PERMISSION_KEYS.map((key) => (
              <label
                key={key}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 cursor-pointer transition-colors ${
                  editPerms[key] ? 'bg-[#EDE9FD]' : 'bg-white border border-[#E5E7EB]'
                }`}
              >
                <input
                  type="checkbox"
                  checked={editPerms[key] || false}
                  onChange={(e) => setEditPerms({ ...editPerms, [key]: e.target.checked })}
                  className="sr-only"
                />
                <div className={`flex h-5 w-5 items-center justify-center rounded border transition-colors ${
                  editPerms[key]
                    ? 'bg-[#6C5CE7] border-[#6C5CE7] text-white'
                    : 'border-[#D1D5DB] bg-white'
                }`}>
                  {editPerms[key] && <Check size={12} />}
                </div>
                <span className={`text-sm ${editPerms[key] ? 'text-[#111827] font-medium' : 'text-[#6B7280]'}`}>
                  {PERMISSION_LABELS[key]}
                </span>
              </label>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-end gap-3">
            <button
              onClick={onToggle}
              className="h-9 px-4 rounded-lg text-sm font-medium text-[#374151] hover:bg-[#F3F4F6] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="h-9 px-4 rounded-lg bg-[#6C5CE7] text-sm font-medium text-white hover:bg-[#5B4BD5] disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : 'Save Permissions'}
            </button>
          </div>
        </div>
      )}

      {/* Read-only permissions for non-editable cases */}
      {isExpanded && (!canEdit || member.role !== 'team_member') && (
        <div className="border-t border-[#E5E7EB] px-5 py-4 bg-[#FAFAFA]">
          <p className="mb-3 text-xs font-medium text-[#6B7280] uppercase tracking-wide">Permissions (role-based, read-only)</p>
          <div className="grid grid-cols-2 gap-2">
            {PERMISSION_KEYS.map((key) => (
              <div
                key={key}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 ${
                  perms[key] ? 'bg-[#EDE9FD]' : 'bg-white border border-[#E5E7EB]'
                }`}
              >
                <div className={`flex h-5 w-5 items-center justify-center rounded border ${
                  perms[key]
                    ? 'bg-[#6C5CE7] border-[#6C5CE7] text-white'
                    : 'border-[#D1D5DB] bg-white'
                }`}>
                  {perms[key] && <Check size={12} />}
                </div>
                <span className={`text-sm ${perms[key] ? 'text-[#111827] font-medium' : 'text-[#6B7280]'}`}>
                  {PERMISSION_LABELS[key]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Invite Modal ─── */
function InviteModal({
  templates,
  onClose,
  onInvite,
}: {
  templates: any[]
  onClose: () => void
  onInvite: (data: any) => Promise<void>
}) {
  const [email, setEmail] = useState('')
  const [useCase, setUseCase] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [customPerms, setCustomPerms] = useState<Record<string, boolean>>(
    Object.fromEntries(PERMISSION_KEYS.map(k => [k, false]))
  )
  const [permMode, setPermMode] = useState<'template' | 'custom'>('template')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleApplyTemplate = (id: string) => {
    setSelectedTemplateId(id)
    const t = templates.find((tpl: any) => tpl.id === id)
    if (t?.permissions) setCustomPerms({ ...t.permissions })
  }

  const handleSend = async () => {
    setError('')
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.')
      return
    }
    setSending(true)
    try {
      await onInvite({
        email: email.trim(),
        role: 'team_member',
        ...(permMode === 'template' && selectedTemplateId ? { templateId: selectedTemplateId } : {}),
        ...(permMode === 'custom' ? { permissions: customPerms } : {}),
        ...(useCase ? { useCase } : {}),
      })
      setSuccess(true)
      setTimeout(() => { setSuccess(false); onClose() }, 1500)
    } catch (err: any) {
      setError(err?.message || 'Failed to send invite.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-[#111827]">Invite Team Member</h2>
            <p className="text-xs text-[#6B7280]">They'll receive an email with a link to join your organization.</p>
          </div>
          <button onClick={onClose} className="p-1 text-[#9CA3AF] hover:text-[#374151]"><X size={18} /></button>
        </div>

        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Email */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#374151]">Email address</label>
            <div className="flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-3 h-10 focus-within:ring-2 focus-within:ring-[#6C5CE7]">
              <Mail size={16} className="text-[#9CA3AF]" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@company.com"
                className="flex-1 bg-transparent text-sm text-[#111827] placeholder:text-[#9CA3AF] outline-none"
              />
            </div>
          </div>

          {/* Use case */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#374151]">Role / use case (optional)</label>
            <input
              type="text"
              value={useCase}
              onChange={(e) => setUseCase(e.target.value)}
              placeholder="e.g. Finance manager, Operations lead..."
              className="h-10 w-full rounded-lg border border-[#E5E7EB] px-3 text-sm text-[#111827] placeholder:text-[#9CA3AF] outline-none focus:ring-2 focus:ring-[#6C5CE7]"
            />
          </div>

          {/* Permission mode */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#374151]">Permissions</label>
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setPermMode('template')}
                className={`h-8 px-3 rounded-lg text-xs font-medium transition-colors ${
                  permMode === 'template' ? 'bg-[#111827] text-white' : 'bg-white text-[#374151] border border-[#E5E7EB]'
                }`}
              >
                Use Template
              </button>
              <button
                onClick={() => setPermMode('custom')}
                className={`h-8 px-3 rounded-lg text-xs font-medium transition-colors ${
                  permMode === 'custom' ? 'bg-[#111827] text-white' : 'bg-white text-[#374151] border border-[#E5E7EB]'
                }`}
              >
                Custom
              </button>
            </div>

            {permMode === 'template' && (
              <div className="flex gap-2 flex-wrap">
                {templates.map((t: any) => (
                  <button
                    key={t.id}
                    onClick={() => handleApplyTemplate(t.id)}
                    className={`h-8 px-3 rounded-lg text-xs font-medium transition-colors ${
                      selectedTemplateId === t.id
                        ? 'bg-[#6C5CE7] text-white'
                        : 'bg-white text-[#374151] border border-[#E5E7EB] hover:bg-[#F3F4F6]'
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            )}

            {permMode === 'custom' && (
              <div className="grid grid-cols-2 gap-2">
                {PERMISSION_KEYS.map((key) => (
                  <label
                    key={key}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer text-sm transition-colors ${
                      customPerms[key] ? 'bg-[#EDE9FD] text-[#111827]' : 'bg-[#F9FAFB] text-[#6B7280]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={customPerms[key] || false}
                      onChange={(e) => setCustomPerms({ ...customPerms, [key]: e.target.checked })}
                      className="sr-only"
                    />
                    <div className={`flex h-4 w-4 items-center justify-center rounded border ${
                      customPerms[key] ? 'bg-[#6C5CE7] border-[#6C5CE7] text-white' : 'border-[#D1D5DB]'
                    }`}>
                      {customPerms[key] && <Check size={10} />}
                    </div>
                    {PERMISSION_LABELS[key]}
                  </label>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertCircle size={14} /> {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
              <Check size={14} /> Invite sent successfully!
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[#E5E7EB] px-6 py-4">
          <button onClick={onClose} className="h-9 px-4 rounded-lg text-sm font-medium text-[#374151] hover:bg-[#F3F4F6]">
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending || success}
            className="h-9 px-4 rounded-lg bg-[#6C5CE7] text-sm font-medium text-white hover:bg-[#5B4BD5] disabled:opacity-50"
          >
            {sending ? 'Sending...' : 'Send Invite'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Template Manager Modal ─── */
function TemplateModal({
  templates,
  onClose,
  onCreate,
}: {
  templates: any[]
  onClose: () => void
  onCreate: (data: { name: string; scope: string; permissions: Record<string, boolean> }) => Promise<void>
}) {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPerms, setNewPerms] = useState<Record<string, boolean>>(
    Object.fromEntries(PERMISSION_KEYS.map(k => [k, false]))
  )
  const [creating, setCreating] = useState(false)

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      await onCreate({ name: newName.trim(), scope: 'organization', permissions: newPerms })
      setShowCreateForm(false)
      setNewName('')
      setNewPerms(Object.fromEntries(PERMISSION_KEYS.map(k => [k, false])))
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] px-6 py-4">
          <h2 className="text-lg font-semibold text-[#111827]">Role Templates</h2>
          <button onClick={onClose} className="p-1 text-[#9CA3AF] hover:text-[#374151]"><X size={18} /></button>
        </div>

        <div className="px-6 py-5 max-h-[70vh] overflow-y-auto space-y-4">
          {/* Existing templates */}
          {templates.map((t: any) => (
            <div key={t.id} className="rounded-xl border border-[#E5E7EB] p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Shield size={16} className="text-[#6C5CE7]" />
                  <span className="text-sm font-medium text-[#111827]">{t.name}</span>
                  {t.isSystemTemplate && (
                    <span className="rounded-full bg-[#F3F4F6] px-2 py-0.5 text-[10px] text-[#6B7280]">System</span>
                  )}
                </div>
                <span className="text-[10px] uppercase tracking-wide text-[#9CA3AF]">{t.scope}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PERMISSION_KEYS.filter(k => t.permissions?.[k]).map(k => (
                  <span key={k} className="rounded-full bg-[#EDE9FD] px-2 py-0.5 text-[10px] font-medium text-[#6C5CE7]">
                    {PERMISSION_LABELS[k]}
                  </span>
                ))}
                {PERMISSION_KEYS.filter(k => t.permissions?.[k]).length === 0 && (
                  <span className="text-xs text-[#9CA3AF]">No permissions</span>
                )}
              </div>
            </div>
          ))}

          {/* Create new template form */}
          {showCreateForm ? (
            <div className="rounded-xl border-2 border-dashed border-[#6C5CE7] bg-[#FAFAFF] p-4 space-y-3">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Template name (e.g. Ops Manager)"
                className="h-9 w-full rounded-lg border border-[#E5E7EB] px-3 text-sm outline-none focus:ring-2 focus:ring-[#6C5CE7]"
              />
              <div className="grid grid-cols-2 gap-2">
                {PERMISSION_KEYS.map((key) => (
                  <label key={key} className="flex items-center gap-2 text-sm text-[#374151] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newPerms[key] || false}
                      onChange={(e) => setNewPerms({ ...newPerms, [key]: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300 text-[#6C5CE7] focus:ring-[#6C5CE7]"
                    />
                    {PERMISSION_LABELS[key]}
                  </label>
                ))}
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowCreateForm(false)} className="h-8 px-3 rounded-lg text-xs text-[#374151] hover:bg-[#F3F4F6]">Cancel</button>
                <button onClick={handleCreate} disabled={!newName.trim() || creating} className="h-8 px-3 rounded-lg bg-[#6C5CE7] text-xs font-medium text-white hover:bg-[#5B4BD5] disabled:opacity-50">
                  {creating ? 'Creating...' : 'Create Template'}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#E5E7EB] py-4 text-sm text-[#6B7280] hover:border-[#6C5CE7] hover:text-[#6C5CE7] transition-colors"
            >
              <Plus size={16} /> Create new template
            </button>
          )}
        </div>

        <div className="flex justify-end border-t border-[#E5E7EB] px-6 py-4">
          <button onClick={onClose} className="h-9 px-4 rounded-lg bg-[#6C5CE7] text-sm font-medium text-white hover:bg-[#5B4BD5]">
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
