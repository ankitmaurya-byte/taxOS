// UNUSED — not routed or imported anywhere
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/ui/status-badge'
import { ConfidenceBadge } from '@/components/agents/ConfidenceBadge'
import { formatDate } from '@/lib/utils'
import type { FilingStatus } from 'shared'

const STAGES: { status: FilingStatus; label: string }[] = [
  { status: 'intake', label: 'Intake' },
  { status: 'ai_prep', label: 'AI Preparation' },
  { status: 'cpa_review', label: 'CPA Review' },
  { status: 'founder_approval', label: 'Founder Approval' },
  { status: 'submitted', label: 'Submitted' },
]

export function FilingRoom() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [chatMessage, setChatMessage] = useState('')
  const [chatHistory, setChatHistory] = useState<Array<{ role: string; content: string }>>([])
  const [streaming, setStreaming] = useState(false)

  const { data: filings = [] } = useQuery({ queryKey: ['filings'], queryFn: () => api.getFilings() })
  const { data: filing } = useQuery({
    queryKey: ['filing', id],
    queryFn: () => api.getFiling(id!),
    enabled: !!id,
  })

  const approveMutation = useMutation({
    mutationFn: () => api.approveFiling(id!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['filing', id] }),
  })

  const rejectMutation = useMutation({
    mutationFn: (reason: string) => api.rejectFiling(id!, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['filing', id] }),
  })

  const sendMessage = async () => {
    if (!chatMessage.trim() || !id) return
    const msg = chatMessage
    setChatMessage('')
    setChatHistory(prev => [...prev, { role: 'user', content: msg }])
    setStreaming(true)

    let assistantMsg = ''
    setChatHistory(prev => [...prev, { role: 'assistant', content: '' }])

    try {
      await api.streamIntakeMessage(id, msg, (chunk) => {
        assistantMsg += chunk
        setChatHistory(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: assistantMsg }
          return updated
        })
      })
    } catch (err) {
      console.error('Stream error:', err)
    }
    setStreaming(false)
  }

  // Filing list view when no ID selected
  if (!id) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Filing Room</h1>
        </div>
          <div className="grid gap-4">
            {filings.map(f => (
            <Card key={f.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/filings/room/${f.id}`)}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">{f.formType} — {f.formName}</p>
                  <p className="text-sm text-gray-500">Tax Year {f.taxYear}</p>
                </div>
                <div className="flex items-center gap-3">
                  {f.aiConfidenceScore != null && <ConfidenceBadge score={f.aiConfidenceScore} />}
                  <StatusBadge status={f.status} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!filing) return <div>Loading...</div>

  const stageIndex = STAGES.findIndex(s => s.status === filing.status)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/filings')}>Back</Button>
        <h1 className="text-2xl font-bold text-gray-900">{filing.formType} — {filing.formName}</h1>
        <StatusBadge status={filing.status} />
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Timeline Sidebar */}
        <div className="col-span-2">
          <Card>
            <CardContent className="p-4">
              <div className="space-y-4">
                {STAGES.map((stage, i) => (
                  <div key={stage.status} className="flex items-center gap-2">
                    <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                      i < stageIndex ? 'bg-green-500 text-white' :
                      i === stageIndex ? 'bg-primary text-white' :
                      'bg-gray-200 text-gray-500'
                    }`}>
                      {i < stageIndex ? '✓' : i + 1}
                    </div>
                    <span className={`text-sm ${i === stageIndex ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>
                      {stage.label}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chat / Conversation Thread */}
        <div className="col-span-5">
          <Card className="flex flex-col h-[600px]">
            <CardHeader>
              <CardTitle>AI Conversation</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-3">
              {/* Existing conversation messages */}
              {filing.conversations?.map((convo: any) =>
                (convo.messages || []).map((msg: any, i: number) => (
                  <div key={`${convo.id}-${i}`} className={`rounded-lg p-3 ${
                    msg.role === 'assistant' ? 'bg-blue-50 text-gray-800' : 'bg-gray-100 text-gray-800 ml-8'
                  }`}>
                    <p className="text-xs font-medium text-gray-500 mb-1">
                      {msg.role === 'assistant' ? 'TaxOS AI' : 'You'}
                    </p>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                ))
              )}
              {/* Live chat messages */}
              {chatHistory.map((msg, i) => (
                <div key={`chat-${i}`} className={`rounded-lg p-3 ${
                  msg.role === 'assistant' ? 'bg-blue-50 text-gray-800' : 'bg-gray-100 text-gray-800 ml-8'
                }`}>
                  <p className="text-xs font-medium text-gray-500 mb-1">
                    {msg.role === 'assistant' ? 'TaxOS AI' : 'You'}
                  </p>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              ))}
            </CardContent>
            <div className="border-t p-4 flex gap-2">
              <Input
                value={chatMessage}
                onChange={e => setChatMessage(e.target.value)}
                placeholder="Ask the AI agent..."
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                disabled={streaming}
              />
              <Button onClick={sendMessage} disabled={streaming || !chatMessage.trim()}>
                Send
              </Button>
            </div>
          </Card>
        </div>

        {/* Form Preview */}
        <div className="col-span-5">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Form Preview</CardTitle>
                {filing.aiConfidenceScore != null && <ConfidenceBadge score={filing.aiConfidenceScore} />}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {filing.aiSummary && (
                <div className="rounded-md bg-blue-50 p-3">
                  <p className="text-sm font-medium text-blue-800 mb-1">AI Summary</p>
                  <p className="text-sm text-blue-700">{filing.aiSummary}</p>
                </div>
              )}
              {filing.aiReasoning && (
                <div className="rounded-md bg-gray-50 p-3">
                  <p className="text-sm font-medium text-gray-700 mb-1">AI Reasoning</p>
                  <p className="text-sm text-gray-600">{filing.aiReasoning}</p>
                </div>
              )}
              {filing.filingData && typeof filing.filingData === 'object' && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Filing Data</p>
                  {Object.entries(filing.filingData as Record<string, any>).map(([key, value]) => (
                    <div key={key} className="flex justify-between rounded-md border px-3 py-2">
                      <span className="text-sm text-gray-600">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                      <span className="text-sm font-medium">
                        {typeof value === 'number' ? `$${value.toLocaleString()}` : JSON.stringify(value)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Documents */}
              {filing.documents?.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Attached Documents</p>
                  {filing.documents.map((doc: any) => (
                    <div key={doc.id} className="flex items-center gap-2 rounded-md border px-3 py-2 mb-1">
                      <span className="text-sm">{doc.fileName}</span>
                      {doc.confidenceScore != null && <ConfidenceBadge score={doc.confidenceScore} />}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Approval Card */}
          {filing.status === 'founder_approval' && (
            <Card className="mt-4 border-orange-200 bg-orange-50">
              <CardContent className="p-4 space-y-3">
                <p className="font-medium text-orange-800">Founder Approval Required</p>
                <p className="text-sm text-orange-700">{filing.aiSummary}</p>
                <div className="flex gap-2">
                  <Button onClick={() => approveMutation.mutate()}>Approve & Submit</Button>
                  <Button variant="destructive" onClick={() => {
                    const reason = prompt('Rejection reason:')
                    if (reason) rejectMutation.mutate(reason)
                  }}>
                    Reject
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/advisor')}>Ask AI</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
