import axios, { AxiosRequestConfig } from 'axios'
import { notify } from '@/stores/notifications'

const API_URL = import.meta.env.VITE_API_URL || '/api'

const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('taxos_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.error || error.message || 'Request failed'
    notify({ title: 'Action failed', message, tone: 'error' })
    return Promise.reject(new Error(message))
  },
)

interface RequestMeta {
  successMessage?: string
  notifySuccess?: boolean
}

async function request<T>(path: string, options: AxiosRequestConfig = {}, meta: RequestMeta = {}): Promise<T> {
  const method = (options.method || 'GET').toUpperCase()
  const response = await apiClient.request<T>({ ...options, url: path })
  const data = response.data

  if (meta.successMessage && (meta.notifySuccess ?? method !== 'GET')) {
    notify({ title: 'Success', message: meta.successMessage, tone: 'success' })
  }

  return data
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

const login = (email: string, password: string) =>
  request<{ token: string; user: any }>('/auth/login', {
    method: 'POST',
    data: { email, password },
  })

const registerFounder = async (payload: { email: string; password: string; name: string; organizationName: string }) => {
  const response = await apiClient.post('/auth/register-founder', payload)
  notify({ title: 'Success', message: 'Founder application submitted.', tone: 'success' })
  return response.data
}

const me = (): Promise<Record<string, unknown>> =>
  request<Record<string, unknown>>('/auth/me')

const verifyEmail = (token: string) =>
  request<{ message: string; token?: string; user?: Record<string, unknown> }>('/auth/verify-email', {
    method: 'POST',
    data: { token },
  })

const resendVerification = (email: string) =>
  request<{ message: string }>('/auth/resend-verification', {
    method: 'POST',
    data: { email },
  })

const getOnboardingStatus = () =>
  request<Record<string, unknown>>('/auth/onboarding-status')

const completeFounderOnboarding = async (payload: {
  entityType: string
  brandName: string
  organizationName: string
  legalCompanyName?: string
  registrationNumber?: string
  country?: string
  stateOrJurisdiction?: string
  incorporationDate?: string
  certificate?: File | null
}) => {
  const formData = new FormData()
  formData.append('entityType', payload.entityType)
  formData.append('brandName', payload.brandName)
  formData.append('organizationName', payload.organizationName)
  if (payload.legalCompanyName) formData.append('legalCompanyName', payload.legalCompanyName)
  if (payload.registrationNumber) formData.append('registrationNumber', payload.registrationNumber)
  if (payload.country) formData.append('country', payload.country)
  if (payload.stateOrJurisdiction) formData.append('stateOrJurisdiction', payload.stateOrJurisdiction)
  if (payload.incorporationDate) formData.append('incorporationDate', payload.incorporationDate)
  if (payload.certificate) formData.append('certificate', payload.certificate)

  const response = await apiClient.post('/auth/complete-founder-onboarding', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  notify({ title: 'Success', message: 'Onboarding completed.', tone: 'success' })
  return response.data
}

const getInvite = (token: string) =>
  request<{ email: string; role: string; organizationName: string }>(`/auth/invite/${token}`)

const acceptInvite = (payload: { token: string; password: string; name: string }) =>
  request<{ message: string; token?: string; user?: Record<string, unknown> }>('/auth/accept-invite', {
    method: 'POST',
    data: payload,
  }, { successMessage: 'Account set up. Welcome to TaxOS!' })

// ─── Profile ──────────────────────────────────────────────────────────────────

const getProfile = () => request<Record<string, unknown>>('/profile')

// ─── Admin ─────────────────────────────────────────────────────────────────────

const getFounderApplications = () =>
  request<any[]>('/admin/founder-applications')

const reviewFounderApplication = (id: string, decision: 'approved' | 'rejected', reviewNotes?: string) =>
  request<{ message: string }>(`/admin/founder-applications/${id}/review`, {
    method: 'POST',
    data: { decision, reviewNotes },
  }, { successMessage: `Founder application ${decision}.` })

const getCpas = () =>
  request<any[]>('/admin/cpas')

// Extended Users
const createUser = (payload: any) => request<any>('/admin/users', { method: 'POST', data: payload }, { successMessage: 'User created' })
const getUser = (id: string) => request<any>(`/admin/users/${id}`)
const updateUser = (id: string, payload: any) => request<any>(`/admin/users/${id}`, { method: 'PUT', data: payload }, { successMessage: 'User updated' })
const deleteUser = (id: string) => request<any>(`/admin/users/${id}`, { method: 'DELETE' }, { successMessage: 'User suspended' })

// Extended Organizations
const createOrganization = (payload: any) => request<any>('/admin/organizations', { method: 'POST', data: payload }, { successMessage: 'Organization created' })
const getOrganization = (id: string) => request<any>(`/admin/organizations/${id}`)
const updateOrganization = (id: string, payload: any) => request<any>(`/admin/organizations/${id}`, { method: 'PUT', data: payload }, { successMessage: 'Organization updated' })
const deleteOrganization = (id: string) => request<any>(`/admin/organizations/${id}`, { method: 'DELETE' }, { successMessage: 'Org toggled suspend' })

// Global Views
const getGlobalEntities = () => request<any[]>('/admin/global-entities')
const getGlobalFilings = () => request<any[]>('/admin/global-filings')

// Admin entity & filing management (cross-org)
const adminUpdateEntity = (id: string, payload: any) => request<any>(`/admin/entities/${id}`, { method: 'PUT', data: payload }, { successMessage: 'Entity updated.' })
const adminDissolveEntity = (id: string) => request<any>(`/admin/entities/${id}`, { method: 'DELETE' }, { successMessage: 'Entity dissolved.' })
const adminGetFiling = (id: string) => request<any>(`/admin/filings/${id}`)
const adminUpdateFilingStatus = (id: string, status: string) => request<any>(`/admin/filings/${id}/status`, { method: 'PUT', data: { status } }, { successMessage: 'Filing status updated.' })
const adminUpdateFilingData = (id: string, fields: Record<string, unknown>) => request<any>(`/admin/filings/${id}/data`, { method: 'PUT', data: { fields } }, { successMessage: 'Filing data saved.' })
const adminGetAgentConversations = (params?: Record<string, string>) => {
  const qs = params ? '?' + new URLSearchParams(params).toString() : ''
  return request<{ conversations: any[]; total: number }>(`/admin/agent-conversations${qs}`)
}
const adminGetOrgMessages = (orgId: string, params?: { limit?: number; offset?: number }) => {
  const qs = params ? '&' + new URLSearchParams({ limit: String(params.limit || 20), offset: String(params.offset || 0) }).toString() : ''
  return request<{ messages: any[]; total: number }>(`/chat/org/${orgId}?${qs.replace('&', '')}`)
}
const adminGetFounderMessages = (params?: { limit?: number; offset?: number }) => {
  const qs = params ? '?' + new URLSearchParams({ limit: String(params.limit || 20), offset: String(params.offset || 0) }).toString() : ''
  return request<{ messages: any[]; total: number }>(`/chat/founders${qs}`)
}
const adminGetCpaMessages = (params?: { limit?: number; offset?: number }) => {
  const qs = params ? '?' + new URLSearchParams({ limit: String(params.limit || 20), offset: String(params.offset || 0) }).toString() : ''
  return request<{ messages: any[]; total: number }>(`/chat/cpas${qs}`)
}

const getSystemUsers = () =>
  request<any[]>('/admin/system-users')

const getOrganizationOverview = () =>
  request<any[]>('/admin/organizations-overview')

const createCpa = (payload: { email: string }) =>
  request<{ message: string; inviteId: string }>('/admin/cpas', {
    method: 'POST',
    data: payload,
  }, { successMessage: 'CPA invite sent.' })

const assignCpaOrganization = (id: string, organizationId: string) =>
  request<{ message: string }>(`/admin/cpas/${id}/assign-org`, {
    method: 'POST',
    data: { organizationId },
  }, { successMessage: 'CPA assigned to organization.' })

// ─── Members ─────────────────────────────────────────────────────────────────

const getMembers = () =>
  request<any[]>('/members')

const getMemberTemplates = () =>
  request<any[]>('/members/templates')

const createMemberTemplate = (payload: { name: string; scope: string; permissions: Record<string, boolean> }) =>
  request<any>('/members/templates', {
    method: 'POST',
    data: payload,
  }, { successMessage: 'Template created.' })

const inviteMember = (payload: { email: string; role: string; templateId?: string; permissions?: Record<string, boolean>; useCase?: string }) =>
  request<any>('/members/invite', {
    method: 'POST',
    data: payload,
  }, { successMessage: 'Invite sent.' })

const updateMemberPermissions = (id: string, payload: { templateId?: string; permissions?: Record<string, boolean> }) =>
  request<{ message: string }>(`/members/${id}/permissions`, {
    method: 'PUT',
    data: payload,
  }, { successMessage: 'Permissions updated.' })

const getTemplateRecommendation = (useCase: string) =>
  request<{ recommendedName: string; template: unknown | null }>(`/members/recommendation?${new URLSearchParams({ useCase }).toString()}`)

// ─── Entities ─────────────────────────────────────────────────────────────────

const getEntities = () =>
  request<any[]>('/entities')

const getEntity = (id: string) =>
  request<any>(`/entities/${id}`)

const createEntity = (payload: {
  legalName: string
  entityType: string
  stateOfIncorporation: string
  ein?: string
  fiscalYearEnd?: string
  foreignSubsidiaries?: string[]
  country?: string
}) =>
  request<any>('/entities', {
    method: 'POST',
    data: payload,
  }, { successMessage: 'Entity created.' })

const updateEntity = (id: string, payload: Record<string, unknown>) =>
  request<{ message: string }>(`/entities/${id}`, {
    method: 'PUT',
    data: payload,
  }, { successMessage: 'Entity updated.' })

const deleteEntity = (id: string) =>
  request<{ message: string }>(`/entities/${id}`, { method: 'DELETE' }, { successMessage: 'Entity dissolved.' })

const getEstimatedTaxProjection = (id: string, taxYear?: number) => {
  const qs = taxYear ? `?taxYear=${taxYear}` : ''
  return request<any>(`/entities/${id}/estimated-tax${qs}`)
}

// ─── Filings ─────────────────────────────────────────────────────────────────

const getFilings = (params?: Record<string, string>) => {
  const qs = params ? '?' + new URLSearchParams(params).toString() : ''
  return request<any[]>(`/filings${qs}`)
}

const getFiling = (id: string) =>
  request<any>(`/filings/${id}`)

const createFiling = (payload: { entityId: string; formType: string; formName: string; deadlineId?: string; taxYear?: number }) =>
  request<any>('/filings', {
    method: 'POST',
    data: payload,
  }, { successMessage: 'Filing created.' })

const updateFilingStatus = (id: string, status: string) =>
  request<{ message: string }>(`/filings/${id}/status`, {
    method: 'PUT',
    data: { status },
  }, { successMessage: 'Filing status updated.' })

const updateFilingData = (id: string, fields: Record<string, unknown>) =>
  request<{ message: string; filingData: Record<string, unknown> }>(`/filings/${id}/data`, {
    method: 'PUT',
    data: { fields },
  }, { successMessage: 'Filing data saved.' })

const claimFilingReview = (id: string) =>
  request<any>(`/filings/${id}/claim-review`, { method: 'POST' }, { successMessage: 'Filing review claimed.' })

const releaseFilingReview = (id: string) =>
  request<{ message: string }>(`/filings/${id}/release-review`, { method: 'POST' }, { successMessage: 'Filing review released.' })

const approveFiling = (id: string) =>
  request<{ message: string }>(`/filings/${id}/approve`, { method: 'POST' }, { successMessage: 'Filing approved and submitted.' })

const rejectFiling = (id: string, reason: string) =>
  request<{ message: string }>(`/filings/${id}/reject`, {
    method: 'POST',
    data: { reason },
  }, { successMessage: 'Filing rejected.' })

const pauseFiling = (id: string) =>
  request<{ message: string }>(`/filings/${id}/pause`, { method: 'POST' }, { successMessage: 'AI workflow paused.' })

const resumeFiling = (id: string) =>
  request<{ message: string }>(`/filings/${id}/resume`, { method: 'POST' }, { successMessage: 'AI workflow resumed.' })

const stopFiling = (id: string) =>
  request<{ message: string }>(`/filings/${id}/stop`, { method: 'POST' }, { successMessage: 'Workflow stopped.' })

// ─── Filing Document Requirements ────────────────────────────────────────────

const listFilingRequirements = (filingId: string) =>
  request<any[]>(`/filings/${filingId}/requirements`)

const uploadFilingRequirement = async (
  filingId: string,
  slot: string,
  file: File,
  opts?: { onProgress?: (pct: number) => void },
) => {
  const formData = new FormData()
  formData.append('file', file)
  const response = await apiClient.post(`/filings/${filingId}/requirements/${slot}/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (!opts?.onProgress || !e.total) return
      opts.onProgress(Math.round((e.loaded / e.total) * 100))
    },
  })
  return response.data
}

const importFilingRequirementFromVault = (filingId: string, slot: string, documentId: string) =>
  request<{ document: any }>(`/filings/${filingId}/requirements/${slot}/import-from-vault`, {
    method: 'POST',
    data: { documentId },
  }, { successMessage: 'Imported from vault.' })

const skipFilingRequirement = (filingId: string, slot: string, reason: string) =>
  request<{ ok: true }>(`/filings/${filingId}/requirements/${slot}/skip`, {
    method: 'POST',
    data: { reason },
  }, { successMessage: 'Requirement skipped.' })

const unskipFilingRequirement = (filingId: string, slot: string) =>
  request<{ ok: true }>(`/filings/${filingId}/requirements/${slot}/unskip`, { method: 'POST' })

const retryFilingRequirementUpload = async (
  filingId: string,
  slot: string,
  file: File,
  opts?: { onProgress?: (pct: number) => void },
) => {
  const formData = new FormData()
  formData.append('file', file)
  const response = await apiClient.post(`/filings/${filingId}/requirements/${slot}/retry-upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (!opts?.onProgress || !e.total) return
      opts.onProgress(Math.round((e.loaded / e.total) * 100))
    },
  })
  return response.data
}

