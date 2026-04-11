import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import type { ApiTemplate } from 'shared'

const EMPTY_PERMISSIONS: Record<string, boolean> = {
  canViewDashboard: false,
  canViewFilings: false,
  canEditFilings: false,
  canApproveFilings: false,
  canViewDocuments: false,
  canEditDocuments: false,
  canManageTeam: false,
  canCreateAccounts: false,
  canManageTemplates: false,
  canManageOrganization: false,
}

export function CreateAccountPage() {
  const user = useAuthStore((state) => state.user)
  const { templates, fetchTemplates, templatesLoading, inviteMember, createCpa, getTemplateRecommendation } = useAuthStore()

  const canCreate = user?.role === 'admin' || user?.role === 'founder'
  const isAdmin = user?.role === 'admin'
  const [mode, setMode] = useState<'team' | 'cpa'>(isAdmin ? 'cpa' : 'team')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [permissionMode, setPermissionMode] = useState<'template' | 'custom'>('template')
  const [templateId, setTemplateId] = useState('')
  const [useCase, setUseCase] = useState('')
  const [permissions, setPermissions] = useState(EMPTY_PERMISSIONS)
  const [submitting, setSubmitting] = useState(false)

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

  const handleTemplateSuggestion = async () => {
    if (!useCase.trim()) return
    const result = await getTemplateRecommendation(useCase)
    if (result.template) {
      setTemplateId(result.template.id)
      setPermissions(result.template.permissions)
      setPermissionMode('template')
    }
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    try {
      if (isAdmin && mode === 'cpa') {
        await createCpa({ email, name, password })
      } else {
        await inviteMember({
          email,
          role: 'team_member',
          templateId: permissionMode === 'template' ? templateId || undefined : undefined,
          permissions: permissionMode === 'custom' ? permissions : undefined,
          useCase,
        })
      }
      setEmail('')
      setName('')
      setPassword('')
      setTemplateId('')
      setPermissions(EMPTY_PERMISSIONS)
      setUseCase('')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#111827]">Create Account</h1>
        <p className="mt-1 text-sm text-[#6B7280]">Admins can create CPAs. Founders can invite team members with templates or custom permissions.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-[#E5E7EB] bg-white p-6">
        {isAdmin && <div className="rounded-lg bg-[#F9FAFB] px-4 py-3 text-sm text-[#374151]">TaxOS admins can only create CPA accounts from this screen.</div>}

        <div className="grid gap-4 md:grid-cols-2">
          <input value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="Email" className="h-11 rounded-lg border border-[#E5E7EB] px-3 text-sm" />
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="h-11 rounded-lg border border-[#E5E7EB] px-3 text-sm" />
          {isAdmin && mode === 'cpa' && <input value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Temporary password" className="h-11 rounded-lg border border-[#E5E7EB] px-3 text-sm" />}
        </div>

        {mode === 'team' && (
          <>
            <div className="grid gap-4 md:grid-cols-[1fr_auto]">
              <input value={useCase} onChange={(e) => setUseCase(e.target.value)} placeholder="Use case, e.g. finance, operations, read-only" className="h-11 rounded-lg border border-[#E5E7EB] px-3 text-sm" />
              <button type="button" onClick={handleTemplateSuggestion} className="rounded-lg border border-[#D1D5DB] px-4 py-2 text-sm">Suggest Template</button>
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => setPermissionMode('template')} className={`rounded-lg px-4 py-2 text-sm ${permissionMode === 'template' ? 'bg-[#6C5CE7] text-white' : 'bg-[#F3F4F6] text-[#374151]'}`}>Template</button>
              <button type="button" onClick={() => setPermissionMode('custom')} className={`rounded-lg px-4 py-2 text-sm ${permissionMode === 'custom' ? 'bg-[#6C5CE7] text-white' : 'bg-[#F3F4F6] text-[#374151]'}`}>Custom</button>
            </div>

            {permissionMode === 'template' ? (
              <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} className="h-11 w-full rounded-lg border border-[#E5E7EB] px-3 text-sm">
                <option value="">Select template</option>
                {visibleTemplates.map((template: ApiTemplate) => <option key={template.id} value={template.id}>{template.name}</option>)}
              </select>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {Object.entries(permissions).map(([key, value]) => (
                  <label key={key} className="flex items-center justify-between rounded-lg border border-[#E5E7EB] px-4 py-3 text-sm text-[#374151]">
                    <span>{key}</span>
                    <input type="checkbox" checked={Boolean(value)} onChange={(e) => setPermissions((prev) => ({ ...prev, [key]: e.target.checked }))} />
                  </label>
                ))}
              </div>
            )}
          </>
        )}

        <button disabled={submitting} className="rounded-lg bg-[#6C5CE7] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          {submitting ? 'Submitting...' : mode === 'cpa' ? 'Create CPA' : 'Send Invite'}
        </button>
      </form>
    </div>
  )
}
