import { create } from 'zustand'
import { api } from '../lib/api'

interface FilingReviewLock {
  id: string
  filingId: string
  cpaUserId: string
  status: 'active' | 'completed' | 'released'
  releasedAt: string | null
}

interface Filing {
  id: string
  orgId: string
  entityId: string
  formType: string
  formName: string
  status: 'intake' | 'ai_prep' | 'cpa_review' | 'founder_approval' | 'submitted' | 'archived'
  aiConfidenceScore: number | null
  cpaAssignedId: string | null
  filingData: Record<string, unknown>
  aiSummary: string | null
  aiReasoning: string | null
  founderApprovedAt: string | null
  submittedAt: string | null
  taxYear: number | null
  deadlineId: string | null
  reviewLock: FilingReviewLock | null
  createdAt: string
  updatedAt: string
}

interface FilingConversation {
  id: string
  filingId: string
  role: 'user' | 'assistant'
  message: string
  createdAt: string
}

interface FilingDocument {
  id: string
  filingId: string | null
  orgId: string
  fileName: string
  storageUrl: string
  mimeType: string
  extractedData: Record<string, unknown> | null
  aiTags: string[]
  confidenceScore: number | null
  reviewedByHuman: boolean
  uploadedById: string
  createdAt: string
}

interface FilingApproval {
  id: string
  filingId: string
  orgId: string
  queueType: 'founder' | 'cpa'
  status: 'pending' | 'approved' | 'rejected' | 'escalated'
  summary: string
  aiRecommendation: string | null
  rejectionReason: string | null
  resolvedAt: string | null
  resolvedById: string | null
  createdAt: string
}

interface FilingDetail extends Filing {
  conversations: FilingConversation[]
  documents: FilingDocument[]
  approvals: FilingApproval[]
}

interface Approval {
  id: string
  filingId: string
  orgId: string
  queueType: 'founder' | 'cpa'
  status: 'pending' | 'approved' | 'rejected' | 'escalated'
  summary: string
  aiRecommendation: string | null
  rejectionReason: string | null
  resolvedAt: string | null
  resolvedById: string | null
  createdAt: string
}

interface Document {
  id: string
  filingId: string | null
  orgId: string
  fileName: string
  storageUrl: string
  mimeType: string
  extractedData: Record<string, unknown> | null
  aiTags: string[]
  confidenceScore: number | null
  reviewedByHuman: boolean
  uploadedById: string
  createdAt: string
}

interface FounderApplication {
  id: string
  userId: string
  organizationId: string
  email: string
  name: string | null
  organizationName: string
  legalCompanyName: string | null
  brandName: string | null
  entityType: string | null
  country: string | null
  stateOrJurisdiction: string | null
  registrationNumber: string | null
  incorporationDate: string | null
  certificateFileName: string | null
  certificateStorageUrl: string | null
  parsedCertificateData: Record<string, unknown> | null
  status: 'pending' | 'approved' | 'rejected'
  reviewNotes: string | null
  reviewedByUserId: string | null
  reviewedAt: string | null
  approvedUserId: string | null
  onboardingCompletedAt: string | null
  emailVerifiedAt: string | null
  createdAt: string
}

interface Cpa {
  id: string
  email: string
  name: string
  role: string
  orgId: string | null
  status: string
  isVerified: boolean
  assignments: Array<{
    id: string
    userId: string
    organizationId: string
    createdByUserId: string
  }>
}

interface Member {
  id: string
  email: string
  name: string
  role: string
  orgId: string | null
  status: string
  isVerified: boolean
  permissionRecord: {
    id: string
    userId: string
    templateId: string | null
    permissions: Record<string, boolean>
  } | null
}

interface Template {
  id: string
  name: string
  scope: 'global' | 'organization'
  organizationId: string | null
  createdByUserId: string
  permissions: Record<string, boolean>
  isSystemTemplate: boolean
  createdAt: string
  updatedAt: string
}

interface Entity {
  id: string
  orgId: string
  legalName: string
  entityType: string
  stateOfIncorporation: string
  ein: string | null
  fiscalYearEnd: string
  foreignSubsidiaries: string[]
  country: string
  status: 'active' | 'inactive' | 'dissolved'
  createdAt: string
}