const retryFilingRequirementExtract = async (filingId: string, slot: string, file?: File) => {
  if (file) {
    const formData = new FormData()
    formData.append('file', file)
    const response = await apiClient.post(`/filings/${filingId}/requirements/${slot}/retry-extract`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  }
  return request<{ ok: true }>(`/filings/${filingId}/requirements/${slot}/retry-extract`, { method: 'POST' })
}

const markFilingRequirementViewed = (filingId: string, slot: string) =>
  request<{ ok: true }>(`/filings/${filingId}/requirements/${slot}/view`, { method: 'POST' })

const markAllFilingRequirementsViewed = (filingId: string) =>
  request<{ ok: true }>(`/filings/${filingId}/requirements/mark-all-viewed`, { method: 'POST' }, { successMessage: 'All requirements marked viewed.' })

const escalateToCpa = (id: string) =>
  request<{ message: string; notifiedCpaCount: number }>(`/filings/${id}/escalate-cpa`, { method: 'POST' }, { successMessage: 'Filing escalated to CPA.' })

const escalateToFounder = (id: string, reason?: string) =>
  request<{ message: string; reason: string }>(`/filings/${id}/escalate-founder`, {
    method: 'POST',
    data: { reason: reason ?? '' },
  }, { successMessage: 'Filing escalated to founder.' })

const cpaApproveFiling = (id: string) =>
  request<{ message: string }>(`/filings/${id}/cpa-approve`, { method: 'POST' }, { successMessage: 'Filing approved.' })

const cpaRejectFiling = (id: string, reason: string) =>
  request<{ message: string; notifiedCpaCount: number }>(`/filings/${id}/cpa-reject`, {
    method: 'POST',
    data: { reason },
  }, { successMessage: 'Filing rejection recorded.' })

// ─── Deadlines ────────────────────────────────────────────────────────────────

const getDeadlines = (entityId?: string) => {
  const qs = entityId ? `?entityId=${entityId}` : ''
  return request<any[]>(`/deadlines${qs}`)
}

const getDeadline = (id: string) => request<any>(`/deadlines/${id}`)

const completeDeadline = (id: string, note?: string) =>
  request<{ ok: true }>(`/deadlines/${id}/complete`, {
    method: 'POST',
    data: { note: note ?? '' },
  }, { successMessage: 'Deadline marked filed.' })

const skipDeadlineApi = (id: string, reason: string) =>
  request<{ ok: true }>(`/deadlines/${id}/skip`, {
    method: 'POST',
    data: { reason },
  }, { successMessage: 'Deadline skipped.' })

const extendDeadlineApi = (id: string, newDueDate?: string, note?: string) =>
  request<{ ok: true }>(`/deadlines/${id}/extend`, {
    method: 'POST',
    data: { newDueDate: newDueDate ?? '', note: note ?? '' },
  }, { successMessage: 'Deadline extended.' })

const snoozeDeadlineApi = (id: string, until: string) =>
  request<{ ok: true }>(`/deadlines/${id}/snooze`, {
    method: 'POST',
    data: { until },
  }, { successMessage: 'Deadline snoozed.' })

const reopenDeadlineApi = (id: string) =>
  request<{ ok: true }>(`/deadlines/${id}/reopen`, {
    method: 'POST',
  }, { successMessage: 'Deadline reopened.' })

// ─── Documents ───────────────────────────────────────────────────────────────

const getDocuments = (params?: Record<string, string>) => {
  const qs = params ? '?' + new URLSearchParams(params).toString() : ''
  return request<any[]>(`/documents${qs}`)
}

const getDocument = (id: string) =>
  request<any>(`/documents/${id}`)

const uploadDocument = async (
  file: File,
  filingId?: string,
  opts?: { onProgress?: (pct: number) => void },
) => {
  const formData = new FormData()
  formData.append('file', file)
  if (filingId) formData.append('filingId', filingId)
  const response = await apiClient.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (!opts?.onProgress || !e.total) return
      opts.onProgress(Math.round((e.loaded / e.total) * 100))
    },
  })
  return response.data
}

