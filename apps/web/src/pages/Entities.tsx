// UNUSED — not routed or imported anywhere. Superseded by EntitiesOverviewPage.
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

export function EntitiesPage() {
  const queryClient = useQueryClient()
  const { data: entities = [] } = useQuery({ queryKey: ['entities'], queryFn: () => api.getEntities() })
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    legalName: '',
    entityType: 'C-Corp' as const,
    stateOfIncorporation: '',
    ein: '',
    country: 'US',
  })

  const createMutation = useMutation({
    mutationFn: () => api.createEntity(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entities'] })
      setShowForm(false)
      setForm({ legalName: '', entityType: 'C-Corp', stateOfIncorporation: '', ein: '', country: 'US' })
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Entities</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'Add Entity'}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Legal Name</label>
                <Input value={form.legalName} onChange={e => setForm(f => ({ ...f, legalName: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Entity Type</label>
                <select
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                  value={form.entityType}
                  onChange={e => setForm(f => ({ ...f, entityType: e.target.value as any }))}
                >
                  <option value="C-Corp">C-Corp</option>
                  <option value="LLC">LLC</option>
                  <option value="S-Corp">S-Corp</option>
                  <option value="Pvt-Ltd">Pvt-Ltd</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State of Incorporation</label>
                <Input value={form.stateOfIncorporation} onChange={e => setForm(f => ({ ...f, stateOfIncorporation: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">EIN</label>
                <Input value={form.ein} onChange={e => setForm(f => ({ ...f, ein: e.target.value }))} placeholder="XX-XXXXXXX" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <Input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} />
              </div>
            </div>
            <Button onClick={() => createMutation.mutate()}>Create Entity</Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {entities.map((entity: any) => (
          <Card key={entity.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{entity.legalName}</h3>
                  <p className="text-sm text-gray-500">{entity.entityType} — {entity.stateOfIncorporation}</p>
                </div>
                <Badge className={entity.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}>
                  {entity.status}
                </Badge>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                {entity.ein && (
                  <div>
                    <span className="text-gray-500">EIN:</span>{' '}
                    <span className="font-medium">{entity.ein}</span>
                  </div>
                )}
                <div>
                  <span className="text-gray-500">FY End:</span>{' '}
                  <span className="font-medium">{entity.fiscalYearEnd}</span>
                </div>
                <div>
                  <span className="text-gray-500">Country:</span>{' '}
                  <span className="font-medium">{entity.country}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