interface OnboardingStatus {
  user: {
    id: string
    email: string
    name: string
    role: string
    orgId: string | null
    status: string
    isVerified: boolean
    permissions: Record<string, boolean>
  }
  application: {
    id: string
    userId: string
    organizationId: string
    email: string
    name: string | null
    organizationName: string | null
    legalCompanyName: string | null
    brandName: string | null
    entityType: string | null
    country: string | null
    stateOrJurisdiction: string | null
    registrationNumber: string | null
    incorporationDate: string | null
    certificateFileName: string | null
    certificateStorageUrl: string | null
    parsedCertificateData: Record<string, unknown> | null
    status: string
    onboardingCompletedAt: string | null
    emailVerifiedAt: string | null
    createdAt: string
  } | null
  organization: {
    id: string
    name: string
    legalName: string | null
    registrationNumber: string | null
    incorporationCountry: string | null
    incorporationState: string | null
    incorporationDate: string | null
  } | null
}

interface Profile {
  id: string
  name: string
  email: string
  role: string
  status: string
  organization: { id: string; name: string; legalName: string | null } | null
  permissions: Record<string, boolean>
  permissionRecord: {
    id: string
    userId: string
    templateId: string | null
    permissions: Record<string, boolean>
  } | null
  canCreateAccount: boolean
}

interface Deadline {
  id: string
  entityId: string | null
  orgId: string
  title: string
  description: string | null
  dueDate: string
  type: string
  status: 'pending' | 'completed' | 'missed' | 'upcoming' | 'overdue' | 'filed' | 'extended'
  filingId: string | null
  createdAt: string
  urgencyScore?: number
  formType?: string
  formName?: string
  aiPredicted?: boolean
}

interface EstimatedTaxProjection {
  taxYear?: number
  taxableIncome?: number
  annualProjectedTax?: number
  effectiveTaxRate?: number
  basis?: '1120_total_tax' | '7004_estimated_tax' | 'taxable_income_formula' | 'default_formula'
  quarterlyPayments?: Array<{
    quarter?: string
    amount?: number
    dueDate?: string
    status?: string
  }>
  supportingFilingId?: string
}

interface AuditLogEntry {
  id: string
  orgId: string
  filingId: string | null
  actorType: 'ai' | 'cpa' | 'founder' | 'system'
  actorId: string | null
  action: string
  reasoning: string | null
  inputs: Record<string, unknown> | null
  outputs: Record<string, unknown> | null
  modelVersion: string | null
  confidenceScore: number | null
  createdAt: string
}

interface AuthState {
  user: {
    id: string
    email: string
    name: string
    role: string
    orgId: string | null
    status: string
    isVerified: boolean
    permissions?: Record<string, boolean>
    onboardingCompleted?: boolean
    onboardingStep?: string
  } | null
  token: string | null
  isLoading: boolean

  onboardingStatus: OnboardingStatus | null
  profile: Profile | null
  filings: Filing[]
  filingDetails: Record<string, FilingDetail>
  approvals: Approval[]
  documents: Document[]
  founderApplications: FounderApplication[]
  cpas: Cpa[]
  adminOrganizations: any[]
  members: Member[]
  templates: Template[]
  entities: Entity[]
  deadlines: Deadline[]
  auditLog: AuditLogEntry[]

  onboardingStatusLoading: boolean
  profileLoading: boolean
  filingsLoading: boolean
  approvalsLoading: boolean
  documentsLoading: boolean
  founderApplicationsLoading: boolean
  cpasLoading: boolean
  membersLoading: boolean
  templatesLoading: boolean
  entitiesLoading: boolean
  deadlinesLoading: boolean
  auditLogLoading: boolean

  login: (email: string, password: string) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>

  fetchOnboardingStatus: () => Promise<void>
  fetchProfile: () => Promise<void>
  fetchFilings: (params?: Record<string, string>) => Promise<void>
  fetchFiling: (id: string) => Promise<void>
  fetchApprovals: () => Promise<void>
  fetchDocuments: (params?: Record<string, string>) => Promise<void>
  fetchFounderApplications: () => Promise<void>
  fetchCpas: () => Promise<void>
  fetchAdminOrganizations: () => Promise<void>
  fetchMembers: () => Promise<void>
  fetchTemplates: () => Promise<void>
  fetchEntities: () => Promise<void>
  fetchEntity: (id: string) => Promise<void>
  fetchDeadlines: (entityId?: string) => Promise<void>
  fetchAuditLog: (params?: Record<string, string>) => Promise<void>
  runDeadlines: (entityId: string) => Promise<void>
  fetchEstimatedTax: (entityId: string, taxYear?: number) => Promise<EstimatedTaxProjection | null>