const retryDocumentUpload = async (
  id: string,
  file: File,
  opts?: { onProgress?: (pct: number) => void },
) => {
  const formData = new FormData()
  formData.append('file', file)
  const response = await apiClient.post(`/documents/${id}/retry-upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (!opts?.onProgress || !e.total) return
      opts.onProgress(Math.round((e.loaded / e.total) * 100))
    },
  })
  return response.data
}

const retryDocumentExtract = async (id: string, file?: File) => {
  if (file) {
    const formData = new FormData()
    formData.append('file', file)
    const response = await apiClient.post(`/documents/${id}/retry-extract`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  }
  return request<{ message: string }>(`/documents/${id}/retry-extract`, { method: 'POST' })
}

const getDocumentDownload = (id: string) =>
  request<{ url: string; fileName: string }>(`/documents/${id}/download`)

const deleteDocumentApi = (id: string) =>
  request<{ message: string }>(`/documents/${id}`, { method: 'DELETE' }, { successMessage: 'Document deleted.' })

// ─── Vaults ──────────────────────────────────────────────────────────────────

const getVaults = () =>
  request<any[]>('/vaults')

const createVault = (payload: { name: string; description?: string }) =>
  request<any>('/vaults', {
    method: 'POST',
    data: payload,
  }, { successMessage: 'Vault created.' })

const getVault = (id: string) =>
  request<any>(`/vaults/${id}`)

const updateVault = (id: string, payload: { name?: string; description?: string }) =>
  request<any>(`/vaults/${id}`, {
    method: 'PUT',
    data: payload,
  }, { successMessage: 'Vault updated.' })

const deleteVault = (id: string) =>
  request<any>(`/vaults/${id}`, { method: 'DELETE' }, { successMessage: 'Vault deleted.' })

const createFolder = (vaultId: string, payload: { name: string; parentId?: string }) =>
  request<any>(`/vaults/${vaultId}/folders`, {
    method: 'POST',
    data: payload,
  }, { successMessage: 'Folder created.' })

const deleteFolderApi = (vaultId: string, folderId: string) =>
  request<any>(`/vaults/${vaultId}/folders/${folderId}`, { method: 'DELETE' }, { successMessage: 'Folder deleted.' })

const getVaultDocuments = (vaultId: string, folderId?: string) => {
  const qs = folderId ? `?folderId=${folderId}` : ''
  return request<any[]>(`/vaults/${vaultId}/documents${qs}`)
}

const moveDocumentApi = (docId: string, payload: { vaultId?: string; folderId?: string }) =>
  request<any>(`/documents/${docId}/move`, {
    method: 'PUT',
    data: payload,
  }, { successMessage: 'Document moved.' })

const uploadDocumentToVault = async (
  file: File,
  vaultId: string,
  folderId?: string,
  opts?: { onProgress?: (pct: number) => void },
) => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('vaultId', vaultId)
  if (folderId) formData.append('folderId', folderId)
  const response = await apiClient.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (!opts?.onProgress || !e.total) return
      opts.onProgress(Math.round((e.loaded / e.total) * 100))
    },
  })
  return response.data
}

// ─── Approvals ───────────────────────────────────────────────────────────────

const getApprovals = () =>
  request<any[]>('/approvals')

const resolveApproval = (id: string, status: 'approved' | 'rejected', reason?: string) =>
  request<{ message: string }>(`/approvals/${id}/resolve`, {
    method: 'POST',
    data: { status, reason },
  }, { successMessage: status === 'approved' ? 'Approval resolved.' : 'Approval rejected.' })

const escalateApproval = (id: string) =>
  request<{ message: string }>(`/approvals/${id}/escalate`, { method: 'POST' }, { successMessage: 'Escalated to CPA.' })

// ─── Audit ─────────────────────────────────────────────────────────────────

const getAuditLog = (params?: Record<string, string>) => {
  const qs = params ? '?' + new URLSearchParams(params).toString() : ''
  return request<any[]>(`/audit${qs}`)
}

const exportAuditCsv = async (filingId?: string) => {
  const token = localStorage.getItem('taxos_token')
  const qs = filingId ? `?filingId=${filingId}` : ''
  const response = await apiClient.get(`/audit/export${qs}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    responseType: 'text',
  })
  return response.data as string
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

