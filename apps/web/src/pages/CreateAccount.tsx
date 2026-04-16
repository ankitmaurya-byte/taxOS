import { FormEvent, useEffect, useMemo, useState, useRef } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/lib/api'
import { Sparkles, Check, Mail } from 'lucide-react'
import type { ApiTemplate } from 'shared'

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

const EMPTY_PERMISSIONS: Record<string, boolean> = Object.fromEntries(PERMISSION_KEYS.map(k => [k, false]))

export function CreateAccountPage() {
  const user = useAuthStore((state) => state.user)
  const { templates, fetchTemplates, templatesLoading, inviteMember, createCpa } = useAuthStore()

  const canCreate = user?.role === 'admin' || user?.role === 'founder'
  const isAdmin = user?.role === 'admin'
  const [mode, setMode] = useState<'team' | 'cpa'>(isAdmin ? 'cpa' : 'team')
  const [email, setEmail] = useState('')
  const [permissionMode, setPermissionMode] = useState<'template' | 'custom'>('template')
  const [templateId, setTemplateId] = useState('')
  const [useCase, setUseCase] = useState('')
  const [permissions, setPermissions] = useState(EMPTY_PERMISSIONS)
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [sentEmail, setSentEmail] = useState('')

  // AI suggestion
  const [aiSuggestion, setAiSuggestion] = useState<{ name: string; templateId: string } | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setMode(isAdmin ? 'cpa' : 'team')
  }, [isAdmin])

  useEffect(() => {
    if (!isAdmin && canCreate && templates.length === 0 && !templatesLoading) {
      fetchTemplates()
    }
  }, [canCreate, isAdmin, templates.length, templatesLoading])

  const visibleTemplates = useMemo(
    () => templates.filter((template: ApiTemplate) => isAdmin || template.scope === 'global' || template.organizationId === user?.orgId),
    [isAdmin, templates, user?.orgId],
  )

  if (!canCreate) {
    return <Navigate to={user?.role === 'cpa' ? '/dashboard' : '/home'} replace />
  }

  const fetchAiSuggestion = (value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!value.trim()) { setAiSuggestion(null); return }
    debounceRef.current = setTimeout(async () => {
      setAiLoading(true)
      try {
        const res = await api.members.getTemplateRecommendation(value) as any
        if (res?.template) setAiSuggestion({ name: res.recommendedName, templateId: res.template.id })
        else setAiSuggestion(null)
      } catch { setAiSuggestion(null) }
      finally { setAiLoading(false) }
    }, 400)
  }

  const handleApplyTemplate = (id: string) => {
    setTemplateId(id)
    setPermissionMode('template')
    const t = visibleTemplates.find((tpl: ApiTemplate) => tpl.id === id)
    if (t?.permissions) setPermissions(t.permissions as Record<string, boolean>)
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setSent(false)
    try {
      if (isAdmin && mode === 'cpa') {
        await createCpa({ email })
      } else {
        await inviteMember({
          email,
          role: 'team_member',
          templateId: permissionMode === 'template' ? templateId || undefined : undefined,
          permissions: permissionMode === 'custom' ? permissions : undefined,
          useCase,
        })
      }
      setSent(true)
      setSentEmail(email)
      setEmail('')
      setTemplateId('')
      setPermissions(EMPTY_PERMISSIONS)
      setUseCase('')
      setAiSuggestion(null)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 p-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold text-[#061b31]">
          {isAdmin ? 'Invite CPA' : 'Invite Team Member'}
        </h1>
        <p className="mt-1 text-sm text-[#64748d]">
          {isAdmin
            ? 'A secure invite link will be sent to the CPA\'s email. They must accept within 24 hours.'
            : 'A secure invite link will be sent. They must accept within 24 hours.'}
        </p>
      </div>

      {sent && (
        <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <Check size={16} className="text-green-600 shrink-0" />
          Invite sent to <strong>{sentEmail}</strong>. They have 24 hours to accept.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 rounded-md border border-[#e5edf5] bg-white p-6">
        {isAdmin && (
          <div className="rounded-lg bg-[#F0EDFF] px-4 py-3 text-sm text-[#4C3D8F]">
            The CPA will receive a secure link to create their account. You can assign them to organizations after they accept.
          </div>
        )}

        {/* Email */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#273951]">Email address</label>
          <div className="flex items-center gap-2 rounded-lg border border-[#e5edf5] bg-white px-3 h-11 focus-within:ring-2 focus-within:ring-[#533afd]">
            <Mail size={16} className="text-[#64748d]" />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              type="email"
              placeholder="colleague@company.com"
              className="flex-1 bg-transparent text-sm text-[#061b31] placeholder:text-[#64748d] outline-none"
            />
          </div>
        </div>

        {mode === 'team' && (
          <>
            {/* Use case with AI */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#273951]">Role / use case</label>
              <input
                value={useCase}
                onChange={(e) => { setUseCase(e.target.value); fetchAiSuggestion(e.target.value) }}
                placeholder="e.g. Finance manager, Operations lead..."
                className="h-11 w-full rounded-lg border border-[#e5edf5] px-3 text-sm text-[#061b31] placeholder:text-[#64748d] outline-none focus:ring-2 focus:ring-[#533afd]"
              />
              {aiLoading && (
                <p className="mt-1.5 text-xs text-[#64748d] flex items-center gap-1"><Sparkles size={12} className="animate-pulse" /> Finding best template...</p>
              )}
              {aiSuggestion && !aiLoading && (
                <button
                  type="button"
                  onClick={() => handleApplyTemplate(aiSuggestion.templateId)}
                  className={`mt-2 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors w-full text-left ${
                    templateId === aiSuggestion.templateId
                      ? 'border-[#533afd] bg-[#EDE9FD] text-[#533afd]'
                      : 'border-[#E0E7FF] bg-[#F0F9FF] text-[#0369A1] hover:bg-[#E0F2FE]'
                  }`}
                >
                  <Sparkles size={13} className="shrink-0" />
                  <span>AI suggests: <strong>{aiSuggestion.name}</strong> template{templateId === aiSuggestion.templateId ? ' (applied)' : ''}</span>
                </button>
              )}
            </div>

            {/* Permission mode */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#273951]">Permissions</label>
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setPermissionMode('template')}
                  className={`h-8 px-3 rounded-lg text-xs font-medium transition-colors ${
                    permissionMode === 'template' ? 'bg-[#061b31] text-white' : 'bg-white text-[#273951] border border-[#e5edf5]'
                  }`}
                >
                  Use Template
                </button>
                <button
                  type="button"
                  onClick={() => setPermissionMode('custom')}
                  className={`h-8 px-3 rounded-lg text-xs font-medium transition-colors ${
                    permissionMode === 'custom' ? 'bg-[#061b31] text-white' : 'bg-white text-[#273951] border border-[#e5edf5]'
                  }`}
                >
                  Custom
                </button>
              </div>

              {permissionMode === 'template' && (
                <div className="flex gap-2 flex-wrap">
                  {visibleTemplates.map((t: ApiTemplate) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleApplyTemplate(t.id)}
                      className={`h-8 px-3 rounded-lg text-xs font-medium transition-colors ${
                        templateId === t.id
                          ? 'bg-[#533afd] text-white'
                          : 'bg-white text-[#273951] border border-[#e5edf5] hover:bg-[#f6f9fc]'
                      }`}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              )}

              {permissionMode === 'custom' && (
                <div className="grid grid-cols-2 gap-2">
                  {PERMISSION_KEYS.map((key) => (
                    <label
                      key={key}
                      className={`flex items-center gap-2 rounded-lg px-3 py-2.5 cursor-pointer text-sm transition-colors ${
                        permissions[key] ? 'bg-[#EDE9FD] text-[#061b31]' : 'bg-[#f6f9fc] text-[#64748d]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={permissions[key] || false}
                        onChange={(e) => setPermissions(prev => ({ ...prev, [key]: e.target.checked }))}
                        className="sr-only"
                      />
                      <div className={`flex h-4 w-4 items-center justify-center rounded border ${
                        permissions[key] ? 'bg-[#533afd] border-[#533afd] text-white' : 'border-[#e5edf5]'
                      }`}>
                        {permissions[key] && <Check size={10} />}
                      </div>
                      {PERMISSION_LABELS[key]}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        <button
          disabled={submitting}
          className="h-10 rounded-lg bg-[#533afd] px-6 text-sm font-medium text-white hover:bg-[#4434d4] disabled:opacity-50 transition-colors"
        >
          {submitting ? 'Sending...' : 'Send Invite'}
        </button>
      </form>
    </div>
  )
}
