import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { sql } from 'drizzle-orm'
import bcrypt from 'bcrypt'
import * as schema from './schema'

const connectionString = process.env.DATABASE_URL || 'postgres://taxos:taxos@localhost:5432/taxos'
const pool = new Pool({ connectionString })
const db = drizzle(pool, { schema })

const TABLES = [
  'document_contexts',
  'filing_document_requirements',
  'cpa_notifications',
  'cpa_rejections',
  'filing_review_locks',
  'approval_queue',
  'audit_log',
  'agent_conversations',
  'ai_chat_conversations',
  'org_chat_messages',
  'founder_chat_messages',
  'cpa_chat_messages',
  'documents',
  'folders',
  'vaults',
  'filings',
  'deadlines',
  'entities',
  'cpa_assignments',
  'email_verification_tokens',
  'invites',
  'permissions',
  'role_templates',
  'founder_applications',
  'users',
  'organizations',
]

async function seed() {
  console.log('Seeding database...')

  await db.execute(sql.raw(`TRUNCATE TABLE ${TABLES.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE`))

  const adminPasswordHash = await bcrypt.hash('admin1234', 10)
  const userPasswordHash = await bcrypt.hash('demo1234', 10)

  const [adminOrg] = await db.insert(schema.organizations).values({
    id: 'org-admin-001',
    name: 'TaxOS Admin',
    legalName: 'TaxOS Admin',
    plan: 'pro',
  }).returning()

  const [founderOrg] = await db.insert(schema.organizations).values({
    id: 'org-demo-001',
    name: 'Acme Inc (Demo)',
    legalName: 'Acme Incorporated',
    registrationNumber: 'ACME-2024-001',
    incorporationCountry: 'US',
    incorporationState: 'Delaware',
    incorporationDate: '2024-01-15',
    plan: 'pro',
  }).returning()

  const [admin] = await db.insert(schema.users).values({
    id: 'user-admin-001',
    orgId: adminOrg.id,
    email: 'admin@taxos.ai',
    passwordHash: adminPasswordHash,
    name: 'System Admin',
    role: 'admin',
    status: 'active',
    isVerified: true,
  }).returning()

  const [founder] = await db.insert(schema.users).values({
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
  }).returning()

  await db.insert(schema.founderApplications).values({
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
  })

  const [pendingOrg] = await db.insert(schema.organizations).values({
    id: 'org-pending-001',
    name: 'Pending Co',
    legalName: 'Pending Co LLC',
    plan: 'starter',
  }).returning()

  const [pendingFounder] = await db.insert(schema.users).values({
    id: 'user-pending-founder-001',
    orgId: pendingOrg.id,
    email: 'pending-founder@taxos.ai',
    passwordHash: userPasswordHash,
    name: 'Taylor Morgan',
    role: 'founder',
    status: 'pending_admin_review',
    isVerified: true,
  }).returning()

  const [cpa] = await db.insert(schema.users).values({
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
  }).returning()

  const [teamMember] = await db.insert(schema.users).values({
    id: 'user-team-001',
    orgId: founderOrg.id,
    email: 'team@taxos.ai',
    passwordHash: userPasswordHash,
    name: 'Jamie Patel',
    role: 'team_member',
    status: 'active',
    isVerified: true,
    invitedByUserId: founder.id,
  }).returning()

  const [managerTemplate] = await db.insert(schema.roleTemplates).values({
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
  }).returning()

  await db.insert(schema.roleTemplates).values([
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
  ])

  await db.insert(schema.permissions).values({
    id: 'perm-team-001',
    userId: teamMember.id,
    organizationId: founderOrg.id,
    templateId: managerTemplate.id,
    permissions: managerTemplate.permissions as any,
    createdByUserId: founder.id,
  })

  await db.insert(schema.cpaAssignments).values({
    id: 'cpa-assignment-001',
    userId: cpa.id,
    organizationId: founderOrg.id,
    createdByUserId: admin.id,
  })

  await db.insert(schema.founderApplications).values({
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
  })

  const [entity] = await db.insert(schema.entities).values({
    id: 'entity-acme-us-001',
    orgId: founderOrg.id,
    legalName: 'Acme Inc',
    entityType: 'C-Corp',
    stateOfIncorporation: 'Delaware',
    ein: '12-3456789',
    fiscalYearEnd: '12-31',
    foreignSubsidiaries: ['Acme India Pvt Ltd'],
    country: 'US',
    status: 'active',
  }).returning()

  const [deadline] = await db.insert(schema.deadlines).values({
    id: 'deadline-1120-001',
    entityId: entity.id,
    formType: '1120',
    formName: 'U.S. Corporation Income Tax Return',
    dueDate: '2026-04-15',
    status: 'upcoming',
    aiPredicted: true,
    urgencyScore: 95,
    description: 'Annual federal corporate income tax return for Acme Inc.',
  }).returning()

  const [filing] = await db.insert(schema.filings).values({
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
  }).returning()

  await db.insert(schema.approvalQueue).values({
    id: 'approval-cpa-001',
    orgId: founderOrg.id,
    filingId: filing.id,
    queueType: 'cpa',
    status: 'pending',
    summary: 'CPA review required before founder approval.',
    aiRecommendation: 'Review before submission.',
  })

  await db.insert(schema.filingReviewLocks).values({
    id: 'review-lock-001',
    filingId: filing.id,
    cpaUserId: cpa.id,
    status: 'active',
  })

  // ─── Vaults ───────────────────────────────────────
  const [taxVault] = await db.insert(schema.vaults).values({
    id: 'vault-tax-2025',
    orgId: founderOrg.id,
    name: 'Tax Returns 2025',
    description: 'All federal and state tax return documents for 2025.',
    createdById: founder.id,
  }).returning()

  const [financialVault] = await db.insert(schema.vaults).values({
    id: 'vault-financial',
    orgId: founderOrg.id,
    name: 'Financial Statements',
    description: 'P&L, balance sheets, and cash flow statements.',
    createdById: founder.id,
  }).returning()

  const [payrollVault] = await db.insert(schema.vaults).values({
    id: 'vault-payroll',
    orgId: founderOrg.id,
    name: 'Payroll Records',
    description: 'W-2s, payroll summaries, and employment tax docs.',
    createdById: founder.id,
  }).returning()

  // ─── Folders ──────────────────────────────────────
  const [federalFolder] = await db.insert(schema.folders).values({
    id: 'folder-federal',
    vaultId: taxVault.id,
    parentId: null,
    name: 'Federal',
    createdById: founder.id,
  }).returning()

  await db.insert(schema.folders).values({
    id: 'folder-state',
    vaultId: taxVault.id,
    parentId: null,
    name: 'State',
    createdById: founder.id,
  })

  const [q4Folder] = await db.insert(schema.folders).values({
    id: 'folder-q4',
    vaultId: financialVault.id,
    parentId: null,
    name: 'Q4 2025',
    createdById: founder.id,
  }).returning()

  await db.insert(schema.folders).values({
    id: 'folder-q3',
    vaultId: financialVault.id,
    parentId: null,
    name: 'Q3 2025',
    createdById: founder.id,
  })

  // ─── Documents in Vaults ──────────────────────────
  const [doc1] = await db.insert(schema.documents).values({
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
    aiTags: ['income', 'payroll', 'withholding'],
    confidenceScore: 0.92,
    reviewedByHuman: false,
    uploadedById: founder.id,
  }).returning()

  const [doc2] = await db.insert(schema.documents).values({
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
    aiTags: ['revenue', 'expenses', 'income'],
    confidenceScore: 0.94,
    reviewedByHuman: true,
    uploadedById: teamMember.id,
  }).returning()

  const [doc3] = await db.insert(schema.documents).values({
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
    aiTags: ['contractor', 'expenses'],
    confidenceScore: 0.86,
    reviewedByHuman: false,
    uploadedById: founder.id,
  }).returning()

  // ─── Document Contexts ────────────────────────────
  await db.insert(schema.documentContexts).values({
    id: 'ctx-w2-2025',
    documentId: doc1.id,
    orgId: founderOrg.id,
    vaultId: payrollVault.id,
    rawText: 'W-2 Wage and Tax Statement 2025\nEmployer: Acme Inc\nEIN: 12-3456789\nEmployee: Alex Chen\nWages: $150,000.00\nFederal Tax Withheld: $35,000.00\nSocial Security Wages: $150,000.00\nSocial Security Tax: $9,300.00\nMedicare Wages: $150,000.00\nMedicare Tax: $2,175.00\nState: Delaware\nState Wages: $150,000.00\nState Tax Withheld: $9,750.00',
    summary: 'W-2 for Alex Chen from Acme Inc showing $150K wages with $35K federal withholding for tax year 2025.',
    keyEntities: ['Acme Inc', 'Alex Chen', 'Delaware', 'IRS'],
    metadata: { documentType: 'W-2', date: '2025-01-31', parties: ['Acme Inc', 'Alex Chen'], amounts: ['$150,000', '$35,000'] },
  })

  await db.insert(schema.documentContexts).values({
    id: 'ctx-pl-q4',
    documentId: doc2.id,
    orgId: founderOrg.id,
    vaultId: financialVault.id,
    rawText: 'Profit & Loss Statement Q4 2025\nAcme Incorporated\n\nRevenue:\n  Software Licenses: $1,200,000\n  Consulting Services: $800,000\n  Support Contracts: $500,000\n  Total Revenue: $2,500,000\n\nExpenses:\n  Salaries & Wages: $900,000\n  Contractor Payments: $200,000\n  Cloud Infrastructure: $150,000\n  Office & Admin: $100,000\n  R&D Expenses: $300,000\n  Marketing: $150,000\n  Total Expenses: $1,800,000\n\nNet Income: $700,000',
    summary: 'Q4 2025 P&L showing $2.5M revenue, $1.8M expenses, $700K net income. Key items: $900K salaries, $300K R&D, $200K contractor payments.',
    keyEntities: ['Acme Incorporated', 'Revenue', 'Net Income', 'R&D'],
    metadata: { documentType: 'P&L', date: '2025-12-31', parties: ['Acme Incorporated'], amounts: ['$2,500,000', '$1,800,000', '$700,000'] },
  })

  await db.insert(schema.documentContexts).values({
    id: 'ctx-1099',
    documentId: doc3.id,
    orgId: founderOrg.id,
    vaultId: taxVault.id,
    rawText: '1099-NEC Nonemployee Compensation 2025\nPayer: Acme Inc\nEIN: 12-3456789\nRecipient: DevCo Solutions LLC\nTIN: 98-7654321\nNonemployee Compensation: $200,000.00\nServices: Software development and consulting for product platform.',
    summary: '1099-NEC showing $200K paid to DevCo Solutions for software development services in 2025.',
    keyEntities: ['Acme Inc', 'DevCo Solutions LLC'],
    metadata: { documentType: '1099-NEC', date: '2025-01-31', parties: ['Acme Inc', 'DevCo Solutions LLC'], amounts: ['$200,000'] },
  })

  console.log('Admin: admin@taxos.ai / admin1234')
  console.log('Founder: demo@taxos.ai / demo1234')
  console.log('CPA: cpa@taxos.ai / demo1234')
  console.log('Team member: team@taxos.ai / demo1234')
}

seed().catch((error) => {
  console.error(error)
  process.exit(1)
}).finally(() => {
  pool.end()
})
