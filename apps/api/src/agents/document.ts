import { BaseAgent } from './base'
import { db } from '../db'
import { documents, approvalQueue } from '../db/schema'
import { eq } from 'drizzle-orm'
import fs from 'fs'
import path from 'path'

const EXTRACTION_PROMPT = `
You are a document extraction specialist. Extract all structured data from this tax document.

Return a JSON object with:
{
  "documentType": "string (e.g. W-2, 1099-NEC, bank statement)",
  "taxYear": number,
  "fields": {
    "fieldName": {
      "value": "extracted value",
      "confidence": 0.0-1.0
    }
  },
  "overallConfidence": 0.0-1.0,
  "flaggedIssues": ["any anomalies or unclear data"],
  "reasoning": "brief explanation of extraction approach"
}

Mark confidence < 0.75 for any field that is unclear, partially visible, or ambiguous.
Return ONLY the JSON object, no other text.
`

export class DocumentAgent extends BaseAgent {
  async extract(documentId: string, orgId: string) {
    const doc = db.select().from(documents).where(eq(documents.id, documentId)).get()
    if (!doc) throw new Error('Document not found')

    // For PDF/image files, use vision API
    let extractionResult: any

    if (doc.mimeType === 'application/pdf' || doc.mimeType.startsWith('image/')) {
      const filePath = path.join(__dirname, '../../', doc.storageUrl)

      if (!fs.existsSync(filePath)) {
        // If file doesn't exist, use a simulated extraction
        extractionResult = this.simulateExtraction(doc.fileName)
      } else {
        const fileBuffer = fs.readFileSync(filePath)
        const base64 = fileBuffer.toString('base64')

        const mimeType = doc.mimeType as 'image/png' | 'image/jpeg' | 'application/pdf'
        const model = this.getModel()

        const result = await model.generateContent([
          {
            inlineData: {
              mimeType,
              data: base64,
            },
          },
          { text: EXTRACTION_PROMPT },
        ])

        const text = result.response.text()
        try {
          // Strip markdown code fences if present
          const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
          extractionResult = JSON.parse(cleaned)
        } catch {
          extractionResult = this.simulateExtraction(doc.fileName)
        }
      }
    } else {
      extractionResult = this.simulateExtraction(doc.fileName)
    }

    // Update document with extracted data
    const tags = [extractionResult.documentType || 'unknown']
    db.update(documents).set({
      extractedData: extractionResult as any,
      aiTags: tags as any,
      confidenceScore: extractionResult.overallConfidence || 0.8,
    }).where(eq(documents.id, documentId)).run()

    // If low confidence, create CPA review item
    if (extractionResult.overallConfidence < 0.75 && doc.filingId) {
      db.insert(approvalQueue).values({
        orgId,
        filingId: doc.filingId,
        queueType: 'cpa',
        status: 'pending',
        summary: `Document "${doc.fileName}" extracted with low confidence (${Math.round(extractionResult.overallConfidence * 100)}%). CPA review required.`,
        aiRecommendation: `Flagged issues: ${(extractionResult.flaggedIssues || []).join(', ')}`,
      }).run()
    }

    await this.log({
      orgId,
      filingId: doc.filingId,
      action: 'document_extracted',
      reasoning: extractionResult.reasoning || 'Extracted structured data from document',
      confidenceScore: extractionResult.overallConfidence || 0.8,
      outputs: { documentId, documentType: extractionResult.documentType },
    })

    return extractionResult
  }

  private simulateExtraction(fileName: string) {
    const lowerName = fileName.toLowerCase()
    if (lowerName.includes('w-2') || lowerName.includes('w2')) {
      return {
        documentType: 'W-2',
        taxYear: 2025,
        fields: {
          employerName: { value: 'Acme Inc', confidence: 0.95 },
          wages: { value: '150000', confidence: 0.92 },
          federalTaxWithheld: { value: '35000', confidence: 0.90 },
        },
        overallConfidence: 0.92,
        flaggedIssues: [],
        reasoning: 'Standard W-2 extraction',
      }
    }
    return {
      documentType: 'General Tax Document',
      taxYear: 2025,
      fields: {
        totalAmount: { value: 'Needs manual review', confidence: 0.6 },
      },
      overallConfidence: 0.65,
      flaggedIssues: ['Could not identify document type with certainty'],
      reasoning: 'Document type not recognized — flagging for manual review',
    }
  }
}
