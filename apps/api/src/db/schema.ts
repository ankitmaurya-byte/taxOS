import { pgTable, text, integer, real, boolean, jsonb, timestamp } from 'drizzle-orm/pg-core'

export const userRoles = ['founder', 'team_member', 'cpa', 'admin'] as const
export const userStatuses = ['pending_email_verification', 'pending_onboarding', 'pending_admin_review', 'active', 'rejected', 'suspended'] as const
export const templateScopes = ['global', 'organization'] as const
export const inviteStatuses = ['pending', 'accepted', 'expired', 'revoked'] as const
export const reviewLockStatuses = ['active', 'released', 'completed'] as const
export const founderApplicationStatuses = ['pending', 'approved', 'rejected'] as const

const ts = (name: string) => timestamp(name, { mode: 'string', withTimezone: true })

// ─── Organizations ────────────────────────────────────
export const organizations = pgTable('organizations', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  legalName: text('legal_name'),
  registrationNumber: text('registration_number'),
  incorporationCountry: text('incorporation_country'),
  incorporationState: text('incorporation_state'),
  incorporationDate: text('incorporation_date'),
  plan: text('plan', { enum: ['free', 'starter', 'pro'] }).default('free').notNull(),
  createdAt: ts('created_at').defaultNow().notNull(),
})

// ─── Users ────────────────────────────────────────────
export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: text('org_id').references(() => organizations.id),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  role: text('role', { enum: userRoles }).default('founder').notNull(),
  status: text('status', { enum: userStatuses }).default('pending_admin_review').notNull(),
  isVerified: boolean('is_verified').default(false).notNull(),
  invitedByUserId: text('invited_by_user_id'),
  approvedByUserId: text('approved_by_user_id'),
  approvalReviewedAt: ts('approval_reviewed_at'),
  lastLoginAt: ts('last_login_at'),
  createdAt: ts('created_at').defaultNow().notNull(),
})

export const founderApplications = pgTable('founder_applications', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').references(() => users.id).notNull(),
  organizationId: text('organization_id').references(() => organizations.id).notNull(),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  organizationName: text('organization_name').notNull(),
  brandName: text('brand_name'),
  entityType: text('entity_type'),
  legalCompanyName: text('legal_company_name'),
  registrationNumber: text('registration_number'),
  country: text('country'),
  stateOrJurisdiction: text('state_or_jurisdiction'),
  incorporationDate: text('incorporation_date'),
  certificateFileName: text('certificate_file_name'),
  certificateStorageUrl: text('certificate_storage_url'),
  parsedCertificateData: jsonb('parsed_certificate_data').$type<Record<string, unknown> | null>(),
  emailVerifiedAt: ts('email_verified_at'),
  onboardingCompletedAt: ts('onboarding_completed_at'),
  status: text('status', { enum: founderApplicationStatuses }).default('pending').notNull(),
  reviewNotes: text('review_notes'),
  reviewedByUserId: text('reviewed_by_user_id').references(() => users.id),
  reviewedAt: ts('reviewed_at'),
  approvedUserId: text('approved_user_id').references(() => users.id),
  createdAt: ts('created_at').defaultNow().notNull(),
})

export const roleTemplates = pgTable('role_templates', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  scope: text('scope', { enum: templateScopes }).default('organization').notNull(),
  organizationId: text('organization_id').references(() => organizations.id),
  createdByUserId: text('created_by_user_id').references(() => users.id).notNull(),
  permissions: jsonb('permissions').$type<Record<string, boolean>>().default({}),
  isSystemTemplate: boolean('is_system_template').default(false).notNull(),
  createdAt: ts('created_at').defaultNow().notNull(),
  updatedAt: ts('updated_at').defaultNow().notNull(),
})

export const permissions = pgTable('permissions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').references(() => users.id).notNull(),
  organizationId: text('organization_id').references(() => organizations.id).notNull(),
  templateId: text('template_id').references(() => roleTemplates.id),
  permissions: jsonb('permissions').$type<Record<string, boolean>>().default({}).notNull(),
  createdByUserId: text('created_by_user_id').references(() => users.id).notNull(),
  updatedAt: ts('updated_at').defaultNow().notNull(),
  createdAt: ts('created_at').defaultNow().notNull(),
})