  completeFounderOnboarding: (data: {
    entityType: string
    brandName: string
    organizationName: string
    legalCompanyName?: string
    registrationNumber?: string
    country?: string
    stateOrJurisdiction?: string
    incorporationDate?: string
    certificate?: File | null
  }) => Promise<void>
  reviewFounderApplication: (id: string, decision: 'approved' | 'rejected', reviewNotes?: string) => Promise<void>
  inviteMember: (data: { email: string; role: string; templateId?: string; permissions?: Record<string, boolean>; useCase?: string }) => Promise<void>
  updateMemberPermissions: (id: string, data: { templateId?: string; permissions?: Record<string, boolean> }) => Promise<void>
  createFiling: (data: { entityId: string; formType: string; formName: string; deadlineId?: string; taxYear?: number }) => Promise<{ id: string }>
  updateFilingStatus: (id: string, status: string) => Promise<void>
  approveFiling: (id: string) => Promise<void>
  rejectFiling: (id: string, reason: string) => Promise<void>
  cpaApproveFiling: (id: string) => Promise<void>
  cpaRejectFiling: (id: string, reason: string) => Promise<void>
  claimFilingReview: (id: string) => Promise<void>
  releaseFilingReview: (id: string) => Promise<void>
  startIntake: (id: string) => Promise<void>
  runPrefill: (id: string) => Promise<void>
  runAuditRisk: (id: string) => Promise<any>
  pauseFiling: (id: string) => Promise<void>
  escalateToCpa: (id: string) => Promise<void>
  extractDocument: (documentId: string) => Promise<void>
  createEntity: (data: { legalName: string; entityType: string; stateOfIncorporation: string; ein?: string; fiscalYearEnd?: string; foreignSubsidiaries?: string[]; country?: string }) => Promise<void>
  updateEntity: (id: string, data: Partial<{ legalName: string; entityType: string; stateOfIncorporation: string; ein: string; majorBusinessActivity: string | null; fiscalYearEnd: string; foreignSubsidiaries: string[]; country: string; status: string; directors: Record<string, unknown>[]; officers: Record<string, unknown>[]; shareholders: Record<string, unknown>[]; capTable: Record<string, unknown>[]; sensitiveData: Record<string, unknown>[] }>) => Promise<void>
  deleteEntity: (id: string) => Promise<void>
  resolveApproval: (id: string, status: 'approved' | 'rejected', reason?: string) => Promise<void>
  escalateApproval: (id: string) => Promise<void>
  uploadDocument: (file: File, filingId?: string) => Promise<void>
  markDocumentReviewed: (id: string) => Promise<void>
  createCpa: (data: { email: string }) => Promise<void>
  assignCpaOrganization: (id: string, organizationId: string) => Promise<void>
  createTemplate: (data: { name: string; scope: string; permissions: Record<string, boolean> }) => Promise<void>
  getTemplateRecommendation: (useCase: string) => Promise<{ recommendedName: string; template: Template | null }>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('taxos_token'),
  isLoading: true,

  onboardingStatus: null,
  profile: null,
  filings: [],
  filingDetails: {},
  approvals: [],
  documents: [],
  founderApplications: [],
  cpas: [],
  adminOrganizations: [],
  members: [],
  templates: [],
  entities: [],
  deadlines: [],
  auditLog: [],

  onboardingStatusLoading: false,
  profileLoading: false,
  filingsLoading: false,
  approvalsLoading: false,
  documentsLoading: false,
  founderApplicationsLoading: false,
  cpasLoading: false,
  membersLoading: false,
  templatesLoading: false,
  entitiesLoading: false,
  deadlinesLoading: false,
  auditLogLoading: false,

  login: async (email, password) => {
    const result = await api.auth.login(email, password) as { token: string; user: AuthState['user'] }
    localStorage.setItem('taxos_token', result.token)
    set({ token: result.token, user: result.user, isLoading: false })
  },

  logout: () => {
    localStorage.removeItem('taxos_token')
    set({
      token: null,
      user: null,
      onboardingStatus: null,
      profile: null,
      filings: [],
      filingDetails: {},
      approvals: [],
      documents: [],
      founderApplications: [],
      cpas: [],
      adminOrganizations: [],
      members: [],
      deadlines: [],
      auditLog: [],
      templates: [],
      entities: [],
    })
  },

