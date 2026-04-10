// Used in: App.tsx — route /approvals (approval queue for filings)
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfidenceBadge } from '@/components/agents/ConfidenceBadge'

export function ApprovalQueue() {
  const approvals = useAuthStore(s => s.approvals)
  const fetchApprovals = useAuthStore(s => s.fetchApprovals)
  const resolveApproval = useAuthStore(s => s.resolveApproval)
  const escalateApproval = useAuthStore(s => s.escalateApproval)

  const [expandedChat, setExpandedChat] = useState<string | null>(null)
  const [chatInputs, setChatInputs] = useState<Record<string, string>>({})
  const [chatResponses, setChatResponses] = useState<Record<string, string>>({})
  const [chatLoading, setChatLoading] = useState<Record<string, boolean>>({})
  const [chatErrors, setChatErrors] = useState<Record<string, string>>({})
  const [resolveLoading, setResolveLoading] = useState<Record<string, boolean>>({})
  const [escalateLoading, setEscalateLoading] = useState<Record<string, boolean>>({})

  useEffect(() => { fetchApprovals() }, [fetchApprovals])

  const sendApprovalQuestion = async (approval: any) => {
    const question = chatInputs[approval.id]?.trim()
    if (!question || chatLoading[approval.id]) return

    setChatLoading((prev) => ({ ...prev, [approval.id]: true }))
    setChatErrors((prev) => ({ ...prev, [approval.id]: '' }))
    setChatResponses((prev) => ({ ...prev, [approval.id]: '' }))

    try {
      let fullResponse = ''
      const prompt = [
        'You are helping with an approval queue decision for a filing.',
        `Queue type: ${approval.queueType}.`,
        `Approval summary: ${approval.summary}`,
        approval.aiRecommendation ? `Existing AI recommendation: ${approval.aiRecommendation}` : '',
        `User question: ${question}`,
      ]
        .filter(Boolean)
        .join('\n')

      await api.streamTaxQa(prompt, (chunk: string) => {
        fullResponse += chunk
        setChatResponses((prev) => ({ ...prev, [approval.id]: fullResponse }))
      })

      setChatInputs((prev) => ({ ...prev, [approval.id]: '' }))
    } catch {
      setChatErrors((prev) => ({
        ...prev,
        [approval.id]: 'Sorry, something went wrong while asking the AI. Please try again.',
      }))
    } finally {
      setChatLoading((prev) => ({ ...prev, [approval.id]: false }))
    }
  }

  const pending = approvals.filter(a => a.status === 'pending')
  const resolved = approvals.filter(a => a.status !== 'pending')

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Approval Queue</h1>

      {pending.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center p-12 text-gray-500">
            No pending approvals. All caught up!
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {pending.map(approval => (
            <Card key={approval.id} className="border-l-4 border-l-orange-400">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-orange-100 text-orange-700">{approval.queueType === 'founder' ? 'Founder Review' : 'CPA Review'}</Badge>
                      <Badge className="bg-gray-100 text-gray-600">Pending</Badge>
                    </div>
                    <p className="text-sm text-gray-800">{approval.summary}</p>
                    {approval.aiRecommendation && (
                      <div className="rounded-md bg-blue-50 p-3">
                        <p className="text-xs font-medium text-blue-700 mb-1">AI Recommendation</p>
                        <p className="text-sm text-blue-600">{approval.aiRecommendation}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    onClick={async () => {
                      setResolveLoading(prev => ({ ...prev, [approval.id]: true }))
                      try { await resolveApproval(approval.id, 'approved') } finally { setResolveLoading(prev => ({ ...prev, [approval.id]: false })) }
                    }}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={async () => {
                      const reason = prompt('Rejection reason:')
                      if (reason) {
                        setResolveLoading(prev => ({ ...prev, [approval.id]: true }))
                        try { await resolveApproval(approval.id, 'rejected', reason) } finally { setResolveLoading(prev => ({ ...prev, [approval.id]: false })) }
                      }
                    }}
                  >
                    Reject
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setExpandedChat(expandedChat === approval.id ? null : approval.id)}>
                    Ask AI
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      setEscalateLoading(prev => ({ ...prev, [approval.id]: true }))
                      try { await escalateApproval(approval.id) } finally { setEscalateLoading(prev => ({ ...prev, [approval.id]: false })) }
                    }}
                  >
                    Get CPA
                  </Button>
                </div>

                {expandedChat === approval.id && (
                  <div className="mt-4 rounded-md border p-4 bg-gray-50">
                    <p className="text-sm text-gray-500">AI chat panel — ask follow-up questions about this filing</p>
                    <div className="mt-2 flex gap-2">
                      <input
                        className="flex-1 rounded-md border px-3 py-1 text-sm"
                        placeholder="Ask the AI..."
                        value={chatInputs[approval.id] || ''}
                        onChange={(e) => setChatInputs((prev) => ({ ...prev, [approval.id]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') sendApprovalQuestion(approval)
                        }}
                      />
                      <Button
                        size="sm"
                        onClick={() => sendApprovalQuestion(approval)}
                        disabled={chatLoading[approval.id] || !chatInputs[approval.id]?.trim()}
                      >
                        {chatLoading[approval.id] ? 'Sending...' : 'Send'}
                      </Button>
                    </div>
                    {chatErrors[approval.id] && (
                      <p className="mt-2 text-sm text-red-600">{chatErrors[approval.id]}</p>
                    )}
                    {chatResponses[approval.id] && (
                      <div className="mt-3 rounded-md border border-blue-100 bg-white p-3">
                        <p className="mb-1 text-xs font-medium text-blue-700">AI response</p>
                        <p className="whitespace-pre-wrap text-sm text-gray-700">{chatResponses[approval.id]}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {resolved.length > 0 && (
        <>
          <h2 className="text-lg font-semibold text-gray-700 mt-8">Resolved</h2>
          <div className="grid gap-3">
            {resolved.map(approval => (
              <Card key={approval.id} className="opacity-60">
                <CardContent className="flex items-center justify-between p-4">
                  <p className="text-sm text-gray-600">{approval.summary}</p>
                  <Badge className={approval.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                    {approval.status}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
