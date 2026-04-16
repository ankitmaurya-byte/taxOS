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
    DROP TABLE IF EXISTS document_contexts;
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
    DROP TABLE IF EXISTS folders;
    DROP TABLE IF EXISTS vaults;
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
      directors TEXT DEFAULT '[]',
      officers TEXT DEFAULT '[]',
      shareholders TEXT DEFAULT '[]',
      cap_table TEXT DEFAULT '[]',
      sensitive_data TEXT DEFAULT '[]',
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
    CREATE TABLE vaults (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES organizations(id),
      name TEXT NOT NULL,
      description TEXT,
      created_by_id TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE folders (
      id TEXT PRIMARY KEY,
      vault_id TEXT NOT NULL REFERENCES vaults(id),
      parent_id TEXT,
      name TEXT NOT NULL,
      created_by_id TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE documents (
      id TEXT PRIMARY KEY,
      filing_id TEXT REFERENCES filings(id),
      org_id TEXT NOT NULL REFERENCES organizations(id),
      vault_id TEXT REFERENCES vaults(id),
      folder_id TEXT REFERENCES folders(id),
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
    CREATE TABLE document_contexts (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL REFERENCES documents(id),
      org_id TEXT NOT NULL REFERENCES organizations(id),
      vault_id TEXT REFERENCES vaults(id),
      raw_text TEXT,
      summary TEXT,
      key_entities TEXT DEFAULT '[]',
      metadata TEXT DEFAULT '{}',
      chunk_index INTEGER DEFAULT 0,
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

  // ─── Vaults ───────────────────────────────────────
  const taxVault = db.insert(schema.vaults).values({
    id: 'vault-tax-2025',
    orgId: founderOrg.id,
    name: 'Tax Returns 2025',
    description: 'All federal and state tax return documents for 2025.',
    createdById: founder.id,
  }).returning().get()

  const financialVault = db.insert(schema.vaults).values({
    id: 'vault-financial',
    orgId: founderOrg.id,
    name: 'Financial Statements',
    description: 'P&L, balance sheets, and cash flow statements.',
    createdById: founder.id,
  }).returning().get()

  const payrollVault = db.insert(schema.vaults).values({
    id: 'vault-payroll',
    orgId: founderOrg.id,
    name: 'Payroll Records',
    description: 'W-2s, payroll summaries, and employment tax docs.',
    createdById: founder.id,
  }).returning().get()

  // ─── Folders ──────────────────────────────────────
  const federalFolder = db.insert(schema.folders).values({
    id: 'folder-federal',
    vaultId: taxVault.id,
    parentId: null,
    name: 'Federal',
    createdById: founder.id,
  }).returning().get()

  db.insert(schema.folders).values({
    id: 'folder-state',
    vaultId: taxVault.id,
    parentId: null,
    name: 'State',
    createdById: founder.id,
  }).run()

  const q4Folder = db.insert(schema.folders).values({
    id: 'folder-q4',
    vaultId: financialVault.id,
    parentId: null,
    name: 'Q4 2025',
    createdById: founder.id,
  }).returning().get()

  db.insert(schema.folders).values({
    id: 'folder-q3',
    vaultId: financialVault.id,
    parentId: null,
    name: 'Q3 2025',
    createdById: founder.id,
  }).run()

  // ─── Documents in Vaults ──────────────────────────
  const doc1 = db.insert(schema.documents).values({
    id: 'doc-w2-2025',
    filingId: filing.id,
    orgId: founderOrg.id,
    vaultId: payrollVault.id,
    folderId: null,
    fileName: 'W-2_2025.pdf',
    storageUrl: '/uploads/W-2_2025.pdf',
    mimeType: 'application/pdf',
    extractedData: {
      documentType: 'W-2',
      taxYear: 2025,
      fields: {
        employerName: { value: 'Acme Inc', confidence: 0.95 },
        wages: { value: '150000', confidence: 0.92 },
        federalTaxWithheld: { value: '35000', confidence: 0.90 },
      },
      overallConfidence: 0.92,
    },
    aiTags: ['income', 'payroll', 'withholding'] as any,
    confidenceScore: 0.92,
    reviewedByHuman: false,
    uploadedById: founder.id,
  }).returning().get()

  const doc2 = db.insert(schema.documents).values({
    id: 'doc-pl-q4',
    orgId: founderOrg.id,
    vaultId: financialVault.id,
    folderId: q4Folder.id,
    fileName: 'profit_loss_q4_2025.pdf',
    storageUrl: '/uploads/profit_loss_q4_2025.pdf',
    mimeType: 'application/pdf',
    extractedData: {
      documentType: 'P&L Statement',
      taxYear: 2025,
      fields: {
        revenue: { value: '2500000', confidence: 0.95 },
        expenses: { value: '1800000', confidence: 0.93 },
        netIncome: { value: '700000', confidence: 0.94 },
      },
      overallConfidence: 0.94,
    },
    aiTags: ['revenue', 'expenses', 'income'] as any,
    confidenceScore: 0.94,
    reviewedByHuman: true,
    uploadedById: teamMember.id,
  }).returning().get()

  const doc3 = db.insert(schema.documents).values({
    id: 'doc-1099-contractor',
    filingId: filing.id,
    orgId: founderOrg.id,
    vaultId: taxVault.id,
    folderId: federalFolder.id,
    fileName: '1099_contractor_payments.pdf',
    storageUrl: '/uploads/1099_contractor.pdf',
    mimeType: 'application/pdf',
    extractedData: {
      documentType: '1099-NEC',
      taxYear: 2025,
      fields: {
        contractorName: { value: 'DevCo Solutions', confidence: 0.88 },
        totalPaid: { value: '200000', confidence: 0.85 },
      },
      overallConfidence: 0.86,
    },
    aiTags: ['contractor', 'expenses'] as any,
    confidenceScore: 0.86,
    reviewedByHuman: false,
    uploadedById: founder.id,
  }).returning().get()

  // ─── Document Contexts ────────────────────────────
  db.insert(schema.documentContexts).values({
    id: 'ctx-w2-2025',
    documentId: doc1.id,
    orgId: founderOrg.id,
    vaultId: payrollVault.id,
    rawText: 'W-2 Wage and Tax Statement 2025\nEmployer: Acme Inc\nEIN: 12-3456789\nEmployee: Alex Chen\nWages: $150,000.00\nFederal Tax Withheld: $35,000.00\nSocial Security Wages: $150,000.00\nSocial Security Tax: $9,300.00\nMedicare Wages: $150,000.00\nMedicare Tax: $2,175.00\nState: Delaware\nState Wages: $150,000.00\nState Tax Withheld: $9,750.00',
    summary: 'W-2 for Alex Chen from Acme Inc showing $150K wages with $35K federal withholding for tax year 2025.',
    keyEntities: ['Acme Inc', 'Alex Chen', 'Delaware', 'IRS'] as any,
    metadata: { documentType: 'W-2', date: '2025-01-31', parties: ['Acme Inc', 'Alex Chen'], amounts: ['$150,000', '$35,000'] } as any,
  }).run()

  db.insert(schema.documentContexts).values({
    id: 'ctx-pl-q4',
    documentId: doc2.id,
    orgId: founderOrg.id,
    vaultId: financialVault.id,
    rawText: 'Profit & Loss Statement Q4 2025\nAcme Incorporated\n\nRevenue:\n  Software Licenses: $1,200,000\n  Consulting Services: $800,000\n  Support Contracts: $500,000\n  Total Revenue: $2,500,000\n\nExpenses:\n  Salaries & Wages: $900,000\n  Contractor Payments: $200,000\n  Cloud Infrastructure: $150,000\n  Office & Admin: $100,000\n  R&D Expenses: $300,000\n  Marketing: $150,000\n  Total Expenses: $1,800,000\n\nNet Income: $700,000',
    summary: 'Q4 2025 P&L showing $2.5M revenue, $1.8M expenses, $700K net income. Key items: $900K salaries, $300K R&D, $200K contractor payments.',
    keyEntities: ['Acme Incorporated', 'Revenue', 'Net Income', 'R&D'] as any,
    metadata: { documentType: 'P&L', date: '2025-12-31', parties: ['Acme Incorporated'], amounts: ['$2,500,000', '$1,800,000', '$700,000'] } as any,
  }).run()

  db.insert(schema.documentContexts).values({
    id: 'ctx-1099',
    documentId: doc3.id,
    orgId: founderOrg.id,
    vaultId: taxVault.id,
    rawText: '1099-NEC Nonemployee Compensation 2025\nPayer: Acme Inc\nEIN: 12-3456789\nRecipient: DevCo Solutions LLC\nTIN: 98-7654321\nNonemployee Compensation: $200,000.00\nServices: Software development and consulting for product platform.',
    summary: '1099-NEC showing $200K paid to DevCo Solutions for software development services in 2025.',
    keyEntities: ['Acme Inc', 'DevCo Solutions LLC'] as any,
    metadata: { documentType: '1099-NEC', date: '2025-01-31', parties: ['Acme Inc', 'DevCo Solutions LLC'], amounts: ['$200,000'] } as any,
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
