import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { sql, and, eq } from 'drizzle-orm'
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import * as schema from './schema'
import { getRequirementsForFormType } from '../lib/documentRequirements'

const connectionString = process.env.DATABASE_URL || 'postgres://taxos:taxos@localhost:5432/taxos'
const pool = new Pool({ connectionString })
const db = drizzle(pool, { schema })

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

const vaultNames = [
  'Tax Returns 2025', 'Tax Returns 2024', 'Incorporation Docs', 'Financial Statements',
  'Payroll Records', 'Contractor Agreements', 'Board Resolutions', 'Insurance Policies',
  'Compliance Documents', 'R&D Documentation', 'Cap Table & Equity', 'Legal Agreements',
  'Bank Statements', 'Expense Reports', 'Investor Relations', 'State Filings',
]
const vaultDescriptions = [
  'All federal and state tax return documents and supporting materials.',
  'Financial records including P&L, balance sheets, and cash flow statements.',
  'Payroll records, W-2s, and employment tax documents.',
  'Contractor 1099s, agreements, and payment records.',
  'Corporate governance documents and board meeting minutes.',
  'Business insurance policies and certificates.',
  'Regulatory compliance and licensing documents.',
  'Research & development documentation for tax credit claims.',
  'Capitalization table exports and equity agreements.',
  'Legal contracts, NDAs, and partnership agreements.',
  null, null, null,
]
const folderNames = [
  'Q1', 'Q2', 'Q3', 'Q4', 'Federal', 'State', 'Archive', 'Drafts',
  'Pending Review', 'Approved', 'Receipts', 'Invoices', 'Contracts',
  'Correspondence', 'Supporting Docs', 'Amendments', 'Extensions',
]
const docSummaries = [
  'W-2 wage and tax statement showing total compensation, federal and state withholdings, and social security contributions for the tax year.',
  'Quarterly bank statement showing deposits, withdrawals, and ending balance for business checking account.',
  'Profit and loss statement summarizing revenue, cost of goods sold, operating expenses, and net income.',
  'Balance sheet showing total assets, liabilities, and stockholders equity at fiscal year end.',
  'Invoice summary listing all client invoices issued during the quarter with payment status.',
  '1099-NEC form for independent contractor compensation paid during the tax year.',
  'Certificate of incorporation from the Delaware Secretary of State.',
  'Board resolution authorizing officer compensation and equity grants.',
  'Stock ledger showing all share issuances, transfers, and current ownership percentages.',
  'Payroll summary report with gross wages, tax withholdings, and net pay by employee.',
  'Federal tax payment receipt confirming estimated quarterly tax payment.',
  'Depreciation schedule listing all fixed assets with cost basis, useful life, and accumulated depreciation.',
  'Commercial lease agreement for primary office space.',
  'Business insurance policy covering general liability and professional indemnity.',
  'Cap table export showing current equity ownership distribution among founders and investors.',
  'Bank reconciliation report matching bank statement transactions to accounting records.',
  'Employee expense report with categorized business expenses and receipt attachments.',
  'Accounts receivable aging report showing outstanding invoices by due date.',
  'Accounts payable report listing vendor invoices pending payment.',
  'Trial balance showing all general ledger account balances at period end.',
]
const docKeyEntities = [
  ['Acme Inc', 'IRS', 'Delaware Secretary of State'],
  ['Wells Fargo', 'Silicon Valley Bank', 'Chase Business'],
  ['Revenue', 'Net Income', 'Operating Expenses'],
  ['Total Assets', 'Total Liabilities', 'Retained Earnings'],
  ['Gusto', 'ADP', 'Rippling'],
  ['Form W-2', 'Form 1099', 'Form 1120'],
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
const NUM_ORGS = 100
const NUM_CPAS = 80
const USERS_PER_ORG = { min: 8, max: 22 }
const ENTITIES_PER_ORG = { min: 5, max: 15 }
const DEADLINES_PER_ENTITY = { min: 6, max: 14 }
const FILINGS_PER_ORG = { min: 25, max: 60 }
const DOCS_PER_ORG = { min: 40, max: 120 }
const AUDIT_LOGS_PER_ORG = { min: 80, max: 220 }
const CONVERSATIONS_PER_ORG = { min: 15, max: 45 }
const VAULTS_PER_ORG = { min: 3, max: 7 }
const FOLDERS_PER_VAULT = { min: 3, max: 8 }
const AI_CHATS_PER_USER = { min: 0, max: 5 }
const ORG_CHAT_MSGS_PER_ORG = { min: 25, max: 80 }

async function fakeSeed() {
  console.log('🌱 Starting fake data seed (10x scale)...\n')

  // ─── Clean existing data ──────────────────────────
  console.log('Cleaning existing tables...')
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
  await db.execute(sql.raw(`TRUNCATE TABLE ${TABLES.map(t => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE`))

  const passwordHash = await bcrypt.hash('password123', 10)

  const allOrgs: string[] = []
  const allUsers: { id: string; orgId: string; role: string; email: string; name: string }[] = []
  const allCpas: { id: string; orgId: string; role: string; email: string; status: string; name: string }[] = []
  const allEntities: { id: string; orgId: string; entityType: string }[] = []
  const allDeadlines: { id: string; entityId: string; formType: string; formName: string }[] = []
  const allFilings: { id: string; orgId: string; entityId: string; status: string; cpaAssignedId: string | null; formType: string }[] = []
  const allTemplates: { id: string; orgId: string | null }[] = []
  const orgCpaMap = new Map<string, string[]>()
  const allVaults: { id: string; orgId: string }[] = []
  const allFolders: { id: string; vaultId: string }[] = []

  // ─── 1. Organizations ─────────────────────────────
  // First org is the hardcoded demo org; rest are random
  console.log(`Creating ${NUM_ORGS} organizations...`)
  let demoOrgId = ''
  for (let i = 0; i < NUM_ORGS; i++) {
    const isDemo = i === 0
    const name = isDemo ? 'Acme Technologies' : genCompanyName()
    const orgId = uuid()
    if (isDemo) demoOrgId = orgId
    await db.insert(schema.organizations).values({
      id: orgId,
      name,
      legalName: `${name} Inc.`,
      registrationNumber: isDemo ? 'REG-DEMO-001' : `REG-${rand(100000, 999999)}`,
      incorporationCountry: isDemo ? 'US' : pick(countries),
      incorporationState: isDemo ? 'Delaware' : pick(usStates),
      incorporationDate: pastDate(1500),
      plan: isDemo ? 'pro' : pick(['free', 'starter', 'pro', 'pro', 'pro']),
    })
    allOrgs.push(orgId)
  }

  // ─── 2. Admin org + admin user ────────────────────
  const adminOrgId = uuid()
  await db.insert(schema.organizations).values({
    id: adminOrgId,
    name: 'TaxOS Platform',
    legalName: 'TaxOS Platform Inc.',
    plan: 'pro',
  })

  const adminId = uuid()
  const adminHash = await bcrypt.hash('admin1234', 10)
  await db.insert(schema.users).values({
    id: adminId,
    orgId: adminOrgId,
    email: 'superadmin@taxos.ai',
    passwordHash: adminHash,
    name: 'Platform Admin',
    role: 'admin',
    status: 'active',
    isVerified: true,
  })
  allUsers.push({ id: adminId, orgId: adminOrgId, role: 'admin', email: 'superadmin@taxos.ai', name: 'Platform Admin' })

  // ─── 3. CPAs ──────────────────────────────────────
  // First CPA is the hardcoded demo CPA; rest are random
  console.log(`Creating ${NUM_CPAS} CPAs...`)
  const usedEmails = new Set<string>(['superadmin@taxos.ai', 'founder@demo.taxos.ai', 'team@demo.taxos.ai', 'cpa@demo.taxos.ai'])

  let demoCpaId = ''
  for (let i = 0; i < NUM_CPAS; i++) {
    const isDemo = i === 0
    const name = isDemo ? 'Sam Rivera' : genName()
    const domain = 'taxos-cpas.com'
    let email = isDemo ? 'cpa@demo.taxos.ai' : genEmail(name, domain)
    if (!isDemo) {
      while (usedEmails.has(email)) email = genEmail(name + rand(1, 999), domain)
    }
    usedEmails.add(email)

    const cpaId = uuid()
    if (isDemo) demoCpaId = cpaId
    const status = i < 15 ? 'active' as const : pick(['active', 'active', 'pending_admin_review'] as const)
    const cpaName = `${name}, CPA`

    await db.insert(schema.users).values({
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
    })

    allCpas.push({ id: cpaId, orgId: adminOrgId, role: 'cpa', email, status, name: cpaName })
    allUsers.push({ id: cpaId, orgId: adminOrgId, role: 'cpa', email, name: cpaName })
  }

  // Deterministic CPA logins (skip demo CPA at index 0)
  for (let i = 1; i < Math.min(6, allCpas.length); i++) {
    const cpa = allCpas[i]
    const newEmail = `cpa${i}@taxos.ai`
    await db.update(schema.users).set({ email: newEmail, name: cpa.name }).where(eq(schema.users.id, cpa.id))
    cpa.email = newEmail
    usedEmails.add(newEmail)
  }

  console.log(`  → ${allCpas.length} CPAs created`)

  // ─── 4. Client org users ──────────────────────────
  // For the demo org (first org), founder and first team member get hardcoded emails
  console.log('Creating client org users...')
  let demoFounderId = ''
  for (const orgId of allOrgs) {
    const isDemo = orgId === demoOrgId
    const numUsers = rand(USERS_PER_ORG.min, USERS_PER_ORG.max)
    const roles: Array<'founder' | 'team_member'> = ['founder']
    for (let j = 1; j < numUsers; j++) roles.push('team_member')

    for (let j = 0; j < numUsers; j++) {
      const isFounderDemo = isDemo && j === 0
      const isTeamDemo = isDemo && j === 1
      const name = isFounderDemo ? 'Alex Morgan' : isTeamDemo ? 'Jordan Lee' : genName()
      const domain = `${pick(companyPrefixes).toLowerCase()}.com`
      let email = isFounderDemo ? 'founder@demo.taxos.ai' : isTeamDemo ? 'team@demo.taxos.ai' : genEmail(name, domain)
      if (!isFounderDemo && !isTeamDemo) {
        let attempt = 0
        while (usedEmails.has(email)) email = genEmail(name + (++attempt), domain)
      }
      usedEmails.add(email)

      const userId = uuid()
      if (isFounderDemo) demoFounderId = userId
      const role = roles[j] || 'team_member'
      const status = (j === 0 || isTeamDemo) ? 'active' as const : pick(['active', 'active', 'active', 'pending_admin_review'] as const)

      await db.insert(schema.users).values({
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
      })

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
    await db.insert(schema.roleTemplates).values({
      id: tplId, name: tpl.name, scope: 'global', organizationId: null,
      createdByUserId: adminId, permissions: tpl.perms, isSystemTemplate: true,
    })
    allTemplates.push({ id: tplId, orgId: null })
  }

  for (const orgId of allOrgs.slice(0, 20)) {
    const founder = allUsers.find(u => u.orgId === orgId && u.role === 'founder')
    if (!founder) continue
    const tplId = uuid()
    await db.insert(schema.roleTemplates).values({
      id: tplId,
      name: `${pick(['Ops', 'Tax', 'Finance', 'Compliance', 'Legal'])} Specialist`,
      scope: 'organization', organizationId: orgId, createdByUserId: founder.id,
      permissions: pick(templateDefs).perms, isSystemTemplate: false,
    })
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
      await db.insert(schema.permissions).values({
        id: uuid(), userId: user.id, organizationId: orgId,
        permissions: pick(templateDefs).perms, createdByUserId: founder.id,
      })
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
      const exists = (await db.select().from(schema.cpaAssignments)
        .where(and(eq(schema.cpaAssignments.userId, cpa.id), eq(schema.cpaAssignments.organizationId, orgId)))
        .limit(1))[0]
      if (exists) continue
      await db.insert(schema.cpaAssignments).values({
        id: uuid(), userId: cpa.id, organizationId: orgId, createdByUserId: adminId,
      })
      const list = orgCpaMap.get(orgId) ?? []
      list.push(cpa.id)
      orgCpaMap.set(orgId, list)
      cpaAssignCount++
    }
  }
  // Ensure demo CPA is assigned to demo org
  const demoCpaAssigned = (await db.select().from(schema.cpaAssignments)
    .where(and(eq(schema.cpaAssignments.userId, demoCpaId), eq(schema.cpaAssignments.organizationId, demoOrgId)))
    .limit(1))[0]
  if (!demoCpaAssigned) {
    await db.insert(schema.cpaAssignments).values({
      id: uuid(), userId: demoCpaId, organizationId: demoOrgId, createdByUserId: adminId,
    })
    const list = orgCpaMap.get(demoOrgId) ?? []
    list.push(demoCpaId)
    orgCpaMap.set(demoOrgId, list)
    cpaAssignCount++
  }
  console.log(`  → ${cpaAssignCount} CPA assignments`)

  // ─── 8. Invites ───────────────────────────────────
  console.log('Creating invites...')
  let inviteCount = 0
  for (const orgId of allOrgs.slice(0, Math.floor(allOrgs.length * 0.75))) {
    const founder = allUsers.find(u => u.orgId === orgId && u.role === 'founder')
    if (!founder) continue
    for (let j = 0; j < rand(3, 10); j++) {
      const name = genName()
      let email = genEmail(name, 'invited.com')
      while (usedEmails.has(email)) email = genEmail(name + rand(1, 999), 'invited.com')
      usedEmails.add(email)
      const status = pick(['pending', 'pending', 'accepted', 'expired'] as const)
      await db.insert(schema.invites).values({
        id: uuid(), email, role: 'team_member', organizationId: orgId,
        invitedByUserId: founder.id, permissions: pick(templateDefs).perms,
        token: crypto.randomBytes(32).toString('hex'), status, expiresAt: futureDate(30),
        acceptedAt: status === 'accepted' ? pastDate(10) : undefined,
      })
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
    await db.insert(schema.founderApplications).values({
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
    })
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

      await db.insert(schema.entities).values({
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
      })
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
      await db.insert(schema.deadlines).values({
        id: deadlineId, entityId: entity.id, formType: form.type, formName: form.name,
        dueDate: (status === 'overdue' ? pastDate(60) : futureDate(180)).split('T')[0],
        status, aiPredicted: pick([true, true, true, false]),
        urgencyScore: status === 'overdue' ? rand(80, 100) : rand(10, 70),
        description: `${form.name} for tax year ${rand(2024, 2025)}.`,
      })
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

      // Pause / stop states — rare, only meaningful on non-terminal statuses.
      const canPause = ['cpa_review', 'founder_approval'].includes(status)
      const canStop = !['submitted', 'archived'].includes(status)
      const paused = canPause && rand(0, 14) === 0
      const stopped = !paused && canStop && rand(0, 29) === 0

      const chosenFormType = deadline?.formType || pick(formTypes).type
      const chosenFormName = deadline?.formName || pick(formTypes).name

      await db.insert(schema.filings).values({
        id: filingId, entityId: entity.id, deadlineId: deadline?.id, orgId,
        formType: chosenFormType,
        formName: chosenFormName,
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
        paused,
        stopped,
      })

      allFilings.push({ id: filingId, orgId, entityId: entity.id, status, cpaAssignedId: cpaId, formType: chosenFormType })
    }
  }
  console.log(`  → ${allFilings.length} filings`)

  // ─── 12b. Vaults & Folders ─────────────────────────
  console.log('Creating vaults and folders...')
  let folderCount = 0
  for (const orgId of allOrgs) {
    const founder = allUsers.find(u => u.orgId === orgId && u.role === 'founder')
    if (!founder) continue
    const numVaults = rand(VAULTS_PER_ORG.min, VAULTS_PER_ORG.max)
    const chosenVaultNames = pickN(vaultNames, numVaults)

    for (const vName of chosenVaultNames) {
      const vaultId = uuid()
      await db.insert(schema.vaults).values({
        id: vaultId, orgId, name: vName,
        description: pick(vaultDescriptions),
        createdById: founder.id,
        createdAt: pastDate(120), updatedAt: pastDate(30),
      })
      allVaults.push({ id: vaultId, orgId })

      // Folders within vault
      const numFolders = rand(FOLDERS_PER_VAULT.min, FOLDERS_PER_VAULT.max)
      const chosenFolderNames = pickN(folderNames, numFolders)
      for (const fName of chosenFolderNames) {
        const folderId = uuid()
        await db.insert(schema.folders).values({
          id: folderId, vaultId, parentId: null,
          name: fName, createdById: founder.id,
          createdAt: pastDate(90),
        })
        allFolders.push({ id: folderId, vaultId })
        folderCount++

        // Occasional sub-folder
        if (rand(0, 3) === 0) {
          const subId = uuid()
          await db.insert(schema.folders).values({
            id: subId, vaultId, parentId: folderId,
            name: pick(['Archive', 'Reviewed', 'Drafts', 'Final']),
            createdById: founder.id, createdAt: pastDate(60),
          })
          allFolders.push({ id: subId, vaultId })
          folderCount++
        }
      }
    }
  }
  console.log(`  → ${allVaults.length} vaults, ${folderCount} folders`)

  // ─── 13. Documents ────────────────────────────────
  console.log('Creating documents...')
  const allDocIds: { id: string; orgId: string; vaultId: string | null; extractionStatus: string; filingId: string | null; fileName: string; mimeType: string }[] = []
  let docCount = 0
  for (const orgId of allOrgs) {
    const orgUsers = allUsers.filter(u => u.orgId === orgId)
    const orgFilings = allFilings.filter(f => f.orgId === orgId)
    const orgVaults = allVaults.filter(v => v.orgId === orgId)
    const orgFolders = allFolders.filter(f => orgVaults.some(v => v.id === f.vaultId))

    for (let j = 0; j < rand(DOCS_PER_ORG.min, DOCS_PER_ORG.max); j++) {
      const uploader = pick(orgUsers)
      const filing = orgFilings.length > 0 && rand(0, 1) ? pick(orgFilings) : null
      const fileName = pick(docNames)
      const mimeType = pick(mimeTypes)
      // ~70% of docs go into a vault
      const vault = orgVaults.length > 0 && rand(0, 9) < 7 ? pick(orgVaults) : null
      const vaultFolders = vault ? orgFolders.filter(f => f.vaultId === vault.id) : []
      const folder = vaultFolders.length > 0 && rand(0, 1) ? pick(vaultFolders) : null

      // Realistic size distribution: most ≤ 1 MB (go to Cloudinary), some larger.
      const sizeBucket = rand(0, 99)
      const fileSize = sizeBucket < 70
        ? rand(20_000, 900_000)           // ≤ 1 MB → uploaded to Cloudinary
        : sizeBucket < 90
          ? rand(1_100_000, 5_000_000)    // > 1 MB → skipped
          : rand(5_000_000, 18_000_000)   // way over limit → skipped

      const isLarge = fileSize > 1024 * 1024

      // Upload status: large files skipped; small files mostly uploaded, a few failed.
      const uploadRoll = rand(0, 99)
      const uploadStatus = isLarge
        ? 'skipped'
        : uploadRoll < 92
          ? 'uploaded'
          : uploadRoll < 97
            ? 'failed'
            : 'uploading'
      const uploadError = uploadStatus === 'failed'
        ? pick([
            'Cloudinary rate limit exceeded',
            'Network timeout during upload',
            'Invalid mime type rejected by CDN',
            'Upstream 502 from cloudinary',
          ])
        : null

      // Extraction status: mostly done when upload succeeded; some failures/in-flight.
      const extractRoll = rand(0, 99)
      const extractionStatus = extractRoll < 75
        ? 'done'
        : extractRoll < 85
          ? 'failed'
          : extractRoll < 92
            ? 'extracting'
            : extractRoll < 97
              ? 'processing'
              : 'pending'
      const extractionError = extractionStatus === 'failed'
        ? pick([
            'Gemini output parsing failed',
            'Document vision model unavailable',
            'PDF appears corrupted or password-protected',
            'Extraction timed out after 30s',
          ])
        : null

      const publicId = uploadStatus === 'uploaded'
        ? `taxos/documents/${fileName.replace(/\.[^.]+$/, '')}_${rand(100000, 999999)}`
        : null
      const resourceType = uploadStatus === 'uploaded'
        ? (mimeType.startsWith('image/') ? 'image' : 'raw')
        : null
      const storageUrl = uploadStatus === 'uploaded'
        ? `https://res.cloudinary.com/demo/${resourceType}/upload/v${rand(1600000000, 1730000000)}/${publicId}.${pick(['pdf', 'png', 'jpg'])}`
        : '' // sentinel for "not uploaded" — column is NOT NULL in legacy schema

      const docId = uuid()
      await db.insert(schema.documents).values({
        id: docId, filingId: filing?.id, orgId, fileName,
        vaultId: vault?.id || null,
        folderId: folder?.id || null,
        storageUrl,
        cloudinaryPublicId: publicId,
        cloudinaryResourceType: resourceType,
        fileSize,
        mimeType,
        extractedData: extractionStatus === 'done' && rand(0, 9) < 8 ? {
          documentType: pick(['W-2', '1099', 'Bank Statement', 'P&L', 'Balance Sheet', 'Invoice']),
          extractedFields: { totalAmount: rand(1000, 5000000), date: pastDate(365).split('T')[0], entity: genCompanyName() },
          confidence: randFloat(0.7, 0.99),
        } : null,
        aiTags: pickN(aiTags, rand(1, 4)) as any,
        confidenceScore: extractionStatus === 'done' ? randFloat(0.5, 0.99) : null,
        uploadStatus,
        extractionStatus,
        uploadError,
        extractionError,
        reviewedByHuman: false,
        uploadedById: uploader.id,
      })
      allDocIds.push({
        id: docId,
        orgId,
        vaultId: vault?.id || null,
        extractionStatus,
        filingId: filing?.id || null,
        fileName,
        mimeType,
      })
      docCount++
    }
  }
  console.log(`  → ${docCount} documents`)

  // ─── 13b. Document Contexts ───────────────────────
  console.log('Creating document contexts...')
  let contextCount = 0
  for (const doc of allDocIds) {
    // Only docs whose extraction completed get a saved context row.
    if (doc.extractionStatus !== 'done') continue
    const summary = pick(docSummaries)
    const entities = pick(docKeyEntities)
    const revenue = rand(50000, 10000000)
    const expenses = rand(30000, revenue)

    await db.insert(schema.documentContexts).values({
      id: uuid(),
      documentId: doc.id,
      orgId: doc.orgId,
      vaultId: doc.vaultId || null,
      rawText: `${summary}\n\nTotal Revenue: $${revenue.toLocaleString()}\nTotal Expenses: $${expenses.toLocaleString()}\nNet Income: $${(revenue - expenses).toLocaleString()}\nTax Year: ${pick([2024, 2025])}\nEntity: ${genCompanyName()} Inc.\nEIN: ${genEIN()}\nState: ${pick(usStates)}\nFiscal Year End: ${pick(['12-31', '03-31', '06-30'])}\n\nAdditional details: ${pick(['Includes depreciation of $' + rand(10000, 500000).toLocaleString(), 'R&D expenses of $' + rand(50000, 2000000).toLocaleString(), 'Contractor payments totaling $' + rand(20000, 800000).toLocaleString(), 'Foreign income of $' + rand(10000, 1000000).toLocaleString()])}`,
      summary,
      keyEntities: entities as any,
      metadata: {
        documentType: pick(['W-2', '1099', 'Bank Statement', 'P&L', 'Balance Sheet', 'Invoice', 'Tax Return', 'Payroll Report']),
        date: pastDate(365).split('T')[0],
        parties: [genCompanyName(), genName()],
        amounts: [`$${revenue.toLocaleString()}`, `$${expenses.toLocaleString()}`],
        references: [`EIN: ${genEIN()}`, `Ref: ${rand(100000, 999999)}`],
      } as any,
      chunkIndex: 0,
    })
    contextCount++
  }
  console.log(`  → ${contextCount} document contexts`)

  // ─── 13c. Filing Document Requirements ───────────────
  // For every filing: generate a checklist from its formType. Attach existing
  // docs linked to that filing to the first N slots; mark some as skipped with
  // a remark; flip viewedByCpa=true for filings that have advanced to / past
  // CPA review.
  console.log('Creating filing document requirements...')
  const skipReasonPool = [
    'Not applicable for this tax year.',
    'Document is still being prepared by the bookkeeper.',
    'Information included in the prior-year return.',
    'No activity in this category this year.',
    'Will be provided directly to the CPA out of band.',
  ]
  let reqCount = 0
  let reqSkippedCount = 0
  let reqLinkedCount = 0
  let reqViewedCount = 0
  for (const filing of allFilings) {
    const templates = getRequirementsForFormType(filing.formType)
    // Pool of docs already tied to this filing
    const filingDocs = allDocIds.filter(d => d.filingId === filing.id)
    // Shuffle so different templates grab different docs
    const docPool = [...filingDocs].sort(() => Math.random() - 0.5)

    const canLinkDocs = ['ai_prep', 'cpa_review', 'founder_approval', 'submitted', 'archived'].includes(filing.status)
    const shouldMarkViewed = ['founder_approval', 'submitted', 'archived'].includes(filing.status)
      || (filing.status === 'cpa_review' && filing.cpaAssignedId)

    for (let i = 0; i < templates.length; i++) {
      const t = templates[i]
      let linkedDocId: string | null = null
      let skipped = false
      let skipReason: string | null = null
      let viewedByCpa = false
      let viewedAt: string | null = null
      let viewedByUserId: string | null = null

      if (canLinkDocs) {
        // Required slots: ~80% linked, ~10% skipped, rest pending.
        // Optional slots: ~40% linked, ~5% skipped.
        const roll = rand(0, 99)
        if (t.required) {
          if (roll < 80 && docPool.length > 0) {
            linkedDocId = docPool.shift()!.id
            reqLinkedCount++
          } else if (roll < 90) {
            skipped = true
            skipReason = pick(skipReasonPool)
            reqSkippedCount++
          }
        } else {
          if (roll < 40 && docPool.length > 0) {
            linkedDocId = docPool.shift()!.id
            reqLinkedCount++
          } else if (roll < 45) {
            skipped = true
            skipReason = pick(skipReasonPool)
            reqSkippedCount++
          }
        }
      }

      // CPA view state — only if the filing is at / past cpa_review
      if (shouldMarkViewed && (linkedDocId || skipped || t.required)) {
        // Mark most of them viewed; leave a few unviewed at cpa_review to
        // simulate in-progress review.
        const viewChance = filing.status === 'cpa_review' ? 70 : 95
        if (rand(0, 99) < viewChance) {
          viewedByCpa = true
          viewedAt = pastDate(20)
          viewedByUserId = filing.cpaAssignedId
          reqViewedCount++
        }
      }

      await db.insert(schema.filingDocumentRequirements).values({
        id: uuid(),
        filingId: filing.id,
        slotKey: t.slot,
        label: t.label,
        description: t.description ?? null,
        required: t.required,
        sortOrder: i,
        documentId: linkedDocId,
        skipped,
        skipReason,
        viewedByCpa,
        viewedAt: viewedAt ?? undefined,
        viewedByUserId: viewedByUserId ?? undefined,
      })
      reqCount++
    }
  }
  console.log(`  → ${reqCount} requirement rows (${reqLinkedCount} linked, ${reqSkippedCount} skipped, ${reqViewedCount} CPA-viewed)`)

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

    await db.insert(schema.approvalQueue).values({
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
    })
    approvalCount++

    // Founder approval entries
    if (['submitted', 'archived'].includes(filing.status)) {
      await db.insert(schema.approvalQueue).values({
        id: uuid(), orgId: filing.orgId, filingId: filing.id, queueType: 'founder', status: 'approved',
        summary: `Founder approval for filing ${filing.id.slice(0, 8)}. Ready for submission.`,
        aiRecommendation: 'All items reviewed by CPA. Recommend approval for submission.',
        resolvedAt: pastDate(15), resolvedById: founder?.id || resolver.id,
      })
      approvalCount++
    }
    if (filing.status === 'founder_approval') {
      await db.insert(schema.approvalQueue).values({
        id: uuid(), orgId: filing.orgId, filingId: filing.id, queueType: 'founder', status: 'pending',
        summary: `Awaiting founder approval for filing ${filing.id.slice(0, 8)}.`,
        aiRecommendation: 'CPA review complete. Filing is ready for founder sign-off.',
      })
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
    await db.insert(schema.filingReviewLocks).values({
      id: uuid(), filingId: filing.id, cpaUserId: cpaId,
      status: pick(['active', 'active', 'active', 'completed']),
      releasedAt: rand(0, 5) === 0 ? pastDate(5) : null,
    })
    lockCount++
  }
  // Completed locks for approved filings
  const approvedFilings = allFilings.filter(f => ['founder_approval', 'submitted', 'archived'].includes(f.status) && f.cpaAssignedId)
  for (const filing of approvedFilings) {
    await db.insert(schema.filingReviewLocks).values({
      id: uuid(), filingId: filing.id, cpaUserId: filing.cpaAssignedId!,
      status: 'completed', releasedAt: pastDate(20),
    })
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

      await db.insert(schema.cpaNotifications).values({
        id: uuid(), filingId: filing.id, cpaUserId: cpa.id, status: notifStatus,
        respondedAt: notifStatus !== 'pending' ? pastDate(10) : undefined,
      })
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
    await db.insert(schema.cpaRejections).values({
      id: uuid(), filingId: filing.id, cpaUserId: pick(assignedCpaIds),
      reason: pick(rejectionReasons),
    })
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

      await db.insert(schema.auditLog).values({
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
      })
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

      await db.insert(schema.agentConversations).values({
        id: uuid(), filingId: filing?.id, orgId, agentType,
        messages: messages as any,
        status: pick(['active', 'completed', 'completed', 'completed', 'escalated']),
        createdAt: pastDate(60), updatedAt: pastDate(10),
      })
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
  for (let i = 0; i < Math.min(founders.length * 8, 1500); i++) {
    const sender = pick(founders)
    await db.insert(schema.founderChatMessages).values({
      id: uuid(),
      senderId: sender.id,
      message: pick(founderChatPool),
      createdAt: pastDate(60),
    })
    founderMsgCount++
  }
  console.log(`  → ${founderMsgCount} founder network messages`)

  // CPA Network messages — all CPAs post
  let cpaMsgCount = 0
  const activeCpas = allCpas.filter(c => c.status === 'active')
  for (let i = 0; i < Math.min(activeCpas.length * 10, 1200); i++) {
    const sender = pick(activeCpas)
    await db.insert(schema.cpaChatMessages).values({
      id: uuid(),
      senderId: sender.id,
      message: pick(cpaChatPool),
      createdAt: pastDate(45),
    })
    cpaMsgCount++
  }
  console.log(`  → ${cpaMsgCount} CPA network messages`)

  // Org Chat messages — each org's team members + founder post
  let orgMsgCount = 0
  for (const orgId of allOrgs) {
    const orgMembers = allUsers.filter(u => u.orgId === orgId)
    if (orgMembers.length === 0) continue
    const numMsgs = rand(ORG_CHAT_MSGS_PER_ORG.min, ORG_CHAT_MSGS_PER_ORG.max)
    for (let i = 0; i < numMsgs; i++) {
      const sender = pick(orgMembers)
      await db.insert(schema.orgChatMessages).values({
        id: uuid(),
        orgId,
        senderId: sender.id,
        message: pick(orgChatPool),
        createdAt: pastDate(30),
      })
      orgMsgCount++
    }
  }
  console.log(`  → ${orgMsgCount} org chat messages`)

  // ─── 20b. AI Chat (Inkle AI) conversations ───────────
  console.log('Creating AI chat conversations...')
  const aiChatPrompts = [
    { q: 'What tax forms do I need to file as a Delaware C-Corp?', a: 'A Delaware C-Corp typically files Form 1120 federally, plus state-level corporate income tax in every state where you have nexus. You\'ll also file a Delaware Annual Franchise Tax Report. If you have foreign shareholders, a Form 5472 may apply.' },
    { q: 'How do I calculate the R&D tax credit?', a: 'The R&D credit under Section 41 is calculated as 20% of qualified research expenses (QREs) above a base amount, or via the Alternative Simplified Credit (ASC) at 14% of QREs above 50% of the prior 3-year average. Most startups use ASC for simplicity.' },
    { q: 'Can I deduct my home office if I work from home full-time?', a: 'For a C-Corp or S-Corp, you can reimburse home office expenses through an accountable plan. For a single-member LLC, use Form 8829 — the simplified method is $5/sqft up to 300 sqft.' },
    { q: 'What is the deadline for 1099-NEC filings?', a: 'Form 1099-NEC must be filed with the IRS and furnished to recipients by January 31. There is no automatic extension for this form — penalties start immediately at $50 per form.' },
    { q: 'How do I handle foreign subsidiary income on my corporate return?', a: 'You generally report Subpart F income and GILTI on Form 5471 schedules. GILTI is calculated as net CFC income minus a 10% deemed return on tangible assets. It flows through to your 1120 via Schedule I.' },
    { q: 'What is Section 174 capitalization and how does it affect me?', a: 'Post-TCJA (starting 2022), you must capitalize and amortize R&E expenses over 5 years (15 years for foreign research). This applies even if you historically deducted them currently. It may significantly increase your taxable income.' },
    { q: 'How do quarterly estimated tax payments work for C-Corps?', a: 'C-Corps must pay 25% of the required annual payment by the 15th day of the 4th, 6th, 9th, and 12th months. The required payment is the lesser of 100% of current year or 100% of prior year tax (110% if prior year AGI > $1M).' },
    { q: 'Do I need to file a BOI report?', a: 'Most domestic entities created before Jan 1, 2024 had until Jan 1, 2025 to file. New entities file within 30 days of formation. Recent court rulings have changed enforcement — check current FinCEN guidance before filing.' },
    { q: 'Can I deduct stock-based compensation?', a: 'Yes, but the timing and amount of the deduction depend on the award type. ISOs generally produce no deduction. NSOs and RSUs produce a deduction equal to the employee\'s ordinary income in the year of vesting or exercise.' },
    { q: 'What records do I need to keep for a tax audit?', a: 'Keep source documents (receipts, invoices, bank statements), filed returns, supporting schedules, and correspondence for at least 3 years after filing (7 years if you had a loss carryforward). Digital copies are acceptable.' },
  ]
  let aiChatCount = 0
  for (const user of allUsers) {
    // CPAs + admins don\'t typically have per-org AI chats.
    if (user.role === 'cpa' || user.role === 'admin') continue
    const num = rand(AI_CHATS_PER_USER.min, AI_CHATS_PER_USER.max)
    for (let j = 0; j < num; j++) {
      const exchanges = pickN(aiChatPrompts, rand(1, 4))
      const baseDate = pastDate(45)
      const messages: Array<{ role: string; content: string; timestamp: string }> = []
      for (const ex of exchanges) {
        messages.push({ role: 'user', content: ex.q, timestamp: baseDate })
        messages.push({ role: 'assistant', content: ex.a, timestamp: baseDate })
      }
      const title = exchanges[0].q.length > 60 ? exchanges[0].q.slice(0, 57) + '...' : exchanges[0].q
      await db.insert(schema.aiChatConversations).values({
        id: uuid(),
        userId: user.id,
        orgId: user.orgId,
        title,
        messages: messages as any,
        createdAt: baseDate,
        updatedAt: pastDate(15),
      })
      aiChatCount++
    }
  }
  console.log(`  → ${aiChatCount} AI chat conversations`)

  // ─── 21. Email Verification Tokens ────────────────
  console.log('Creating email verification tokens...')
  let tokenCount = 0
  for (const user of allUsers.slice(-250)) {
    await db.insert(schema.emailVerificationTokens).values({
      id: uuid(), userId: user.id,
      token: crypto.randomBytes(32).toString('hex'),
      expiresAt: futureDate(7), usedAt: pick([pastDate(5), null, null]),
    })
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
  console.log(`  Vaults:               ${allVaults.length}`)
  console.log(`  Folders:              ${folderCount}`)
  console.log(`  Documents:            ${docCount}`)
  console.log(`  Document Contexts:    ${contextCount}`)
  console.log(`  Filing Requirements:  ${reqCount} (${reqLinkedCount} linked · ${reqSkippedCount} skipped · ${reqViewedCount} CPA-viewed)`)
  console.log(`  Approval Queue:       ${approvalCount}`)
  console.log(`  Filing Review Locks:  ${lockCount}`)
  console.log(`  CPA Notifications:    ${notifCount}`)
  console.log(`  CPA Rejections:       ${rejCount}`)
  console.log(`  Audit Log Entries:    ${auditCount}`)
  console.log(`  Agent Conversations:  ${convCount}`)
  console.log(`  AI Chat Sessions:     ${aiChatCount}`)
  console.log(`  Founder Chat Msgs:    ${founderMsgCount}`)
  console.log(`  CPA Chat Msgs:        ${cpaMsgCount}`)
  console.log(`  Org Chat Msgs:        ${orgMsgCount}`)
  console.log(`  Role Templates:       ${allTemplates.length}`)
  console.log(`  Permissions:          ${permCount}`)
  console.log(`  CPA Assignments:      ${cpaAssignCount}`)
  console.log(`  Invites:              ${inviteCount}`)
  console.log(`  Founder Applications: ${appCount}`)
  console.log(`  Email Tokens:         ${tokenCount}`)
  console.log(`\n  Login credentials:`)
  console.log(`    Admin:       superadmin@taxos.ai / admin1234`)
  console.log(`    Founder:     founder@demo.taxos.ai / password123`)
  console.log(`    Team Member: team@demo.taxos.ai / password123`)
  console.log(`    CPA:         cpa@demo.taxos.ai / password123`)
  console.log(`    Other CPAs:  cpa1@taxos.ai ... cpa5@taxos.ai / password123`)
}

fakeSeed().catch((error) => {
  console.error('Seed failed:', error)
  process.exit(1)
}).finally(async () => {
  await pool.end()
})
