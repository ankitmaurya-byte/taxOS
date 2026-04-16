// Used in: App.tsx — route /entities/overview (lists all entities with summary cards)
// Navigates to: /entities/:entityId (EntityDetailPage) when clicking an entity card
// Navigates to: /entities/:entityId?tab=<tab> when clicking a tab on a card
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/auth'
import { StatusBadge } from '@/components/ui/status-badge'
import { Plus, FileText, Users, CircleDot } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Input } from '@/components/ui/input'

const COUNTRY_FLAGS: Record<string, string> = {
  US: '🇺🇸',
  IN: '🇮🇳',
  GB: '🇬🇧',
  CA: '🇨🇦',
  DE: '🇩🇪',
  AU: '🇦🇺',
}

// Tab key mapping from overview card tabs → EntityDetailPage tab query params
const TAB_NAV_MAP: Record<string, string> = {
  overview: 'overview',
  directors: 'directors-officers',
  shareholders: 'shareholders',
}

export function EntitiesOverviewPage() {
  const navigate = useNavigate()
  const [showAddForm, setShowAddForm] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [form, setForm] = useState({
    legalName: '',
    entityType: 'C-Corp' as string,
    stateOfIncorporation: '',
    ein: '',
    country: 'US',
  })

  const user = useAuthStore(s => s.user)
  const entities = useAuthStore(s => s.entities)
  const fetchEntities = useAuthStore(s => s.fetchEntities)
  const createEntity = useAuthStore(s => s.createEntity)

  useEffect(() => { fetchEntities() }, [fetchEntities])

  return (
    <div>
      {/* Top row */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs text-[#64748d]">Overall Brand</p>
          <h1 className="text-xl font-semibold text-[#061b31]">{user?.name || 'My Brand'}</h1>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 h-9 px-4 bg-[#533afd] text-white rounded-lg text-sm font-medium hover:bg-[#4434d4] transition-colors"
        >
          <Plus size={16} />
          {showAddForm ? 'Cancel' : 'Add Entity'}
        </button>
      </div>

      {/* Add Entity form */}
      {showAddForm && (
        <div className="bg-white border border-[#e5edf5] rounded-md p-5 mb-6">
          <h3 className="text-sm font-semibold text-[#061b31] mb-4">New Entity</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs text-[#64748d] mb-1">Legal Name</label>
              <Input
                value={form.legalName}
                onChange={(e) => setForm((f) => ({ ...f, legalName: e.target.value }))}
                placeholder="e.g. ACME CORPORATION"
              />
            </div>
            <div>
              <label className="block text-xs text-[#64748d] mb-1">Entity Type</label>
              <select
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#533afd]"
                value={form.entityType}
                onChange={(e) => setForm((f) => ({ ...f, entityType: e.target.value }))}
              >
                <option value="C-Corp">C-Corp</option>
                <option value="LLC">LLC</option>
                <option value="S-Corp">S-Corp</option>
                <option value="Pvt-Ltd">Pvt Ltd Company</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#64748d] mb-1">State of Incorporation</label>
              <Input
                value={form.stateOfIncorporation}
                onChange={(e) => setForm((f) => ({ ...f, stateOfIncorporation: e.target.value }))}
                placeholder="e.g. Delaware"
              />
            </div>
            <div>
              <label className="block text-xs text-[#64748d] mb-1">EIN (optional)</label>
              <Input
                value={form.ein}
                onChange={(e) => setForm((f) => ({ ...f, ein: e.target.value }))}
                placeholder="XX-XXXXXXX"
              />
            </div>
            <div>
              <label className="block text-xs text-[#64748d] mb-1">Country</label>
              <Input
                value={form.country}
                onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                placeholder="US"
              />
            </div>
          </div>
          <button
            onClick={async () => {
              setCreateLoading(true)
              try {
                await createEntity(form)
                setShowAddForm(false)
                setForm({ legalName: '', entityType: 'C-Corp', stateOfIncorporation: '', ein: '', country: 'US' })
              } finally { setCreateLoading(false) }
            }}
            disabled={!form.legalName || !form.stateOfIncorporation || createLoading}
            className="h-9 px-4 bg-[#533afd] text-white rounded-lg text-sm font-medium hover:bg-[#4434d4] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {createLoading ? 'Creating...' : 'Create Entity'}
          </button>
        </div>
      )}

      {/* Section */}
      <h2 className="text-base font-semibold text-[#061b31] mb-4">Your Brand Entities</h2>

      {/* Entity cards */}
      <div className="space-y-4">
        {entities.length === 0 && (
          <div className="bg-white border border-[#e5edf5] rounded-md p-12 flex flex-col items-center text-center">
            <FileText size={32} className="text-[#e5edf5] mb-3" />
            <p className="text-sm text-[#64748d]">No entities yet. Add your first entity to get started.</p>
          </div>
        )}

        {entities.map((entity, index) => {
          const flag = COUNTRY_FLAGS[entity.country || 'US'] || '🏳️'

          return (
            // Navigates to → /entities/:entityId (EntityDetailPage)
            <div
              key={entity.id}
              className="relative cursor-pointer"
              onClick={() => navigate(`/entities/${entity.id}`)}
            >
              {/* Connector line for sub-entities */}
              {index > 0 && (
                <div className="absolute left-8 -top-4 w-0.5 h-4 bg-[#e5edf5]" />
              )}

              <div
                className={`bg-white border border-[#e5edf5] rounded-md p-5 hover:border-[#533afd] hover:shadow-sm transition-all ${
                  index > 0 ? 'ml-8' : ''
                }`}
              >
                {/* Top row */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{flag}</span>
                    <h3 className="text-[15px] font-semibold text-[#061b31] uppercase">
                      {entity.legalName}
                    </h3>
                  </div>
                  <StatusBadge status={entity.status || 'active'} />
                </div>

                {/* Details */}
                <div className="grid grid-cols-3 gap-6 mb-4">
                  <div>
                    <p className="text-[11px] text-[#64748d] uppercase tracking-wider mb-0.5">
                      Country
                    </p>
                    <p className="text-[13px] font-medium text-[#061b31]">
                      {entity.country || 'US'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[#64748d] uppercase tracking-wider mb-0.5">
                      State
                    </p>
                    <p className="text-[13px] font-medium text-[#061b31]">
                      {entity.stateOfIncorporation}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[#64748d] uppercase tracking-wider mb-0.5">
                      Formation
                    </p>
                    <p className="text-[13px] font-medium text-[#061b31]">{entity.entityType}</p>
                  </div>
                </div>

                {/* Tabs — each navigates to EntityDetailPage with the matching tab */}
                <div className="flex items-center gap-4 border-t border-[#e5edf5] pt-3">
                  {[
                    { key: 'overview', icon: FileText, label: 'Overview' },
                    { key: 'directors', icon: Users, label: 'Directors & Officers' },
                    { key: 'shareholders', icon: CircleDot, label: 'Shareholders' },
                  ].map((t) => (
                    <button
                      key={t.key}
                      onClick={(e) => {
                        e.stopPropagation()
                        // Navigates to → /entities/:entityId?tab=<tab> (EntityDetailPage)
                        navigate(`/entities/${entity.id}?tab=${TAB_NAV_MAP[t.key]}`)
                      }}
                      className="flex items-center gap-1.5 text-[13px] pb-1 text-[#64748d] hover:text-[#533afd] transition-colors"
                    >
                      <t.icon size={14} />
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
