// Used in: App.tsx — route /entities/:entityId (entity detail page with tabbed UI)
// Navigated from: EntitiesOverview.tsx — clicking an entity card or tab button
// Navigates to: /entities/overview (EntitiesOverviewPage) via breadcrumb "My Entities"
// Navigated to: /entities/:entityId?tab=<tab> when clicking a tab on a card
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/auth'
import {
  ChevronDown,
  ChevronRight,
  Phone,
  Shield,
  Lock,
  Plus,
  Search,
  Download,
  Trash2,
  Info,
  X,
  Copy,
  FileSpreadsheet,
} from 'lucide-react'
import { Input } from '@/components/ui/input'

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'directors-officers', label: 'Directors & Officers' },
  { key: 'shareholders', label: 'Shareholders' },
  { key: 'cap-table', label: 'Cap Table' },
  { key: 'sensitive-data', label: 'Sensitive Data' },
] as const

type TabKey = (typeof TABS)[number]['key']

const ENTITY_TYPE_LABELS: Record<string, string> = {
  'C-Corp': 'C Corporation',
  'S-Corp': 'S Corporation',
  'LLC': 'LLC',
  'Pvt-Ltd': 'Pvt Ltd Company',
}

const COUNTRY_LABELS: Record<string, string> = {
  US: 'United States',
  IN: 'India',
  GB: 'United Kingdom',
  CA: 'Canada',
  DE: 'Germany',
  AU: 'Australia',
}

