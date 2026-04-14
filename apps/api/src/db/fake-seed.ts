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
]
const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
  'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
  'Patel', 'Kumar', 'Chen', 'Yamamoto', 'Santos', 'Khan', 'Ivanov', 'Kim',
]
const companyPrefixes = [
  'Apex', 'Nova', 'Vertex', 'Quantum', 'Stellar', 'Nimbus', 'Helix', 'Orion',
  'Cipher', 'Fusion', 'Prism', 'Vortex', 'Zenith', 'Atlas', 'Bolt', 'Crux',
  'Echo', 'Flux', 'Glyph', 'Ionic', 'Kite', 'Lumen', 'Metro', 'Nexus',
  'Opal', 'Pixel', 'Quasar', 'Relay', 'Spark', 'Tidal', 'Unity', 'Wave',
]
const companySuffixes = [
  'Technologies', 'Labs', 'Systems', 'Solutions', 'AI', 'Software', 'Cloud',
  'Digital', 'Robotics', 'Bio', 'Health', 'Finance', 'Analytics', 'Data',
  'Dynamics', 'Ventures', 'Works', 'Logic', 'Ops', 'Hub',
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
  'Biotechnology Research',
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
  'filing.created', 'filing.status_changed', 'filing.prefill_completed', 'filing.risk_scored',
  'document.uploaded', 'document.extracted', 'document.reviewed', 'intake.started',
  'intake.completed', 'approval.requested', 'approval.approved', 'approval.rejected',
  'cpa.review_started', 'cpa.review_completed', 'cpa.escalated', 'deadline.calculated',
  'deadline.updated', 'entity.created', 'entity.updated', 'user.login',
]
const agentTypes = ['intake', 'deadline', 'document', 'prefill', 'auditRisk', 'taxQa']
const intakeMessages = [
  { role: 'assistant', content: 'Welcome! Let\'s gather the information needed for your tax filing. What was your total revenue for the tax year?' },
  { role: 'user', content: 'Our total revenue was approximately $2.5 million.' },
  { role: 'assistant', content: 'Got it — $2.5M in revenue. How many employees did you have on payroll?' },
  { role: 'user', content: 'We had 15 full-time employees and 8 contractors.' },
  { role: 'assistant', content: 'Thanks. Did your company make any significant capital expenditures or asset purchases this year?' },
  { role: 'user', content: 'Yes, we bought new servers and office equipment totaling about $180,000.' },
  { role: 'assistant', content: 'Noted. Any R&D activities that might qualify for the R&D tax credit?' },
  { role: 'user', content: 'We spent about $600K on R&D for our new product line.' },
]

const genName = () => `${pick(firstNames)} ${pick(lastNames)}`
const genCompanyName = () => `${pick(companyPrefixes)} ${pick(companySuffixes)}`
const genEIN = () => `${rand(10, 99)}-${rand(1000000, 9999999)}`
const genEmail = (name: string, domain: string) =>
  `${name.toLowerCase().replace(/[^a-z]/g, '.')}@${domain}`

// ─── CONFIG ──────────────────────────────────────────
const NUM_ORGS = 15
const NUM_CPAS = 10            // All CPAs live under the TaxOS admin org
const USERS_PER_ORG = { min: 3, max: 8 }
const ENTITIES_PER_ORG = { min: 1, max: 4 }
const DEADLINES_PER_ENTITY = { min: 2, max: 6 }
const FILINGS_PER_ORG = { min: 3, max: 10 }
const DOCS_PER_ORG = { min: 5, max: 20 }
const AUDIT_LOGS_PER_ORG = { min: 10, max: 40 }
const CONVERSATIONS_PER_ORG = { min: 2, max: 8 }

