// UNUSED — not routed or imported anywhere
import { useState, useRef, useEffect } from 'react'
import { api } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useNavigate } from 'react-router-dom'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export function AIAdvisor() {
  const navigate = useNavigate()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendQuestion = async () => {
    if (!input.trim() || streaming) return
    const question = input
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: question }])
    setStreaming(true)

    let assistantMsg = ''
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    try {
      await api.streamTaxQa(question, (chunk) => {
        assistantMsg += chunk
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: assistantMsg }
          return updated
        })
      })
    } catch (err) {
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: 'Error: Failed to get response. Please try again.' }
        return updated
      })
    }
    setStreaming(false)
  }

  const parseMetadata = (content: string) => {
    const metadataMatch = content.match(/METADATA:\s*(\{[\s\S]*\})/)
    if (metadataMatch) {
      try {
        return {
          text: content.replace(/METADATA:\s*\{[\s\S]*\}/, '').trim(),
          metadata: JSON.parse(metadataMatch[1]),
        }
      } catch {}
    }
    return { text: content, metadata: null }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">AI Tax Advisor</h1>

      <Card className="flex-1 flex flex-col min-h-0">
        <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4">
              <div className="text-4xl">🤖</div>
              <p className="text-lg">Ask me anything about US taxes</p>
              <div className="grid gap-2 text-sm">
                <button
                  className="rounded-md border px-4 py-2 hover:bg-gray-50 text-left"
                  onClick={() => setInput('Do I need to file Form 5471 for my Indian subsidiary?')}
                >
                  Do I need to file Form 5471 for my Indian subsidiary?
                </button>
                <button
                  className="rounded-md border px-4 py-2 hover:bg-gray-50 text-left"
                  onClick={() => setInput('What happens if I miss the Delaware Franchise Tax deadline?')}
                >
                  What happens if I miss the Delaware Franchise Tax deadline?
                </button>
                <button
                  className="rounded-md border px-4 py-2 hover:bg-gray-50 text-left"
                  onClick={() => setInput('Can I claim R&D tax credits as a seed-stage startup?')}
                >
                  Can I claim R&D tax credits as a seed-stage startup?
                </button>
              </div>
            </div>
          )}

          {messages.map((msg, i) => {
            if (msg.role === 'user') {
              return (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[70%] rounded-lg bg-primary text-white px-4 py-3">
                    <p className="text-sm">{msg.content}</p>
                  </div>
                </div>
              )
            }

            const { text, metadata } = parseMetadata(msg.content)
            return (
              <div key={i} className="space-y-2">
                <div className="max-w-[85%] rounded-lg bg-gray-100 px-4 py-3">
                  <p className="text-sm whitespace-pre-wrap">{text}</p>
                </div>
                {metadata && (
                  <div className="flex items-center gap-2 ml-2">
                    <Badge className={
                      metadata.confidence === 'HIGH' ? 'bg-green-100 text-green-700' :
                      metadata.confidence === 'MEDIUM' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }>
                      {metadata.confidence} confidence
                    </Badge>
                    {metadata.sources?.map((s: string, j: number) => (
                      <Badge key={j} className="bg-blue-50 text-blue-600">{s}</Badge>
                    ))}
                    {metadata.requiresCpaReview && (
                      <Button size="sm" variant="outline" className="text-xs h-6" onClick={() => navigate('/approvals')}>
                        Escalate to CPA
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </CardContent>

        <div className="border-t p-4 flex gap-2">
          <input
            className="flex-1 rounded-md border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask a tax question..."
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendQuestion()}
            disabled={streaming}
          />
          <Button onClick={sendQuestion} disabled={streaming || !input.trim()}>
            {streaming ? 'Thinking...' : 'Ask'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