const getOrgMessages = (orgId: string, params?: { limit?: number; offset?: number }) => {
  const qs = params ? '?' + new URLSearchParams({ limit: String(params.limit || 20), offset: String(params.offset || 0) }).toString() : ''
  return request<{ messages: any[]; total: number }>(`/chat/org/${orgId}${qs}`)
}

const postOrgMessage = (orgId: string, message: string) =>
  request<any>(`/chat/org/${orgId}`, { method: 'POST', data: { message } })

const getFounderMessages = (params?: { limit?: number; offset?: number }) => {
  const qs = params ? '?' + new URLSearchParams({ limit: String(params.limit || 20), offset: String(params.offset || 0) }).toString() : ''
  return request<{ messages: any[]; total: number }>(`/chat/founders${qs}`)
}

const postFounderMessage = (message: string) =>
  request<any>('/chat/founders', { method: 'POST', data: { message } })

const getCpaMessages = (params?: { limit?: number; offset?: number }) => {
  const qs = params ? '?' + new URLSearchParams({ limit: String(params.limit || 20), offset: String(params.offset || 0) }).toString() : ''
  return request<{ messages: any[]; total: number }>(`/chat/cpas${qs}`)
}

const postCpaMessage = (message: string) =>
  request<any>('/chat/cpas', { method: 'POST', data: { message } })

