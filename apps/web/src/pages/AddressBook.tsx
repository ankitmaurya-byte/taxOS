// Used in: App.tsx — route /entities/address-book (address book with sub-views)
// Navigated from: Sidebar → My Entities → Address Book
// Sub-views controlled by ?view= query param: addresses | bank_accounts | authorized_persons
// Entity filter controlled by ?entity= query param
import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/auth'
import { useSearchParams } from 'react-router-dom'
import {
  MapPin,
  Landmark,
  Contact,
  Plus,
  Pencil,
  Trash2,
  ChevronRight,
  ChevronDown,
} from 'lucide-react'
import { Input } from '@/components/ui/input'

type ViewType = 'addresses' | 'bank_accounts' | 'authorized_persons'

const VIEW_TABS = [
  { key: 'addresses' as ViewType, icon: MapPin, label: 'Addresses' },
  { key: 'bank_accounts' as ViewType, icon: Landmark, label: 'Banks' },
  { key: 'authorized_persons' as ViewType, icon: Contact, label: 'Persons' },
]

export function AddressBookPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeView = (searchParams.get('view') as ViewType) || 'addresses'
  const selectedEntity = searchParams.get('entity') || ''

  const entities = useAuthStore(s => s.entities)
  const fetchEntities = useAuthStore(s => s.fetchEntities)

  useEffect(() => { fetchEntities() }, [fetchEntities])

  const setView = (view: ViewType) => {
    const params: Record<string, string> = { view }
    if (selectedEntity) params.entity = selectedEntity
    setSearchParams(params)
  }

  const setEntity = (entityId: string) => {
    setSearchParams({ view: activeView, entity: entityId })
  }

  // If no view selected yet, show the card selector
  if (!searchParams.get('view')) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-[#111827] mb-6">Address Book</h1>
        <div className="grid grid-cols-3 gap-4">
          {VIEW_TABS.map((tab) => (
            <button
              key={tab.key}
              // Navigates to → /entities/address-book?view=<key> (same page, sub-view)
              onClick={() => setView(tab.key)}
              className="bg-white border border-[#E5E7EB] rounded-xl py-8 px-5 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-[#F9FAFB] hover:border-[#6C5CE7] transition-colors"
            >
              <tab.icon size={28} className="text-[#6C5CE7] mb-3" />
              <span className="text-sm font-medium text-[#6C5CE7]">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  const viewLabel =
    activeView === 'addresses'
      ? 'Addresses'
      : activeView === 'bank_accounts'
        ? 'Bank Accounts'
        : 'Authorized Persons'

  return (
    <div>
      {/* Breadcrumb — navigates back to card selector */}
      <div className="flex items-center gap-2 mb-2 text-sm">
        <button
          onClick={() => setSearchParams({})}
          className="text-[#6C5CE7] hover:underline"
        >
          Address Book
        </button>
        <ChevronRight size={14} className="text-[#9CA3AF]" />
      </div>

      {/* Header with entity selector */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-[#111827]">{viewLabel}</h1>
        <div className="flex items-center gap-3">
          {/* Entity selector dropdown */}
          <EntitySelector
            entities={entities}
            selectedEntity={selectedEntity}
            onSelect={setEntity}
          />
          {/* Add button */}
          {activeView === 'addresses' && <AddButton label="Add" view={activeView} />}
          {activeView === 'bank_accounts' && <AddButton label="Add" view={activeView} />}
          {activeView === 'authorized_persons' && <AddButton label="Add" view={activeView} />}
        </div>
      </div>

      {/* Sub-view tabs */}
      <div className="flex items-center gap-4 border-b border-[#E5E7EB] mb-6">
        {VIEW_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setView(tab.key)}
            className={`flex items-center gap-1.5 pb-3 text-sm font-medium transition-colors ${
              activeView === tab.key
                ? 'text-[#6C5CE7] border-b-2 border-[#6C5CE7]'
                : 'text-[#6B7280] hover:text-[#374151]'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeView === 'addresses' && <AddressesView />}
      {activeView === 'bank_accounts' && <BankAccountsView />}
      {activeView === 'authorized_persons' && <AuthorizedPersonsView />}
    </div>
  )
}

/* ─── Entity Selector ─── */
// Used in: AddressBookPage — dropdown to filter by entity
function EntitySelector({
  entities,
  selectedEntity,
  onSelect,
}: {
  entities: any[]
  selectedEntity: string
  onSelect: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const selected = entities.find((e: any) => e.id === selectedEntity)

  const COUNTRY_FLAGS: Record<string, string> = {
    US: '🇺🇸',
    IN: '🇮🇳',
    GB: '🇬🇧',
    CA: '🇨🇦',
    DE: '🇩🇪',
    AU: '🇦🇺',
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm hover:border-[#6C5CE7] min-w-[200px]"
      >
        {selected ? (
          <>
            <span>{COUNTRY_FLAGS[selected.country] || '🏳️'}</span>
            <span className="truncate max-w-[150px] text-[#111827]">
              {selected.legalName}
            </span>
          </>
        ) : (
          <span className="text-[#6B7280]">Select entity...</span>
        )}
        <ChevronDown size={14} className="text-[#9CA3AF] ml-auto" />
      </button>
      {open && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-[#E5E7EB] rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {entities.map((entity: any) => (
            <button
              key={entity.id}
              onClick={() => {
                onSelect(entity.id)
                setOpen(false)
              }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-[#F3F0FF] flex items-center gap-2 ${
                selectedEntity === entity.id ? 'bg-[#F3F0FF] text-[#6C5CE7]' : 'text-[#111827]'
              }`}
            >
              <span>{COUNTRY_FLAGS[entity.country] || '🏳️'}</span>
              <span className="truncate">{entity.legalName}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Add Button with inline form ─── */
// Used in: AddressBookPage — opens inline add form for each view type
function AddButton({ label, view }: { label: string; view: ViewType }) {
  // The add functionality is handled within each view component
  return (
    <button
      onClick={() => {
        // Dispatch a custom event so the view component can open its form
        window.dispatchEvent(new CustomEvent('addressbook-add', { detail: view }))
      }}
      className="flex items-center gap-1.5 h-9 px-4 bg-[#6C5CE7] text-white rounded-lg text-sm font-medium hover:bg-[#5B4BD5] transition-colors"
    >
      <Plus size={14} />
      {label}
    </button>
  )
}

/* ─── Addresses View ─── */
// Used in: AddressBookPage — rendered when ?view=addresses
function AddressesView() {
  const [addresses, setAddresses] = useState<any[]>([
    { id: 1, title: 'bangadf, Bangalore, Karnataka, 560102, India' },
  ])
  const [showForm, setShowForm] = useState(false)
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [form, setForm] = useState({
    street: '',
    city: '',
    state: '',
    zip: '',
    country: 'India',
  })

  // Listen for add button clicks
  useState(() => {
    const handler = (e: Event) => {
      if ((e as CustomEvent).detail === 'addresses') setShowForm(true)
    }
    window.addEventListener('addressbook-add', handler)
    return () => window.removeEventListener('addressbook-add', handler)
  })

  const saveAddress = () => {
    const title = [form.street, form.city, form.state, form.zip, form.country]
      .filter(Boolean)
      .join(', ')
    if (!title.trim()) return

    if (editIndex !== null) {
      setAddresses((prev) =>
        prev.map((a, i) => (i === editIndex ? { ...a, title } : a))
      )
      setEditIndex(null)
    } else {
      setAddresses((prev) => [...prev, { id: Date.now(), title }])
    }
    setForm({ street: '', city: '', state: '', zip: '', country: 'India' })
    setShowForm(false)
  }

  return (
    <div>
      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-4 mb-4">
          <h3 className="text-sm font-semibold text-[#111827] mb-3">
            {editIndex !== null ? 'Edit Address' : 'New Address'}
          </h3>
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <label className="block text-xs text-[#6B7280] mb-1">Street</label>
              <Input
                value={form.street}
                onChange={(e) => setForm((f) => ({ ...f, street: e.target.value }))}
                placeholder="Street address"
              />
            </div>
            <div>
              <label className="block text-xs text-[#6B7280] mb-1">City</label>
              <Input
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                placeholder="City"
              />
            </div>
            <div>
              <label className="block text-xs text-[#6B7280] mb-1">State</label>
              <Input
                value={form.state}
                onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                placeholder="State / Province"
              />
            </div>
            <div>
              <label className="block text-xs text-[#6B7280] mb-1">ZIP Code</label>
              <Input
                value={form.zip}
                onChange={(e) => setForm((f) => ({ ...f, zip: e.target.value }))}
                placeholder="ZIP / Postal Code"
              />
            </div>
            <div>
              <label className="block text-xs text-[#6B7280] mb-1">Country</label>
              <Input
                value={form.country}
                onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                placeholder="Country"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={saveAddress}
              className="h-8 px-4 bg-[#6C5CE7] text-white rounded-lg text-sm font-medium hover:bg-[#5B4BD5]"
            >
              Save
            </button>
            <button
              onClick={() => {
                setShowForm(false)
                setEditIndex(null)
                setForm({ street: '', city: '', state: '', zip: '', country: 'India' })
              }}
              className="h-8 px-4 border border-[#E5E7EB] rounded-lg text-sm font-medium text-[#6B7280] hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-[#F9FAFB]">
              <th className="text-left text-xs font-medium text-[#6B7280] uppercase px-4 py-3">
                Title
              </th>
              <th className="text-right text-xs font-medium text-[#6B7280] uppercase px-4 py-3 w-24">
              </th>
            </tr>
          </thead>
          <tbody>
            {addresses.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-4 py-8 text-center text-sm text-[#6B7280]">
                  No addresses added yet.
                </td>
              </tr>
            ) : (
              addresses.map((addr, i) => (
                <tr key={addr.id} className="border-t border-[#E5E7EB]">
                  <td className="px-4 py-3 text-sm text-[#111827]">{addr.title}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          const parts = addr.title.split(', ')
                          setForm({
                            street: parts[0] || '',
                            city: parts[1] || '',
                            state: parts[2] || '',
                            zip: parts[3] || '',
                            country: parts[4] || 'India',
                          })
                          setEditIndex(i)
                          setShowForm(true)
                        }}
                        className="w-8 h-8 flex items-center justify-center border border-[#E5E7EB] rounded-lg text-[#6B7280] hover:text-[#111827] hover:bg-gray-50"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setAddresses((prev) => prev.filter((_, idx) => idx !== i))}
                        className="w-8 h-8 flex items-center justify-center border border-[#E5E7EB] rounded-lg text-[#6B7280] hover:text-red-500 hover:bg-gray-50"
                      >
                        <Trash2 size={14} />
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

/* ─── Bank Accounts View ─── */
// Used in: AddressBookPage — rendered when ?view=bank_accounts
function BankAccountsView() {
  const [accounts, setAccounts] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    bankName: '',
    accountNumber: '',
    routingNumber: '',
    accountType: 'Checking',
  })

  const addAccount = () => {
    if (!form.bankName) return
    setAccounts((prev) => [...prev, { id: Date.now(), ...form }])
    setForm({ bankName: '', accountNumber: '', routingNumber: '', accountType: 'Checking' })
    setShowForm(false)
  }

  return (
    <div>
      {/* Add Form */}
      {showForm && (
        <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-4 mb-4">
          <h3 className="text-sm font-semibold text-[#111827] mb-3">New Bank Account</h3>
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <label className="block text-xs text-[#6B7280] mb-1">Bank Name</label>
              <Input
                value={form.bankName}
                onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))}
                placeholder="e.g. Chase Bank"
              />
            </div>
            <div>
              <label className="block text-xs text-[#6B7280] mb-1">Account Number</label>
              <Input
                value={form.accountNumber}
                onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value }))}
                placeholder="Account number"
              />
            </div>
            <div>
              <label className="block text-xs text-[#6B7280] mb-1">Routing Number</label>
              <Input
                value={form.routingNumber}
                onChange={(e) => setForm((f) => ({ ...f, routingNumber: e.target.value }))}
                placeholder="Routing number"
              />
            </div>
            <div>
              <label className="block text-xs text-[#6B7280] mb-1">Account Type</label>
              <select
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]"
                value={form.accountType}
                onChange={(e) => setForm((f) => ({ ...f, accountType: e.target.value }))}
              >
                <option value="Checking">Checking</option>
                <option value="Savings">Savings</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={addAccount}
              disabled={!form.bankName}
              className="h-8 px-4 bg-[#6C5CE7] text-white rounded-lg text-sm font-medium hover:bg-[#5B4BD5] disabled:opacity-50"
            >
              Save
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="h-8 px-4 border border-[#E5E7EB] rounded-lg text-sm font-medium text-[#6B7280] hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="mb-4 flex items-center gap-1.5 h-9 px-4 bg-[#6C5CE7] text-white rounded-lg text-sm font-medium hover:bg-[#5B4BD5] transition-colors"
        >
          <Plus size={14} />
          Add Bank Account
        </button>
      )}

      <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-[#F9FAFB]">
              <th className="text-left text-xs font-medium text-[#6B7280] uppercase px-4 py-3">
                Bank Name
              </th>
              <th className="text-left text-xs font-medium text-[#6B7280] uppercase px-4 py-3">
                Account Number
              </th>
              <th className="text-left text-xs font-medium text-[#6B7280] uppercase px-4 py-3">
                Routing Number
              </th>
              <th className="text-left text-xs font-medium text-[#6B7280] uppercase px-4 py-3">
                Type
              </th>
              <th className="text-right px-4 py-3 w-24"></th>
            </tr>
          </thead>
          <tbody>
            {accounts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-[#6B7280]">
                  No bank accounts added yet.
                </td>
              </tr>
            ) : (
              accounts.map((acc, i) => (
                <tr key={acc.id} className="border-t border-[#E5E7EB]">
                  <td className="px-4 py-3 text-sm text-[#111827]">{acc.bankName}</td>
                  <td className="px-4 py-3 text-sm text-[#111827]">
                    {'****' + (acc.accountNumber?.slice(-4) || '')}
                  </td>
                  <td className="px-4 py-3 text-sm text-[#111827]">{acc.routingNumber || '—'}</td>
                  <td className="px-4 py-3 text-sm text-[#111827]">{acc.accountType}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setAccounts((prev) => prev.filter((_, idx) => idx !== i))}
                      className="w-8 h-8 flex items-center justify-center border border-[#E5E7EB] rounded-lg text-[#6B7280] hover:text-red-500 hover:bg-gray-50"
                    >
                      <Trash2 size={14} />
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

/* ─── Authorized Persons View ─── */
// Used in: AddressBookPage — rendered when ?view=authorized_persons
function AuthorizedPersonsView() {
  const [persons, setPersons] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '',
    role: '',
    email: '',
    phone: '',
  })

  const addPerson = () => {
    if (!form.name) return
    setPersons((prev) => [...prev, { id: Date.now(), ...form }])
    setForm({ name: '', role: '', email: '', phone: '' })
    setShowForm(false)
  }

  return (
    <div>
      {/* Add Form */}
      {showForm && (
        <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-4 mb-4">
          <h3 className="text-sm font-semibold text-[#111827] mb-3">New Authorized Person</h3>
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
              <label className="block text-xs text-[#6B7280] mb-1">Role</label>
              <Input
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                placeholder="e.g. Director, Officer"
              />
            </div>
            <div>
              <label className="block text-xs text-[#6B7280] mb-1">Email</label>
              <Input
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label className="block text-xs text-[#6B7280] mb-1">Phone</label>
              <Input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={addPerson}
              disabled={!form.name}
              className="h-8 px-4 bg-[#6C5CE7] text-white rounded-lg text-sm font-medium hover:bg-[#5B4BD5] disabled:opacity-50"
            >
              Save
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="h-8 px-4 border border-[#E5E7EB] rounded-lg text-sm font-medium text-[#6B7280] hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="mb-4 flex items-center gap-1.5 h-9 px-4 bg-[#6C5CE7] text-white rounded-lg text-sm font-medium hover:bg-[#5B4BD5] transition-colors"
        >
          <Plus size={14} />
          Add Person
        </button>
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
                Email
              </th>
              <th className="text-left text-xs font-medium text-[#6B7280] uppercase px-4 py-3">
                Phone
              </th>
              <th className="text-right px-4 py-3 w-24"></th>
            </tr>
          </thead>
          <tbody>
            {persons.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-[#6B7280]">
                  No authorized persons added yet.
                </td>
              </tr>
            ) : (
              persons.map((person, i) => (
                <tr key={person.id} className="border-t border-[#E5E7EB]">
                  <td className="px-4 py-3 text-sm text-[#111827]">{person.name}</td>
                  <td className="px-4 py-3 text-sm text-[#111827]">{person.role || '—'}</td>
                  <td className="px-4 py-3 text-sm text-[#111827]">{person.email || '—'}</td>
                  <td className="px-4 py-3 text-sm text-[#111827]">{person.phone || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setPersons((prev) => prev.filter((_, idx) => idx !== i))}
                      className="w-8 h-8 flex items-center justify-center border border-[#E5E7EB] rounded-lg text-[#6B7280] hover:text-red-500 hover:bg-gray-50"
                    >
                      <Trash2 size={14} />
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
