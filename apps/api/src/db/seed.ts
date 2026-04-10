import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import bcrypt from 'bcrypt'
import path from 'path'
import * as schema from './schema'

const dbPath = process.env.DATABASE_URL || path.join(__dirname, '../../taxos.db')
const sqlite = new Database(dbPath)
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = OFF')

const db = drizzle(sqlite, { schema })

async function seed() {
  console.log('Seeding database...')

  sqlite.exec(`
    DROP TABLE IF EXISTS filing_review_locks;
    DROP TABLE IF EXISTS cpa_assignments;
    DROP TABLE IF EXISTS email_verification_tokens;
    DROP TABLE IF EXISTS invites;
    DROP TABLE IF EXISTS permissions;
    DROP TABLE IF EXISTS role_templates;
    DROP TABLE IF EXISTS founder_applications;
    DROP TABLE IF EXISTS agent_conversations;
    DROP TABLE IF EXISTS audit_log;
    DROP TABLE IF EXISTS approval_queue;
    DROP TABLE IF EXISTS documents;
    DROP TABLE IF EXISTS filings;
    DROP TABLE IF EXISTS deadlines;
    DROP TABLE IF EXISTS entities;
    DROP TABLE IF EXISTS users;
    DROP TABLE IF EXISTS organizations;

    CREATE TABLE organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      legal_name TEXT,
      registration_number TEXT,
      incorporation_country TEXT,
      incorporation_state TEXT,
      incorporation_date TEXT,
      plan TEXT NOT NULL DEFAULT 'free',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      org_id TEXT REFERENCES organizations(id),
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'founder',
      status TEXT NOT NULL DEFAULT 'pending_email_verification',
      is_verified INTEGER NOT NULL DEFAULT 0,
      invited_by_user_id TEXT REFERENCES users(id),
      approved_by_user_id TEXT REFERENCES users(id),
      approval_reviewed_at TEXT,
      last_login_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE founder_applications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      organization_id TEXT NOT NULL REFERENCES organizations(id),
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      organization_name TEXT NOT NULL,
      brand_name TEXT,
      entity_type TEXT,
      legal_company_name TEXT,
      registration_number TEXT,
      country TEXT,
      state_or_jurisdiction TEXT,
      incorporation_date TEXT,
      certificate_file_name TEXT,
      certificate_storage_url TEXT,
      parsed_certificate_data TEXT,
      email_verified_at TEXT,
      onboarding_completed_at TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      review_notes TEXT,
      reviewed_by_user_id TEXT REFERENCES users(id),
      reviewed_at TEXT,
      approved_user_id TEXT REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE role_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      scope TEXT NOT NULL DEFAULT 'organization',
      organization_id TEXT REFERENCES organizations(id),
      created_by_user_id TEXT NOT NULL REFERENCES users(id),
      permissions TEXT DEFAULT '{}',
      is_system_template INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE permissions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      organization_id TEXT NOT NULL REFERENCES organizations(id),
      template_id TEXT REFERENCES role_templates(id),
      permissions TEXT NOT NULL DEFAULT '{}',
      created_by_user_id TEXT NOT NULL REFERENCES users(id),
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE invites (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'team_member',
      organization_id TEXT NOT NULL REFERENCES organizations(id),
      invited_by_user_id TEXT NOT NULL REFERENCES users(id),
      template_id TEXT REFERENCES role_templates(id),
      permissions TEXT DEFAULT '{}',
      token TEXT UNIQUE NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      expires_at TEXT NOT NULL,
      accepted_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE email_verification_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      invite_id TEXT REFERENCES invites(id),
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE cpa_assignments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      organization_id TEXT NOT NULL REFERENCES organizations(id),
      created_by_user_id TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE entities (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES organizations(id),
      legal_name TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      state_of_incorporation TEXT NOT NULL,
      ein TEXT,
      major_business_activity TEXT NOT NULL DEFAULT 'Software Development',
      fiscal_year_end TEXT NOT NULL DEFAULT '12-31',
      foreign_subsidiaries TEXT DEFAULT '[]',
      country TEXT NOT NULL DEFAULT 'US',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE deadlines (
      id TEXT PRIMARY KEY,
      entity_id TEXT NOT NULL REFERENCES entities(id),
      form_type TEXT NOT NULL,
      form_name TEXT NOT NULL,
      due_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'upcoming',
      ai_predicted INTEGER DEFAULT 1,
      urgency_score INTEGER DEFAULT 0,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE filings (
      id TEXT PRIMARY KEY,
      entity_id TEXT NOT NULL REFERENCES entities(id),
      deadline_id TEXT REFERENCES deadlines(id),
      org_id TEXT NOT NULL REFERENCES organizations(id),
      form_type TEXT NOT NULL,
      form_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'intake',
      ai_confidence_score REAL,
      cpa_assigned_id TEXT REFERENCES users(id),
      filing_data TEXT DEFAULT '{}',
      ai_summary TEXT,
      ai_reasoning TEXT,
      founder_approved_at TEXT,
      submitted_at TEXT,
      tax_year INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE documents (
      id TEXT PRIMARY KEY,
      filing_id TEXT REFERENCES filings(id),
      org_id TEXT NOT NULL REFERENCES organizations(id),
      file_name TEXT NOT NULL,
      storage_url TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      extracted_data TEXT,
      ai_tags TEXT DEFAULT '[]',
      confidence_score REAL,
      reviewed_by_human INTEGER DEFAULT 0,
      uploaded_by_id TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE approval_queue (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES organizations(id),
      filing_id TEXT NOT NULL REFERENCES filings(id),
      queue_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      summary TEXT NOT NULL,
      ai_recommendation TEXT,
      rejection_reason TEXT,
      resolved_at TEXT,
      resolved_by_id TEXT REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE audit_log (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES organizations(id),
      filing_id TEXT REFERENCES filings(id),
      actor_type TEXT NOT NULL,
      actor_id TEXT,
      action TEXT NOT NULL,
      reasoning TEXT,
      inputs TEXT,
      outputs TEXT,
      model_version TEXT,
      confidence_score REAL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE agent_conversations (
      id TEXT PRIMARY KEY,
      filing_id TEXT REFERENCES filings(id),
      org_id TEXT NOT NULL REFERENCES organizations(id),
      agent_type TEXT NOT NULL,
      messages TEXT DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE filing_review_locks (
      id TEXT PRIMARY KEY,
      filing_id TEXT NOT NULL REFERENCES filings(id),
      cpa_user_id TEXT NOT NULL REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'active',
      released_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `)

  sqlite.pragma('foreign_keys = ON')

  const adminPasswordHash = await bcrypt.hash('admin1234', 10)
  const userPasswordHash = await bcrypt.hash('demo1234', 10)

  const adminOrg = db.insert(schema.organizations).values({
    id: 'org-admin-001',
    name: 'TaxOS Admin',
    legalName: 'TaxOS Admin',
    plan: 'pro',
  }).returning().get()

  const founderOrg = db.insert(schema.organizations).values({
    id: 'org-demo-001',
    name: 'Acme Inc (Demo)',
    legalName: 'Acme Incorporated',
    registrationNumber: 'ACME-2024-001',
    incorporationCountry: 'US',
    incorporationState: 'Delaware',
    incorporationDate: '2024-01-15',
    plan: 'pro',
  }).returning().get()

  const admin = db.insert(schema.users).values({
    id: 'user-admin-001',
    orgId: adminOrg.id,
    email: 'admin@taxos.ai',
    passwordHash: adminPasswordHash,
    name: 'System Admin',
    role: 'admin',
    status: 'active',
    isVerified: true,
  }).returning().get()

  const founder = db.insert(schema.users).values({
    id: 'user-founder-001',
    orgId: founderOrg.id,
    email: 'demo@taxos.ai',
    passwordHash: userPasswordHash,
    name: 'Alex Chen',
    role: 'founder',
    status: 'active',
    isVerified: true,
    approvedByUserId: admin.id,
    approvalReviewedAt: new Date().toISOString(),
  }).returning().get()

  db.insert(schema.founderApplications).values({
    id: 'founder-app-demo-001',
    userId: founder.id,
    organizationId: founderOrg.id,
    email: founder.email,
    passwordHash: userPasswordHash,
    name: founder.name,
    organizationName: founderOrg.name,
    brandName: 'Acme',
    entityType: 'C-Corp',
    legalCompanyName: founderOrg.legalName,
    registrationNumber: founderOrg.registrationNumber,
    country: founderOrg.incorporationCountry,
    stateOrJurisdiction: founderOrg.incorporationState,
    incorporationDate: founderOrg.incorporationDate,
    certificateFileName: 'certificate.pdf',
    certificateStorageUrl: '/uploads/certificate.pdf',
    parsedCertificateData: { legalCompanyName: founderOrg.legalName, entityType: 'C-Corp', stateOrJurisdiction: 'Delaware', country: 'US' },
    emailVerifiedAt: new Date().toISOString(),
    onboardingCompletedAt: new Date().toISOString(),
    status: 'approved',
    reviewedByUserId: admin.id,
    reviewedAt: new Date().toISOString(),
    approvedUserId: founder.id,
  }).run()

  const pendingOrg = db.insert(schema.organizations).values({
    id: 'org-pending-001',
    name: 'Pending Co',
    legalName: 'Pending Co LLC',
    plan: 'starter',
  }).returning().get()

  const pendingFounder = db.insert(schema.users).values({
    id: 'user-pending-founder-001',
    orgId: pendingOrg.id,
    email: 'pending-founder@taxos.ai',
    passwordHash: userPasswordHash,
    name: 'Taylor Morgan',
    role: 'founder',
    status: 'pending_admin_review',
    isVerified: true,
  }).returning().get()

  const cpa = db.insert(schema.users).values({
    id: 'user-cpa-001',
    orgId: founderOrg.id,
    email: 'cpa@taxos.ai',
    passwordHash: userPasswordHash,
    name: 'Sarah Miller, CPA',
    role: 'cpa',
    status: 'active',
    isVerified: true,
    approvedByUserId: admin.id,
    approvalReviewedAt: new Date().toISOString(),
  }).returning().get()

  const teamMember = db.insert(schema.users).values({
    id: 'user-team-001',
    orgId: founderOrg.id,
    email: 'team@taxos.ai',
    passwordHash: userPasswordHash,
    name: 'Jamie Patel',
    role: 'team_member',
    status: 'active',
    isVerified: true,
    invitedByUserId: founder.id,
  }).returning().get()

  const managerTemplate = db.insert(schema.roleTemplates).values({
    id: 'template-manager-001',
    name: 'Manager',
    scope: 'global',
    organizationId: null,
    createdByUserId: admin.id,
    permissions: {
      canViewDashboard: true,
      canViewFilings: true,
      canEditFilings: true,
      canApproveFilings: false,
      canViewDocuments: true,
      canEditDocuments: true,
      canManageTeam: true,
      canCreateAccounts: false,
      canManageTemplates: true,
      canManageOrganization: false,
    },
    isSystemTemplate: true,
  }).returning().get()

  db.insert(schema.roleTemplates).values([
    {
      id: 'template-accountant-001',
      name: 'Accountant',
      scope: 'global',
      organizationId: null,
      createdByUserId: admin.id,
      permissions: {
        canViewDashboard: true,
        canViewFilings: true,
        canEditFilings: true,
        canApproveFilings: true,
        canViewDocuments: true,
        canEditDocuments: true,
        canManageTeam: false,
        canCreateAccounts: false,
        canManageTemplates: false,
        canManageOrganization: false,
      },
      isSystemTemplate: true,
    },
    {
      id: 'template-viewer-001',
      name: 'Viewer',
      scope: 'global',
      organizationId: null,
      createdByUserId: admin.id,
      permissions: {
        canViewDashboard: true,
        canViewFilings: true,
        canEditFilings: false,
        canApproveFilings: false,
        canViewDocuments: true,
        canEditDocuments: false,
        canManageTeam: false,
        canCreateAccounts: false,
        canManageTemplates: false,
        canManageOrganization: false,
      },
      isSystemTemplate: true,
    },
    {
      id: 'template-ops-001',
      name: 'Ops Specialist',
      scope: 'organization',
      organizationId: founderOrg.id,
      createdByUserId: founder.id,
      permissions: {
        canViewDashboard: true,
        canViewFilings: true,
        canEditFilings: true,
        canApproveFilings: false,
        canViewDocuments: true,
        canEditDocuments: true,
        canManageTeam: false,
        canCreateAccounts: false,
        canManageTemplates: false,
        canManageOrganization: false,
      },
      isSystemTemplate: false,
    },
  ]).run()

  db.insert(schema.permissions).values({
    id: 'perm-team-001',
    userId: teamMember.id,
    organizationId: founderOrg.id,
    templateId: managerTemplate.id,
    permissions: managerTemplate.permissions as any,
    createdByUserId: founder.id,
  }).run()

  db.insert(schema.cpaAssignments).values({
    id: 'cpa-assignment-001',
    userId: cpa.id,
    organizationId: founderOrg.id,
    createdByUserId: admin.id,
  }).run()

  db.insert(schema.founderApplications).values({
    id: 'founder-app-001',
    userId: pendingFounder.id,
    organizationId: pendingOrg.id,
    email: 'pending-founder@taxos.ai',
    passwordHash: userPasswordHash,
    name: 'Taylor Morgan',
    organizationName: 'Pending Co',
    brandName: 'Pending',
    entityType: 'LLC',
    legalCompanyName: 'Pending Co LLC',
    registrationNumber: 'PEND-001',
    country: 'US',
    stateOrJurisdiction: 'Wyoming',
    incorporationDate: '2025-11-10',
    certificateFileName: 'certificate.pdf',
    certificateStorageUrl: '/uploads/certificate.pdf',
    parsedCertificateData: { legalCompanyName: 'Pending Co LLC', entityType: 'LLC', stateOrJurisdiction: 'Wyoming', country: 'US' },
    emailVerifiedAt: new Date().toISOString(),
    onboardingCompletedAt: new Date().toISOString(),
    status: 'pending',
  }).run()

  const entity = db.insert(schema.entities).values({
    id: 'entity-acme-us-001',
    orgId: founderOrg.id,
    legalName: 'Acme Inc',
    entityType: 'C-Corp',
    stateOfIncorporation: 'Delaware',
    ein: '12-3456789',
    fiscalYearEnd: '12-31',
    foreignSubsidiaries: ['Acme India Pvt Ltd'] as any,
    country: 'US',
    status: 'active',
  }).returning().get()

  const deadline = db.insert(schema.deadlines).values({
    id: 'deadline-1120-001',
    entityId: entity.id,
    formType: '1120',
    formName: 'U.S. Corporation Income Tax Return',
    dueDate: '2026-04-15',
    status: 'upcoming',
    aiPredicted: true,
    urgencyScore: 95,
    description: 'Annual federal corporate income tax return for Acme Inc.',
  }).returning().get()

  const filing = db.insert(schema.filings).values({
    id: 'filing-1120-001',
    entityId: entity.id,
    deadlineId: deadline.id,
    orgId: founderOrg.id,
    formType: '1120',
    formName: 'U.S. Corporation Income Tax Return',
    status: 'cpa_review',
    cpaAssignedId: cpa.id,
    filingData: { revenue: 1000000 },
    aiSummary: 'Prepared with source documents and prior returns.',
    aiReasoning: 'Demo filing ready for CPA review.',
    taxYear: 2025,
  }).returning().get()

  db.insert(schema.approvalQueue).values({
    id: 'approval-cpa-001',
    orgId: founderOrg.id,
    filingId: filing.id,
    queueType: 'cpa',
    status: 'pending',
    summary: 'CPA review required before founder approval.',
    aiRecommendation: 'Review before submission.',
  }).run()

  db.insert(schema.filingReviewLocks).values({
    id: 'review-lock-001',
    filingId: filing.id,
    cpaUserId: cpa.id,
    status: 'active',
  }).run()

  console.log('Admin: admin@taxos.ai / admin1234')
  console.log('Founder: demo@taxos.ai / demo1234')
  console.log('CPA: cpa@taxos.ai / demo1234')
  console.log('Team member: team@taxos.ai / demo1234')
}

seed().catch((error) => {
  console.error(error)
  process.exit(1)
}).finally(() => {
  sqlite.close()
})
