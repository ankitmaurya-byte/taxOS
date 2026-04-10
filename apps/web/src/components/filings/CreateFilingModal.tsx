import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface CreateFilingModalProps {
  open: boolean
  onClose: () => void
}

const INITIAL_FORM = {
  entityId: '',
  formType: '',
  formName: '',
  taxYear: String(new Date().getFullYear()),
}

export function CreateFilingModal({ open, onClose }: CreateFilingModalProps) {
  const navigate = useNavigate()
  const [createLoading, setCreateLoading] = useState(false)
  const [form, setForm] = useState(INITIAL_FORM)
  const [error, setError] = useState('')

  const entities = useAuthStore(s => s.entities)
  const fetchEntities = useAuthStore(s => s.fetchEntities)
  const createFiling = useAuthStore(s => s.createFiling)
  const fetchAuditLog = useAuthStore(s => s.fetchAuditLog)

  useEffect(() => { if (open) fetchEntities() }, [open, fetchEntities])

  useEffect(() => {
    if (!open) {
      setForm(INITIAL_FORM)
      setError('')
    }
  }, [open])

  useEffect(() => {
    if (open && entities.length > 0 && !form.entityId) {
      setForm((current) => ({ ...current, entityId: entities[0].id }))
    }
  }, [open, entities, form.entityId])

  if (!open) return null

  const canSubmit = Boolean(form.entityId && form.formType.trim() && form.formName.trim()) && !createLoading

  const handleSubmit = async () => {
    setError('')
    setCreateLoading(true)
    try {
      const filing = await createFiling({
        entityId: form.entityId,
        formType: form.formType.trim(),
        formName: form.formName.trim(),
        taxYear: form.taxYear ? Number(form.taxYear) : undefined,
      })
      await fetchAuditLog()
      onClose()
      navigate(`/filings/${filing.id}`)
    } catch (err: any) {
      setError(err?.message || 'Failed to create filing')
    } finally {
      setCreateLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-full max-w-xl rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-[#111827]">Create filing</h2>
            <p className="mt-0.5 text-sm text-[#6B7280]">Start a new filing from an existing entity.</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#9CA3AF] hover:bg-[#F3F4F6] hover:text-[#374151]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-1 block text-xs text-[#6B7280]">Entity</label>
            <select
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]"
              value={form.entityId}
              onChange={(e) => setForm((current) => ({ ...current, entityId: e.target.value }))}
              disabled={entities.length === 0}
            >
              {entities.length === 0 ? (
                <option value="">No entities available</option>
              ) : (
                entities.map((entity: any) => (
                  <option key={entity.id} value={entity.id}>
                    {entity.legalName}
                  </option>
                ))
              )}
            </select>
            {entities.length === 0 && (
              <p className="mt-1 text-xs text-[#B45309]">Create an entity first before starting a filing.</p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-[#6B7280]">Form type</label>
              <Input
                value={form.formType}
                onChange={(e) => setForm((current) => ({ ...current, formType: e.target.value }))}
                placeholder="e.g. Federal"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[#6B7280]">Tax year</label>
              <Input
                type="number"
                min="2000"
                max="2100"
                value={form.taxYear}
                onChange={(e) => setForm((current) => ({ ...current, taxYear: e.target.value }))}
                placeholder="2026"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-[#6B7280]">Form name</label>
            <Input
              value={form.formName}
              onChange={(e) => setForm((current) => ({ ...current, formName: e.target.value }))}
              placeholder="e.g. Form 1120"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[#E5E7EB] px-6 py-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {createLoading ? 'Creating...' : 'Create filing'}
          </Button>
        </div>
      </div>
    </div>
  )
}
