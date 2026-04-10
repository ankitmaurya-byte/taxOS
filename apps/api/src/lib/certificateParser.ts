import fs from 'fs/promises'
import path from 'path'
import pdfParse from 'pdf-parse'

const STATE_MATCHERS = [
  'Delaware', 'California', 'New York', 'Texas', 'Florida', 'Wyoming', 'Nevada', 'Andhra Pradesh', 'Karnataka', 'Maharashtra', 'Tamil Nadu', 'Gujarat',
]

function firstMatch(text: string, values: string[]) {
  return values.find((value) => text.toLowerCase().includes(value.toLowerCase())) || null
}

function inferEntityType(text: string) {
  const normalized = text.toLowerCase()
  if (normalized.includes('private limited') || normalized.includes('private ltd')) return 'Pvt-Ltd'
  if (normalized.includes('limited liability company') || normalized.includes(' llc')) return 'LLC'
  if (normalized.includes('s corporation') || normalized.includes('s-corp')) return 'S-Corp'
  if (normalized.includes('corporation') || normalized.includes('inc.')) return 'C-Corp'
  return null
}

function inferRegistrationNumber(text: string) {
  const match = text.match(/(cin|registration no\.?|company number|entity number)[:\s-]*([A-Z0-9-]{5,})/i)
  return match?.[2] || null
}

function inferIncorporationDate(text: string) {
  const match = text.match(/(dated|incorporated on|date of incorporation)[:\s-]*([0-9]{1,2}[\/\-.][0-9]{1,2}[\/\-.][0-9]{2,4}|[A-Za-z]+\s+[0-9]{1,2},\s+[0-9]{4})/i)
  return match?.[2] || null
}

function inferLegalName(lines: string[]) {
  return lines.find((line) => /inc|corporation|private limited|llc|ltd/i.test(line) && line.trim().length > 5) || null
}

export async function parseCertificateOfIncorporation(filePath: string, originalName: string) {
  const extension = path.extname(originalName).toLowerCase()
  const result: Record<string, unknown> = {
    sourceFileName: originalName,
    parsedAt: new Date().toISOString(),
  }

  if (extension !== '.pdf') {
    return result
  }

  try {
    const buffer = await fs.readFile(filePath)
    const parsed = await pdfParse(buffer)
    const text = parsed.text.replace(/\r/g, ' ')
    const lines = text.split('\n').map((line: string) => line.trim()).filter(Boolean)

    result.rawTextPreview = lines.slice(0, 20).join(' | ')
    result.legalCompanyName = inferLegalName(lines)
    result.entityType = inferEntityType(text)
    result.registrationNumber = inferRegistrationNumber(text)
    result.incorporationDate = inferIncorporationDate(text)
    result.stateOrJurisdiction = firstMatch(text, STATE_MATCHERS)
    result.country = /india/i.test(text) ? 'India' : /united states|u\.s\.|delaware/i.test(text) ? 'US' : null

    return result
  } catch {
    return result
  }
}
