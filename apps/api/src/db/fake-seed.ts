import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import bcrypt from 'bcrypt'
import path from 'path'
import crypto from 'crypto'
import * as schema from './schema'

const dbPath = process.env.DATABASE_URL || path.join(__dirname, '../../taxos.db')
const sqlite = new Database(dbPath)
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = OFF')

const db = drizzle(sqlite, { schema })

// ─── Helpers ─────────────────────────────────────────
const uuid = () => crypto.randomUUID()
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]
const pickN = <T>(arr: T[], n: number): T[] => {
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, n)
}
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min
const randFloat = (min: number, max: number) => +(Math.random() * (max - min) + min).toFixed(2)
const pastDate = (daysAgo: number) => {
  const d = new Date()
  d.setDate(d.getDate() - rand(1, daysAgo))
  return d.toISOString()
}
const futureDate = (daysAhead: number) => {
  const d = new Date()
  d.setDate(d.getDate() + rand(1, daysAhead))
  return d.toISOString()
}

// ─── Fake data pools ─────────────────────────────────
const firstNames = [
  'James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda',
  'David', 'Elizabeth', 'William', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica',
  'Thomas', 'Sarah', 'Christopher', 'Karen', 'Daniel', 'Lisa', 'Matthew', 'Nancy',
  'Anthony', 'Betty', 'Mark', 'Margaret', 'Donald', 'Sandra', 'Steven', 'Ashley',
  'Paul', 'Dorothy', 'Andrew', 'Kimberly', 'Joshua', 'Emily', 'Kenneth', 'Donna',
  'Kevin', 'Michelle', 'Brian', 'Carol', 'George', 'Amanda', 'Timothy', 'Melissa',
  'Raj', 'Priya', 'Wei', 'Yuki', 'Carlos', 'Fatima', 'Ahmed', 'Olga',
  'Alexander', 'Sophia', 'Benjamin', 'Olivia', 'Ethan', 'Isabella', 'Nathan', 'Mia',
  'Lucas', 'Charlotte', 'Henry', 'Amelia', 'Sebastian', 'Harper', 'Jack', 'Evelyn',
  'Owen', 'Abigail', 'Liam', 'Ella', 'Noah', 'Chloe', 'Mason', 'Grace',
  'Aiden', 'Lily', 'Caleb', 'Zoey', 'Ryan', 'Aria', 'Leo', 'Luna',
]
const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
  'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
  'Patel', 'Kumar', 'Chen', 'Yamamoto', 'Santos', 'Khan', 'Ivanov', 'Kim',
  'Walker', 'Hall', 'Allen', 'Young', 'King', 'Wright', 'Scott', 'Green',
  'Baker', 'Adams', 'Nelson', 'Hill', 'Mitchell', 'Roberts', 'Carter', 'Phillips',
  'Evans', 'Turner', 'Torres', 'Parker', 'Collins', 'Edwards', 'Stewart', 'Flores',
]
const companyPrefixes = [
  'Apex', 'Nova', 'Vertex', 'Quantum', 'Stellar', 'Nimbus', 'Helix', 'Orion',
  'Cipher', 'Fusion', 'Prism', 'Vortex', 'Zenith', 'Atlas', 'Bolt', 'Crux',
  'Echo', 'Flux', 'Glyph', 'Ionic', 'Kite', 'Lumen', 'Metro', 'Nexus',
  'Opal', 'Pixel', 'Quasar', 'Relay', 'Spark', 'Tidal', 'Unity', 'Wave',
  'Arc', 'Bloom', 'Crest', 'Dash', 'Ember', 'Forge', 'Grid', 'Haven',
  'Iris', 'Jade', 'Keen', 'Link', 'Mint', 'Node', 'Orbit', 'Pulse',
]
const companySuffixes = [
  'Technologies', 'Labs', 'Systems', 'Solutions', 'AI', 'Software', 'Cloud',
  'Digital', 'Robotics', 'Bio', 'Health', 'Finance', 'Analytics', 'Data',
  'Dynamics', 'Ventures', 'Works', 'Logic', 'Ops', 'Hub', 'Studio',
  'Platform', 'Group', 'Partners', 'Capital', 'Networks', 'Security', 'Media',
]
const usStates = [
  'Delaware', 'California', 'New York', 'Texas', 'Florida', 'Nevada',
  'Wyoming', 'Washington', 'Massachusetts', 'Illinois', 'Colorado', 'Georgia',
  'Virginia', 'Oregon', 'Utah', 'North Carolina', 'Arizona', 'Michigan',
  'Pennsylvania', 'Ohio', 'New Jersey', 'Maryland',
]
const entityTypes = ['C-Corp', 'LLC', 'S-Corp', 'Pvt-Ltd'] as const
const businessActivities = [
  'Software Development', 'SaaS Platform', 'E-Commerce', 'Fintech Services',
  'Healthcare Technology', 'Data Analytics', 'Cybersecurity', 'Cloud Infrastructure',
  'AI/ML Solutions', 'Mobile Applications', 'Blockchain Services', 'IoT Platform',
  'Digital Marketing', 'EdTech Platform', 'Logistics Technology', 'Legal Tech',
  'Real Estate Technology', 'Agricultural Technology', 'Clean Energy Technology',
  'Biotechnology Research', 'Autonomous Vehicles', 'Space Technology',
  'Quantum Computing', 'AR/VR Solutions', 'Supply Chain Management',
]
const countries = ['US', 'US', 'US', 'US', 'IN', 'UK', 'CA', 'SG', 'DE', 'AU']
const foreignSubs = [
  'India Pvt Ltd', 'UK Limited', 'Canada Corp', 'Singapore Pte Ltd',
  'Germany GmbH', 'Australia Pty Ltd', 'Japan KK', 'Brazil Ltda',
]
const formTypes: { type: string; name: string; entityTypes: string[] }[] = [
  { type: '1120', name: 'U.S. Corporation Income Tax Return', entityTypes: ['C-Corp'] },
  { type: '1120-S', name: 'U.S. Income Tax Return for an S Corporation', entityTypes: ['S-Corp'] },
  { type: '1065', name: 'U.S. Return of Partnership Income', entityTypes: ['LLC'] },
  { type: '5472', name: 'Information Return of a 25% Foreign-Owned U.S. Corporation', entityTypes: ['C-Corp', 'LLC'] },
  { type: '1099-NEC', name: 'Nonemployee Compensation', entityTypes: ['C-Corp', 'LLC', 'S-Corp'] },
  { type: '1099-MISC', name: 'Miscellaneous Income', entityTypes: ['C-Corp', 'LLC', 'S-Corp'] },
  { type: '940', name: 'Employer\'s Annual Federal Unemployment Tax Return', entityTypes: ['C-Corp', 'LLC', 'S-Corp'] },
  { type: '941', name: 'Employer\'s Quarterly Federal Tax Return', entityTypes: ['C-Corp', 'LLC', 'S-Corp'] },
  { type: 'W-2', name: 'Wage and Tax Statement', entityTypes: ['C-Corp', 'LLC', 'S-Corp'] },
  { type: '8832', name: 'Entity Classification Election', entityTypes: ['LLC'] },
  { type: '2553', name: 'Election by a Small Business Corporation', entityTypes: ['S-Corp'] },
  { type: 'BOI', name: 'Beneficial Ownership Information Report', entityTypes: ['C-Corp', 'LLC', 'S-Corp'] },
  { type: 'CT-1', name: 'Annual State Corporation Tax Return', entityTypes: ['C-Corp', 'S-Corp'] },
]
const filingStatuses = ['intake', 'ai_prep', 'cpa_review', 'founder_approval', 'submitted', 'archived'] as const
const deadlineStatuses = ['upcoming', 'overdue', 'filed', 'extended'] as const
const mimeTypes = ['application/pdf', 'image/png', 'image/jpeg', 'application/pdf', 'application/pdf']
const docNames = [
  'W-2_2025.pdf', 'bank_statement_q4.pdf', 'profit_loss_2025.pdf', 'balance_sheet_2025.pdf',
  'invoice_summary.pdf', '1099_contractor.pdf', 'incorporation_certificate.pdf',
  'board_resolution.pdf', 'stock_ledger.pdf', 'payroll_summary.pdf', 'tax_payment_receipt.pdf',
  'depreciation_schedule.pdf', 'lease_agreement.pdf', 'insurance_policy.pdf',
  'cap_table_export.png', 'bank_reconciliation.pdf', 'expense_report_q1.pdf',
  'expense_report_q2.pdf', 'expense_report_q3.pdf', 'expense_report_q4.pdf',
  'accounts_receivable.pdf', 'accounts_payable.pdf', 'trial_balance.pdf',
]
const aiTags = [
  'income', 'expenses', 'payroll', 'deductions', 'revenue', 'assets', 'liabilities',
  'depreciation', 'tax-payment', 'withholding', 'contractor', 'equity', 'capital-gains',
  'R&D-credit', 'foreign-income', 'state-tax', 'quarterly-estimated', 'loss-carryforward',
]
const auditActions = [
  'filing_created', 'status_changed', 'form_prefilled', 'risk_scored',
  'document_uploaded', 'document_extracted', 'document_reviewed', 'intake_started',
  'intake_completed', 'approval_requested', 'founder_approved', 'founder_rejected',
  'cpa_approved', 'cpa_rejected', 'escalated_to_cpa', 'workflow_paused',
  'deadline_calculated', 'deadline_updated', 'entity_created', 'entity_updated',
]
const agentTypes = ['intake', 'deadline', 'document', 'prefill', 'auditRisk', 'taxQa']
const intakeMessages = [
  { role: 'assistant', content: 'Welcome! Let\'s gather the information needed for your tax filing. What was your total revenue for the tax year?' },
  { role: 'user', content: 'Our total revenue was approximately $2.5 million.' },
  { role: 'assistant', content: 'Got it — $2.5M in revenue. [COLLECTED: revenue=$2,500,000] How many employees did you have on payroll?' },
  { role: 'user', content: 'We had 15 full-time employees and 8 contractors.' },
  { role: 'assistant', content: 'Thanks. [COLLECTED: employeeCount=15] [COLLECTED: contractorCount=8] Did your company make any significant capital expenditures or asset purchases this year?' },
  { role: 'user', content: 'Yes, we bought new servers and office equipment totaling about $180,000.' },
  { role: 'assistant', content: 'Noted. [COLLECTED: capitalExpenditures=$180,000] Any R&D activities that might qualify for the R&D tax credit?' },
  { role: 'user', content: 'We spent about $600K on R&D for our new product line.' },
  { role: 'assistant', content: '[COLLECTED: rdExpenses=$600,000] Great. Were there any foreign transactions, income from overseas, or payments to foreign entities?' },
  { role: 'user', content: 'We have a subsidiary in India and paid them about $200K for development services.' },
  { role: 'assistant', content: '[COLLECTED: foreignPayments=$200,000] Do you have any outstanding loans or significant liabilities?' },
  { role: 'user', content: 'We have a $500K line of credit with about $300K drawn.' },
]
const rejectionReasons = [
  'Missing documentation for contractor payments.',
  'Revenue figures do not match bank statements.',
  'Need additional information on foreign income.',
  'R&D expense breakdown insufficient for credit claim.',
  'Depreciation schedule needs recalculation.',
  'State apportionment factors need verification.',
  'Payroll tax amounts do not reconcile with W-2 totals.',
  'Capital gains classification needs review.',
]