export const invites = pgTable('invites', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text('email').notNull(),
  role: text('role', { enum: userRoles }).default('team_member').notNull(),
  organizationId: text('organization_id').references(() => organizations.id).notNull(),
  invitedByUserId: text('invited_by_user_id').references(() => users.id).notNull(),
  templateId: text('template_id').references(() => roleTemplates.id),
  permissions: jsonb('permissions').$type<Record<string, boolean>>().default({}),
  token: text('token').unique().notNull(),
  status: text('status', { enum: inviteStatuses }).default('pending').notNull(),
  expiresAt: ts('expires_at').notNull(),
  acceptedAt: ts('accepted_at'),
  createdAt: ts('created_at').defaultNow().notNull(),
})

export const emailVerificationTokens = pgTable('email_verification_tokens', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').references(() => users.id),
  inviteId: text('invite_id').references(() => invites.id),
  token: text('token').unique().notNull(),
  expiresAt: ts('expires_at').notNull(),
  usedAt: ts('used_at'),
  createdAt: ts('created_at').defaultNow().notNull(),
})

export const cpaAssignments = pgTable('cpa_assignments', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').references(() => users.id).notNull(),
  organizationId: text('organization_id').references(() => organizations.id).notNull(),
  createdByUserId: text('created_by_user_id').references(() => users.id).notNull(),
  createdAt: ts('created_at').defaultNow().notNull(),
})

export const filingReviewLocks = pgTable('filing_review_locks', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  filingId: text('filing_id').references(() => filings.id).notNull(),
  cpaUserId: text('cpa_user_id').references(() => users.id).notNull(),
  status: text('status', { enum: reviewLockStatuses }).default('active').notNull(),
  releasedAt: ts('released_at'),
  createdAt: ts('created_at').defaultNow().notNull(),
})

// ─── Entities ─────────────────────────────────────────
export const entities = pgTable('entities', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: text('org_id').references(() => organizations.id).notNull(),
  legalName: text('legal_name').notNull(),
  entityType: text('entity_type', {
    enum: ['C-Corp', 'LLC', 'S-Corp', 'Pvt-Ltd']
  }).notNull(),
  stateOfIncorporation: text('state_of_incorporation').notNull(),
  ein: text('ein'),
  majorBusinessActivity: text('major_business_activity')
    .notNull()
    .default('Software Development'),
  fiscalYearEnd: text('fiscal_year_end').default('12-31').notNull(),
  foreignSubsidiaries: jsonb('foreign_subsidiaries').$type<string[]>().default([]),
  directors: jsonb('directors').$type<Record<string, unknown>[]>().default([]),
  officers: jsonb('officers').$type<Record<string, unknown>[]>().default([]),
  shareholders: jsonb('shareholders').$type<Record<string, unknown>[]>().default([]),
  capTable: jsonb('cap_table').$type<Record<string, unknown>[]>().default([]),
  sensitiveData: jsonb('sensitive_data').$type<Record<string, unknown>[]>().default([]),
  country: text('country').default('US').notNull(),
  status: text('status', {
    enum: ['active', 'inactive', 'dissolved']
  }).default('active').notNull(),
  createdAt: ts('created_at').defaultNow().notNull(),
})

// ─── Deadlines ────────────────────────────────────────
export const deadlines = pgTable('deadlines', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  entityId: text('entity_id').references(() => entities.id).notNull(),
  formType: text('form_type').notNull(),
  formName: text('form_name').notNull(),
  dueDate: text('due_date').notNull(),
  status: text('status', { enum: ['upcoming', 'overdue', 'filed', 'extended', 'skipped'] }).default('upcoming').notNull(),
  aiPredicted: boolean('ai_predicted').default(true),
  urgencyScore: integer('urgency_score').default(0),
  description: text('description'),
  completedAt: ts('completed_at'),
  completedById: text('completed_by_id').references(() => users.id),
  skipReason: text('skip_reason'),
  snoozedUntil: ts('snoozed_until'),
  note: text('note'),
  createdAt: ts('created_at').defaultNow().notNull(),
})

