// Used in: App.tsx — route /documents/vault (full document vault view)
import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfidenceBadge } from '@/components/agents/ConfidenceBadge'
import { formatDate } from '@/lib/utils'
import { ChevronRight } from 'lucide-react'

export function DocumentVault() {
  const queryClient = useQueryClient()
  const [dragOver, setDragOver] = useState(false)
  const { data: documents = [] } = useQuery({ queryKey: ['documents'], queryFn: () => api.getDocuments() })

  const uploadMutation = useMutation({
    mutationFn: (file: File) => api.uploadDocument(file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents'] }),
  })

  const extractMutation = useMutation({
    mutationFn: (documentId: string) => api.extractDocument(documentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents'] }),
  })

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    files.forEach(file => uploadMutation.mutate(file))
  }, [uploadMutation])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    files.forEach(file => uploadMutation.mutate(file))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1 text-[13px] mb-1">
        <Link to="/documents" className="text-[#6B7280] hover:text-[#374151]">Documents</Link>
        <ChevronRight size={12} className="text-[#9CA3AF]" />
        <span className="text-[#111827]">Vault</span>
      </div>
      <h1 className="text-2xl font-bold text-gray-900">Document Vault</h1>

      {/* Upload Zone */}
      <div
        className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          dragOver ? 'border-primary bg-primary-50' : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <div className="text-gray-500">
          <p className="text-lg font-medium">Drop files here or click to upload</p>
          <p className="text-sm mt-1">PDF, PNG, JPG, CSV, XLSX — Max 25MB</p>
          <input type="file" className="hidden" id="file-upload" onChange={handleFileInput} multiple accept=".pdf,.png,.jpg,.jpeg,.csv,.xlsx" />
          <Button variant="outline" className="mt-3" onClick={() => document.getElementById('file-upload')?.click()}>
            Choose Files
          </Button>
        </div>
      </div>

      {/* Document Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {documents.map(doc => (
          <Card key={doc.id}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-sm">{doc.fileName}</p>
                  <p className="text-xs text-gray-500">{formatDate(doc.createdAt)}</p>
                </div>
                {doc.reviewedByHuman ? (
                  <Badge className="bg-green-100 text-green-700">Reviewed</Badge>
                ) : (
                  <Badge className="bg-amber-100 text-amber-700">Needs review</Badge>
                )}
              </div>

              {/* AI Tags */}
              {doc.aiTags?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {doc.aiTags.map((tag: string, i: number) => (
                    <Badge key={i} className="bg-blue-50 text-blue-600 text-xs">{tag}</Badge>
                  ))}
                </div>
              )}

              {/* Confidence */}
              {doc.confidenceScore != null && (
                <ConfidenceBadge score={doc.confidenceScore} />
              )}

              {/* Extracted fields preview */}
              {doc.extractedData && typeof doc.extractedData === 'object' && (doc.extractedData as any).fields && (
                <div className="space-y-1">
                  {Object.entries((doc.extractedData as any).fields).slice(0, 3).map(([key, val]: [string, any]) => (
                    <div key={key} className="flex justify-between text-xs">
                      <span className="text-gray-500">{key}</span>
                      <span className={`font-medium ${val.confidence < 0.75 ? 'text-amber-600' : 'text-gray-900'}`}>
                        {val.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                {!doc.extractedData && (
                  <Button size="sm" variant="outline" onClick={() => extractMutation.mutate(doc.id)}>
                    Extract Data
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