// SSE notification stream — returns an EventSource. Caller must close it.
const subscribeNotifications = (): EventSource => {
  const token = localStorage.getItem('taxos_token')
  const url = `${API_URL}/sse/notifications${token ? `?token=${encodeURIComponent(token)}` : ''}`
  return new EventSource(url)
}

// ─── Agents ──────────────────────────────────────────────────────────────────

const startIntake = (filingId: string) =>
  request<any>('/agents/intake/start', {
    method: 'POST',
    data: { filingId },
  }, { notifySuccess: false })

interface StreamHandlers {
  onChunk: (text: string) => void
  onMetadata?: (metadata: Record<string, unknown>) => void
  onError?: (message: string, code?: string) => void
}

async function consumeSseStream(url: string, body: unknown, handlers: StreamHandlers) {
  const token = localStorage.getItem('taxos_token')
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error('Agent request failed')
  const reader = response.body?.getReader()
  if (!reader) return
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const events = buffer.split('\n\n')
    buffer = events.pop() ?? ''
    for (const ev of events) {
      const line = ev.split('\n').find(l => l.startsWith('data: '))
      if (!line) continue
      const data = line.slice(6)
      if (data === '[DONE]') return
      try {
        const parsed = JSON.parse(data)
        if (parsed.error) {
          if (handlers.onError) handlers.onError(parsed.error, parsed.code)
          else handlers.onChunk(`\n\n_Error: ${parsed.error}_`)
          return
        }
        if (parsed.metadata && handlers.onMetadata) handlers.onMetadata(parsed.metadata)
        if (parsed.text) handlers.onChunk(parsed.text)
      } catch { /* ignore malformed frames */ }
    }
  }
}