// ─── Filings ──────────────────────────────────────────
export const filings = pgTable('filings', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  entityId: text('entity_id').references(() => entities.id).notNull(),
  deadlineId: text('deadline_id').references(() => deadlines.id),
  orgId: text('org_id').references(() => organizations.id).notNull(),
  formType: text('form_type').notNull(),
  formName: text('form_name').notNull(),
  status: text('status', {
    enum: ['intake', 'ai_prep', 'cpa_review', 'founder_approval', 'submitted', 'archived']
  }).default('intake').notNull(),
  aiConfidenceScore: real('ai_confidence_score'),
  cpaReviewSkipped: boolean('cpa_review_skipped').default(false).notNull(),
  paused: boolean('paused').default(false).notNull(),
  stopped: boolean('stopped').default(false).notNull(),
  cpaAssignedId: text('cpa_assigned_id').references(() => users.id),
  filingData: jsonb('filing_data').$type<Record<string, unknown>>().default({}),
  aiSummary: text('ai_summary'),
  aiReasoning: text('ai_reasoning'),
  founderApprovedAt: ts('founder_approved_at'),
  submittedAt: ts('submitted_at'),
  taxYear: integer('tax_year'),
  createdAt: ts('created_at').defaultNow().notNull(),
  updatedAt: ts('updated_at').defaultNow().notNull(),
})

// ─── Vaults ──────────────────────────────────────────
export const vaults = pgTable('vaults', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: text('org_id').references(() => organizations.id).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  createdById: text('created_by_id').references(() => users.id).notNull(),
  createdAt: ts('created_at').defaultNow().notNull(),
  updatedAt: ts('updated_at').defaultNow().notNull(),
})

// ─── Folders (within vaults) ─────────────────────────
export const folders = pgTable('folders', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  vaultId: text('vault_id').references(() => vaults.id).notNull(),
  parentId: text('parent_id'),
  name: text('name').notNull(),
  createdById: text('created_by_id').references(() => users.id).notNull(),
  createdAt: ts('created_at').defaultNow().notNull(),
})

// ─── Documents ────────────────────────────────────────
export const documents = pgTable('documents', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  filingId: text('filing_id').references(() => filings.id),
  orgId: text('org_id').references(() => organizations.id).notNull(),
  vaultId: text('vault_id').references(() => vaults.id),
  folderId: text('folder_id').references(() => folders.id),
  fileName: text('file_name').notNull(),
  storageUrl: text('storage_url'),
  cloudinaryPublicId: text('cloudinary_public_id'),
  cloudinaryResourceType: text('cloudinary_resource_type'),
  fileSize: integer('file_size'),
  mimeType: text('mime_type').notNull(),
  extractedData: jsonb('extracted_data').$type<Record<string, unknown>>(),
  aiTags: jsonb('ai_tags').$type<string[]>().default([]),
  confidenceScore: real('confidence_score'),
  uploadStatus: text('upload_status').default('pending'),
  extractionStatus: text('extraction_status').default('pending'),
  uploadError: text('upload_error'),
  extractionError: text('extraction_error'),
  reviewedByHuman: boolean('reviewed_by_human').default(false),
  uploadedById: text('uploaded_by_id').references(() => users.id).notNull(),
  createdAt: ts('created_at').defaultNow().notNull(),
})

// ─── Document Contexts (extracted text for AI) ───────
export const documentContexts = pgTable('document_contexts', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  documentId: text('document_id').references(() => documents.id).notNull(),
  orgId: text('org_id').references(() => organizations.id).notNull(),
  vaultId: text('vault_id').references(() => vaults.id),
  rawText: text('raw_text'),
  summary: text('summary'),
  keyEntities: jsonb('key_entities').$type<string[]>().default([]),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  chunkIndex: integer('chunk_index').default(0),
  createdAt: ts('created_at').defaultNow().notNull(),
})

// ─── Filing Document Requirements ─────────────────────
export const filingDocumentRequirements = pgTable('filing_document_requirements', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  filingId: text('filing_id').references(() => filings.id).notNull(),
  slotKey: text('slot_key').notNull(),
  label: text('label').notNull(),
  description: text('description'),
  required: boolean('required').default(true).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  documentId: text('document_id').references(() => documents.id),
  skipped: boolean('skipped').default(false).notNull(),
  skipReason: text('skip_reason'),
  viewedByCpa: boolean('viewed_by_cpa').default(false).notNull(),
  viewedAt: ts('viewed_at'),
  viewedByUserId: text('viewed_by_user_id').references(() => users.id),
  createdAt: ts('created_at').defaultNow().notNull(),
  updatedAt: ts('updated_at').defaultNow().notNull(),
})

