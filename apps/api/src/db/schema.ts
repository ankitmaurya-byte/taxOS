import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const userRoles = ['founder', 'team_member', 'cpa', 'admin'] as const
export const userStatuses = ['pending_email_verification', 'pending_onboarding', 'pending_admin_review', 'active', 'rejected', 'suspended'] as const
export const templateScopes = ['global', 'organization'] as const
export const inviteStatuses = ['pending', 'accepted', 'expired', 'revoked'] as const
export const reviewLockStatuses = ['active', 'released', 'completed'] as const
export const founderApplicationStatuses = ['pending', 'approved', 'rejected'] as const

// ─── Organizations ────────────────────────────────────
export const organizations = sqliteTable('organizations', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  legalName: text('legal_name'),
  registrationNumber: text('registration_number'),
  incorporationCountry: text('incorporation_country'),
  incorporationState: text('incorporation_state'),
  incorporationDate: text('incorporation_date'),
  plan: text('plan', { enum: ['free', 'starter', 'pro'] }).default('free').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
})

// ─── Users ────────────────────────────────────────────
export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: text('org_id').references(() => organizations.id),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  role: text('role', { enum: userRoles }).default('founder').notNull(),
  status: text('status', { enum: userStatuses }).default('pending_admin_review').notNull(),
  isVerified: integer('is_verified', { mode: 'boolean' }).default(false).notNull(),
  invitedByUserId: text('invited_by_user_id'),
  approvedByUserId: text('approved_by_user_id'),
  approvalReviewedAt: text('approval_reviewed_at'),
  lastLoginAt: text('last_login_at'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
})

export const founderApplications = sqliteTable('founder_applications', {
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
  parsedCertificateData: text('parsed_certificate_data', { mode: 'json' }).$type<Record<string, unknown> | null>(),
  emailVerifiedAt: text('email_verified_at'),
  onboardingCompletedAt: text('onboarding_completed_at'),
  status: text('status', { enum: founderApplicationStatuses }).default('pending').notNull(),
  reviewNotes: text('review_notes'),
  reviewedByUserId: text('reviewed_by_user_id').references(() => users.id),
  reviewedAt: text('reviewed_at'),
  approvedUserId: text('approved_user_id').references(() => users.id),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
})

export const roleTemplates = sqliteTable('role_templates', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  scope: text('scope', { enum: templateScopes }).default('organization').notNull(),
  organizationId: text('organization_id').references(() => organizations.id),
  createdByUserId: text('created_by_user_id').references(() => users.id).notNull(),
  permissions: text('permissions', { mode: 'json' }).$type<Record<string, boolean>>().default({}),
  isSystemTemplate: integer('is_system_template', { mode: 'boolean' }).default(false).notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
})

export const permissions = sqliteTable('permissions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').references(() => users.id).notNull(),
  organizationId: text('organization_id').references(() => organizations.id).notNull(),
  templateId: text('template_id').references(() => roleTemplates.id),
  permissions: text('permissions', { mode: 'json' }).$type<Record<string, boolean>>().default({}).notNull(),
  createdByUserId: text('created_by_user_id').references(() => users.id).notNull(),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
})

export const invites = sqliteTable('invites', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text('email').notNull(),
  role: text('role', { enum: userRoles }).default('team_member').notNull(),
  organizationId: text('organization_id').references(() => organizations.id).notNull(),
  invitedByUserId: text('invited_by_user_id').references(() => users.id).notNull(),
  templateId: text('template_id').references(() => roleTemplates.id),
  permissions: text('permissions', { mode: 'json' }).$type<Record<string, boolean>>().default({}),
  token: text('token').unique().notNull(),
  status: text('status', { enum: inviteStatuses }).default('pending').notNull(),
  expiresAt: text('expires_at').notNull(),
  acceptedAt: text('accepted_at'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
})

export const emailVerificationTokens = sqliteTable('email_verification_tokens', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').references(() => users.id),
  inviteId: text('invite_id').references(() => invites.id),
  token: text('token').unique().notNull(),
  expiresAt: text('expires_at').notNull(),
  usedAt: text('used_at'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
})

export const cpaAssignments = sqliteTable('cpa_assignments', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').references(() => users.id).notNull(),
  organizationId: text('organization_id').references(() => organizations.id).notNull(),
  createdByUserId: text('created_by_user_id').references(() => users.id).notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
})

