// Used in: App.tsx — route /audit (audit trail log viewer)
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'

const ACTOR_COLORS = {
  ai: 'border-l-blue-400 bg-blue-50',
  cpa: 'border-l-amber-400 bg-amber-50',
  founder: 'border-l-green-400 bg-green-50',
  system: 'border-l-gray-400 bg-gray-50',
}

const ACTOR_BADGES = {
  ai: 'bg-blue-100 text-blue-700',
  cpa: 'bg-amber-100 text-amber-700',
  founder: 'bg-green-100 text-green-700',
  system: 'bg-gray-100 text-gray-700',
}

export function AuditTrail() {
  const [filter, setFilter] = useState<{ actorType?: string; filingId?: string }>({})

  const auditLog = useAuthStore(s => s.auditLog)
  const fetchAuditLog = useAuthStore(s => s.fetchAuditLog)

  useEffect(() => { fetchAuditLog() }, [fetchAuditLog])

  const exportCsv = async () => {
    const csv = await api.exportAuditCsv(filter.filingId)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'audit-trail.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Audit Trail</h1>
        <Button variant="outline" onClick={exportCsv}>Export CSV</Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={!filter.actorType ? 'default' : 'outline'}
          onClick={() => setFilter(f => ({ ...f, actorType: undefined }))}
        >
          All
        </Button>
        {(['ai', 'cpa', 'founder', 'system'] as const).map(type => (
          <Button
            key={type}
            size="sm"
            variant={filter.actorType === type ? 'default' : 'outline'}
            onClick={() => setFilter(f => ({ ...f, actorType: type }))}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </Button>
        ))}
      </div>

      {/* Log entries */}
      <div className="space-y-3">
        {auditLog.map(entry => (
          <Card key={entry.id} className={`border-l-4 ${ACTOR_COLORS[entry.actorType as keyof typeof ACTOR_COLORS] || ACTOR_COLORS.system}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge className={ACTOR_BADGES[entry.actorType as keyof typeof ACTOR_BADGES] || ACTOR_BADGES.system}>
                      {entry.actorType}
                    </Badge>
                    <span className="text-sm font-medium text-gray-900">
                      {entry.action.replace(/_/g, ' ')}
                    </span>
                    {entry.confidenceScore != null && (
                      <Badge className="bg-purple-50 text-purple-600">
                        {Math.round(entry.confidenceScore * 100)}% confidence
                      </Badge>
                    )}
                  </div>
                  {entry.reasoning && (
                    <p className="text-sm text-gray-600">{entry.reasoning}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>{formatDate(entry.createdAt)}</span>
                    {entry.actorId && <span>by {entry.actorId}</span>}
                    {entry.modelVersion && <span>model: {entry.modelVersion}</span>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
