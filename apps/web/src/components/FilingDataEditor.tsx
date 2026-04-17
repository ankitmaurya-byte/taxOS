import { useState } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import { api } from '@/lib/api'

function formatKey(key: string): string {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())
}

export function FilingDataEditor({
  filingId,
  initialData,
  onClose,
  onSaved,
}: {
  filingId: string
  initialData: Record<string, unknown>
  onClose: () => void
  onSaved: () => void
}) {
  const [rows, setRows] = useState<{ key: string; value: string }[]>(
    Object.entries(initialData).map(([k, v]) => {
      if (v && typeof v === 'object' && 'value' in (v as any)) {
        return { key: k, value: String((v as any).value ?? '') }
      }
      if (v && typeof v === 'object') {
        return { key: k, value: JSON.stringify(v) }
      }
      return { key: k, value: String(v ?? '') }
    })
  )
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function addRow() {
    const k = newKey.trim()
    if (!k) return
    if (rows.some(r => r.key === k)) {
      setError(`Field "${k}" already exists — edit it below.`)
      return
    }
    setRows(prev => [...prev, { key: k, value: newValue }])
    setNewKey('')
    setNewValue('')
    setError('')
  }

  function removeRow(key: string) {
    setRows(prev => prev.filter(r => r.key !== key))
  }

  function updateValue(key: string, value: string) {
    setRows(prev => prev.map(r => r.key === key ? { ...r, value } : r))
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const fields: Record<string, string | null> = {}
      for (const key of Object.keys(initialData)) {
        if (!rows.some(r => r.key === key)) fields[key] = null
      }
      for (const r of rows) fields[r.key] = r.value
      await api.updateFilingData(filingId, fields)
      onSaved()
    } catch (e: any) {
      setError(e?.message ?? 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-md shadow-2xl w-full max-w-lg max-w-[calc(100vw-1.5rem)] max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-[#e5edf5]">
          <h2 className="text-base font-normal text-[#061b31]" style={{ fontWeight: 400 }}>Edit Filing Data</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#64748d] hover:bg-[#f6f9fc]">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-2">
          {rows.length === 0 && (
            <p className="text-sm text-[#64748d] italic">No fields yet. Add one below.</p>
          )}
          {rows.map(row => (
            <div key={row.key} className="flex items-center gap-2">
              <span className="w-36 shrink-0 text-xs font-medium text-[#64748d] truncate" title={row.key}>
                {formatKey(row.key)}
              </span>
              <input
                value={row.value}
                onChange={e => updateValue(row.key, e.target.value)}
                className="flex-1 h-8 text-sm border border-[#e5edf5] rounded-lg px-2 outline-none focus:border-[#533afd]"
              />
              <button onClick={() => removeRow(row.key)} className="p-1 text-[#64748d] hover:text-[#ea2261]">
                <Trash2 size={14} />
              </button>
            </div>
          ))}

          <div className="pt-3 border-t border-[#f6f9fc] mt-3">
            <p className="text-xs font-medium text-[#64748d] mb-2">Add new field</p>
            <div className="flex items-center gap-2">
              <input
                value={newKey}
                onChange={e => setNewKey(e.target.value)}
                placeholder="fieldName"
                className="w-36 h-8 text-sm border border-[#e5edf5] rounded-lg px-2 outline-none focus:border-[#533afd]"
              />
              <input
                value={newValue}
                onChange={e => setNewValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addRow()}
                placeholder="value"
                className="flex-1 h-8 text-sm border border-[#e5edf5] rounded-lg px-2 outline-none focus:border-[#533afd]"
              />
              <button
                onClick={addRow}
                disabled={!newKey.trim()}
                className="h-8 w-8 flex items-center justify-center rounded-lg bg-[#533afd] text-white hover:bg-[#4434d4] disabled:opacity-40"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          {error && <p className="text-xs text-[#ea2261] mt-1">{error}</p>}
        </div>

        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-[#e5edf5] flex justify-end gap-2 flex-wrap">
          <button onClick={onClose} className="h-9 px-4 border border-[#e5edf5] rounded-lg text-sm font-medium text-[#273951] hover:bg-[#f6f9fc]">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="h-9 px-4 bg-[#533afd] text-white rounded-lg text-sm font-medium hover:bg-[#4434d4] disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