export const filingReviewLocks = sqliteTable('filing_review_locks', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  filingId: text('filing_id').references(() => filings.id).notNull(),
  cpaUserId: text('cpa_user_id').references(() => users.id).notNull(),
  status: text('status', { enum: reviewLockStatuses }).default('active').notNull(),
  releasedAt: text('released_at'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
})

// ─── Entities ─────────────────────────────────────────
export const entities = sqliteTable('entities', {
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
  foreignSubsidiaries: text('foreign_subsidiaries', { mode: 'json' })
    .$type<string[]>()
    .default([]),
  directors: text('directors', { mode: 'json' }).$type<Record<string, unknown>[]>().default([]),
  officers: text('officers', { mode: 'json' }).$type<Record<string, unknown>[]>().default([]),
  shareholders: text('shareholders', { mode: 'json' }).$type<Record<string, unknown>[]>().default([]),
  capTable: text('cap_table', { mode: 'json' }).$type<Record<string, unknown>[]>().default([]),
  sensitiveData: text('sensitive_data', { mode: 'json' }).$type<Record<string, unknown>[]>().default([]),
  country: text('country').default('US').notNull(),
  status: text('status', {
    enum: ['active', 'inactive', 'dissolved']
  }).default('active').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
})
// ─── Deadlines ────────────────────────────────────────
export const deadlines = sqliteTable('deadlines', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  entityId: text('entity_id').references(() => entities.id).notNull(),
  formType: text('form_type').notNull(),
  formName: text('form_name').notNull(),
  dueDate: text('due_date').notNull(),
  status: text('status', { enum: ['upcoming', 'overdue', 'filed', 'extended'] }).default('upcoming').notNull(),
  aiPredicted: integer('ai_predicted', { mode: 'boolean' }).default(true),
  urgencyScore: integer('urgency_score').default(0),
  description: text('description'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
})

// ─── Filings ──────────────────────────────────────────
export const filings = sqliteTable('filings', {
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
  cpaReviewSkipped: integer('cpa_review_skipped', { mode: 'boolean' }).default(false).notNull(),
  paused: integer('paused', { mode: 'boolean' }).default(false).notNull(),
  stopped: integer('stopped', { mode: 'boolean' }).default(false).notNull(),
  cpaAssignedId: text('cpa_assigned_id').references(() => users.id),
  filingData: text('filing_data', { mode: 'json' }).$type<Record<string, unknown>>().default({}),
  aiSummary: text('ai_summary'),
  aiReasoning: text('ai_reasoning'),
  founderApprovedAt: text('founder_approved_at'),
  submittedAt: text('submitted_at'),
  taxYear: integer('tax_year'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
})

// ─── Vaults ──────────────────────────────────────────
export const vaults = sqliteTable('vaults', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: text('org_id').references(() => organizations.id).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  createdById: text('created_by_id').references(() => users.id).notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
})

// ─── Folders (within vaults) ─────────────────────────
export const folders = sqliteTable('folders', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  vaultId: text('vault_id').references(() => vaults.id).notNull(),
  parentId: text('parent_id'),
  name: text('name').notNull(),
  createdById: text('created_by_id').references(() => users.id).notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
})

// ─── Documents ────────────────────────────────────────
export const documents = sqliteTable('documents', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  filingId: text('filing_id').references(() => filings.id),
  orgId: text('org_id').references(() => organizations.id).notNull(),
  vaultId: text('vault_id').references(() => vaults.id),
  folderId: text('folder_id').references(() => folders.id),
  fileName: text('file_name').notNull(),
  // storageUrl is the Cloudinary secure_url when uploaded; null when the file
  // was too large (> CLOUDINARY_SIZE_LIMIT) and only exists as extracted context.
  storageUrl: text('storage_url'),
  cloudinaryPublicId: text('cloudinary_public_id'),
  cloudinaryResourceType: text('cloudinary_resource_type'),
  fileSize: integer('file_size'),
  mimeType: text('mime_type').notNull(),
  extractedData: text('extracted_data', { mode: 'json' }).$type<Record<string, unknown>>(),
  aiTags: text('ai_tags', { mode: 'json' }).$type<string[]>().default([]),
  confidenceScore: real('confidence_score'),
  // 'pending' | 'uploading' | 'uploaded' | 'skipped' | 'failed'
  uploadStatus: text('upload_status').default('pending'),
  // 'pending' | 'extracting' | 'processing' | 'done' | 'failed'
  extractionStatus: text('extraction_status').default('pending'),
  uploadError: text('upload_error'),
  extractionError: text('extraction_error'),
  reviewedByHuman: integer('reviewed_by_human', { mode: 'boolean' }).default(false),
  uploadedById: text('uploaded_by_id').references(() => users.id).notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
})

