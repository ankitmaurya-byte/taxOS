interface DeadlineRule {
  baseMonth: number
  baseDay: number
  extensionAvailable: boolean
  extensionForm?: string
  description: string
}

const DEADLINE_RULES: Record<string, Record<string, DeadlineRule>> = {
  'C-Corp': {
    '1120': { baseMonth: 4, baseDay: 15, extensionAvailable: true, extensionForm: '7004', description: 'U.S. Corporation Income Tax Return' },
    '5472': { baseMonth: 4, baseDay: 15, extensionAvailable: false, description: 'Information Return of a Foreign-Owned U.S. Corporation' },
    '5471': { baseMonth: 4, baseDay: 15, extensionAvailable: true, description: 'Information Return — Foreign Corporations' },
    'DFT': { baseMonth: 3, baseDay: 1, extensionAvailable: false, description: 'Delaware Franchise Tax' },
  },
  'LLC': {
    '1065': { baseMonth: 3, baseDay: 15, extensionAvailable: true, extensionForm: '7004', description: 'U.S. Return of Partnership Income' },
  },
  'S-Corp': {
    '1120-S': { baseMonth: 3, baseDay: 15, extensionAvailable: true, extensionForm: '7004', description: 'U.S. Income Tax Return for an S Corporation' },
  },
}

export function getApplicableDeadlines(entityType: string, taxYear: number, state: string): Array<{
  formType: string
  formName: string
  dueDate: string
  description: string
}> {
  const rules = DEADLINE_RULES[entityType] || {}
  const results: Array<{ formType: string; formName: string; dueDate: string; description: string }> = []

  for (const [formType, rule] of Object.entries(rules)) {
    // Skip Delaware-specific forms for non-Delaware entities
    if (formType === 'DFT' && state !== 'Delaware') continue

    const dueDate = new Date(taxYear + 1, rule.baseMonth - 1, rule.baseDay)
    results.push({
      formType,
      formName: rule.description,
      dueDate: dueDate.toISOString().split('T')[0],
      description: rule.description,
    })

    // Add extension deadline if available
    if (rule.extensionAvailable && rule.extensionForm) {
      results.push({
        formType: rule.extensionForm,
        formName: `Extension for ${formType}`,
        dueDate: dueDate.toISOString().split('T')[0],
        description: `Automatic extension application for Form ${formType}`,
      })
    }
  }

  return results
}

export function calculateUrgencyScore(dueDate: string): number {
  const days = Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86_400_000)
  if (days < 0) return 100
  if (days < 7) return 95
  if (days < 30) return 80
  if (days < 60) return 60
  if (days < 90) return 40
  return 20
}