export function EntityDetailPage() {
  const { entityId } = useParams<{ entityId: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = (searchParams.get('tab') as TabKey) || 'overview'
  const [updateLoading, setUpdateLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const entities = useAuthStore(s => s.entities)
  const fetchEntity = useAuthStore(s => s.fetchEntity)
  const fetchEntities = useAuthStore(s => s.fetchEntities)
  const updateEntity = useAuthStore(s => s.updateEntity)
  const deleteEntity = useAuthStore(s => s.deleteEntity)

  useEffect(() => {
    if (entityId) fetchEntity(entityId)
  }, [entityId, fetchEntity])

  const entity = entities.find(e => e.id === entityId)
  const isLoading = false

  const setTab = (tab: TabKey) => {
    setSearchParams({ tab })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-[#6B7280]">
        Loading entity...
      </div>
    )
  }

  if (!entity) {
    return (
      <div className="flex items-center justify-center h-64 text-[#6B7280]">
        Entity not found.
      </div>
    )
  }

  return (
    <div>
      {/* Breadcrumb — navigates back to /entities/overview (EntitiesOverviewPage) */}
      <div className="flex items-center gap-2 mb-2 text-sm">
        <button
          onClick={() => navigate('/entities/overview')}
          className="text-[#6C5CE7] hover:underline"
        >
          My Entities
        </button>
        <ChevronRight size={14} className="text-[#9CA3AF]" />
      </div>

      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-[#111827] uppercase">{entity.legalName}</h1>
        {entity.status !== 'dissolved' && (
          <button
            onClick={async () => {
              if (window.confirm(`Dissolve ${entity.legalName}?`)) {
                setDeleteLoading(true)
                try { await deleteEntity(entityId!) } finally { setDeleteLoading(false) }
                navigate('/entities/overview')
              }
            }}
            disabled={deleteLoading}
            className="h-9 rounded-lg border border-red-200 px-4 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            {deleteLoading ? 'Dissolving...' : 'Dissolve Entity'}
          </button>
        )}
      </div>

      {/* Tabs — switches between tab views within this page */}
      <div className="flex items-center gap-6 border-b border-[#E5E7EB] mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setTab(tab.key)}
            className={`pb-3 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'text-[#6C5CE7] border-b-2 border-[#6C5CE7]'
                : 'text-[#6B7280] hover:text-[#374151]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex gap-6">
        <div className="flex-1">
          {activeTab === 'overview' && (
            <OverviewTab entity={entity} onUpdate={async (data: any) => {
              setUpdateLoading(true)
              try { await updateEntity(entityId!, data) } finally { setUpdateLoading(false) }
            }} />
          )}
          {activeTab === 'directors-officers' && <DirectorsOfficersTab entity={entity} />}
          {activeTab === 'shareholders' && <ShareholdersTab entity={entity} />}
          {activeTab === 'cap-table' && <CapTableTab entity={entity} />}
          {activeTab === 'sensitive-data' && <SensitiveDataTab entity={entity} />}
        </div>

        {/* Supporting docs sidebar - only on overview */}
        {activeTab === 'overview' && (
          <div className="w-64 flex-shrink-0">
            <div className="border border-[#E5E7EB] rounded-xl p-4">
              <h3 className="text-sm font-semibold text-[#111827] mb-2">Supporting Docs</h3>
              <p className="text-sm text-[#6B7280]">-</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Overview Tab ─── */
// Used in: EntityDetailPage — rendered when ?tab=overview (default tab)
function OverviewTab({ entity, onUpdate }: { entity: any; onUpdate: (data: any) => void }) {
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const [showActivityDropdown, setShowActivityDropdown] = useState(false)

  const STATUSES = ['active', 'inactive', 'dissolved']
  const ACTIVITIES = [
    'Accounting services',
    'Software development',
    'Consulting services',
    'Financial services',
    'Manufacturing',
    'Retail trade',
    'Healthcare',
    'Real estate',
  ]

  return (
    <div className="space-y-4">
      {/* Top info row */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
        <div className="grid grid-cols-3 gap-6 mb-5">
          <div>
            <p className="text-xs text-[#6B7280] mb-1">Business name</p>
            <p className="text-sm font-semibold text-[#111827] uppercase">
              {entity.legalName}
            </p>
          </div>
          <div>
            <p className="text-xs text-[#6B7280] mb-1">Entity type</p>
            <p className="text-sm font-semibold text-[#111827]">
              {ENTITY_TYPE_LABELS[entity.entityType] || entity.entityType}
            </p>
          </div>
          <div>
            <p className="text-xs text-[#6B7280] mb-1">Country</p>
            <p className="text-sm font-semibold text-[#111827]">
              {COUNTRY_LABELS[entity.country] || entity.country}
            </p>
          </div>
        </div>

        {/* Date of incorporation */}
        <div className="mb-5">
          <p className="text-xs text-[#6B7280] mb-1">Date of incorporation</p>
          <div className="flex items-center justify-between border border-[#E5E7EB] rounded-lg px-3 py-2">
            <span className="text-sm text-[#111827]">
              {entity.createdAt
                ? new Date(entity.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: '2-digit',
                  })
                : '—'}
            </span>
            <span className="text-[#9CA3AF]">&#128197;</span>
          </div>
        </div>

        {/* Entity Status — functional dropdown */}
        <div className="mb-5 relative">
          <p className="text-xs text-[#6B7280] mb-1">Entity Status</p>
          <div
            className="flex items-center justify-between border border-[#E5E7EB] rounded-lg px-3 py-2 cursor-pointer hover:border-[#6C5CE7]"
            onClick={() => setShowStatusDropdown(!showStatusDropdown)}
          >
            <span className="text-sm text-[#111827] capitalize">{entity.status || 'Active'}</span>
            <div className="flex items-center gap-1">
              {entity.status && entity.status !== 'active' && (
                <X
                  size={14}
                  className="text-[#9CA3AF] hover:text-[#111827] cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation()
                    onUpdate({ status: 'active' })
                  }}
                />
              )}
              <ChevronDown size={14} className="text-[#9CA3AF]" />
            </div>
          </div>
          {showStatusDropdown && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-[#E5E7EB] rounded-lg shadow-lg">
              {STATUSES.map((status) => (
                <button
                  key={status}
                  onClick={() => {
                    onUpdate({ status })
                    setShowStatusDropdown(false)
                  }}
                  className={`w-full text-left px-3 py-2 text-sm capitalize hover:bg-[#F3F0FF] ${
                    entity.status === status ? 'text-[#6C5CE7] font-medium' : 'text-[#111827]'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Major business activity — functional dropdown */}
        <div className="relative">
          <div className="flex items-center gap-1 mb-1">
            <p className="text-xs text-[#6B7280]">Major business activity</p>
            <Info size={12} className="text-[#9CA3AF]" />
          </div>
          <div
            className="flex items-center justify-between border border-[#E5E7EB] rounded-lg px-3 py-2 cursor-pointer hover:border-[#6C5CE7]"
            onClick={() => setShowActivityDropdown(!showActivityDropdown)}
          >
            <span className="text-sm text-[#111827]">
              {entity.majorBusinessActivity || '—'}
            </span>
            <div className="flex items-center gap-1">
              {entity.majorBusinessActivity && (
                <X
                  size={14}
                  className="text-[#9CA3AF] hover:text-[#111827] cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation()
                    onUpdate({ majorBusinessActivity: null })
                  }}
                />
              )}
              <ChevronDown size={14} className="text-[#9CA3AF]" />
            </div>
          </div>
          {showActivityDropdown && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-[#E5E7EB] rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {ACTIVITIES.map((activity) => (
                <button
                  key={activity}
                  onClick={() => {
                    onUpdate({ majorBusinessActivity: activity })
                    setShowActivityDropdown(false)
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-[#F3F0FF] text-[#111827]"
                >
                  {activity}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Collapsible sections */}
      <CollapsibleSection
        icon={<Phone size={20} className="text-[#6C5CE7]" />}
        title="Contact and Addresses"
        description="Official contact information and addresses for business correspondence"
      />
      <CollapsibleSection
        icon={<Shield size={20} className="text-[#6C5CE7]" />}
        title="Tax and Compliance Information"
        description="Key tax and regulatory details for federal compliance and classification"
      />
    </div>
  )
}

/* ─── Collapsible Section ─── */
// Used in: OverviewTab — renders expandable Contact/Tax info sections
function CollapsibleSection({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#F3F0FF] flex items-center justify-center">
            {icon}
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-[#111827]">{title}</h3>
            <p className="text-xs text-[#6B7280]">{description}</p>
          </div>
        </div>
        <ChevronDown
          size={16}
          className={`text-[#9CA3AF] transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="mt-4 pt-4 border-t border-[#E5E7EB] text-sm text-[#6B7280]">
          No information added yet.
        </div>
      )}
    </div>
  )
}

/* ─── Directors & Officers Tab ─── */
// Used in: EntityDetailPage — rendered when ?tab=directors-officers
function DirectorsOfficersTab({ entity }: { entity: any }) {
  const [directors, setDirectors] = useState<any[]>(entity.directors || [])
  const [officers, setOfficers] = useState<any[]>(entity.officers || [])
  const [showDirectorForm, setShowDirectorForm] = useState(false)
  const [showOfficerForm, setShowOfficerForm] = useState(false)
  const [directorForm, setDirectorForm] = useState({ name: '', dateAppointed: '' })
  const [officerForm, setOfficerForm] = useState({
    name: '',
    role: '',
    dateAppointed: '',
    authorisedSignatory: false,
  })

  const addDirector = () => {
    if (!directorForm.name) return
    setDirectors((prev) => [...prev, { ...directorForm, status: 'Active' }])
    setDirectorForm({ name: '', dateAppointed: '' })
    setShowDirectorForm(false)
  }

  const addOfficer = () => {
    if (!officerForm.name) return
    setOfficers((prev) => [...prev, { ...officerForm, status: 'Active' }])
    setOfficerForm({ name: '', role: '', dateAppointed: '', authorisedSignatory: false })
    setShowOfficerForm(false)
  }

  return (
    <div className="space-y-8">
      {/* Directors */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[#111827]">Directors</h2>
          <button
            onClick={() => setShowDirectorForm(!showDirectorForm)}
            className="px-4 py-2 border border-[#E5E7EB] rounded-lg text-sm font-medium text-[#111827] hover:bg-gray-50"
          >
            {showDirectorForm ? 'Cancel' : 'Add director'}
          </button>
        </div>

        {/* Add Director Form */}
        {showDirectorForm && (
          <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-4 mb-4">
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <label className="block text-xs text-[#6B7280] mb-1">Name</label>
                <Input
                  value={directorForm.name}
                  onChange={(e) => setDirectorForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className="block text-xs text-[#6B7280] mb-1">Date Appointed</label>
                <input
                  type="date"
                  value={directorForm.dateAppointed}
                  onChange={(e) =>
                    setDirectorForm((f) => ({ ...f, dateAppointed: e.target.value }))
                  }
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]"
                />
              </div>
            </div>
            <button
              onClick={addDirector}
              disabled={!directorForm.name}
              className="h-8 px-4 bg-[#6C5CE7] text-white rounded-lg text-sm font-medium hover:bg-[#5B4BD5] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Director
            </button>
          </div>
        )}

        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-[#F9FAFB]">
                <th className="text-left text-xs font-medium text-[#6B7280] uppercase px-4 py-3">
                  Name
                </th>
                <th className="text-left text-xs font-medium text-[#6B7280] uppercase px-4 py-3">
                  Date Appointed
                </th>
                <th className="text-left text-xs font-medium text-[#6B7280] uppercase px-4 py-3">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {directors.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-sm text-[#6B7280]">
                    No directors added yet.
                  </td>
                </tr>
              ) : (
                directors.map((d: any, i: number) => (
                  <tr key={i} className="border-t border-[#E5E7EB]">
                    <td className="px-4 py-3 text-sm text-[#111827]">{d.name}</td>
                    <td className="px-4 py-3 text-sm text-[#111827]">
                      {d.dateAppointed
                        ? new Date(d.dateAppointed).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: '2-digit',
                          })
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#D1FAE5] text-[#065F46]">
                        {d.status || 'Active'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <div className="flex items-center justify-end px-4 py-2 text-xs text-[#6B7280] border-t border-[#E5E7EB]">
            {directors.length > 0
              ? `1 – ${directors.length} of ${directors.length}`
              : '0 of 0'}
          </div>
        </div>
      </div>

      {/* Officers */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[#111827]">Officers</h2>
          <button
            onClick={() => setShowOfficerForm(!showOfficerForm)}
            className="px-4 py-2 border border-[#E5E7EB] rounded-lg text-sm font-medium text-[#111827] hover:bg-gray-50"
          >
            {showOfficerForm ? 'Cancel' : 'Add officer'}
          </button>
        </div>

        {/* Add Officer Form */}
        {showOfficerForm && (
          <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-4 mb-4">
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <label className="block text-xs text-[#6B7280] mb-1">Name</label>
                <Input
                  value={officerForm.name}
                  onChange={(e) => setOfficerForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className="block text-xs text-[#6B7280] mb-1">Role</label>
                <Input
                  value={officerForm.role}
                  onChange={(e) => setOfficerForm((f) => ({ ...f, role: e.target.value }))}
                  placeholder="e.g. Chief Executive Officer"
                />
              </div>
              <div>
                <label className="block text-xs text-[#6B7280] mb-1">Date Appointed</label>
                <input
                  type="date"
                  value={officerForm.dateAppointed}
                  onChange={(e) =>
                    setOfficerForm((f) => ({ ...f, dateAppointed: e.target.value }))
                  }
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]"
                />
              </div>
              <div className="flex items-center gap-2 pt-5">
                <input
                  type="checkbox"
                  id="authorisedSignatory"
                  checked={officerForm.authorisedSignatory}
                  onChange={(e) =>
                    setOfficerForm((f) => ({ ...f, authorisedSignatory: e.target.checked }))
                  }
                  className="rounded border-gray-300"
                />
                <label htmlFor="authorisedSignatory" className="text-sm text-[#111827]">
                  Authorised Signatory
                </label>
              </div>
            </div>
            <button
              onClick={addOfficer}
              disabled={!officerForm.name}
              className="h-8 px-4 bg-[#6C5CE7] text-white rounded-lg text-sm font-medium hover:bg-[#5B4BD5] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Officer
            </button>
          </div>
        )}

        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-[#F9FAFB]">
                <th className="text-left text-xs font-medium text-[#6B7280] uppercase px-4 py-3">
                  Name
                </th>
                <th className="text-left text-xs font-medium text-[#6B7280] uppercase px-4 py-3">
                  Role
                </th>
                <th className="text-left text-xs font-medium text-[#6B7280] uppercase px-4 py-3">
                  Date Appointed
                </th>
                <th className="text-left text-xs font-medium text-[#6B7280] uppercase px-4 py-3">
                  Authorised Signatory
                </th>
                <th className="text-left text-xs font-medium text-[#6B7280] uppercase px-4 py-3">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {officers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-[#6B7280]">
                    No officers added yet.
                  </td>
                </tr>
              ) : (
                officers.map((o: any, i: number) => (
                  <tr key={i} className="border-t border-[#E5E7EB]">
                    <td className="px-4 py-3 text-sm text-[#111827]">{o.name}</td>
                    <td className="px-4 py-3 text-sm text-[#111827]">{o.role || '—'}</td>
                    <td className="px-4 py-3 text-sm text-[#111827]">
                      {o.dateAppointed
                        ? new Date(o.dateAppointed).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: '2-digit',
                          })
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#111827]">
                      {o.authorisedSignatory ? 'Yes' : 'No'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#D1FAE5] text-[#065F46]">
                        {o.status || 'Active'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <div className="flex items-center justify-end px-4 py-2 text-xs text-[#6B7280] border-t border-[#E5E7EB]">
            {officers.length > 0
              ? `1 – ${officers.length} of ${officers.length}`
              : '0 of 0'}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Shareholders Tab ─── */
// Used in: EntityDetailPage — rendered when ?tab=shareholders
function ShareholdersTab({ entity }: { entity: any }) {
  const [shareholders, setShareholders] = useState<any[]>(entity.shareholders || [])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '',
    ownership: '',
    tin: '',
    country: 'US',
    address: '',
  })

  const addShareholder = () => {
    if (!form.name) return
    setShareholders((prev) => [...prev, { ...form }])
    setForm({ name: '', ownership: '', tin: '', country: 'US', address: '' })
    setShowForm(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-[#111827]">Shareholders</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-4 py-2 border border-[#E5E7EB] rounded-lg text-sm font-medium text-[#111827] hover:bg-gray-50"
        >
          <Plus size={14} />
          {showForm ? 'Cancel' : 'Add shareholder'}
        </button>
      </div>

      {/* Add Shareholder Form */}
      {showForm && (
        <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-4 mb-4">
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <label className="block text-xs text-[#6B7280] mb-1">Name</label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Full name"
              />
            </div>
            <div>
              <label className="block text-xs text-[#6B7280] mb-1">Ownership %</label>
              <Input
                value={form.ownership}
                onChange={(e) => setForm((f) => ({ ...f, ownership: e.target.value }))}
                placeholder="e.g. 22%"
              />
            </div>
            <div>
              <label className="block text-xs text-[#6B7280] mb-1">TIN</label>
              <Input
                value={form.tin}
                onChange={(e) => setForm((f) => ({ ...f, tin: e.target.value }))}
                placeholder="Tax Identification Number"
              />
            </div>
            <div>
              <label className="block text-xs text-[#6B7280] mb-1">Country</label>
              <Input
                value={form.country}
                onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                placeholder="US"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-[#6B7280] mb-1">Address</label>
              <Input
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="Full address"
              />
            </div>
          </div>
          <button
            onClick={addShareholder}
            disabled={!form.name}
            className="h-8 px-4 bg-[#6C5CE7] text-white rounded-lg text-sm font-medium hover:bg-[#5B4BD5] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Shareholder
          </button>
        </div>
      )}

      <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-[#F9FAFB]">
              <th className="text-left text-xs font-medium text-[#6B7280] uppercase px-4 py-3">
                Name
              </th>
              <th className="text-left text-xs font-medium text-[#6B7280] uppercase px-4 py-3">
                Ownership
              </th>
              <th className="text-left text-xs font-medium text-[#6B7280] uppercase px-4 py-3">
                TIN
              </th>
              <th className="text-left text-xs font-medium text-[#6B7280] uppercase px-4 py-3">
                Country
              </th>
              <th className="text-left text-xs font-medium text-[#6B7280] uppercase px-4 py-3">
                Address
              </th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {shareholders.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-[#6B7280]">
                  No shareholders added yet.
                </td>
              </tr>
            ) : (
              shareholders.map((s: any, i: number) => (
                <tr key={i} className="border-t border-[#E5E7EB]">
                  <td className="px-4 py-3 text-sm text-[#111827]">{s.name}</td>
                  <td className="px-4 py-3 text-sm text-[#111827]">{s.ownership || '—'}</td>
                  <td className="px-4 py-3 text-sm text-[#111827]">
                    <span className="flex items-center gap-1">
                      {'******'}
                      <Copy
                        size={12}
                        className="text-[#6C5CE7] cursor-pointer"
                        onClick={() => {
                          if (s.tin) navigator.clipboard.writeText(s.tin)
                        }}
                      />
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-[#111827]">
                    {COUNTRY_LABELS[s.country] || s.country || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-[#111827]">{s.address || '—'}</td>
                  <td className="px-4 py-3 text-sm text-[#6B7280]">
                    <button
                      onClick={() =>
                        setShareholders((prev) => prev.filter((_, idx) => idx !== i))
                      }
                      className="hover:text-red-500"
                    >
                      &#8942;
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ─── Cap Table Tab ─── */
// Used in: EntityDetailPage — rendered when ?tab=cap-table
function CapTableTab({ entity }: { entity: any }) {
  const [capTableEntries, setCapTableEntries] = useState<any[]>(entity.capTable || [])
  const [searchQuery, setSearchQuery] = useState('')
  const fileInputRef = useState<HTMLInputElement | null>(null)

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCapTableEntries((prev) => [
      ...prev,
      {
        date: new Date().toISOString(),
        note: '-',
        fileName: file.name,
      },
    ])
    e.target.value = ''
  }

  const filteredEntries = capTableEntries.filter(
    (entry: any) =>
      !searchQuery ||
      entry.note?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.fileName?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-[#111827]">Cap Table</h2>
        <label className="flex items-center gap-1.5 h-9 px-4 bg-[#6C5CE7] text-white rounded-lg text-sm font-medium hover:bg-[#5B4BD5] cursor-pointer">
          Upload
          <input type="file" className="hidden" accept=".xls,.xlsx,.csv" onChange={handleUpload} />
        </label>
      </div>

      {/* Search and pagination */}
      <div className="flex items-center justify-between mb-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-3 py-2 border border-[#E5E7EB] rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]"
          />
        </div>
        <span className="text-xs text-[#6B7280]">
          {filteredEntries.length > 0
            ? `1 – ${filteredEntries.length} of ${filteredEntries.length}`
            : '0 of 0'}
        </span>
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-[#F9FAFB]">
              <th className="text-left text-xs font-medium text-[#6B7280] uppercase px-4 py-3">
                As On
              </th>
              <th className="text-left text-xs font-medium text-[#6B7280] uppercase px-4 py-3">
                Note
              </th>
              <th className="text-right text-xs font-medium text-[#6B7280] uppercase px-4 py-3">
                File
              </th>
              <th className="text-right text-xs font-medium text-[#6B7280] uppercase px-4 py-3">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredEntries.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-[#6B7280]">
                  No cap table entries yet. Upload your first cap table.
                </td>
              </tr>
            ) : (
              filteredEntries.map((entry: any, i: number) => (
                <tr key={i} className="border-t border-[#E5E7EB]">
                  <td className="px-4 py-3 text-sm text-[#111827]">
                    {entry.date
                      ? new Date(entry.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: '2-digit',
                        })
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-[#111827]">{entry.note || '-'}</td>
                  <td className="px-4 py-3 text-right">
                    <FileSpreadsheet size={20} className="inline text-[#10B981]" />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        className="text-[#6B7280] hover:text-[#111827]"
                        title="Download"
                      >
                        <Download size={16} />
                      </button>
                      <button
                        className="text-[#6B7280] hover:text-red-500"
                        title="Delete"
                        onClick={() =>
                          setCapTableEntries((prev) => prev.filter((_, idx) => idx !== i))
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ─── Sensitive Data Tab ─── */
// Used in: EntityDetailPage — rendered when ?tab=sensitive-data
function SensitiveDataTab({ entity }: { entity: any }) {
  const [sensitiveData, setSensitiveData] = useState<any[]>(entity.sensitiveData || [])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', description: '' })

  const addSensitiveData = () => {
    if (!form.name) return
    setSensitiveData((prev) => [...prev, { ...form }])
    setForm({ name: '', description: '' })
    setShowForm(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-[#111827]">Sensitive Data</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 h-9 px-4 bg-[#6C5CE7] text-white rounded-lg text-sm font-medium hover:bg-[#5B4BD5]"
        >
          <Plus size={14} />
          {showForm ? 'Cancel' : 'Add Sensitive Data'}
        </button>
      </div>

      {/* Add Sensitive Data Form */}
      {showForm && (
        <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-4 mb-4">
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <label className="block text-xs text-[#6B7280] mb-1">Name</label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. TIN - John Doe"
              />
            </div>
            <div>
              <label className="block text-xs text-[#6B7280] mb-1">Description</label>
              <Input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Description of the sensitive data"
              />
            </div>
          </div>
          <button
            onClick={addSensitiveData}
            disabled={!form.name}
            className="h-8 px-4 bg-[#6C5CE7] text-white rounded-lg text-sm font-medium hover:bg-[#5B4BD5] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save
          </button>
        </div>
      )}

      <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-[#F9FAFB]">
              <th className="text-left text-xs font-medium text-[#6B7280] uppercase px-4 py-3">
                Name
              </th>
              <th className="text-left text-xs font-medium text-[#6B7280] uppercase px-4 py-3">
                Description
              </th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {sensitiveData.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-sm text-[#6B7280]">
                  No sensitive data added yet.
                </td>
              </tr>
            ) : (
              sensitiveData.map((item: any, i: number) => (
                <tr key={i} className="border-t border-[#E5E7EB]">
                  <td className="px-4 py-3 text-sm text-[#111827]">
                    <span className="flex items-center gap-2">
                      <Lock size={14} className="text-[#6B7280]" />
                      {item.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-[#6B7280]">{item.description || '—'}</td>
                  <td className="px-4 py-3 text-sm text-[#6B7280]">
                    <button
                      onClick={() =>
                        setSensitiveData((prev) => prev.filter((_, idx) => idx !== i))
                      }
                      className="hover:text-red-500"
                    >
                      &#8942;
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