const streamIntakeMessage = (
  filingId: string,
  message: string,
  onChunk: (text: string) => void,
  onMetadata?: (metadata: Record<string, unknown>) => void,
) => consumeSseStream(`${API_URL}/agents/intake/message`, { filingId, message }, { onChunk, onMetadata })

const runDeadlines = (entityId: string) =>
  request<any>('/agents/deadline/run', {
    method: 'POST',
    data: { entityId },
  }, { notifySuccess: false })

const extractDocument = (documentId: string) =>
  request<any>('/agents/document/extract', {
    method: 'POST',
    data: { documentId },
  }, { notifySuccess: false })

const runPrefill = (filingId: string) =>
  request<any>('/agents/prefill/run', {
    method: 'POST',
    data: { filingId },
  }, { notifySuccess: false })

const runAuditRisk = (filingId: string) =>
  request<any>('/agents/audit-risk/run', {
    method: 'POST',
    data: { filingId },
  }, { notifySuccess: false })

// ─── AI Chat (Inkle AI) conversations ────────────────────────────────────────
export interface AiChatMessage { role: 'user' | 'assistant'; content: string; timestamp: string }
export interface AiChatConversation {
  id: string
  userId: string
  orgId: string | null
  title: string
  messages: AiChatMessage[]
  createdAt: string
  updatedAt: string
}