const genName = () => `${pick(firstNames)} ${pick(lastNames)}`
const genCompanyName = () => `${pick(companyPrefixes)} ${pick(companySuffixes)}`
const genEIN = () => `${rand(10, 99)}-${rand(1000000, 9999999)}`
const genEmail = (name: string, domain: string) =>
  `${name.toLowerCase().replace(/[^a-z]/g, '.')}@${domain}`

// Generate mixed filing data — some fields AI-prefilled (objects), some manual (strings)
function genFilingData(hasPrefill: boolean) {
  const revenue = rand(50000, 10000000)
  const expenses = rand(30000, Math.min(revenue, 8000000))
  const data: Record<string, unknown> = {}

  if (hasPrefill) {
    // AI-prefilled fields (objects with confidence)
    data.revenue = { value: String(revenue), confidence: randFloat(0.8, 0.99), source: 'bank_statement', needsCpaReview: false }
    data.expenses = { value: String(expenses), confidence: randFloat(0.75, 0.98), source: 'profit_loss', needsCpaReview: false }
    data.netIncome = { value: String(revenue - expenses), confidence: randFloat(0.85, 0.99), source: 'calculated', needsCpaReview: false }
    data.totalAssets = { value: String(rand(100000, 50000000)), confidence: randFloat(0.7, 0.95), source: 'balance_sheet', needsCpaReview: false }
    data.rdExpenses = { value: String(rand(0, 2000000)), confidence: randFloat(0.6, 0.9), source: 'expense_report', needsCpaReview: true }
    // Manually entered fields (plain strings)
    data.employeeCount = String(rand(1, 200))
    data.contractorCount = String(rand(0, 50))
    data.statesTaxedIn = pickN(usStates, rand(1, 5)).join(', ')
    data.fiscalYearEnd = pick(['12-31', '03-31', '06-30', '09-30'])
    data.businessType = pick(businessActivities)
  } else {
    // All manual entry (plain strings)
    data.revenue = String(revenue)
    data.expenses = String(expenses)
    data.netIncome = String(revenue - expenses)
    data.employeeCount = String(rand(1, 200))
    data.contractorCount = String(rand(0, 50))
    data.businessType = pick(businessActivities)
    data.statesTaxedIn = pickN(usStates, rand(1, 3)).join(', ')
  }

  return data
}

