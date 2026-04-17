// Used in: App.tsx — route /entities/:entityId (entity detail page with tabbed UI)
// Navigated from: EntitiesOverview.tsx — clicking an entity card or tab button
// Navigates to: /entities/overview (EntitiesOverviewPage) via breadcrumb "My Entities"
// Navigated to: /entities/:entityId?tab=<tab> when clicking a tab on a card
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/auth'
import { confirmDialog } from '@/stores/dialogs'
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
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
  ExternalLink,
} from 'lucide-react'
import { Input } from '@/components/ui/input'

const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/api\/?$/, '')

function resolveStorageUrl(storageUrl?: string) {
  if (!storageUrl) return '#'
  if (storageUrl.startsWith('http://') || storageUrl.startsWith('https://')) return storageUrl
  return `${API_BASE}${storageUrl}`
}

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
  const fromAdmin = searchParams.get('from') === 'admin'
  const [updateLoading, setUpdateLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const entities = useAuthStore(s => s.entities)
  const fetchEntity = useAuthStore(s => s.fetchEntity)
  const fetchEntities = useAuthStore(s => s.fetchEntities)
  const updateEntity = useAuthStore(s => s.updateEntity)
  const deleteEntity = useAuthStore(s => s.deleteEntity)
  const filings = useAuthStore(s => s.filings)
  const documents = useAuthStore(s => s.documents)
  const fetchFilings = useAuthStore(s => s.fetchFilings)
  const fetchDocuments = useAuthStore(s => s.fetchDocuments)

  useEffect(() => {
    if (entityId) fetchEntity(entityId)
  }, [entityId, fetchEntity])

  useEffect(() => {
    fetchFilings()
    fetchDocuments()
  }, [fetchFilings, fetchDocuments])

  const entity = entities.find(e => e.id === entityId)
  const isLoading = false
  const entityFilingIds = new Set(filings.filter((filing: any) => filing.entityId === entityId).map((filing: any) => filing.id))
  const supportingDocs = documents
    .filter((document: any) => document.filingId && entityFilingIds.has(document.filingId))
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const setTab = (tab: TabKey) => {
    const params: Record<string, string> = { tab }
    if (fromAdmin) params.from = 'admin'
    setSearchParams(params)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-[#64748d]">
        Loading entity...
      </div>
    )
  }

  if (!entity) {
    return (
      <div className="flex items-center justify-center h-64 text-[#64748d]">
        Entity not found.
      </div>
    )
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-2 text-sm">
        <button
          onClick={() => navigate(fromAdmin ? '/admin/entities' : '/entities/overview')}
          className="text-[#533afd] hover:underline"
        >
          {fromAdmin ? 'Admin: Entities' : 'My Entities'}
        </button>
        <ChevronRight size={14} className="text-[#64748d]" />
      </div>

      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-normal text-[#061b31] uppercase" style={{ fontWeight: 300 }}>{entity.legalName}</h1>
        {entity.status !== 'dissolved' && (
          <button
            onClick={async () => {
              const ok = await confirmDialog({
                title: `Dissolve ${entity.legalName}?`,
                message: 'This marks the entity as dissolved. You can still view its history afterwards.',
                confirmLabel: 'Dissolve entity',
                tone: 'danger',
              })
              if (ok) {
                setDeleteLoading(true)
                try { await deleteEntity(entityId!) } finally { setDeleteLoading(false) }
                navigate(fromAdmin ? '/admin/entities' : '/entities/overview')
              }
            }}
            disabled={deleteLoading}
            className="h-9 rounded-lg border border-[#ffd7ef] px-4 text-sm font-medium text-[#ea2261] hover:bg-[rgba(234,34,97,0.08)] disabled:opacity-50"
          >
            {deleteLoading ? 'Dissolving...' : 'Dissolve Entity'}
          </button>
        )}
      </div>

      {/* Tabs — switches between tab views within this page */}
      <div className="flex items-center gap-6 border-b border-[#e5edf5] mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setTab(tab.key)}
            className={`pb-3 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'text-[#533afd] border-b-2 border-[#533afd]'
                : 'text-[#64748d] hover:text-[#273951]'
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
          {activeTab === 'directors-officers' && <DirectorsOfficersTab entity={entity} onUpdate={async (data: any) => {
            setUpdateLoading(true)
            try { await updateEntity(entityId!, data) } finally { setUpdateLoading(false) }
          }} />}
          {activeTab === 'shareholders' && <ShareholdersTab entity={entity} onUpdate={async (data: any) => {
            setUpdateLoading(true)
            try { await updateEntity(entityId!, data) } finally { setUpdateLoading(false) }
          }} />}
          {activeTab === 'cap-table' && <CapTableTab entity={entity} onUpdate={async (data: any) => {
            setUpdateLoading(true)
            try { await updateEntity(entityId!, data) } finally { setUpdateLoading(false) }
          }} />}
          {activeTab === 'sensitive-data' && <SensitiveDataTab entity={entity} onUpdate={async (data: any) => {
            setUpdateLoading(true)
            try { await updateEntity(entityId!, data) } finally { setUpdateLoading(false) }
          }} />}
        </div>

        {/* Supporting docs sidebar - only on overview */}
        {activeTab === 'overview' && (
          <div className="w-64 flex-shrink-0">
            <div className="border border-[#e5edf5] rounded-md bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-normal text-[#061b31]" style={{ fontWeight: 400 }}>Supporting Docs</h3>
                  <p className="mt-1 text-xs text-[#64748d]">Documents linked through this entity's filings.</p>
                </div>
                <span className="rounded-md bg-[#f6f9fc] px-2.5 py-1 text-xs font-medium text-[#533afd] font-tnum">
                  {supportingDocs.length}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {supportingDocs.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-[#e5edf5] bg-[#FCFCFD] p-3 text-sm text-[#64748d]">
                    No supporting documents linked yet.
                  </div>
                ) : (
                  supportingDocs.slice(0, 5).map((doc: any) => (
                    <a
                      key={doc.id}
                      href={resolveStorageUrl(doc.storageUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-lg border border-[#e5edf5] p-3 transition-colors hover:border-[#D8D1F7] hover:bg-[#FAFAFF]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-[#061b31]">{doc.fileName}</p>
                          <p className="mt-1 text-xs text-[#64748d]">
                            {new Date(doc.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: '2-digit',
                            })}
                          </p>
                        </div>
                        <ExternalLink size={14} className="mt-0.5 flex-shrink-0 text-[#64748d]" />
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span className="text-[#64748d]">
                          {doc.mimeType?.includes('pdf') ? 'PDF' : doc.mimeType?.includes('sheet') || doc.mimeType?.includes('csv') ? 'Spreadsheet' : 'Document'}
                        </span>
                        {doc.reviewedByHuman ? (
                          <span className="inline-flex items-center gap-1 font-medium text-[#108c3d]">
                            <CheckCircle2 size={12} /> Reviewed
                          </span>
                        ) : (
                          <span className="font-medium text-[#9b6829]">Needs review</span>
                        )}
                      </div>
                    </a>
                  ))
                )}
              </div>
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
      <div className="bg-white border border-[#e5edf5] rounded-md p-5">
        <div className="grid grid-cols-3 gap-6 mb-5">
          <div>
            <p className="text-xs text-[#64748d] mb-1">Business name</p>
            <p className="text-sm font-medium text-[#061b31] uppercase">
              {entity.legalName}
            </p>
          </div>
          <div>
            <p className="text-xs text-[#64748d] mb-1">Entity type</p>
            <p className="text-sm font-medium text-[#061b31]">
              {ENTITY_TYPE_LABELS[entity.entityType] || entity.entityType}
            </p>
          </div>
          <div>
            <p className="text-xs text-[#64748d] mb-1">Country</p>
            <p className="text-sm font-medium text-[#061b31]">
              {COUNTRY_LABELS[entity.country] || entity.country}
            </p>
          </div>
        </div>

        {/* Date of incorporation */}
        <div className="mb-5">
          <p className="text-xs text-[#64748d] mb-1">Date of incorporation</p>
          <div className="flex items-center justify-between border border-[#e5edf5] rounded-lg px-3 py-2">
            <span className="text-sm text-[#061b31]">
              {entity.createdAt
                ? new Date(entity.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: '2-digit',
                  })
                : '—'}
            </span>
            <span className="text-[#64748d]">&#128197;</span>
          </div>
        </div>

        {/* Entity Status — functional dropdown */}
        <div className="mb-5 relative">
          <p className="text-xs text-[#64748d] mb-1">Entity Status</p>
          <div
            className="flex items-center justify-between border border-[#e5edf5] rounded-lg px-3 py-2 cursor-pointer hover:border-[#533afd]"
            onClick={() => setShowStatusDropdown(!showStatusDropdown)}
          >
            <span className="text-sm text-[#061b31] capitalize">{entity.status || 'Active'}</span>
            <div className="flex items-center gap-1">
              {entity.status && entity.status !== 'active' && (
                <X
                  size={14}
                  className="text-[#64748d] hover:text-[#061b31] cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation()
                    onUpdate({ status: 'active' })
                  }}
                />
              )}
              <ChevronDown size={14} className="text-[#64748d]" />
            </div>
          </div>
          {showStatusDropdown && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-[#e5edf5] rounded-lg shadow-lg">
              {STATUSES.map((status) => (
                <button
                  key={status}
                  onClick={() => {
                    onUpdate({ status })
                    setShowStatusDropdown(false)
                  }}
                  className={`w-full text-left px-3 py-2 text-sm capitalize hover:bg-[#f6f9fc] ${
                    entity.status === status ? 'text-[#533afd] font-medium' : 'text-[#061b31]'
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
            <p className="text-xs text-[#64748d]">Major business activity</p>
            <Info size={12} className="text-[#64748d]" />
          </div>
          <div
            className="flex items-center justify-between border border-[#e5edf5] rounded-lg px-3 py-2 cursor-pointer hover:border-[#533afd]"
            onClick={() => setShowActivityDropdown(!showActivityDropdown)}
          >
            <span className="text-sm text-[#061b31]">
              {entity.majorBusinessActivity || '—'}
            </span>
            <div className="flex items-center gap-1">
              {entity.majorBusinessActivity && (
                <X
                  size={14}
                  className="text-[#64748d] hover:text-[#061b31] cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation()
                    onUpdate({ majorBusinessActivity: null })
                  }}
                />
              )}
              <ChevronDown size={14} className="text-[#64748d]" />
            </div>
          </div>
          {showActivityDropdown && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-[#e5edf5] rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {ACTIVITIES.map((activity) => (
                <button
                  key={activity}
                  onClick={() => {
                    onUpdate({ majorBusinessActivity: activity })
                    setShowActivityDropdown(false)
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-[#f6f9fc] text-[#061b31]"
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
        icon={<Phone size={20} className="text-[#533afd]" />}
        title="Contact and Addresses"
        description="Official contact information and addresses for business correspondence"
      />
      <CollapsibleSection
        icon={<Shield size={20} className="text-[#533afd]" />}
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
    <div className="bg-white border border-[#e5edf5] rounded-md p-5">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-[#f6f9fc] flex items-center justify-center">
            {icon}
          </div>
          <div className="text-left">
            <h3 className="text-sm font-normal text-[#061b31]" style={{ fontWeight: 400 }}>{title}</h3>
            <p className="text-xs text-[#64748d]">{description}</p>
          </div>
        </div>
        <ChevronDown
          size={16}
          className={`text-[#64748d] transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="mt-4 pt-4 border-t border-[#e5edf5] text-sm text-[#64748d]">
          No information added yet.
        </div>
      )}
    </div>
  )
}

/* ─── Directors & Officers Tab ─── */
// Used in: EntityDetailPage — rendered when ?tab=directors-officers
function DirectorsOfficersTab({ entity, onUpdate }: { entity: any; onUpdate: (data: any) => Promise<void> }) {
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

  useEffect(() => {
    setDirectors(entity.directors || [])
    setOfficers(entity.officers || [])
  }, [entity.directors, entity.officers])

  const addDirector = async () => {
    if (!directorForm.name) return
    const nextDirectors = [...directors, { ...directorForm, status: 'Active' }]
    setDirectors(nextDirectors)
    await onUpdate({ directors: nextDirectors })
    setDirectorForm({ name: '', dateAppointed: '' })
    setShowDirectorForm(false)
  }

  const addOfficer = async () => {
    if (!officerForm.name) return
    const nextOfficers = [...officers, { ...officerForm, status: 'Active' }]
    setOfficers(nextOfficers)
    await onUpdate({ officers: nextOfficers })
    setOfficerForm({ name: '', role: '', dateAppointed: '', authorisedSignatory: false })
    setShowOfficerForm(false)
  }

  return (
    <div className="space-y-8">
      {/* Directors */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-normal text-[#061b31]" style={{ fontWeight: 400 }}>Directors</h2>
          <button
            onClick={() => setShowDirectorForm(!showDirectorForm)}
            className="px-4 py-2 border border-[#e5edf5] rounded-lg text-sm font-medium text-[#061b31] hover:bg-[#f6f9fc]"
          >
            {showDirectorForm ? 'Cancel' : 'Add director'}
          </button>
        </div>

        {/* Add Director Form */}
        {showDirectorForm && (
          <div className="bg-[#f6f9fc] border border-[#e5edf5] rounded-md p-4 mb-4">
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <label className="block text-xs text-[#64748d] mb-1">Name</label>
                <Input
                  value={directorForm.name}
                  onChange={(e) => setDirectorForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className="block text-xs text-[#64748d] mb-1">Date Appointed</label>
                <input
                  type="date"
                  value={directorForm.dateAppointed}
                  onChange={(e) =>
                    setDirectorForm((f) => ({ ...f, dateAppointed: e.target.value }))
                  }
                  className="flex h-10 w-full rounded-md border border-[#e5edf5] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#533afd]"
                />
              </div>
            </div>
            <button
              onClick={addDirector}
              disabled={!directorForm.name}
              className="h-8 px-4 bg-[#533afd] text-white rounded-lg text-sm font-medium hover:bg-[#4434d4] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Director
            </button>
          </div>
        )}

        <div className="bg-white border border-[#e5edf5] rounded-md overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-[#f6f9fc]">
                <th className="text-left text-xs font-medium text-[#64748d] uppercase px-4 py-3">
                  Name
                </th>
                <th className="text-left text-xs font-medium text-[#64748d] uppercase px-4 py-3">
                  Date Appointed
                </th>
                <th className="text-left text-xs font-medium text-[#64748d] uppercase px-4 py-3">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {directors.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-sm text-[#64748d]">
                    No directors added yet.
                  </td>
                </tr>
              ) : (
                directors.map((d: any, i: number) => (
                  <tr key={i} className="border-t border-[#e5edf5]">
                    <td className="px-4 py-3 text-sm text-[#061b31]">{d.name}</td>
                    <td className="px-4 py-3 text-sm text-[#061b31]">
                      {d.dateAppointed
                        ? new Date(d.dateAppointed).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: '2-digit',
                          })
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-[rgba(21,190,83,0.12)] text-[#108c3d]">
                        {d.status || 'Active'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <div className="flex items-center justify-end px-4 py-2 text-xs text-[#64748d] border-t border-[#e5edf5]">
            {directors.length > 0
              ? `1 – ${directors.length} of ${directors.length}`
              : '0 of 0'}
          </div>
        </div>
      </div>

      {/* Officers */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-normal text-[#061b31]" style={{ fontWeight: 400 }}>Officers</h2>
          <button
            onClick={() => setShowOfficerForm(!showOfficerForm)}
            className="px-4 py-2 border border-[#e5edf5] rounded-lg text-sm font-medium text-[#061b31] hover:bg-[#f6f9fc]"
          >
            {showOfficerForm ? 'Cancel' : 'Add officer'}
          </button>
        </div>

        {/* Add Officer Form */}
        {showOfficerForm && (
          <div className="bg-[#f6f9fc] border border-[#e5edf5] rounded-md p-4 mb-4">
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <label className="block text-xs text-[#64748d] mb-1">Name</label>
                <Input
                  value={officerForm.name}
                  onChange={(e) => setOfficerForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className="block text-xs text-[#64748d] mb-1">Role</label>
                <Input
                  value={officerForm.role}
                  onChange={(e) => setOfficerForm((f) => ({ ...f, role: e.target.value }))}
                  placeholder="e.g. Chief Executive Officer"
                />
              </div>
              <div>
                <label className="block text-xs text-[#64748d] mb-1">Date Appointed</label>
                <input
                  type="date"
                  value={officerForm.dateAppointed}
                  onChange={(e) =>
                    setOfficerForm((f) => ({ ...f, dateAppointed: e.target.value }))
                  }
                  className="flex h-10 w-full rounded-md border border-[#e5edf5] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#533afd]"
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
                  className="rounded border-[#e5edf5]"
                />
                <label htmlFor="authorisedSignatory" className="text-sm text-[#061b31]">
                  Authorised Signatory
                </label>
              </div>
            </div>
            <button
              onClick={addOfficer}
              disabled={!officerForm.name}
              className="h-8 px-4 bg-[#533afd] text-white rounded-lg text-sm font-medium hover:bg-[#4434d4] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Officer
            </button>
          </div>
        )}

        <div className="bg-white border border-[#e5edf5] rounded-md overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-[#f6f9fc]">
                <th className="text-left text-xs font-medium text-[#64748d] uppercase px-4 py-3">
                  Name
                </th>
                <th className="text-left text-xs font-medium text-[#64748d] uppercase px-4 py-3">
                  Role
                </th>
                <th className="text-left text-xs font-medium text-[#64748d] uppercase px-4 py-3">
                  Date Appointed
                </th>
                <th className="text-left text-xs font-medium text-[#64748d] uppercase px-4 py-3">
                  Authorised Signatory
                </th>
                <th className="text-left text-xs font-medium text-[#64748d] uppercase px-4 py-3">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {officers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-[#64748d]">
                    No officers added yet.
                  </td>
                </tr>
              ) : (
                officers.map((o: any, i: number) => (
                  <tr key={i} className="border-t border-[#e5edf5]">
                    <td className="px-4 py-3 text-sm text-[#061b31]">{o.name}</td>
                    <td className="px-4 py-3 text-sm text-[#061b31]">{o.role || '—'}</td>
                    <td className="px-4 py-3 text-sm text-[#061b31]">
                      {o.dateAppointed
                        ? new Date(o.dateAppointed).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: '2-digit',
                          })
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#061b31]">
                      {o.authorisedSignatory ? 'Yes' : 'No'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-[rgba(21,190,83,0.12)] text-[#108c3d]">
                        {o.status || 'Active'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <div className="flex items-center justify-end px-4 py-2 text-xs text-[#64748d] border-t border-[#e5edf5]">
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
function ShareholdersTab({ entity, onUpdate }: { entity: any; onUpdate: (data: any) => Promise<void> }) {
  const [shareholders, setShareholders] = useState<any[]>(entity.shareholders || [])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '',
    ownership: '',
    tin: '',
    country: 'US',
    address: '',
  })

  useEffect(() => {
    setShareholders(entity.shareholders || [])
  }, [entity.shareholders])

  const addShareholder = async () => {
    if (!form.name) return
    const nextShareholders = [...shareholders, { ...form }]
    setShareholders(nextShareholders)
    await onUpdate({ shareholders: nextShareholders })
    setForm({ name: '', ownership: '', tin: '', country: 'US', address: '' })
    setShowForm(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-normal text-[#061b31]" style={{ fontWeight: 400 }}>Shareholders</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-4 py-2 border border-[#e5edf5] rounded-lg text-sm font-medium text-[#061b31] hover:bg-[#f6f9fc]"
        >
          <Plus size={14} />
          {showForm ? 'Cancel' : 'Add shareholder'}
        </button>
      </div>

      {/* Add Shareholder Form */}
      {showForm && (
        <div className="bg-[#f6f9fc] border border-[#e5edf5] rounded-md p-4 mb-4">
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <label className="block text-xs text-[#64748d] mb-1">Name</label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Full name"
              />
            </div>
            <div>
              <label className="block text-xs text-[#64748d] mb-1">Ownership %</label>
              <Input
                value={form.ownership}
                onChange={(e) => setForm((f) => ({ ...f, ownership: e.target.value }))}
                placeholder="e.g. 22%"
              />
            </div>
            <div>
              <label className="block text-xs text-[#64748d] mb-1">TIN</label>
              <Input
                value={form.tin}
                onChange={(e) => setForm((f) => ({ ...f, tin: e.target.value }))}
                placeholder="Tax Identification Number"
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
            <div className="col-span-2">
              <label className="block text-xs text-[#64748d] mb-1">Address</label>
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
            className="h-8 px-4 bg-[#533afd] text-white rounded-lg text-sm font-medium hover:bg-[#4434d4] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Shareholder
          </button>
        </div>
      )}

      <div className="bg-white border border-[#e5edf5] rounded-md overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-[#f6f9fc]">
              <th className="text-left text-xs font-medium text-[#64748d] uppercase px-4 py-3">
                Name
              </th>
              <th className="text-left text-xs font-medium text-[#64748d] uppercase px-4 py-3">
                Ownership
              </th>
              <th className="text-left text-xs font-medium text-[#64748d] uppercase px-4 py-3">
                TIN
              </th>
              <th className="text-left text-xs font-medium text-[#64748d] uppercase px-4 py-3">
                Country
              </th>
              <th className="text-left text-xs font-medium text-[#64748d] uppercase px-4 py-3">
                Address
              </th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {shareholders.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-[#64748d]">
                  No shareholders added yet.
                </td>
              </tr>
            ) : (
              shareholders.map((s: any, i: number) => (
                <tr key={i} className="border-t border-[#e5edf5]">
                  <td className="px-4 py-3 text-sm text-[#061b31]">{s.name}</td>
                  <td className="px-4 py-3 text-sm text-[#061b31]">{s.ownership || '—'}</td>
                  <td className="px-4 py-3 text-sm text-[#061b31]">
                    <span className="flex items-center gap-1">
                      {'******'}
                      <Copy
                        size={12}
                        className="text-[#533afd] cursor-pointer"
                        onClick={() => {
                          if (s.tin) navigator.clipboard.writeText(s.tin)
                        }}
                      />
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-[#061b31]">
                    {COUNTRY_LABELS[s.country] || s.country || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-[#061b31]">{s.address || '—'}</td>
                  <td className="px-4 py-3 text-sm text-[#64748d]">
                    <button
                      onClick={() =>
                        (async () => {
                          const nextShareholders = shareholders.filter((_, idx) => idx !== i)
                          setShareholders(nextShareholders)
                          await onUpdate({ shareholders: nextShareholders })
                        })()
                      }
                      className="hover:text-[#ea2261]"
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
function CapTableTab({ entity, onUpdate }: { entity: any; onUpdate: (data: any) => Promise<void> }) {
  const [capTableEntries, setCapTableEntries] = useState<any[]>(entity.capTable || [])
  const [searchQuery, setSearchQuery] = useState('')
  const fileInputRef = useState<HTMLInputElement | null>(null)

  useEffect(() => {
    setCapTableEntries(entity.capTable || [])
  }, [entity.capTable])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const nextEntries = [
      ...capTableEntries,
      {
        date: new Date().toISOString(),
        note: '-',
        fileName: file.name,
      },
    ]
    setCapTableEntries(nextEntries)
    await onUpdate({ capTable: nextEntries })
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
        <h2 className="text-lg font-normal text-[#061b31]" style={{ fontWeight: 400 }}>Cap Table</h2>
        <label className="flex items-center gap-1.5 h-9 px-4 bg-[#533afd] text-white rounded-lg text-sm font-medium hover:bg-[#4434d4] cursor-pointer">
          Upload
          <input type="file" className="hidden" accept=".xls,.xlsx,.csv" onChange={handleUpload} />
        </label>
      </div>

      {/* Search and pagination */}
      <div className="flex items-center justify-between mb-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748d]" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-3 py-2 border border-[#e5edf5] rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-[#533afd]"
          />
        </div>
        <span className="text-xs text-[#64748d]">
          {filteredEntries.length > 0
            ? `1 – ${filteredEntries.length} of ${filteredEntries.length}`
            : '0 of 0'}
        </span>
      </div>

      <div className="bg-white border border-[#e5edf5] rounded-md overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-[#f6f9fc]">
              <th className="text-left text-xs font-medium text-[#64748d] uppercase px-4 py-3">
                As On
              </th>
              <th className="text-left text-xs font-medium text-[#64748d] uppercase px-4 py-3">
                Note
              </th>
              <th className="text-right text-xs font-medium text-[#64748d] uppercase px-4 py-3">
                File
              </th>
              <th className="text-right text-xs font-medium text-[#64748d] uppercase px-4 py-3">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredEntries.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-[#64748d]">
                  No cap table entries yet. Upload your first cap table.
                </td>
              </tr>
            ) : (
              filteredEntries.map((entry: any, i: number) => (
                <tr key={i} className="border-t border-[#e5edf5]">
                  <td className="px-4 py-3 text-sm text-[#061b31]">
                    {entry.date
                      ? new Date(entry.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: '2-digit',
                        })
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-[#061b31]">{entry.note || '-'}</td>
                  <td className="px-4 py-3 text-right">
                    <FileSpreadsheet size={20} className="inline text-[#15be53]" />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        className="text-[#64748d] hover:text-[#061b31]"
                        title="Download"
                      >
                        <Download size={16} />
                      </button>
                      <button
                        className="text-[#64748d] hover:text-red-500"
                        title="Delete"
                        onClick={() =>
                          (async () => {
                            const nextEntries = capTableEntries.filter((_, idx) => idx !== i)
                            setCapTableEntries(nextEntries)
                            await onUpdate({ capTable: nextEntries })
                          })()
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
function SensitiveDataTab({ entity, onUpdate }: { entity: any; onUpdate: (data: any) => Promise<void> }) {
  const [sensitiveData, setSensitiveData] = useState<any[]>(entity.sensitiveData || [])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', description: '' })

  useEffect(() => {
    setSensitiveData(entity.sensitiveData || [])
  }, [entity.sensitiveData])

  const addSensitiveData = async () => {
    if (!form.name) return
    const nextSensitiveData = [...sensitiveData, { ...form }]
    setSensitiveData(nextSensitiveData)
    await onUpdate({ sensitiveData: nextSensitiveData })
    setForm({ name: '', description: '' })
    setShowForm(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-normal text-[#061b31]" style={{ fontWeight: 400 }}>Sensitive Data</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 h-9 px-4 bg-[#533afd] text-white rounded-lg text-sm font-medium hover:bg-[#4434d4]"
        >
          <Plus size={14} />
          {showForm ? 'Cancel' : 'Add Sensitive Data'}
        </button>
      </div>

      {/* Add Sensitive Data Form */}
      {showForm && (
        <div className="bg-[#f6f9fc] border border-[#e5edf5] rounded-md p-4 mb-4">
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <label className="block text-xs text-[#64748d] mb-1">Name</label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. TIN - John Doe"
              />
            </div>
            <div>
              <label className="block text-xs text-[#64748d] mb-1">Description</label>
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
            className="h-8 px-4 bg-[#533afd] text-white rounded-lg text-sm font-medium hover:bg-[#4434d4] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save
          </button>
        </div>
      )}

      <div className="bg-white border border-[#e5edf5] rounded-md overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-[#f6f9fc]">
              <th className="text-left text-xs font-medium text-[#64748d] uppercase px-4 py-3">
                Name
              </th>
              <th className="text-left text-xs font-medium text-[#64748d] uppercase px-4 py-3">
                Description
              </th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {sensitiveData.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-sm text-[#64748d]">
                  No sensitive data added yet.
                </td>
              </tr>
            ) : (
              sensitiveData.map((item: any, i: number) => (
                <tr key={i} className="border-t border-[#e5edf5]">
                  <td className="px-4 py-3 text-sm text-[#061b31]">
                    <span className="flex items-center gap-2">
                      <Lock size={14} className="text-[#64748d]" />
                      {item.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-[#64748d]">{item.description || '—'}</td>
                  <td className="px-4 py-3 text-sm text-[#64748d]">
                    <button
                      onClick={() =>
                        (async () => {
                          const nextSensitiveData = sensitiveData.filter((_, idx) => idx !== i)
                          setSensitiveData(nextSensitiveData)
                          await onUpdate({ sensitiveData: nextSensitiveData })
                        })()
                      }
                      className="hover:text-[#ea2261]"
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
