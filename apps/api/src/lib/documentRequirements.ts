/**
 * Per-form document requirement checklist.
 *
 * Each filing is born with a set of requirement rows generated from the
 * template matching its `formType`. Founders / team members satisfy each slot
 * by uploading a file (or skipping it with a remark). CPAs review + mark each
 * slot viewed before approval.
 */

export interface RequirementTemplate {
  slot: string
  label: string
  required: boolean
  description?: string
}

const DEFAULT_TEMPLATE: RequirementTemplate[] = [
  { slot: 'supporting_documents', label: 'Supporting Documents', required: true, description: 'Any documents supporting this filing.' },
]

const TEMPLATES: Record<string, RequirementTemplate[]> = {
  '1120': [
    { slot: 'incorporation_certificate', label: 'Certificate of Incorporation', required: true, description: 'Filed with the Secretary of State.' },
    { slot: 'ein_letter', label: 'IRS EIN Assignment Letter (CP-575)', required: true },
    { slot: 'prior_year_return', label: 'Prior Year Tax Return (1120)', required: true },
    { slot: 'year_end_bank_statements', label: 'Year-end Bank Statements', required: true, description: 'All business accounts for the tax year.' },
    { slot: 'pnl_statement', label: 'Profit & Loss Statement', required: true },
    { slot: 'balance_sheet', label: 'Balance Sheet', required: true },
    { slot: 'payroll_summary', label: 'Payroll Summary', required: false, description: 'W-2s, 941s, year-end payroll report.' },
    { slot: 'contractor_1099s', label: 'Contractor 1099 forms', required: false },
    { slot: 'depreciation_schedule', label: 'Depreciation Schedule', required: false },
    { slot: 'rd_expense_report', label: 'R&D Expense Report', required: false, description: 'Required if claiming R&D credit.' },
    { slot: 'board_resolutions', label: 'Board Resolutions', required: false },
    { slot: 'cap_table', label: 'Cap Table', required: false },
  ],
  '1120-S': [
    { slot: 'incorporation_certificate', label: 'Certificate of Incorporation', required: true },
    { slot: 's_corp_election', label: 'Form 2553 S-Corp Election', required: true },
    { slot: 'ein_letter', label: 'IRS EIN Assignment Letter', required: true },
    { slot: 'prior_year_return', label: 'Prior Year Tax Return (1120-S)', required: true },
    { slot: 'pnl_statement', label: 'Profit & Loss Statement', required: true },
    { slot: 'balance_sheet', label: 'Balance Sheet', required: true },
    { slot: 'shareholder_basis', label: 'Shareholder Basis Statements', required: true },
    { slot: 'payroll_summary', label: 'Officer Payroll Summary', required: true, description: 'Reasonable compensation for owner-officers.' },
    { slot: 'k1_distributions', label: 'K-1 Distribution Records', required: false },
    { slot: 'depreciation_schedule', label: 'Depreciation Schedule', required: false },
  ],
  '1065': [
    { slot: 'partnership_agreement', label: 'Partnership Agreement', required: true },
    { slot: 'ein_letter', label: 'IRS EIN Assignment Letter', required: true },
    { slot: 'prior_year_return', label: 'Prior Year Tax Return (1065)', required: true },
    { slot: 'pnl_statement', label: 'Profit & Loss Statement', required: true },
    { slot: 'balance_sheet', label: 'Balance Sheet', required: true },
    { slot: 'partner_capital_accounts', label: 'Partner Capital Account Analysis', required: true },
    { slot: 'guaranteed_payments', label: 'Guaranteed Payment Records', required: false },
    { slot: 'depreciation_schedule', label: 'Depreciation Schedule', required: false },
    { slot: 'k1_distributions', label: 'K-1 Distribution Worksheets', required: false },
  ],
  '5472': [
    { slot: 'incorporation_certificate', label: 'Certificate of Incorporation', required: true },
    { slot: 'foreign_owner_info', label: 'Foreign Owner Identification', required: true, description: 'Name, address, tax-ID of each 25%+ foreign owner.' },
    { slot: 'related_party_transactions', label: 'Related-party Transaction Ledger', required: true },
    { slot: 'intercompany_agreements', label: 'Intercompany Agreements', required: false },
    { slot: 'transfer_pricing_study', label: 'Transfer Pricing Study', required: false },
  ],
  '1099-NEC': [
    { slot: 'contractor_w9s', label: 'Contractor W-9 Forms', required: true },
    { slot: 'payment_ledger', label: 'Contractor Payment Ledger', required: true, description: 'Itemized payments ≥ $600 per contractor.' },
    { slot: 'bank_statements', label: 'Supporting Bank Statements', required: false },
  ],
  '1099-MISC': [
    { slot: 'payee_w9s', label: 'Payee W-9 Forms', required: true },
    { slot: 'payment_ledger', label: 'Payment Ledger', required: true },
    { slot: 'rental_agreements', label: 'Rental Agreements', required: false },
    { slot: 'royalty_statements', label: 'Royalty Statements', required: false },
  ],
  '940': [
    { slot: 'payroll_summary', label: 'Annual Payroll Summary', required: true },
    { slot: 'state_ui_returns', label: 'State Unemployment Tax Returns', required: true },
    { slot: 'futa_deposits', label: 'FUTA Deposit Records', required: false },
  ],
  '941': [
    { slot: 'quarterly_payroll', label: 'Quarterly Payroll Summary', required: true },
    { slot: 'tax_deposits', label: 'Federal Tax Deposit Records', required: true },
    { slot: 'w2_reconciliation', label: 'W-2 / W-3 Reconciliation', required: false },
  ],
  'W-2': [
    { slot: 'employee_roster', label: 'Employee Roster', required: true },
    { slot: 'annual_payroll', label: 'Annual Payroll Summary', required: true },
    { slot: 'w4_forms', label: 'Employee W-4 Forms', required: false },
  ],
  '8832': [
    { slot: 'entity_formation_docs', label: 'Entity Formation Documents', required: true },
    { slot: 'ein_letter', label: 'IRS EIN Assignment Letter', required: true },
    { slot: 'member_consent', label: 'Member Consent to Election', required: true },
  ],
  '2553': [
    { slot: 'incorporation_certificate', label: 'Certificate of Incorporation', required: true },
    { slot: 'shareholder_consents', label: 'Shareholder Consents', required: true },
    { slot: 'ein_letter', label: 'IRS EIN Assignment Letter', required: true },
  ],
  'BOI': [
    { slot: 'beneficial_owners', label: 'Beneficial Owner Information', required: true, description: 'Name, DOB, address, ID for each 25%+ owner.' },
    { slot: 'company_applicant', label: 'Company Applicant Info', required: true },
    { slot: 'owner_id_documents', label: 'Owner ID Documents', required: true, description: 'Passport or driver’s license for each beneficial owner.' },
  ],
  'CT-1': [
    { slot: 'federal_return', label: 'Federal Corporate Return', required: true },
    { slot: 'state_apportionment', label: 'State Apportionment Worksheet', required: true },
    { slot: 'nexus_summary', label: 'Nexus Summary', required: false },
  ],
}

export function getRequirementsForFormType(formType: string | null | undefined): RequirementTemplate[] {
  if (!formType) return DEFAULT_TEMPLATE
  return TEMPLATES[formType] ?? DEFAULT_TEMPLATE
}