  checkAuth: async () => {
    try {
      const token = localStorage.getItem('taxos_token')
      if (!token) {
        set({ isLoading: false })
        return
      }
      const user = await api.auth.me() as AuthState['user']
      set({ user, token, isLoading: false })
    } catch {
      localStorage.removeItem('taxos_token')
      set({ token: null, user: null, isLoading: false })
    }
  },

  fetchOnboardingStatus: async () => {
    set({ onboardingStatusLoading: true })
    try {
      const data = await api.auth.getOnboardingStatus() as unknown as OnboardingStatus
      set({ onboardingStatus: data, onboardingStatusLoading: false })
    } catch {
      set({ onboardingStatusLoading: false })
    }
  },

  fetchProfile: async () => {
    set({ profileLoading: true })
    try {
      const data = await api.profile.get() as unknown as Profile
      set({ profile: data, profileLoading: false })
    } catch {
      set({ profileLoading: false })
    }
  },

  fetchFilings: async (params) => {
    set({ filingsLoading: true })
    try {
      const data = await api.filings.getAll(params) as Filing[]
      set({ filings: data, filingsLoading: false })
    } catch {
      set({ filingsLoading: false })
    }
  },

  fetchFiling: async (id) => {
    const data = await api.filings.get(id) as FilingDetail
    set((state) => ({ filingDetails: { ...state.filingDetails, [id]: data } }))
  },

  fetchApprovals: async () => {
    set({ approvalsLoading: true })
    try {
      const data = await api.approvals.getAll() as Approval[]
      set({ approvals: data, approvalsLoading: false })
    } catch {
      set({ approvalsLoading: false })
    }
  },

  fetchDocuments: async (params) => {
    set({ documentsLoading: true })
    try {
      const data = await api.documents.getAll(params) as Document[]
      set({ documents: data, documentsLoading: false })
    } catch {
      set({ documentsLoading: false })
    }
  },

  fetchFounderApplications: async () => {
    set({ founderApplicationsLoading: true })
    try {
      const data = await api.admin.getFounderApplications() as FounderApplication[]
      set({ founderApplications: data, founderApplicationsLoading: false })
    } catch {
      set({ founderApplicationsLoading: false })
    }
  },

  fetchCpas: async () => {
    set({ cpasLoading: true })
    try {
      const data = await api.admin.getCpas() as Cpa[]
      set({ cpas: data, cpasLoading: false })
    } catch {
      set({ cpasLoading: false })
    }
  },

  fetchAdminOrganizations: async () => {
    try {
      const data = await api.admin.getOrganizationOverview() as any[]
      set({ adminOrganizations: data })
    } catch {
      set({ adminOrganizations: [] })
    }
  },

  fetchMembers: async () => {
    set({ membersLoading: true })
    try {
      const data = await api.members.getAll() as Member[]
      set({ members: data, membersLoading: false })
    } catch {
      set({ membersLoading: false })
    }
  },

  fetchTemplates: async () => {
    set({ templatesLoading: true })
    try {
      const user = get().user
      const data = user?.role === 'founder'
        ? (await api.members.getTemplates() as Template[])
        : []
      set({ templates: data, templatesLoading: false })
    } catch {
      set({ templatesLoading: false })
    }
  },

  fetchEntities: async () => {
    set({ entitiesLoading: true })
    try {
      const data = await api.entities.getAll() as Entity[]
      set({ entities: data, entitiesLoading: false })
    } catch {
      set({ entitiesLoading: false })
    }
  },

  fetchEntity: async (id: string) => {
    try {
      const data = await api.entities.get(id) as Entity
      set((state) => {
        const existing = state.entities.find(e => e.id === id)
        if (existing) {
          return {
            entities: state.entities.map(e => e.id === id ? data : e),
          }
        }
        return { entities: [...state.entities, data] }
      })
    } catch { /* ignore */ }
  },

  fetchDeadlines: async (entityId?: string) => {
    set({ deadlinesLoading: true })
    try {
      const data = await api.deadlines.getAll(entityId) as Deadline[]
      set({ deadlines: data, deadlinesLoading: false })
    } catch {
      set({ deadlinesLoading: false })
    }
  },

  fetchAuditLog: async (params?: Record<string, string>) => {
    set({ auditLogLoading: true })
    try {
      const data = await api.audit.getLog(params) as AuditLogEntry[]
      set({ auditLog: data, auditLogLoading: false })
    } catch {
      set({ auditLogLoading: false })
    }
  },