// ─── Approval Queue ───────────────────────────────────
export const approvalQueue = pgTable('approval_queue', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: text('org_id').references(() => organizations.id).notNull(),
  filingId: text('filing_id').references(() => filings.id).notNull(),
  queueType: text('queue_type', { enum: ['founder', 'cpa'] }).notNull(),
  status: text('status', { enum: ['pending', 'approved', 'rejected', 'escalated'] }).default('pending').notNull(),
  summary: text('summary').notNull(),
  aiRecommendation: text('ai_recommendation'),
  rejectionReason: text('rejection_reason'),
  resolvedAt: ts('resolved_at'),
  resolvedById: text('resolved_by_id').references(() => users.id),
  createdAt: ts('created_at').defaultNow().notNull(),
})

// ─── Audit Log (immutable) ────────────────────────────
export const auditLog = pgTable('audit_log', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: text('org_id').references(() => organizations.id).notNull(),
  filingId: text('filing_id').references(() => filings.id),
  actorType: text('actor_type', { enum: ['ai', 'cpa', 'founder', 'system'] }).notNull(),
  actorId: text('actor_id'),
  action: text('action').notNull(),
  reasoning: text('reasoning'),
  inputs: jsonb('inputs').$type<Record<string, unknown>>(),
  outputs: jsonb('outputs').$type<Record<string, unknown>>(),
  modelVersion: text('model_version'),
  confidenceScore: real('confidence_score'),
  createdAt: ts('created_at').defaultNow().notNull(),
})

// ─── Agent Conversations ──────────────────────────────
export const agentConversations = pgTable('agent_conversations', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  filingId: text('filing_id').references(() => filings.id),
  orgId: text('org_id').references(() => organizations.id).notNull(),
  agentType: text('agent_type').notNull(),
  messages: jsonb('messages').$type<Array<{ role: string; content: string; timestamp: string }>>().default([]),
  status: text('status', { enum: ['active', 'completed', 'escalated'] }).default('active').notNull(),
  createdAt: ts('created_at').defaultNow().notNull(),
  updatedAt: ts('updated_at').defaultNow().notNull(),
})

// ─── AI Chat (Inkle AI) Conversations per user ────────
export const aiChatConversations = pgTable('ai_chat_conversations', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').references(() => users.id).notNull(),
  orgId: text('org_id').references(() => organizations.id),
  title: text('title').notNull().default('Untitled'),
  messages: jsonb('messages').$type<Array<{ role: string; content: string; timestamp: string }>>().default([]).notNull(),
  createdAt: ts('created_at').defaultNow().notNull(),
  updatedAt: ts('updated_at').defaultNow().notNull(),
})

// ─── CPA Notifications (escalation round-robin) ───────
export const cpaNotifications = pgTable('cpa_notifications', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  filingId: text('filing_id').references(() => filings.id).notNull(),
  cpaUserId: text('cpa_user_id').references(() => users.id).notNull(),
  status: text('status', { enum: ['pending', 'approved', 'dismissed'] }).default('pending').notNull(),
  notifiedAt: ts('notified_at').defaultNow().notNull(),
  respondedAt: ts('responded_at'),
  createdAt: ts('created_at').defaultNow().notNull(),
})

// ─── CPA Rejections (for top-match logic) ─────────────
export const cpaRejections = pgTable('cpa_rejections', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  filingId: text('filing_id').references(() => filings.id).notNull(),
  cpaUserId: text('cpa_user_id').references(() => users.id).notNull(),
  reason: text('reason').notNull(),
  createdAt: ts('created_at').defaultNow().notNull(),
})

// ─── Organization Chat ────────────────────────────────
export const orgChatMessages = pgTable('org_chat_messages', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: text('org_id').references(() => organizations.id).notNull(),
  senderId: text('sender_id').references(() => users.id).notNull(),
  message: text('message').notNull(),
  createdAt: ts('created_at').defaultNow().notNull(),
})

// ─── All-Founder Cross-Org Chat ───────────────────────
export const founderChatMessages = pgTable('founder_chat_messages', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  senderId: text('sender_id').references(() => users.id).notNull(),
  message: text('message').notNull(),
  createdAt: ts('created_at').defaultNow().notNull(),
})

// ─── CPA-Only Chat ────────────────────────────────────
export const cpaChatMessages = pgTable('cpa_chat_messages', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  senderId: text('sender_id').references(() => users.id).notNull(),
  message: text('message').notNull(),
  createdAt: ts('created_at').defaultNow().notNull(),
})