const listAiChats = () =>
  request<{ conversations: AiChatConversation[] }>('/ai-chats')

const createAiChat = (payload: { title?: string; messages?: AiChatMessage[] }) =>
  request<AiChatConversation>('/ai-chats', {
    method: 'POST',
    data: payload,
  }, { notifySuccess: false })

const updateAiChat = (id: string, patch: { title?: string; messages?: AiChatMessage[] }) =>
  request<AiChatConversation>(`/ai-chats/${id}`, {
    method: 'PATCH',
    data: patch,
  }, { notifySuccess: false })

const deleteAiChat = (id: string) =>
  request<void>(`/ai-chats/${id}`, { method: 'DELETE' }, { notifySuccess: false })

const streamTaxQa = (
  question: string,
  onChunk: (text: string) => void,
  onMetadata?: (metadata: Record<string, unknown>) => void,
  onError?: (message: string, code?: string) => void,
) => consumeSseStream(`${API_URL}/agents/tax-qa/ask`, { question }, { onChunk, onMetadata, onError })

// ─── Main API export (flat + nested) ─────────────────────────────────────────

export const api = {
  // Auth
  login,
  registerFounder,
  me,
  verifyEmail,
  resendVerification,
  getOnboardingStatus,
  completeFounderOnboarding,
  getInvite,
  acceptInvite,

  // Profile
  getProfile,

  // Admin
  getFounderApplications,
  reviewFounderApplication,
  getCpas,
  getOrganizationOverview,
  createCpa,
  assignCpaOrganization,

  // Members
  getMembers,
  getMemberTemplates,
  createMemberTemplate,
  inviteMember,
  updateMemberPermissions,
  getTemplateRecommendation,

  // Entities
  getEntities,
  getEntity,
  createEntity,
  updateEntity,
  deleteEntity,
  getEstimatedTaxProjection,

  // Filings
  getFilings,
  getFiling,
  createFiling,
  updateFilingStatus,
  updateFilingData,
  claimFilingReview,
  releaseFilingReview,
  approveFiling,
  rejectFiling,
  pauseFiling,
  resumeFiling,
  stopFiling,
  escalateToCpa,
  escalateToFounder,
  listFilingRequirements,
  uploadFilingRequirement,
  importFilingRequirementFromVault,
  skipFilingRequirement,
  unskipFilingRequirement,
  retryFilingRequirementUpload,
  retryFilingRequirementExtract,
  markFilingRequirementViewed,
  markAllFilingRequirementsViewed,

  // Deadlines
  getDeadlines,
  getDeadline,
  completeDeadline,
  skipDeadlineApi,
  extendDeadlineApi,
  snoozeDeadlineApi,
  reopenDeadlineApi,

  // Documents
  getDocuments,
  getDocument,
  uploadDocument,
  retryDocumentUpload,
  retryDocumentExtract,
  getDocumentDownload,
  deleteDocumentApi,

  // Vaults
  getVaults,
  createVault,
  getVault,
  updateVault,
  deleteVault,
  createFolder,
  deleteFolder: deleteFolderApi,
  getVaultDocuments,
  moveDocument: moveDocumentApi,
  uploadDocumentToVault,

  // Approvals
  getApprovals,
  resolveApproval,
  escalateApproval,

  // Audit
  getAuditLog,
  exportAuditCsv,

  // Agents
  startIntake,
  streamIntakeMessage,
  runDeadlines,
  extractDocument,
  runPrefill,
  runAuditRisk,
  streamTaxQa,

  // CPA filing actions
  cpaApproveFiling,
  cpaRejectFiling,

  // AI Chat (Inkle AI)
  listAiChats,
  createAiChat,
  updateAiChat,
  deleteAiChat,

  // Chat
  getOrgMessages,
  postOrgMessage,
  getFounderMessages,
  postFounderMessage,
  getCpaMessages,
  postCpaMessage,

  // SSE notifications
  subscribeNotifications,

  // Nested namespaces (for store actions)
  auth: {
    login,
    registerFounder,
    me,
    verifyEmail,
    resendVerification,
    getOnboardingStatus,
    completeFounderOnboarding,
    getInvite,
    acceptInvite,
  },
  profile: {
    get: getProfile,
  },
  admin: {
    getFounderApplications,
    reviewFounderApplication,
    getSystemUsers,
    createUser,
    getUser,
    updateUser,
    deleteUser,
    createOrganization,
    getOrganization,
    updateOrganization,
    deleteOrganization,
    getGlobalEntities,
    getGlobalFilings,
    getCpas,
    getOrganizationOverview,
    createCpa,
    assignCpaOrganization,
    updateEntity: adminUpdateEntity,
    dissolveEntity: adminDissolveEntity,
    getFiling: adminGetFiling,
    updateFilingStatus: adminUpdateFilingStatus,
    updateFilingData: adminUpdateFilingData,
    getAgentConversations: adminGetAgentConversations,
    getOrgChatMessages: adminGetOrgMessages,
    getFounderMessages: adminGetFounderMessages,
    getCpaMessages: adminGetCpaMessages,
  },
  members: {
    getAll: getMembers,
    getTemplates: getMemberTemplates,
    createTemplate: createMemberTemplate,
    invite: inviteMember,
    updatePermissions: updateMemberPermissions,
    getTemplateRecommendation,
  },
  entities: {
    getAll: getEntities,
    get: getEntity,
    create: createEntity,
    update: updateEntity,
    delete: deleteEntity,
    getEstimatedTax: getEstimatedTaxProjection,
  },
  filings: {
    getAll: getFilings,
    get: getFiling,
    create: createFiling,
    updateStatus: updateFilingStatus,
    updateData: updateFilingData,
    claimReview: claimFilingReview,
    releaseReview: releaseFilingReview,
    approve: approveFiling,
    reject: rejectFiling,
    cpaApprove: cpaApproveFiling,
    cpaReject: cpaRejectFiling,
    pause: pauseFiling,
    resume: resumeFiling,
    stop: stopFiling,
    escalateToCpa,
    escalateToFounder,
    listRequirements: listFilingRequirements,
    uploadRequirement: uploadFilingRequirement,
    importRequirementFromVault: importFilingRequirementFromVault,
    skipRequirement: skipFilingRequirement,
    unskipRequirement: unskipFilingRequirement,
    retryRequirementUpload: retryFilingRequirementUpload,
    retryRequirementExtract: retryFilingRequirementExtract,
    markRequirementViewed: markFilingRequirementViewed,
    markAllRequirementsViewed: markAllFilingRequirementsViewed,
  },
  deadlines: {
    getAll: getDeadlines,
    get: getDeadline,
    complete: completeDeadline,
    skip: skipDeadlineApi,
    extend: extendDeadlineApi,
    snooze: snoozeDeadlineApi,
    reopen: reopenDeadlineApi,
  },
  documents: {
    getAll: getDocuments,
    get: getDocument,
    upload: uploadDocument,
    retryUpload: retryDocumentUpload,
    retryExtract: retryDocumentExtract,
    getDownload: getDocumentDownload,
    delete: deleteDocumentApi,
  },
  vaults: {
    getAll: getVaults,
    get: getVault,
    create: createVault,
    update: updateVault,
    delete: deleteVault,
    createFolder,
    deleteFolder: deleteFolderApi,
    getDocuments: getVaultDocuments,
    moveDocument: moveDocumentApi,
    uploadDocument: uploadDocumentToVault,
  },
  approvals: {
    getAll: getApprovals,
    resolve: resolveApproval,
    escalate: escalateApproval,
  },
  audit: {
    getLog: getAuditLog,
    exportCsv: exportAuditCsv,
  },
  agents: {
    startIntake,
    streamIntakeMessage,
    runDeadlines,
    extractDocument,
    runPrefill,
    runAuditRisk,
    streamTaxQa,
  },

  chat: {
    getOrgMessages,
    postOrgMessage,
    getFounderMessages,
    postFounderMessage,
    getCpaMessages,
    postCpaMessage,
  },

  notifications: {
    subscribe: subscribeNotifications,
  },
}

export type Api = typeof api