// ─── Document Contexts (extracted text for AI) ───────
export const documentContexts = sqliteTable('document_contexts', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  documentId: text('document_id').references(() => documents.id).notNull(),
  orgId: text('org_id').references(() => organizations.id).notNull(),
  vaultId: text('vault_id').references(() => vaults.id),
  rawText: text('raw_text'),
  summary: text('summary'),
  keyEntities: text('key_entities', { mode: 'json' }).$type<string[]>().default([]),
  metadata: text('metadata', { mode: 'json' }).$type<Record<string, unknown>>().default({}),
  chunkIndex: integer('chunk_index').default(0),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
})

// ─── Approval Queue ───────────────────────────────────
export const approvalQueue = sqliteTable('approval_queue', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: text('org_id').references(() => organizations.id).notNull(),
  filingId: text('filing_id').references(() => filings.id).notNull(),
  queueType: text('queue_type', { enum: ['founder', 'cpa'] }).notNull(),
  status: text('status', { enum: ['pending', 'approved', 'rejected', 'escalated'] }).default('pending').notNull(),
  summary: text('summary').notNull(),
  aiRecommendation: text('ai_recommendation'),
  rejectionReason: text('rejection_reason'),
  resolvedAt: text('resolved_at'),
  resolvedById: text('resolved_by_id').references(() => users.id),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
})

// ─── Audit Log (immutable) ────────────────────────────
export const auditLog = sqliteTable('audit_log', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: text('org_id').references(() => organizations.id).notNull(),
  filingId: text('filing_id').references(() => filings.id),
  actorType: text('actor_type', { enum: ['ai', 'cpa', 'founder', 'system'] }).notNull(),
  actorId: text('actor_id'),
  action: text('action').notNull(),
  reasoning: text('reasoning'),
  inputs: text('inputs', { mode: 'json' }).$type<Record<string, unknown>>(),
  outputs: text('outputs', { mode: 'json' }).$type<Record<string, unknown>>(),
  modelVersion: text('model_version'),
  confidenceScore: real('confidence_score'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
})

// ─── Agent Conversations ──────────────────────────────
export const agentConversations = sqliteTable('agent_conversations', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  filingId: text('filing_id').references(() => filings.id),
  orgId: text('org_id').references(() => organizations.id).notNull(),
  agentType: text('agent_type').notNull(),
  messages: text('messages', { mode: 'json' }).$type<Array<{ role: string; content: string; timestamp: string }>>().default([]),
  status: text('status', { enum: ['active', 'completed', 'escalated'] }).default('active').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
})

// ─── AI Chat (Inkle AI) Conversations per user ────────
export const aiChatConversations = sqliteTable('ai_chat_conversations', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').references(() => users.id).notNull(),
  orgId: text('org_id').references(() => organizations.id),
  title: text('title').notNull().default('Untitled'),
  messages: text('messages', { mode: 'json' }).$type<Array<{ role: string; content: string; timestamp: string }>>().default([]).notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
})

// ─── CPA Notifications (escalation round-robin) ───────
export const cpaNotifications = sqliteTable('cpa_notifications', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  filingId: text('filing_id').references(() => filings.id).notNull(),
  cpaUserId: text('cpa_user_id').references(() => users.id).notNull(),
  status: text('status', { enum: ['pending', 'approved', 'dismissed'] }).default('pending').notNull(),
  notifiedAt: text('notified_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  respondedAt: text('responded_at'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
})

// ─── CPA Rejections (for top-match logic) ─────────────
export const cpaRejections = sqliteTable('cpa_rejections', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  filingId: text('filing_id').references(() => filings.id).notNull(),
  cpaUserId: text('cpa_user_id').references(() => users.id).notNull(),
  reason: text('reason').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
})

// ─── Organization Chat ────────────────────────────────
export const orgChatMessages = sqliteTable('org_chat_messages', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: text('org_id').references(() => organizations.id).notNull(),
  senderId: text('sender_id').references(() => users.id).notNull(),
  message: text('message').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
})

// ─── All-Founder Cross-Org Chat ───────────────────────
export const founderChatMessages = sqliteTable('founder_chat_messages', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  senderId: text('sender_id').references(() => users.id).notNull(),
  message: text('message').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
})

// ─── CPA-Only Chat ────────────────────────────────────
export const cpaChatMessages = sqliteTable('cpa_chat_messages', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  senderId: text('sender_id').references(() => users.id).notNull(),
  message: text('message').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
})