// ─── CONFIG (10x scale) ─────────────────────────────
const NUM_ORGS = 80
const NUM_CPAS = 50
const USERS_PER_ORG = { min: 5, max: 15 }
const ENTITIES_PER_ORG = { min: 3, max: 10 }
const DEADLINES_PER_ENTITY = { min: 4, max: 10 }
const FILINGS_PER_ORG = { min: 10, max: 30 }
const DOCS_PER_ORG = { min: 20, max: 60 }
const AUDIT_LOGS_PER_ORG = { min: 40, max: 100 }
const CONVERSATIONS_PER_ORG = { min: 8, max: 25 }

async function fakeSeed() {
  console.log('🌱 Starting fake data seed (10x scale)...\n')

  // ─── Ensure tables exist ──────────────────────────
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS cpa_notifications (
      id TEXT PRIMARY KEY NOT NULL,
      filing_id TEXT NOT NULL,
      cpa_user_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      notified_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      responded_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS cpa_rejections (
      id TEXT PRIMARY KEY NOT NULL,
      filing_id TEXT NOT NULL,
      cpa_user_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS org_chat_messages (
      id TEXT PRIMARY KEY NOT NULL,
      org_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS founder_chat_messages (
      id TEXT PRIMARY KEY NOT NULL,
      sender_id TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS cpa_chat_messages (
      id TEXT PRIMARY KEY NOT NULL,
      sender_id TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `)

  // ─── Clean existing data ──────────────────────────
  console.log('Cleaning existing tables...')
  sqlite.exec(`
    DELETE FROM cpa_notifications;
    DELETE FROM cpa_rejections;
    DELETE FROM org_chat_messages;
    DELETE FROM founder_chat_messages;
    DELETE FROM cpa_chat_messages;
    DELETE FROM filing_review_locks;
    DELETE FROM cpa_assignments;
    DELETE FROM email_verification_tokens;
    DELETE FROM invites;
    DELETE FROM permissions;
    DELETE FROM role_templates;
    DELETE FROM founder_applications;
    DELETE FROM agent_conversations;
    DELETE FROM audit_log;
    DELETE FROM approval_queue;
    DELETE FROM documents;
    DELETE FROM filings;
    DELETE FROM deadlines;
    DELETE FROM entities;
    DELETE FROM users;
    DELETE FROM organizations;
  `)

  const passwordHash = await bcrypt.hash('password123', 10)

  const allOrgs: string[] = []
  const allUsers: { id: string; orgId: string; role: string; email: string; name: string }[] = []
  const allCpas: { id: string; orgId: string; role: string; email: string; status: string; name: string }[] = []
  const allEntities: { id: string; orgId: string; entityType: string }[] = []
  const allDeadlines: { id: string; entityId: string; formType: string; formName: string }[] = []
  const allFilings: { id: string; orgId: string; entityId: string; status: string; cpaAssignedId: string | null }[] = []
  const allTemplates: { id: string; orgId: string | null }[] = []
  const orgCpaMap = new Map<string, string[]>()

  // ─── 1. Organizations ─────────────────────────────
  console.log(`Creating ${NUM_ORGS} organizations...`)
  for (let i = 0; i < NUM_ORGS; i++) {
    const name = genCompanyName()
    const orgId = uuid()
    db.insert(schema.organizations).values({
      id: orgId,
      name,
      legalName: `${name} Inc.`,
      registrationNumber: `REG-${rand(100000, 999999)}`,
      incorporationCountry: pick(countries),
      incorporationState: pick(usStates),
      incorporationDate: pastDate(1500),
      plan: pick(['free', 'starter', 'pro', 'pro', 'pro']),
    }).run()
    allOrgs.push(orgId)
  }

  // ─── 2. Admin org + admin user ────────────────────
  const adminOrgId = uuid()
  db.insert(schema.organizations).values({
    id: adminOrgId,
    name: 'TaxOS Platform',
    legalName: 'TaxOS Platform Inc.',
    plan: 'pro',
  }).run()

  const adminId = uuid()
  const adminHash = await bcrypt.hash('admin1234', 10)
  db.insert(schema.users).values({
    id: adminId,
    orgId: adminOrgId,
    email: 'superadmin@taxos.ai',
    passwordHash: adminHash,
    name: 'Platform Admin',
    role: 'admin',
    status: 'active',
    isVerified: true,
  }).run()
  allUsers.push({ id: adminId, orgId: adminOrgId, role: 'admin', email: 'superadmin@taxos.ai', name: 'Platform Admin' })

  // ─── 3. CPAs ──────────────────────────────────────
  console.log(`Creating ${NUM_CPAS} CPAs...`)
  const usedEmails = new Set<string>(['superadmin@taxos.ai'])

  for (let i = 0; i < NUM_CPAS; i++) {
    const name = genName()
    const domain = 'taxos-cpas.com'
    let email = genEmail(name, domain)
    while (usedEmails.has(email)) email = genEmail(name + rand(1, 999), domain)
    usedEmails.add(email)

    const cpaId = uuid()
    const status = i < 15 ? 'active' as const : pick(['active', 'active', 'pending_admin_review'] as const)
    const cpaName = `${name}, CPA`

    db.insert(schema.users).values({
      id: cpaId,
      orgId: adminOrgId,
      email,
      passwordHash,
      name: cpaName,
      role: 'cpa',
      status,
      isVerified: status === 'active',
      approvedByUserId: status === 'active' ? adminId : undefined,
      approvalReviewedAt: status === 'active' ? pastDate(90) : undefined,
      lastLoginAt: status === 'active' ? pastDate(7) : undefined,
    }).run()

    allCpas.push({ id: cpaId, orgId: adminOrgId, role: 'cpa', email, status, name: cpaName })
    allUsers.push({ id: cpaId, orgId: adminOrgId, role: 'cpa', email, name: cpaName })
  }

  // Deterministic CPA logins
  for (let i = 0; i < Math.min(5, allCpas.length); i++) {
    const cpa = allCpas[i]
    const newEmail = `cpa${i + 1}@taxos.ai`
    sqlite.prepare("UPDATE users SET email = ?, name = ? WHERE id = ?").run(newEmail, cpa.name, cpa.id)
    cpa.email = newEmail
    usedEmails.add(newEmail)
  }

  console.log(`  → ${allCpas.length} CPAs created`)

  // ─── 4. Client org users ──────────────────────────
  console.log('Creating client org users...')
  for (const orgId of allOrgs) {
    const numUsers = rand(USERS_PER_ORG.min, USERS_PER_ORG.max)
    const roles: Array<'founder' | 'team_member'> = ['founder']
    for (let j = 1; j < numUsers; j++) roles.push('team_member')

    for (let j = 0; j < numUsers; j++) {
      const name = genName()
      const domain = `${pick(companyPrefixes).toLowerCase()}.com`
      let email = genEmail(name, domain)
      let attempt = 0
      while (usedEmails.has(email)) email = genEmail(name + (++attempt), domain)
      usedEmails.add(email)

      const userId = uuid()
      const role = roles[j] || 'team_member'
      const status = j === 0 ? 'active' as const : pick(['active', 'active', 'active', 'pending_admin_review'] as const)

      db.insert(schema.users).values({
        id: userId,
        orgId,
        email,
        passwordHash,
        name,
        role,
        status,
        isVerified: status === 'active',
        approvedByUserId: status === 'active' ? adminId : undefined,
        approvalReviewedAt: status === 'active' ? pastDate(90) : undefined,
        lastLoginAt: status === 'active' ? pastDate(7) : undefined,
      }).run()

      allUsers.push({ id: userId, orgId, role, email, name })
    }
  }
  console.log(`  → ${allUsers.length} total users`)

  // ─── 5. Role Templates ────────────────────────────
  console.log('Creating role templates...')
  const templateDefs = [
    { name: 'Full Access Manager', perms: { canViewDashboard: true, canViewFilings: true, canEditFilings: true, canApproveFilings: true, canViewDocuments: true, canEditDocuments: true, canManageTeam: true, canCreateAccounts: true, canManageTemplates: true, canManageOrganization: true } },
    { name: 'Filing Specialist', perms: { canViewDashboard: true, canViewFilings: true, canEditFilings: true, canApproveFilings: false, canViewDocuments: true, canEditDocuments: false, canManageTeam: false, canCreateAccounts: false, canManageTemplates: false, canManageOrganization: false } },
    { name: 'Document Reviewer', perms: { canViewDashboard: true, canViewFilings: true, canEditFilings: false, canApproveFilings: false, canViewDocuments: true, canEditDocuments: true, canManageTeam: false, canCreateAccounts: false, canManageTemplates: false, canManageOrganization: false } },
    { name: 'Read Only', perms: { canViewDashboard: true, canViewFilings: true, canEditFilings: false, canApproveFilings: false, canViewDocuments: true, canEditDocuments: false, canManageTeam: false, canCreateAccounts: false, canManageTemplates: false, canManageOrganization: false } },
  ]

  for (const tpl of templateDefs) {
    const tplId = uuid()
    db.insert(schema.roleTemplates).values({
      id: tplId, name: tpl.name, scope: 'global', organizationId: null,
      createdByUserId: adminId, permissions: tpl.perms, isSystemTemplate: true,
    }).run()
    allTemplates.push({ id: tplId, orgId: null })
  }

  for (const orgId of allOrgs.slice(0, 20)) {
    const founder = allUsers.find(u => u.orgId === orgId && u.role === 'founder')
    if (!founder) continue
    const tplId = uuid()
    db.insert(schema.roleTemplates).values({
      id: tplId,
      name: `${pick(['Ops', 'Tax', 'Finance', 'Compliance', 'Legal'])} Specialist`,
      scope: 'organization', organizationId: orgId, createdByUserId: founder.id,
      permissions: pick(templateDefs).perms, isSystemTemplate: false,
    }).run()
    allTemplates.push({ id: tplId, orgId })
  }

  // ─── 6. Permissions ───────────────────────────────
  console.log('Creating permissions...')
  let permCount = 0
  for (const orgId of allOrgs) {
    const orgUsers = allUsers.filter(u => u.orgId === orgId && u.role === 'team_member')
    const founder = allUsers.find(u => u.orgId === orgId && u.role === 'founder')
    if (!founder) continue
    for (const user of orgUsers) {
      db.insert(schema.permissions).values({
        id: uuid(), userId: user.id, organizationId: orgId,
        permissions: pick(templateDefs).perms, createdByUserId: founder.id,
      }).run()
      permCount++
    }
  }
  console.log(`  → ${permCount} permissions`)

  // ─── 7. CPA Assignments ──────────────────────────
  console.log('Creating CPA assignments...')
  let cpaAssignCount = 0
  for (const orgId of allOrgs) {
    const numCpas = rand(2, 4)
    const selectedCpas = pickN(allCpas.filter(c => c.status === 'active'), numCpas)
    for (const cpa of selectedCpas) {
      const exists = sqlite.prepare('SELECT 1 FROM cpa_assignments WHERE user_id = ? AND organization_id = ?').get(cpa.id, orgId)
      if (exists) continue
      db.insert(schema.cpaAssignments).values({
        id: uuid(), userId: cpa.id, organizationId: orgId, createdByUserId: adminId,
      }).run()
      const list = orgCpaMap.get(orgId) ?? []
      list.push(cpa.id)
      orgCpaMap.set(orgId, list)
      cpaAssignCount++
    }
  }
  console.log(`  → ${cpaAssignCount} CPA assignments`)

  // ─── 8. Invites ───────────────────────────────────
  console.log('Creating invites...')
  let inviteCount = 0
  for (const orgId of allOrgs.slice(0, 40)) {
    const founder = allUsers.find(u => u.orgId === orgId && u.role === 'founder')
    if (!founder) continue
    for (let j = 0; j < rand(2, 6); j++) {
      const name = genName()
      let email = genEmail(name, 'invited.com')
      while (usedEmails.has(email)) email = genEmail(name + rand(1, 999), 'invited.com')
      usedEmails.add(email)
      const status = pick(['pending', 'pending', 'accepted', 'expired'] as const)
      db.insert(schema.invites).values({
        id: uuid(), email, role: 'team_member', organizationId: orgId,
        invitedByUserId: founder.id, permissions: pick(templateDefs).perms,
        token: crypto.randomBytes(32).toString('hex'), status, expiresAt: futureDate(30),
        acceptedAt: status === 'accepted' ? pastDate(10) : undefined,
      }).run()
      inviteCount++
    }
  }
  console.log(`  → ${inviteCount} invites`)

  // ─── 9. Founder Applications ──────────────────────
  console.log('Creating founder applications...')
  let appCount = 0
  for (const orgId of allOrgs) {
    const founder = allUsers.find(u => u.orgId === orgId && u.role === 'founder')
    if (!founder) continue
    const status = pick(['pending', 'approved', 'approved', 'approved']) as 'pending' | 'approved' | 'rejected'
    db.insert(schema.founderApplications).values({
      id: uuid(), userId: founder.id, organizationId: orgId, email: founder.email,
      passwordHash, name: founder.name, organizationName: genCompanyName(),
      brandName: pick(companyPrefixes), entityType: pick([...entityTypes]),
      legalCompanyName: `${pick(companyPrefixes)} Inc.`,
      registrationNumber: `REG-${rand(100000, 999999)}`, country: pick(countries),
      stateOrJurisdiction: pick(usStates), incorporationDate: pastDate(1000),
      certificateFileName: 'certificate.pdf', certificateStorageUrl: `/uploads/cert-${rand(1000, 9999)}.pdf`,
      parsedCertificateData: { legalCompanyName: 'Parsed Corp', entityType: 'C-Corp', stateOrJurisdiction: 'Delaware', country: 'US' },
      emailVerifiedAt: pastDate(60), onboardingCompletedAt: pastDate(55), status,
      reviewedByUserId: status === 'approved' ? adminId : undefined,
      reviewedAt: status === 'approved' ? pastDate(50) : undefined,
      approvedUserId: status === 'approved' ? founder.id : undefined,
    }).run()
    appCount++
  }
  console.log(`  → ${appCount} founder applications`)

  // ─── 10. Entities ─────────────────────────────────
  console.log('Creating entities...')
  for (const orgId of allOrgs) {
    for (let j = 0; j < rand(ENTITIES_PER_ORG.min, ENTITIES_PER_ORG.max); j++) {
      const entityType = pick([...entityTypes])
      const name = genCompanyName()
      const entityId = uuid()
      const directors = Array.from({ length: rand(1, 4) }, () => ({ name: genName(), title: pick(['Director', 'Independent Director', 'Board Member']) }))
      const officers = [{ name: genName(), title: 'CEO' }, { name: genName(), title: 'CFO' }, ...(rand(0, 1) ? [{ name: genName(), title: 'CTO' }] : [])]
      const shareholders = Array.from({ length: rand(2, 6) }, () => ({ name: genName(), shares: rand(1000, 100000), percentage: randFloat(1, 40) }))

      db.insert(schema.entities).values({
        id: entityId, orgId,
        legalName: `${name} ${entityType === 'LLC' ? 'LLC' : 'Inc.'}`,
        entityType, stateOfIncorporation: pick(usStates), ein: genEIN(),
        majorBusinessActivity: pick(businessActivities),
        fiscalYearEnd: pick(['12-31', '03-31', '06-30', '09-30']),
        foreignSubsidiaries: (rand(0, 2) > 0 ? pickN(foreignSubs, rand(1, 3)).map(s => `${name.split(' ')[0]} ${s}`) : []) as any,
        directors: directors as any, officers: officers as any,
        shareholders: shareholders as any,
        capTable: shareholders.map(s => ({ ...s, type: pick(['Common', 'Preferred A', 'Preferred B']) })) as any,
        sensitiveData: [] as any, country: pick(countries),
        status: pick(['active', 'active', 'active', 'inactive']),
      }).run()
      allEntities.push({ id: entityId, orgId, entityType })
    }
  }
  console.log(`  → ${allEntities.length} entities`)

  // ─── 11. Deadlines ────────────────────────────────
  console.log('Creating deadlines...')
  for (const entity of allEntities) {
    const applicableForms = formTypes.filter(f => f.entityTypes.includes(entity.entityType))
    const numDeadlines = Math.min(rand(DEADLINES_PER_ENTITY.min, DEADLINES_PER_ENTITY.max), applicableForms.length)
    for (const form of pickN(applicableForms, numDeadlines)) {
      const deadlineId = uuid()
      const status = pick([...deadlineStatuses])
      db.insert(schema.deadlines).values({
        id: deadlineId, entityId: entity.id, formType: form.type, formName: form.name,
        dueDate: (status === 'overdue' ? pastDate(60) : futureDate(180)).split('T')[0],
        status, aiPredicted: pick([true, true, true, false]),
        urgencyScore: status === 'overdue' ? rand(80, 100) : rand(10, 70),
        description: `${form.name} for tax year ${rand(2024, 2025)}.`,
      }).run()
      allDeadlines.push({ id: deadlineId, entityId: entity.id, formType: form.type, formName: form.name })
    }
  }
  console.log(`  → ${allDeadlines.length} deadlines`)

  // ─── 12. Filings ──────────────────────────────────
  console.log('Creating filings...')
  for (const orgId of allOrgs) {
    const orgEntities = allEntities.filter(e => e.orgId === orgId)
    const assignedCpaIds = orgCpaMap.get(orgId) ?? []

    for (let j = 0; j < rand(FILINGS_PER_ORG.min, FILINGS_PER_ORG.max); j++) {
      const entity = pick(orgEntities)
      if (!entity) continue
      const entityDeadlines = allDeadlines.filter(d => d.entityId === entity.id)
      const deadline = entityDeadlines.length > 0 ? pick(entityDeadlines) : null
      const status = pick([...filingStatuses])
      const filingId = uuid()
      const taxYear = pick([2024, 2025, 2025, 2025])

      // CPA assigned only after escalation (cpa_review+)
      const cpaId = assignedCpaIds.length > 0 && ['cpa_review', 'founder_approval', 'submitted'].includes(status)
        ? pick(assignedCpaIds) : null

      // Use prefill-style data for prefilled filings, plain data for intake
      const filingData = ['ai_prep', 'cpa_review', 'founder_approval', 'submitted', 'archived'].includes(status)
        ? genFilingData(true)
        : genFilingData(false)

      db.insert(schema.filings).values({
        id: filingId, entityId: entity.id, deadlineId: deadline?.id, orgId,
        formType: deadline?.formType || pick(formTypes).type,
        formName: deadline?.formName || pick(formTypes).name,
        status, cpaAssignedId: cpaId, filingData: filingData as any,
        aiConfidenceScore: ['ai_prep', 'cpa_review', 'founder_approval', 'submitted'].includes(status) ? randFloat(0.6, 0.99) : null,
        aiSummary: ['ai_prep', 'cpa_review', 'founder_approval', 'submitted'].includes(status)
          ? `AI-prepared ${deadline?.formType || 'tax'} filing for TY ${taxYear}. Entity has ${rand(5, 150)} employees across ${rand(1, 5)} states.`
          : null,
        aiReasoning: ['ai_prep', 'cpa_review', 'founder_approval', 'submitted'].includes(status)
          ? 'Data gathered from uploaded documents and intake conversation. Cross-referenced with prior year returns.'
          : null,
        founderApprovedAt: ['submitted', 'archived'].includes(status) ? pastDate(30) : null,
        submittedAt: status === 'submitted' ? pastDate(15) : null,
        taxYear,
      }).run()

      allFilings.push({ id: filingId, orgId, entityId: entity.id, status, cpaAssignedId: cpaId })
    }
  }
  console.log(`  → ${allFilings.length} filings`)

  // ─── 13. Documents ────────────────────────────────
  console.log('Creating documents...')
  let docCount = 0
  for (const orgId of allOrgs) {
    const orgUsers = allUsers.filter(u => u.orgId === orgId)
    const orgFilings = allFilings.filter(f => f.orgId === orgId)
    for (let j = 0; j < rand(DOCS_PER_ORG.min, DOCS_PER_ORG.max); j++) {
      const uploader = pick(orgUsers)
      const filing = orgFilings.length > 0 && rand(0, 1) ? pick(orgFilings) : null
      const fileName = pick(docNames)
      db.insert(schema.documents).values({
        id: uuid(), filingId: filing?.id, orgId, fileName,
        storageUrl: `/uploads/${orgId}/${uuid()}-${fileName}`,
        mimeType: pick(mimeTypes),
        extractedData: rand(0, 1) ? {
          documentType: pick(['W-2', '1099', 'Bank Statement', 'P&L', 'Balance Sheet', 'Invoice']),
          extractedFields: { totalAmount: rand(1000, 5000000), date: pastDate(365).split('T')[0], entity: genCompanyName() },
          confidence: randFloat(0.7, 0.99),
        } : null,
        aiTags: pickN(aiTags, rand(1, 4)) as any,
        confidenceScore: randFloat(0.5, 0.99),
        reviewedByHuman: pick([true, false, false]),
        uploadedById: uploader.id,
      }).run()
      docCount++
    }
  }
  console.log(`  → ${docCount} documents`)

  // ─── 14. Approval Queue ───────────────────────────
  console.log('Creating approval queue entries...')
  let approvalCount = 0
  const approvalFilings = allFilings.filter(f => ['cpa_review', 'founder_approval', 'submitted', 'archived'].includes(f.status))
  for (const filing of approvalFilings) {
    const orgUsers = allUsers.filter(u => u.orgId === filing.orgId)
    const founder = allUsers.find(u => u.orgId === filing.orgId && u.role === 'founder')
    const resolver = pick(orgUsers)

    const cpaStatus = ['founder_approval', 'submitted', 'archived'].includes(filing.status)
      ? 'approved' as const
      : pick(['pending', 'pending', 'approved', 'rejected'] as const)

    db.insert(schema.approvalQueue).values({
      id: uuid(), orgId: filing.orgId, filingId: filing.id, queueType: 'cpa', status: cpaStatus,
      summary: `CPA review for filing ${filing.id.slice(0, 8)}. AI confidence: ${randFloat(0.7, 0.99)}.`,
      aiRecommendation: pick([
        'Recommend approval — all amounts verified against source documents.',
        'Review flagged items before approval — two deductions exceed typical ranges.',
        'Straightforward filing, no issues detected.',
        'Minor discrepancies in Q3 revenue — recommend manual verification.',
      ]),
      rejectionReason: cpaStatus === 'rejected' ? pick(rejectionReasons) : null,
      resolvedAt: cpaStatus !== 'pending' ? pastDate(30) : null,
      resolvedById: cpaStatus !== 'pending' ? resolver.id : null,
    }).run()
    approvalCount++

    // Founder approval entries
    if (['submitted', 'archived'].includes(filing.status)) {
      db.insert(schema.approvalQueue).values({
        id: uuid(), orgId: filing.orgId, filingId: filing.id, queueType: 'founder', status: 'approved',
        summary: `Founder approval for filing ${filing.id.slice(0, 8)}. Ready for submission.`,
        aiRecommendation: 'All items reviewed by CPA. Recommend approval for submission.',
        resolvedAt: pastDate(15), resolvedById: founder?.id || resolver.id,
      }).run()
      approvalCount++
    }
    if (filing.status === 'founder_approval') {
      db.insert(schema.approvalQueue).values({
        id: uuid(), orgId: filing.orgId, filingId: filing.id, queueType: 'founder', status: 'pending',
        summary: `Awaiting founder approval for filing ${filing.id.slice(0, 8)}.`,
        aiRecommendation: 'CPA review complete. Filing is ready for founder sign-off.',
      }).run()
      approvalCount++
    }
  }
  console.log(`  → ${approvalCount} approval queue entries`)

  // ─── 15. Filing Review Locks ──────────────────────
  console.log('Creating filing review locks...')
  let lockCount = 0
  const reviewFilings = allFilings.filter(f => f.status === 'cpa_review')
  for (const filing of reviewFilings) {
    const assignedCpaIds = orgCpaMap.get(filing.orgId) ?? []
    if (assignedCpaIds.length === 0) continue
    // ~60% of cpa_review filings are claimed
    if (rand(0, 10) > 6) continue

    const cpaId = filing.cpaAssignedId || pick(assignedCpaIds)
    db.insert(schema.filingReviewLocks).values({
      id: uuid(), filingId: filing.id, cpaUserId: cpaId,
      status: pick(['active', 'active', 'active', 'completed']),
      releasedAt: rand(0, 5) === 0 ? pastDate(5) : null,
    }).run()
    lockCount++
  }
  // Completed locks for approved filings
  const approvedFilings = allFilings.filter(f => ['founder_approval', 'submitted', 'archived'].includes(f.status) && f.cpaAssignedId)
  for (const filing of approvedFilings) {
    db.insert(schema.filingReviewLocks).values({
      id: uuid(), filingId: filing.id, cpaUserId: filing.cpaAssignedId!,
      status: 'completed', releasedAt: pastDate(20),
    }).run()
    lockCount++
  }
  console.log(`  → ${lockCount} filing review locks`)

  // ─── 16. CPA Notifications ────────────────────────
  console.log('Creating CPA notifications...')
  let notifCount = 0
  // All cpa_review and founder_approval filings had escalation notifications
  const escalatedFilings = allFilings.filter(f => ['cpa_review', 'founder_approval', 'submitted'].includes(f.status))
  for (const filing of escalatedFilings) {
    const cpasToNotify = pickN(allCpas.filter(c => c.status === 'active'), 5)
    for (const cpa of cpasToNotify) {
      const isClaimed = filing.cpaAssignedId === cpa.id
      const isOtherClaimed = filing.cpaAssignedId && filing.cpaAssignedId !== cpa.id
      const notifStatus = isClaimed ? 'approved' as const
        : isOtherClaimed ? 'dismissed' as const
        : pick(['pending', 'pending', 'dismissed'] as const)

      db.insert(schema.cpaNotifications).values({
        id: uuid(), filingId: filing.id, cpaUserId: cpa.id, status: notifStatus,
        respondedAt: notifStatus !== 'pending' ? pastDate(10) : undefined,
      }).run()
      notifCount++
    }
  }
  console.log(`  → ${notifCount} CPA notifications`)

  // ─── 17. CPA Rejections ──────────────────────────
  console.log('Creating CPA rejection history...')
  let rejCount = 0
  // Some ai_prep filings were previously rejected by CPAs
  const rejectedFilings = allFilings.filter(f => f.status === 'ai_prep').slice(0, Math.floor(allFilings.filter(f => f.status === 'ai_prep').length * 0.3))
  for (const filing of rejectedFilings) {
    const assignedCpaIds = orgCpaMap.get(filing.orgId) ?? []
    if (assignedCpaIds.length === 0) continue
    db.insert(schema.cpaRejections).values({
      id: uuid(), filingId: filing.id, cpaUserId: pick(assignedCpaIds),
      reason: pick(rejectionReasons),
    }).run()
    rejCount++
  }
  console.log(`  → ${rejCount} CPA rejections`)

  // ─── 18. Audit Log ────────────────────────────────
  console.log('Creating audit logs...')
  let auditCount = 0
  for (const orgId of allOrgs) {
    const orgUsers = allUsers.filter(u => u.orgId === orgId)
    const orgFilings = allFilings.filter(f => f.orgId === orgId)
    for (let j = 0; j < rand(AUDIT_LOGS_PER_ORG.min, AUDIT_LOGS_PER_ORG.max); j++) {
      const actorType = pick(['ai', 'ai', 'cpa', 'founder', 'system']) as 'ai' | 'cpa' | 'founder' | 'system'
      const actor = actorType !== 'system' && actorType !== 'ai' ? pick(orgUsers) : null
      const filing = orgFilings.length > 0 && rand(0, 1) ? pick(orgFilings) : null

      db.insert(schema.auditLog).values({
        id: uuid(), orgId, filingId: filing?.id, actorType,
        actorId: actorType === 'ai' ? 'gemini-2.5-flash' : actor?.id,
        action: pick(auditActions),
        reasoning: actorType === 'ai'
          ? pick([
              'Analyzed source documents and cross-referenced with prior year data.',
              'Calculated based on entity type, state of incorporation, and fiscal year end.',
              'Extracted fields with high confidence using document vision model.',
              'Risk assessment based on IRS audit selection criteria and filing patterns.',
              'Generated prefill values from intake conversation and uploaded documents.',
            ])
          : pick(['Manual review completed.', 'Verified against original documents.', 'Approved after team discussion.', 'Status updated per workflow requirements.', null]),
        inputs: rand(0, 1) ? { filingId: filing?.id } : null,
        outputs: rand(0, 1) ? { status: 'success', confidence: randFloat(0.6, 0.99) } : null,
        modelVersion: actorType === 'ai' ? pick(['gemini-2.5-flash', 'gemini-2.5-pro']) : null,
        confidenceScore: actorType === 'ai' ? randFloat(0.5, 0.99) : null,
        createdAt: pastDate(90),
      }).run()
      auditCount++
    }
  }
  console.log(`  → ${auditCount} audit log entries`)

  // ─── 19. Agent Conversations ──────────────────────
  console.log('Creating agent conversations...')
  let convCount = 0
  for (const orgId of allOrgs) {
    const orgFilings = allFilings.filter(f => f.orgId === orgId)
    for (let j = 0; j < rand(CONVERSATIONS_PER_ORG.min, CONVERSATIONS_PER_ORG.max); j++) {
      const filing = orgFilings.length > 0 ? pick(orgFilings) : null
      const agentType = pick(agentTypes)
      const numMessages = rand(2, 12)
      const messages = intakeMessages.slice(0, Math.min(numMessages, intakeMessages.length)).map(m => ({
        ...m, timestamp: pastDate(30),
      }))

      db.insert(schema.agentConversations).values({
        id: uuid(), filingId: filing?.id, orgId, agentType,
        messages: messages as any,
        status: pick(['active', 'completed', 'completed', 'completed', 'escalated']),
        createdAt: pastDate(60), updatedAt: pastDate(10),
      }).run()
      convCount++
    }
  }
  console.log(`  → ${convCount} agent conversations`)

  // ─── 20. Chat Messages ────────────────────────────
  console.log('Creating chat messages...')

  const orgChatPool = [
    'Hey team, just uploaded the Q4 bank statements for review.',
    'Can someone double-check the depreciation schedule? Numbers look off.',
    'Reminder: we need to finalize the 1120 before Friday.',
    'The AI prefilled most of the form — looks accurate to me.',
    'I flagged a discrepancy in the contractor payments section.',
    'Meeting with the CPA is scheduled for Thursday at 2pm.',
    'Has anyone reviewed the R&D credit documentation yet?',
    'Updated the cap table — please take a look when you get a chance.',
    'New W-2s just came in from payroll. Uploading now.',
    'Quick question — do we need to file a 5472 this year?',
    'Just got confirmation that our extension was approved.',
    'The estimated tax payment for Q1 is due next week.',
    'Can we schedule a call to discuss the foreign subsidiary reporting?',
    'Thanks for catching that error in the revenue figures!',
    'I added notes about the equipment purchase to the filing.',
    'Looks like we need additional docs for the state filing.',
    'FYI — the AI audit risk score came back at 72. Might need CPA review.',
    'All good on my end. Ready to submit whenever you are.',
    'Did we account for the PPP loan forgiveness in the return?',
    'Sharing the board resolution for the entity restructuring.',
  ]

  const founderChatPool = [
    'Anyone else dealing with late K-1s from their partnerships?',
    'Pro tip: make sure your fiscal year end matches your entity docs.',
    'How are you all handling the new BOI reporting requirements?',
    'Our CPA flagged some issues with our R&D credit — anyone seen this?',
    'Just finished our first filing through TaxOS. Pretty smooth!',
    'Has anyone used the AI advisor for estimated tax calculations?',
    'Reminder about the March 15 deadline for S-Corp returns.',
    'We ended up needing an extension. The AI deadline agent was helpful.',
    'Anyone know if we need to file in every state we have remote employees?',
    'The prefill agent saved us hours on the 1120. Highly recommend.',
    'Quick poll — how many of you have foreign subsidiaries to report?',
    'Our audit risk score was low this year. Fingers crossed.',
    'Just got our refund processed. TaxOS made it painless.',
    'Be careful with the contractor classification — IRS is cracking down.',
    'Thanks to whoever shared the depreciation schedule template!',
    'Our entity restructuring is finally complete. What a process.',
    'Does anyone have experience with the R&D credit safe harbor?',
    'The new chat feature is great for coordinating with the team.',
    'Happy tax season everyone! Almost there.',
    'FYI — state filing deadlines vary. Double check yours.',
  ]

  const cpaChatPool = [
    'Heads up — new IRS guidance on digital asset reporting just dropped.',
    'Has anyone dealt with the updated 5472 requirements this year?',
    'I\'m seeing a lot of R&D credit claims that need better documentation.',
    'Reminder to check state nexus before filing multi-state returns.',
    'The AI prefill is getting better but still needs review on depreciation.',
    'Anyone available to take on a few more cpa_review filings?',
    'Just reviewed a filing with a 92 audit risk score. Fun times.',
    'Pro tip: always verify the EIN matches across all forms.',
    'New client just onboarded — they have 4 entities. Going to be busy.',
    'The round-robin escalation is working well for load balancing.',
    'I rejected a filing — missing contractor 1099s. Common issue.',
    'Quick question about the TCJA provisions for C-Corps this year.',
    'Anyone else seeing issues with the state apportionment calculations?',
    'Just approved 5 filings today. Productive morning!',
    'The document extraction AI is impressive on clean PDFs.',
    'Flagging: some clients are not separating personal and business expenses.',
    'Good practice: always add a note when you reject a filing.',
    'I\'m out Friday — can someone cover my review queue?',
    'The platform notifications are really helpful for tracking filings.',
    'Let\'s standardize our rejection reasons for consistency.',
  ]

  // Founder Network messages — all founders post
  let founderMsgCount = 0
  const founders = allUsers.filter(u => u.role === 'founder')
  for (let i = 0; i < Math.min(founders.length * 3, 200); i++) {
    const sender = pick(founders)
    sqlite.prepare(`INSERT INTO founder_chat_messages (id, sender_id, message, created_at) VALUES (?, ?, ?, ?)`).run(
      uuid(), sender.id, pick(founderChatPool), pastDate(60)
    )
    founderMsgCount++
  }
  console.log(`  → ${founderMsgCount} founder network messages`)

  // CPA Network messages — all CPAs post
  let cpaMsgCount = 0
  const activeCpas = allCpas.filter(c => c.status === 'active')
  for (let i = 0; i < Math.min(activeCpas.length * 4, 200); i++) {
    const sender = pick(activeCpas)
    sqlite.prepare(`INSERT INTO cpa_chat_messages (id, sender_id, message, created_at) VALUES (?, ?, ?, ?)`).run(
      uuid(), sender.id, pick(cpaChatPool), pastDate(45)
    )
    cpaMsgCount++
  }
  console.log(`  → ${cpaMsgCount} CPA network messages`)

  // Org Chat messages — each org's team members + founder post
  let orgMsgCount = 0
  for (const orgId of allOrgs) {
    const orgMembers = allUsers.filter(u => u.orgId === orgId)
    if (orgMembers.length === 0) continue
    const numMsgs = rand(10, 40)
    for (let i = 0; i < numMsgs; i++) {
      const sender = pick(orgMembers)
      sqlite.prepare(`INSERT INTO org_chat_messages (id, org_id, sender_id, message, created_at) VALUES (?, ?, ?, ?, ?)`).run(
        uuid(), orgId, sender.id, pick(orgChatPool), pastDate(30)
      )
      orgMsgCount++
    }
  }
  console.log(`  → ${orgMsgCount} org chat messages`)

  // ─── 21. Email Verification Tokens ────────────────
  console.log('Creating email verification tokens...')
  let tokenCount = 0
  for (const user of allUsers.slice(-50)) {
    db.insert(schema.emailVerificationTokens).values({
      id: uuid(), userId: user.id,
      token: crypto.randomBytes(32).toString('hex'),
      expiresAt: futureDate(7), usedAt: pick([pastDate(5), null, null]),
    }).run()
    tokenCount++
  }
  console.log(`  → ${tokenCount} email verification tokens`)

  // ─── Summary ──────────────────────────────────────
  console.log('\n✅ Fake data seed complete (10x scale)!\n')
  console.log('Summary:')
  console.log(`  Organizations:        ${allOrgs.length + 1} (${allOrgs.length} client + 1 TaxOS admin)`)
  console.log(`  CPAs:                 ${allCpas.length}`)
  console.log(`  Client org users:     ${allUsers.filter(u => u.role !== 'cpa' && u.role !== 'admin').length}`)
  console.log(`  Total users:          ${allUsers.length}`)
  console.log(`  Entities:             ${allEntities.length}`)
  console.log(`  Deadlines:            ${allDeadlines.length}`)
  console.log(`  Filings:              ${allFilings.length}`)
  console.log(`  Documents:            ${docCount}`)
  console.log(`  Approval Queue:       ${approvalCount}`)
  console.log(`  Filing Review Locks:  ${lockCount}`)
  console.log(`  CPA Notifications:    ${notifCount}`)
  console.log(`  CPA Rejections:       ${rejCount}`)
  console.log(`  Audit Log Entries:    ${auditCount}`)
  console.log(`  Agent Conversations:  ${convCount}`)
  console.log(`  Founder Chat Msgs:    ${founderMsgCount}`)
  console.log(`  CPA Chat Msgs:        ${cpaMsgCount}`)
  console.log(`  Org Chat Msgs:        ${orgMsgCount}`)
  console.log(`  Role Templates:       ${allTemplates.length}`)
  console.log(`  Permissions:          ${permCount}`)
  console.log(`  CPA Assignments:      ${cpaAssignCount}`)
  console.log(`  Invites:              ${inviteCount}`)
  console.log(`  Founder Applications: ${appCount}`)
  console.log(`  Email Tokens:         ${tokenCount}`)
  console.log(`\n  Login: superadmin@taxos.ai / admin1234`)
  console.log(`  CPA logins: cpa1@taxos.ai ... cpa5@taxos.ai / password123`)
  console.log(`  All other users: password123`)
}

fakeSeed().catch((error) => {
  console.error('Seed failed:', error)
  process.exit(1)
}).finally(() => {
  sqlite.close()
})