  fetchEstimatedTax: async (entityId: string, taxYear?: number) => {
    try {
      const data = await api.entities.getEstimatedTax(entityId, taxYear) as EstimatedTaxProjection
      return data
    } catch {
      return null
    }
  },

  runDeadlines: async (entityId: string) => {
    await api.agents.runDeadlines(entityId)
    await get().fetchDeadlines(entityId)
    await get().fetchAuditLog()
  },

  completeFounderOnboarding: async (data) => {
    await api.auth.completeFounderOnboarding(data)
    set({ onboardingStatus: null })
    await get().fetchOnboardingStatus()
    await get().checkAuth()
  },

  reviewFounderApplication: async (id, decision, reviewNotes) => {
    await api.admin.reviewFounderApplication(id, decision, reviewNotes)
    await get().fetchFounderApplications()
  },

  inviteMember: async (data) => {
    await api.members.invite(data)
  },

  updateMemberPermissions: async (id, data) => {
    await api.members.updatePermissions(id, data)
    await get().fetchMembers()
  },

  createFiling: async (data) => {
    const result = await api.filings.create(data) as { id: string }
    await get().fetchFilings()
    return result
  },

  updateFilingStatus: async (id, status) => {
    await api.filings.updateStatus(id, status)
    await get().fetchFilings()
    await get().fetchFiling(id)
  },

  approveFiling: async (id) => {
    await api.filings.approve(id)
    await get().fetchFilings()
    await get().fetchFiling(id)
  },

  rejectFiling: async (id, reason) => {
    await api.filings.reject(id, reason)
    await get().fetchFilings()
    await get().fetchFiling(id)
  },

  claimFilingReview: async (id) => {
    await api.filings.claimReview(id)
    await get().fetchFilings()
    await get().fetchFiling(id)
  },

  releaseFilingReview: async (id) => {
    await api.filings.releaseReview(id)
    await get().fetchFilings()
    await get().fetchFiling(id)
  },

  cpaApproveFiling: async (id) => {
    await api.filings.cpaApprove(id)
    await get().fetchFilings()
    await get().fetchFiling(id)
  },

  cpaRejectFiling: async (id, reason) => {
    await api.filings.cpaReject(id, reason)
    await get().fetchFilings()
    await get().fetchFiling(id)
  },

  startIntake: async (id) => {
    await api.agents.startIntake(id)
    await get().fetchFilings()
    await get().fetchFiling(id)
  },

  runPrefill: async (id) => {
    await api.agents.runPrefill(id)
    await get().fetchFilings()
    await get().fetchFiling(id)
  },

  runAuditRisk: async (id) => {
    const result = await api.agents.runAuditRisk(id)
    return result
  },

  pauseFiling: async (id) => {
    await api.filings.pause(id)
    await get().fetchFilings()
    await get().fetchFiling(id)
  },

  escalateToCpa: async (id) => {
    await api.filings.escalateToCpa(id)
    await get().fetchFilings()
    await get().fetchFiling(id)
  },

  extractDocument: async (documentId) => {
    await api.agents.extractDocument(documentId)
    await get().fetchDocuments()
  },

  createEntity: async (data) => {
    await api.entities.create(data)
    await get().fetchEntities()
  },

  updateEntity: async (id, data) => {
    await api.entities.update(id, data)
    await get().fetchEntities()
  },

  deleteEntity: async (id) => {
    await api.entities.delete(id)
    await get().fetchEntities()
  },

  resolveApproval: async (id, status, reason) => {
    await api.approvals.resolve(id, status, reason)
    await get().fetchApprovals()
    await get().fetchFilings()
  },

  escalateApproval: async (id) => {
    await api.approvals.escalate(id)
    await get().fetchApprovals()
  },

  uploadDocument: async (file, filingId) => {
    await api.documents.upload(file, filingId)
    await get().fetchDocuments()
  },

  markDocumentReviewed: async (id) => {
    await api.documents.markReviewed(id)
    await get().fetchDocuments()
  },

  createCpa: async (data) => {
    await api.admin.createCpa(data)
    // Invite has been sent — no immediate user record to refresh
  },

  assignCpaOrganization: async (id, organizationId) => {
    await api.admin.assignCpaOrganization(id, organizationId)
    await get().fetchCpas()
  },

  createTemplate: async (data) => {
    await api.members.createTemplate(data)
    await get().fetchTemplates()
  },

  getTemplateRecommendation: async (useCase) => {
    const result = await api.members.getTemplateRecommendation(useCase) as { recommendedName: string; template: Template | null }
    return result
  },
}))
