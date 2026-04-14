import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { useState } from 'react'
import { api } from '@/lib/api'
import { Pencil, Check, X, Trash2 } from 'lucide-react'

const ENTITY_TYPES = ['C-Corp', 'LLC', 'S-Corp', 'Pvt-Ltd']
const FILING_STATUSES = ['intake', 'ai_prep', 'cpa_review', 'founder_approval', 'submitted', 'archived']

export function AdminOrganizationDetails() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const { data: org, isLoading } = useQuery({
    queryKey: ['admin-org', id],
    queryFn: () => api.admin.getOrganization(id!),
    enabled: !!id,
  })

  // Org edit
  const [isEditingOrg, setIsEditingOrg] = useState(false)
  const [orgForm, setOrgForm] = useState({ name: '', legalName: '', plan: '' })

  const updateOrgMutation = useMutation({
    mutationFn: (data: any) => api.admin.updateOrganization(id!, data),
    onSuccess: () => {
      setIsEditingOrg(false)
      queryClient.invalidateQueries({ queryKey: ['admin-org', id] })
    },
  })

  // Entity inline edit
  const [editingEntityId, setEditingEntityId] = useState<string | null>(null)
  const [entityForm, setEntityForm] = useState({ legalName: '', entityType: '', stateOfIncorporation: '', ein: '' })

  const updateEntityMutation = useMutation({
    mutationFn: ({ eid, payload }: { eid: string; payload: any }) => api.admin.updateEntity(eid, payload),
    onSuccess: () => {
      setEditingEntityId(null)
      queryClient.invalidateQueries({ queryKey: ['admin-org', id] })
    },
  })

  const dissolveEntityMutation = useMutation({
    mutationFn: (eid: string) => api.admin.dissolveEntity(eid),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-org', id] }),
  })

  // Filing status inline edit
  const [editingFilingId, setEditingFilingId] = useState<string | null>(null)
  const [filingStatus, setFilingStatus] = useState('')

  const updateFilingMutation = useMutation({
    mutationFn: ({ fid, status }: { fid: string; status: string }) => api.admin.updateFilingStatus(fid, status),
    onSuccess: () => {
      setEditingFilingId(null)
      queryClient.invalidateQueries({ queryKey: ['admin-org', id] })
    },
  })

  if (isLoading) return <div className="p-6">Loading organization details...</div>
  if (!org) return <div className="p-6 text-red-500">Organization not found</div>

  function startEditOrg() {
    setOrgForm({ name: org.name, legalName: org.legalName || '', plan: org.plan || 'free' })
    setIsEditingOrg(true)
  }

  function startEditEntity(e: any) {
    setEditingEntityId(e.id)
    setEntityForm({ legalName: e.legalName || '', entityType: e.entityType || '', stateOfIncorporation: e.stateOfIncorporation || '', ein: e.ein || '' })
  }

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <Link to="/admin/organizations" className="text-sm text-[#6C5CE7] hover:underline mb-2 inline-block">
          &larr; Back to Organizations
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-[#111827]">{org.name}</h1>
            <p className="mt-1 text-sm text-[#6B7280]">Legal: {org.legalName || 'N/A'} &bull; Plan: {org.plan}</p>
          </div>
          <button
            onClick={startEditOrg}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E5E7EB] rounded-lg bg-white hover:bg-gray-50 text-sm font-medium"
          >
            <Pencil size={13} /> Edit Org
          </button>
        </div>
      </div>

      {/* Org edit form */}
      {isEditingOrg && (
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 space-y-3 shadow-sm">
          <h2 className="text-sm font-semibold text-[#111827]">Edit Organization</h2>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-[#6B7280] mb-1">Display Name</label>
              <input
                className="border rounded-lg px-3 py-1.5 text-sm w-full"
                value={orgForm.name}
                onChange={e => setOrgForm({ ...orgForm, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs text-[#6B7280] mb-1">Legal Name</label>
              <input
                className="border rounded-lg px-3 py-1.5 text-sm w-full"
                value={orgForm.legalName}
                onChange={e => setOrgForm({ ...orgForm, legalName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs text-[#6B7280] mb-1">Plan</label>
              <select
                className="border rounded-lg px-3 py-1.5 text-sm w-full"
                value={orgForm.plan}
                onChange={e => setOrgForm({ ...orgForm, plan: e.target.value })}
              >
                <option value="free">Free</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setIsEditingOrg(false)} className="px-3 py-1.5 bg-gray-100 rounded-lg text-xs hover:bg-gray-200">Cancel</button>
            <button
              onClick={() => updateOrgMutation.mutate(orgForm)}
              disabled={updateOrgMutation.isPending}
              className="px-3 py-1.5 bg-[#6C5CE7] text-white rounded-lg text-xs hover:bg-[#5B4BD5] disabled:opacity-50"
            >
              Save Changes
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Users */}
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4 text-[#111827]">Associated Users</h2>
          <div className="space-y-3">
            {org.users?.map((u: any) => (
              <div key={u.id} className="flex justify-between items-center p-3 bg-[#F9FAFB] rounded-lg">
                <div>
                  <Link to={`/admin/users/${u.id}`} className="font-medium text-[#6C5CE7] hover:underline">{u.name}</Link>
                  <p className="text-xs text-[#6B7280]">{u.email}</p>
                </div>
                <span className="px-2 py-1 text-xs font-medium bg-[#E0E7FF] text-[#4338CA] rounded">{u.role}</span>
              </div>
            ))}
            {org.users?.length === 0 && <p className="text-sm text-[#6B7280]">No users found.</p>}
          </div>
        </div>

        {/* Entities */}
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4 text-[#111827]">Entities</h2>
          <div className="space-y-3">
            {org.entities?.map((e: any) => (
              <div key={e.id} className="p-3 bg-[#F0FDF4] rounded-lg border border-[#BBF7D0]">
                {editingEntityId === e.id ? (
                  <div className="space-y-2">
                    <input
                      className="border rounded px-2 py-1 text-xs w-full"
                      value={entityForm.legalName}
                      onChange={ev => setEntityForm({ ...entityForm, legalName: ev.target.value })}
                      placeholder="Legal Name"
                    />
                    <div className="flex gap-2">
                      <select
                        className="border rounded px-2 py-1 text-xs flex-1"
                        value={entityForm.entityType}
                        onChange={ev => setEntityForm({ ...entityForm, entityType: ev.target.value })}
                      >
                        {ENTITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <input
                        className="border rounded px-2 py-1 text-xs flex-1"
                        value={entityForm.stateOfIncorporation}
                        onChange={ev => setEntityForm({ ...entityForm, stateOfIncorporation: ev.target.value })}
                        placeholder="State"
                      />
                      <input
                        className="border rounded px-2 py-1 text-xs flex-1 font-mono"
                        value={entityForm.ein}
                        onChange={ev => setEntityForm({ ...entityForm, ein: ev.target.value })}
                        placeholder="EIN"
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => updateEntityMutation.mutate({ eid: e.id, payload: entityForm })}
                        disabled={updateEntityMutation.isPending}
                        className="flex items-center gap-1 px-2 py-1 bg-green-600 text-white rounded text-xs disabled:opacity-50"
                      >
                        <Check size={11} /> Save
                      </button>
                      <button onClick={() => setEditingEntityId(null)} className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs">
                        <X size={11} /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-[#166534] text-sm">
                        {e.legalName}
                        {e.status === 'dissolved' && <span className="ml-1 text-xs text-red-500">[dissolved]</span>}
                      </p>
                      <p className="text-xs text-[#15803D]">{e.entityType} &bull; {e.stateOfIncorporation}</p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => startEditEntity(e)}
                        className="p-1 text-[#6C5CE7] hover:bg-[#EEF2FF] rounded"
                        title="Edit entity"
                      >
                        <Pencil size={12} />
                      </button>
                      {e.status !== 'dissolved' && (
                        <button
                          onClick={() => dissolveEntityMutation.mutate(e.id)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                          title="Dissolve entity"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {org.entities?.length === 0 && <p className="text-xs text-[#6B7280]">No entities.</p>}
          </div>
        </div>
      </div>

      {/* Filings */}
      <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4 text-[#111827]">Filings</h2>
        {org.filings?.length === 0
          ? <p className="text-sm text-[#6B7280]">No filings.</p>
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-[#374151]">
                <thead className="text-xs uppercase text-[#6B7280] border-b border-[#E5E7EB]">
                  <tr>
                    <th className="py-2 pr-4">Form</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Tax Year</th>
                    <th className="py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3F4F6]">
                  {org.filings?.map((f: any) => (
                    <tr key={f.id}>
                      <td className="py-2 pr-4 font-medium text-[#92400E]">{f.formName} <span className="text-xs text-[#B45309]">({f.formType})</span></td>
                      <td className="py-2 pr-4">
                        {editingFilingId === f.id ? (
                          <div className="flex items-center gap-1">
                            <select
                              className="border rounded px-1.5 py-0.5 text-xs"
                              value={filingStatus}
                              onChange={ev => setFilingStatus(ev.target.value)}
                            >
                              {FILING_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                            </select>
                            <button
                              onClick={() => updateFilingMutation.mutate({ fid: f.id, status: filingStatus })}
                              disabled={updateFilingMutation.isPending}
                              className="p-0.5 text-green-600 hover:text-green-800 disabled:opacity-50"
                            >
                              <Check size={13} />
                            </button>
                            <button onClick={() => setEditingFilingId(null)} className="p-0.5 text-gray-400 hover:text-gray-600">
                              <X size={13} />
                            </button>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#FFFBEB] text-[#92400E]">
                            {f.status}
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-4 text-[#6B7280]">{f.taxYear || '—'}</td>
                      <td className="py-2 text-right">
                        {editingFilingId !== f.id && (
                          <button
                            onClick={() => { setEditingFilingId(f.id); setFilingStatus(f.status) }}
                            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-[#6C5CE7] bg-[#EEF2FF] hover:bg-[#E0E7FF] rounded ml-auto"
                          >
                            <Pencil size={11} /> Edit Status
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </div>
    </div>
  )
}