async function fakeSeed() {
  console.log('🌱 Starting fake data seed...\n')

  // ─── Ensure new tables exist (seed runs its own SQLite connection, bypassing db/index.ts) ───
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

  // ─── Clean existing data ───────────────────────────
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

  // Track all created IDs for FK references
  const allOrgs: string[] = []
  const allUsers: { id: string; orgId: string; role: string; email: string }[] = []
  const allCpas: { id: string; orgId: string; role: string; email: string; status: string }[] = []
  const allEntities: { id: string; orgId: string; entityType: string }[] = []
  const allDeadlines: { id: string; entityId: string; formType: string; formName: string }[] = []
  const allFilings: { id: string; orgId: string; entityId: string; status: string }[] = []
  const allTemplates: { id: string; orgId: string | null }[] = []

  // Map: orgId → cpaId[] (populated during CPA assignments step)
  const orgCpaMap = new Map<string, string[]>()

  // ─── 1. Organizations ──────────────────────────────
  console.log(`Creating ${NUM_ORGS} organizations...`)
  for (let i = 0; i < NUM_ORGS; i++) {
    const name = genCompanyName()
    const state = pick(usStates)
    const country = pick(countries)
    const orgId = uuid()

    db.insert(schema.organizations).values({
      id: orgId,
      name,
      legalName: `${name} Inc.`,
      registrationNumber: `REG-${rand(100000, 999999)}`,
      incorporationCountry: country,
      incorporationState: state,
      incorporationDate: pastDate(1500),
      plan: pick(['free', 'starter', 'pro']),
    }).run()

    allOrgs.push(orgId)
  }

  // ─── 2. Admin org + admin user ─────────────────────
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
  allUsers.push({ id: adminId, orgId: adminOrgId, role: 'admin', email: 'superadmin@taxos.ai' })

  // ─── 3. CPAs — all belong to the TaxOS admin org ──
  // CPAs are platform-level professionals. They do NOT belong to any client org.
  // Client org access is tracked via cpaAssignments only.
  console.log(`Creating ${NUM_CPAS} CPAs under TaxOS admin org...`)
  const usedEmails = new Set<string>(['superadmin@taxos.ai'])

  // First 5 CPAs are always active; remaining can be mixed
  for (let i = 0; i < NUM_CPAS; i++) {
    const name = genName()
    const domain = 'taxos-cpas.com'
    let email = genEmail(name, domain)
    while (usedEmails.has(email)) email = genEmail(name + rand(1, 999), domain)
    usedEmails.add(email)

    const cpaId = uuid()
    // First 5 always active (needed for round-robin escalation logic), rest varied
    const status = i < 5
      ? 'active' as const
      : pick(['active', 'active', 'pending_admin_review'] as const)

    db.insert(schema.users).values({
      id: cpaId,
      orgId: adminOrgId,        // ← all CPAs belong to the admin org
      email,
      passwordHash,
      name: `${name}, CPA`,
      role: 'cpa',
      status,
      isVerified: status === 'active',
      approvedByUserId: status === 'active' ? adminId : undefined,
      approvalReviewedAt: status === 'active' ? pastDate(90) : undefined,
      lastLoginAt: status === 'active' ? pastDate(7) : undefined,
    }).run()

    allCpas.push({ id: cpaId, orgId: adminOrgId, role: 'cpa', email, status })
    allUsers.push({ id: cpaId, orgId: adminOrgId, role: 'cpa', email })
  }

  // Convenience: deterministic CPA login
  const cpa1 = allCpas[0]
  sqlite
    .prepare("UPDATE users SET email = 'cpa1@taxos.ai', name = 'Alice Chen, CPA' WHERE id = ?")
    .run(cpa1.id)
  cpa1.email = 'cpa1@taxos.ai'
  usedEmails.add('cpa1@taxos.ai')

  console.log(`  → ${allCpas.length} CPAs created (all under TaxOS admin org)`)

  // ─── 4. Users per client org (founders + team members only) ───────────────
  // CPAs are NOT created per-org any more. Only founders and team_members.
  console.log('Creating client org users (founders + team members)...')

  for (const orgId of allOrgs) {
    const numUsers = rand(USERS_PER_ORG.min, USERS_PER_ORG.max)
    // First slot always founder; rest team_member
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
      const status = j === 0
        ? 'active' as const
        : pick(['active', 'active', 'active', 'pending_admin_review'] as const)

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

      allUsers.push({ id: userId, orgId, role, email })
    }
  }
  console.log(`  → ${allUsers.length} total users`)

  // ─── 5. Role Templates ─────────────────────────────
  console.log('Creating role templates...')
  const templateDefs = [
    { name: 'Full Access Manager', perms: { canViewDashboard: true, canViewFilings: true, canEditFilings: true, canApproveFilings: true, canViewDocuments: true, canEditDocuments: true, canManageTeam: true, canCreateAccounts: true, canManageTemplates: true, canManageOrganization: true } },
    { name: 'Filing Specialist', perms: { canViewDashboard: true, canViewFilings: true, canEditFilings: true, canApproveFilings: false, canViewDocuments: true, canEditDocuments: false, canManageTeam: false, canCreateAccounts: false, canManageTemplates: false, canManageOrganization: false } },
    { name: 'Document Reviewer', perms: { canViewDashboard: true, canViewFilings: true, canEditFilings: false, canApproveFilings: false, canViewDocuments: true, canEditDocuments: true, canManageTeam: false, canCreateAccounts: false, canManageTemplates: false, canManageOrganization: false } },
    { name: 'Read Only', perms: { canViewDashboard: true, canViewFilings: true, canEditFilings: false, canApproveFilings: false, canViewDocuments: true, canEditDocuments: false, canManageTeam: false, canCreateAccounts: false, canManageTemplates: false, canManageOrganization: false } },
  ]

  // Global templates by admin
  for (const tpl of templateDefs) {
    const tplId = uuid()
    db.insert(schema.roleTemplates).values({
      id: tplId,
      name: tpl.name,
      scope: 'global',
      organizationId: null,
      createdByUserId: adminId,
      permissions: tpl.perms,
      isSystemTemplate: true,
    }).run()
    allTemplates.push({ id: tplId, orgId: null })
  }

  // Some org-specific templates
  for (const orgId of allOrgs.slice(0, 5)) {
    const founder = allUsers.find(u => u.orgId === orgId && u.role === 'founder')
    if (!founder) continue
    const tplId = uuid()
    db.insert(schema.roleTemplates).values({
      id: tplId,
      name: `${pick(['Ops', 'Tax', 'Finance', 'Compliance'])} Specialist`,
      scope: 'organization',
      organizationId: orgId,
      createdByUserId: founder.id,
      permissions: pick(templateDefs).perms,
      isSystemTemplate: false,
    }).run()
    allTemplates.push({ id: tplId, orgId })
  }

  // ─── 6. Permissions ────────────────────────────────
  console.log('Creating permissions...')
  let permCount = 0
  for (const orgId of allOrgs) {
    const orgUsers = allUsers.filter(u => u.orgId === orgId && u.role === 'team_member')
    const founder = allUsers.find(u => u.orgId === orgId && u.role === 'founder')
    const templates = allTemplates.filter(t => t.orgId === null || t.orgId === orgId)

    for (const user of orgUsers) {
      if (!founder) continue
      const tpl = templates.length > 0 ? pick(templates) : null
      const perms = tpl ? pick(templateDefs).perms : templateDefs[1].perms
      db.insert(schema.permissions).values({
        id: uuid(),
        userId: user.id,
        organizationId: orgId,
        templateId: tpl?.id,
        permissions: perms,
        createdByUserId: founder.id,
      }).run()
      permCount++
    }
  }
  console.log(`  → ${permCount} permissions created`)

  // ─── 7. CPA Assignments ────────────────────────────
  // Assign CPAs from the global admin-org CPA pool to client orgs.
  // Each client org gets 1–2 CPAs. CPAs may serve multiple orgs.
  // users.orgId is NOT updated — CPAs stay in the admin org.
  console.log('Creating CPA assignments...')
  let cpaAssignCount = 0

  for (const orgId of allOrgs) {
    const numCpas = rand(1, 2)
    const selectedCpas = pickN(allCpas, numCpas)

    for (const cpa of selectedCpas) {
      // Avoid duplicate assignments
      const exists = sqlite
        .prepare('SELECT 1 FROM cpa_assignments WHERE user_id = ? AND organization_id = ?')
        .get(cpa.id, orgId)
      if (exists) continue

      db.insert(schema.cpaAssignments).values({
        id: uuid(),
        userId: cpa.id,
        organizationId: orgId,
        createdByUserId: adminId,
      }).run()

      // Track for filing / review lock seeding
      const list = orgCpaMap.get(orgId) ?? []
      list.push(cpa.id)
      orgCpaMap.set(orgId, list)

      cpaAssignCount++
    }
  }
  console.log(`  → ${cpaAssignCount} CPA assignments created`)

  // ─── 8. Invites ────────────────────────────────────
  console.log('Creating invites...')
  let inviteCount = 0
  for (const orgId of allOrgs.slice(0, 8)) {
    const founder = allUsers.find(u => u.orgId === orgId && u.role === 'founder')
    if (!founder) continue
    const numInvites = rand(1, 4)
    for (let j = 0; j < numInvites; j++) {
      const name = genName()
      let email = genEmail(name, 'invited.com')
      while (usedEmails.has(email)) email = genEmail(name + rand(1, 999), 'invited.com')
      usedEmails.add(email)

      const status = pick(['pending', 'pending', 'accepted', 'expired'] as const)
      db.insert(schema.invites).values({
        id: uuid(),
        email,
        role: 'team_member',  // only team_member invites from orgs; CPA invites come from admin
        organizationId: orgId,
        invitedByUserId: founder.id,
        permissions: pick(templateDefs).perms,
        token: crypto.randomBytes(32).toString('hex'),
        status,
        expiresAt: futureDate(30),
        acceptedAt: status === 'accepted' ? pastDate(10) : undefined,
      }).run()
      inviteCount++
    }
  }
  console.log(`  → ${inviteCount} invites created`)

  // ─── 9. Founder Applications ───────────────────────
  console.log('Creating founder applications...')
  let appCount = 0
  for (const orgId of allOrgs) {
    const founder = allUsers.find(u => u.orgId === orgId && u.role === 'founder')
    if (!founder) continue
    const status = pick(['pending', 'approved', 'approved', 'approved']) as 'pending' | 'approved' | 'rejected'
    db.insert(schema.founderApplications).values({
      id: uuid(),
      userId: founder.id,
      organizationId: orgId,
      email: founder.email,
      passwordHash,
      name: founder.email.split('@')[0].replace(/\./g, ' '),
      organizationName: genCompanyName(),
      brandName: pick(companyPrefixes),
      entityType: pick([...entityTypes]),
      legalCompanyName: `${pick(companyPrefixes)} Inc.`,
      registrationNumber: `REG-${rand(100000, 999999)}`,
      country: pick(countries),
      stateOrJurisdiction: pick(usStates),
      incorporationDate: pastDate(1000),
      certificateFileName: 'certificate.pdf',
      certificateStorageUrl: `/uploads/cert-${rand(1000, 9999)}.pdf`,
      parsedCertificateData: { legalCompanyName: 'Parsed Corp', entityType: 'C-Corp', stateOrJurisdiction: 'Delaware', country: 'US' },
      emailVerifiedAt: pastDate(60),
      onboardingCompletedAt: pastDate(55),
      status,
      reviewedByUserId: status === 'approved' ? adminId : undefined,
      reviewedAt: status === 'approved' ? pastDate(50) : undefined,
      approvedUserId: status === 'approved' ? founder.id : undefined,
    }).run()
    appCount++
  }
  console.log(`  → ${appCount} founder applications created`)

  // ─── 10. Entities ───────────────────────────────────
  console.log('Creating entities...')
  for (const orgId of allOrgs) {
    const numEntities = rand(ENTITIES_PER_ORG.min, ENTITIES_PER_ORG.max)
    for (let j = 0; j < numEntities; j++) {
      const entityType = pick([...entityTypes])
      const name = genCompanyName()
      const entityId = uuid()
      const state = pick(usStates)
      const numSubs = rand(0, 3)
      const subs = numSubs > 0 ? pickN(foreignSubs, numSubs).map(s => `${name.split(' ')[0]} ${s}`) : []
      const numDirectors = rand(1, 4)
      const directors = Array.from({ length: numDirectors }, () => ({
        name: genName(),
        title: pick(['Director', 'Independent Director', 'Board Member']),
      }))
      const officers = [
        { name: genName(), title: 'CEO' },
        { name: genName(), title: 'CFO' },
        ...(rand(0, 1) ? [{ name: genName(), title: 'CTO' }] : []),
      ]
      const shareholders = Array.from({ length: rand(2, 6) }, () => ({
        name: genName(),
        shares: rand(1000, 100000),
        percentage: randFloat(1, 40),
      }))

      db.insert(schema.entities).values({
        id: entityId,
        orgId,
        legalName: `${name} ${entityType === 'LLC' ? 'LLC' : 'Inc.'}`,
        entityType,
        stateOfIncorporation: state,
        ein: genEIN(),
        majorBusinessActivity: pick(businessActivities),
        fiscalYearEnd: pick(['12-31', '03-31', '06-30', '09-30']),
        foreignSubsidiaries: subs as any,
        directors: directors as any,
        officers: officers as any,
        shareholders: shareholders as any,
        capTable: shareholders.map(s => ({ ...s, type: pick(['Common', 'Preferred A', 'Preferred B']) })) as any,
        sensitiveData: [] as any,
        country: pick(countries),
        status: pick(['active', 'active', 'active', 'inactive']),
      }).run()

      allEntities.push({ id: entityId, orgId, entityType })
    }
  }
  console.log(`  → ${allEntities.length} entities created`)

  // ─── 11. Deadlines ─────────────────────────────────
  console.log('Creating deadlines...')
  for (const entity of allEntities) {
    const applicableForms = formTypes.filter(f => f.entityTypes.includes(entity.entityType))
    const numDeadlines = Math.min(rand(DEADLINES_PER_ENTITY.min, DEADLINES_PER_ENTITY.max), applicableForms.length)
    const selectedForms = pickN(applicableForms, numDeadlines)

    for (const form of selectedForms) {
      const deadlineId = uuid()
      const status = pick([...deadlineStatuses])
      const dueDate = status === 'overdue' ? pastDate(60) : futureDate(180)

      db.insert(schema.deadlines).values({
        id: deadlineId,
        entityId: entity.id,
        formType: form.type,
        formName: form.name,
        dueDate: dueDate.split('T')[0],
        status,
        aiPredicted: pick([true, true, true, false]),
        urgencyScore: status === 'overdue' ? rand(80, 100) : rand(10, 70),
        description: `${form.name} for tax year ${rand(2024, 2025)}.`,
      }).run()

      allDeadlines.push({ id: deadlineId, entityId: entity.id, formType: form.type, formName: form.name })
    }
  }
  console.log(`  → ${allDeadlines.length} deadlines created`)

  // ─── 12. Filings ───────────────────────────────────
  console.log('Creating filings...')
  for (const orgId of allOrgs) {
    const orgEntities = allEntities.filter(e => e.orgId === orgId)
    // CPAs assigned to this org (via cpaAssignments), not from the org itself
    const assignedCpaIds = orgCpaMap.get(orgId) ?? []
    const numFilings = rand(FILINGS_PER_ORG.min, FILINGS_PER_ORG.max)

    for (let j = 0; j < numFilings; j++) {
      const entity = pick(orgEntities)
      if (!entity) continue

      const entityDeadlines = allDeadlines.filter(d => d.entityId === entity.id)
      const deadline = entityDeadlines.length > 0 ? pick(entityDeadlines) : null
      const status = pick([...filingStatuses])
      const filingId = uuid()
      const taxYear = pick([2024, 2025, 2025, 2025])

      // Assign a CPA from the org's assigned CPA list (not an org-member CPA)
      const cpaId = assignedCpaIds.length > 0
        ? (['cpa_review', 'founder_approval', 'submitted'].includes(status) ? pick(assignedCpaIds) : null)
        : null

      const filingData: Record<string, unknown> = {
        revenue: rand(50000, 10000000),
        expenses: rand(30000, 8000000),
        netIncome: rand(-500000, 5000000),
        totalAssets: rand(100000, 50000000),
        totalLiabilities: rand(50000, 30000000),
        employeeCount: rand(1, 200),
        contractorCount: rand(0, 50),
        rdExpenses: rand(0, 2000000),
        statesTaxedIn: pickN(usStates, rand(1, 5)),
      }

      db.insert(schema.filings).values({
        id: filingId,
        entityId: entity.id,
        deadlineId: deadline?.id,
        orgId,
        formType: deadline?.formType || pick(formTypes).type,
        formName: deadline?.formName || pick(formTypes).name,
        status,
        aiConfidenceScore: ['ai_prep', 'cpa_review', 'founder_approval', 'submitted'].includes(status)
          ? randFloat(0.6, 0.99)
          : null,
        cpaAssignedId: cpaId,
        filingData: filingData as any,
        aiSummary: ['ai_prep', 'cpa_review', 'founder_approval', 'submitted'].includes(status)
          ? `AI-prepared ${deadline?.formType || 'tax'} filing for tax year ${taxYear}. Revenue: $${(filingData.revenue as number).toLocaleString()}, Net Income: $${(filingData.netIncome as number).toLocaleString()}.`
          : null,
        aiReasoning: ['ai_prep', 'cpa_review', 'founder_approval', 'submitted'].includes(status)
          ? 'Data gathered from uploaded documents and intake conversation. Cross-referenced with prior year returns where available.'
          : null,
        founderApprovedAt: ['submitted', 'archived'].includes(status) ? pastDate(30) : null,
        submittedAt: status === 'submitted' ? pastDate(15) : null,
        taxYear,
      }).run()

      allFilings.push({ id: filingId, orgId, entityId: entity.id, status })
    }
  }
  console.log(`  → ${allFilings.length} filings created`)

  // ─── 13. Documents ─────────────────────────────────
  console.log('Creating documents...')
  let docCount = 0
  for (const orgId of allOrgs) {
    const orgUsers = allUsers.filter(u => u.orgId === orgId)
    const orgFilings = allFilings.filter(f => f.orgId === orgId)
    const numDocs = rand(DOCS_PER_ORG.min, DOCS_PER_ORG.max)

    for (let j = 0; j < numDocs; j++) {
      const uploader = pick(orgUsers)
      const filing = orgFilings.length > 0 && rand(0, 1) ? pick(orgFilings) : null
      const fileName = pick(docNames)
      const tags = pickN(aiTags, rand(1, 4))

      db.insert(schema.documents).values({
        id: uuid(),
        filingId: filing?.id,
        orgId,
        fileName,
        storageUrl: `/uploads/${orgId}/${uuid()}-${fileName}`,
        mimeType: pick(mimeTypes),
        extractedData: rand(0, 1) ? {
          documentType: pick(['W-2', '1099', 'Bank Statement', 'P&L', 'Balance Sheet', 'Invoice']),
          extractedFields: {
            totalAmount: rand(1000, 5000000),
            date: pastDate(365).split('T')[0],
            entity: genCompanyName(),
          },
          confidence: randFloat(0.7, 0.99),
        } : null,
        aiTags: tags as any,
        confidenceScore: randFloat(0.5, 0.99),
        reviewedByHuman: pick([true, false, false]),
        uploadedById: uploader.id,
      }).run()
      docCount++
    }
  }
  console.log(`  → ${docCount} documents created`)

  // ─── 14. Approval Queue ────────────────────────────
  console.log('Creating approval queue entries...')
  let approvalCount = 0
  const approvalFilings = allFilings.filter(f =>
    ['cpa_review', 'founder_approval', 'submitted', 'archived'].includes(f.status)
  )
  for (const filing of approvalFilings) {
    const orgUsers = allUsers.filter(u => u.orgId === filing.orgId)
    const resolver = pick(orgUsers)

    const cpaStatus = ['founder_approval', 'submitted', 'archived'].includes(filing.status)
      ? 'approved' as const
      : pick(['pending', 'pending', 'approved', 'rejected'] as const)

    db.insert(schema.approvalQueue).values({
      id: uuid(),
      orgId: filing.orgId,
      filingId: filing.id,
      queueType: 'cpa',
      status: cpaStatus,
      summary: `CPA review required for filing ${filing.id.slice(0, 8)}. AI confidence: ${randFloat(0.7, 0.99)}.`,
      aiRecommendation: pick([
        'Recommend approval — all amounts verified against source documents.',
        'Review flagged items before approval — two deductions exceed typical ranges.',
        'Straightforward filing, no issues detected.',
        'Minor discrepancies in Q3 revenue — recommend manual verification.',
      ]),
      rejectionReason: cpaStatus === 'rejected' ? pick([
        'Missing documentation for contractor payments.',
        'Revenue figures do not match bank statements.',
        'Need additional information on foreign income.',
      ]) : null,
      resolvedAt: cpaStatus !== 'pending' ? pastDate(30) : null,
      resolvedById: cpaStatus !== 'pending' ? resolver.id : null,
    }).run()
    approvalCount++

    if (['submitted', 'archived'].includes(filing.status)) {
      db.insert(schema.approvalQueue).values({
        id: uuid(),
        orgId: filing.orgId,
        filingId: filing.id,
        queueType: 'founder',
        status: 'approved',
        summary: `Founder approval for filing ${filing.id.slice(0, 8)}. Ready for submission.`,
        aiRecommendation: 'All items reviewed by CPA. Recommend approval for submission.',
        resolvedAt: pastDate(15),
        resolvedById: allUsers.find(u => u.orgId === filing.orgId && u.role === 'founder')?.id || resolver.id,
      }).run()
      approvalCount++
    }

    if (filing.status === 'founder_approval') {
      db.insert(schema.approvalQueue).values({
        id: uuid(),
        orgId: filing.orgId,
        filingId: filing.id,
        queueType: 'founder',
        status: 'pending',
        summary: `Awaiting founder approval for filing ${filing.id.slice(0, 8)}.`,
        aiRecommendation: 'CPA review complete. Filing is ready for founder sign-off.',
      }).run()
      approvalCount++
    }
  }
  console.log(`  → ${approvalCount} approval queue entries created`)

  // ─── 15. Filing Review Locks ───────────────────────
  // Use CPAs assigned to the filing's org (from orgCpaMap), not org-member CPAs
  console.log('Creating filing review locks...')
  let lockCount = 0
  const reviewFilings = allFilings.filter(f => f.status === 'cpa_review')
  for (const filing of reviewFilings) {
    const assignedCpaIds = orgCpaMap.get(filing.orgId) ?? []
    if (assignedCpaIds.length === 0) continue

    const cpaId = pick(assignedCpaIds)
    db.insert(schema.filingReviewLocks).values({
      id: uuid(),
      filingId: filing.id,
      cpaUserId: cpaId,
      status: pick(['active', 'active', 'completed']),
      releasedAt: rand(0, 1) ? pastDate(5) : null,
    }).run()
    lockCount++
  }
  console.log(`  → ${lockCount} filing review locks created`)

  // ─── 16. CPA Notifications (seed some escalation examples) ─────────────────
  console.log('Creating CPA notification examples...')
  let notifCount = 0
  const escalatedFilings = allFilings.filter(f => f.status === 'cpa_review').slice(0, 5)
  for (const filing of escalatedFilings) {
    const cpasToNotify = pickN(allCpas, Math.min(3, allCpas.length))
    for (const cpa of cpasToNotify) {
      db.insert(schema.cpaNotifications).values({
        id: uuid(),
        filingId: filing.id,
        cpaUserId: cpa.id,
        status: pick(['pending', 'pending', 'approved', 'dismissed'] as const),
      }).run()
      notifCount++
    }
  }
  console.log(`  → ${notifCount} CPA notifications created`)

  // ─── 17. Audit Log ─────────────────────────────────
  console.log('Creating audit logs...')
  let auditCount = 0
  for (const orgId of allOrgs) {
    const orgUsers = allUsers.filter(u => u.orgId === orgId)
    const orgFilings = allFilings.filter(f => f.orgId === orgId)
    const numLogs = rand(AUDIT_LOGS_PER_ORG.min, AUDIT_LOGS_PER_ORG.max)

    for (let j = 0; j < numLogs; j++) {
      const actorType = pick(['ai', 'ai', 'cpa', 'founder', 'system']) as 'ai' | 'cpa' | 'founder' | 'system'
      const actor = actorType !== 'system' && actorType !== 'ai' ? pick(orgUsers) : null
      const filing = orgFilings.length > 0 && rand(0, 1) ? pick(orgFilings) : null

      db.insert(schema.auditLog).values({
        id: uuid(),
        orgId,
        filingId: filing?.id,
        actorType,
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
          : pick([
              'Manual review completed.',
              'Verified against original documents.',
              'Approved after team discussion.',
              'Status updated per workflow requirements.',
              null,
            ]),
        inputs: rand(0, 1) ? { filingId: filing?.id, entityId: pick(allEntities)?.id } : null,
        outputs: rand(0, 1) ? { status: 'success', confidence: randFloat(0.6, 0.99) } : null,
        modelVersion: actorType === 'ai' ? pick(['gemini-2.5-flash', 'gemini-2.5-pro']) : null,
        confidenceScore: actorType === 'ai' ? randFloat(0.5, 0.99) : null,
        createdAt: pastDate(90),
      }).run()
      auditCount++
    }
  }
  console.log(`  → ${auditCount} audit log entries created`)

  // ─── 18. Agent Conversations ───────────────────────
  console.log('Creating agent conversations...')
  let convCount = 0
  for (const orgId of allOrgs) {
    const orgFilings = allFilings.filter(f => f.orgId === orgId)
    const numConvs = rand(CONVERSATIONS_PER_ORG.min, CONVERSATIONS_PER_ORG.max)

    for (let j = 0; j < numConvs; j++) {
      const filing = orgFilings.length > 0 ? pick(orgFilings) : null
      const agentType = pick(agentTypes)
      const numMessages = rand(2, 8)
      const messages = intakeMessages.slice(0, numMessages).map(m => ({
        ...m,
        timestamp: pastDate(30),
      }))

      db.insert(schema.agentConversations).values({
        id: uuid(),
        filingId: filing?.id,
        orgId,
        agentType,
        messages: messages as any,
        status: pick(['active', 'completed', 'completed', 'escalated']),
        createdAt: pastDate(60),
        updatedAt: pastDate(10),
      }).run()
      convCount++
    }
  }
  console.log(`  → ${convCount} agent conversations created`)

  // ─── 19. Email Verification Tokens ─────────────────
  console.log('Creating email verification tokens...')
  let tokenCount = 0
  const recentUsers = allUsers.slice(-20)
  for (const user of recentUsers) {
    db.insert(schema.emailVerificationTokens).values({
      id: uuid(),
      userId: user.id,
      token: crypto.randomBytes(32).toString('hex'),
      expiresAt: futureDate(7),
      usedAt: pick([pastDate(5), null, null]),
    }).run()
    tokenCount++
  }
  console.log(`  → ${tokenCount} email verification tokens created`)

  // ─── Summary ───────────────────────────────────────
  console.log('\n✅ Fake data seed complete!\n')
  console.log('Summary:')
  console.log(`  Organizations:        ${allOrgs.length + 1} (${allOrgs.length} client + 1 TaxOS admin)`)
  console.log(`  CPAs:                 ${allCpas.length} (all under TaxOS admin org)`)
  console.log(`  Client org users:     ${allUsers.filter(u => u.role !== 'cpa' && u.role !== 'admin').length}`)
  console.log(`  Total users:          ${allUsers.length}`)
  console.log(`  Entities:             ${allEntities.length}`)
  console.log(`  Deadlines:            ${allDeadlines.length}`)
  console.log(`  Filings:              ${allFilings.length}`)
  console.log(`  Documents:            ${docCount}`)
  console.log(`  Approval Queue:       ${approvalCount}`)
  console.log(`  Filing Review Locks:  ${lockCount}`)
  console.log(`  CPA Notifications:    ${notifCount}`)
  console.log(`  Audit Log Entries:    ${auditCount}`)
  console.log(`  Agent Conversations:  ${convCount}`)
  console.log(`  Role Templates:       ${allTemplates.length}`)
  console.log(`  Permissions:          ${permCount}`)
  console.log(`  CPA Assignments:      ${cpaAssignCount}`)
  console.log(`  Invites:              ${inviteCount}`)
  console.log(`  Founder Applications: ${appCount}`)
  console.log(`  Email Tokens:         ${tokenCount}`)
  console.log(`\n  Login: superadmin@taxos.ai / admin1234`)
  console.log(`  CPA login: cpa1@taxos.ai / password123`)
  console.log(`  All other users: password123`)
}

fakeSeed().catch((error) => {
  console.error('Seed failed:', error)
  process.exit(1)
}).finally(() => {
  sqlite.close()
})
