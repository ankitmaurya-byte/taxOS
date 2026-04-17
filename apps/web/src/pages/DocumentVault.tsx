// Used in: App.tsx — route /documents/vault (full document vault view)
import { useState, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { ConfidenceBadge } from '@/components/agents/ConfidenceBadge'
import { formatDate } from '@/lib/utils'
import {
  ChevronRight,
  Plus,
  FolderOpen,
  FolderPlus,
  Upload,
  FileText,
  FileSpreadsheet,
  Image,
  Trash2,
  X,
  Vault,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react'

interface VaultData {
  id: string; orgId: string; name: string; description: string | null
  createdById: string; createdAt: string; updatedAt: string
  folders: FolderData[]; documents: DocData[]
}
interface FolderData {
  id: string; vaultId: string; parentId: string | null
  name: string; createdById: string; createdAt: string
}
interface DocData {
  id: string; fileName: string; mimeType: string; storageUrl: string
  extractedData: any; aiTags: string[]; confidenceScore: number | null
  reviewedByHuman: boolean; vaultId: string | null; folderId: string | null; createdAt: string
}

const FILE_ICONS: Record<string, { icon: typeof FileText; color: string; bg: string; label: string }> = {
  'application/pdf': { icon: FileText, color: 'text-[#ea2261]', bg: 'bg-[rgba(234,34,97,0.06)]', label: 'PDF' },
  'text/csv': { icon: FileSpreadsheet, color: 'text-[#15be53]', bg: 'bg-[rgba(21,190,83,0.06)]', label: 'CSV' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { icon: FileSpreadsheet, color: 'text-[#15be53]', bg: 'bg-[rgba(21,190,83,0.06)]', label: 'XLS' },
  'image/png': { icon: Image, color: 'text-[#533afd]', bg: 'bg-[rgba(83,58,253,0.06)]', label: 'PNG' },
  'image/jpeg': { icon: Image, color: 'text-[#533afd]', bg: 'bg-[rgba(83,58,253,0.06)]', label: 'JPG' },
  'text/plain': { icon: FileText, color: 'text-[#64748d]', bg: 'bg-[#f6f9fc]', label: 'TXT' },
  'application/json': { icon: FileText, color: 'text-[#9b6829]', bg: 'bg-[rgba(155,104,41,0.06)]', label: 'JSON' },
}

export function DocumentVault() {
  const user = useAuthStore(s => s.user)
  const isFounder = user?.role === 'founder' || user?.role === 'admin'

  const [vaults, setVaults] = useState<any[]>([])
  const [selectedVault, setSelectedVault] = useState<VaultData | null>(null)
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [showCreateVault, setShowCreateVault] = useState(false)
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [vaultName, setVaultName] = useState('')
  const [vaultDesc, setVaultDesc] = useState('')
  const [folderName, setFolderName] = useState('')

  const fetchVaults = useCallback(async () => { try { setVaults(await api.getVaults()) } catch {} setLoading(false) }, [])
  const fetchVaultDetail = useCallback(async (id: string) => { try { setSelectedVault(await api.getVault(id)) } catch {} }, [])
  useEffect(() => { fetchVaults() }, [fetchVaults])

  // ESC to close modals
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') { setShowCreateVault(false); setShowCreateFolder(false) } }
    window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleCreateVault = async () => { if (!vaultName.trim()) return; await api.createVault({ name: vaultName.trim(), description: vaultDesc.trim() || undefined }); setVaultName(''); setVaultDesc(''); setShowCreateVault(false); fetchVaults() }
  const handleDeleteVault = async (id: string) => { await api.deleteVault(id); if (selectedVault?.id === id) { setSelectedVault(null); setSelectedFolderId(null) } fetchVaults() }
  const handleCreateFolder = async () => { if (!selectedVault || !folderName.trim()) return; await api.createFolder(selectedVault.id, { name: folderName.trim(), parentId: selectedFolderId || undefined }); setFolderName(''); setShowCreateFolder(false); fetchVaultDetail(selectedVault.id) }
  const handleDeleteFolder = async (folderId: string) => { if (!selectedVault) return; await api.deleteFolder(selectedVault.id, folderId); if (selectedFolderId === folderId) setSelectedFolderId(null); fetchVaultDetail(selectedVault.id) }
  const handleUpload = async (files: FileList | File[]) => { if (!selectedVault) return; setUploadLoading(true); try { for (const file of Array.from(files)) await api.uploadDocumentToVault(file, selectedVault.id, selectedFolderId || undefined); fetchVaultDetail(selectedVault.id) } finally { setUploadLoading(false) } }

  const getFileConfig = (mimeType: string) => FILE_ICONS[mimeType] || { icon: FileText, color: 'text-[#64748d]', bg: 'bg-[#f6f9fc]', label: 'FILE' }
  const currentFolders = selectedVault?.folders.filter(f => selectedFolderId ? f.parentId === selectedFolderId : !f.parentId) || []
  const currentDocs = selectedVault?.documents.filter(d => selectedFolderId ? d.folderId === selectedFolderId : !d.folderId) || []

  const getBreadcrumb = (): FolderData[] => {
    if (!selectedVault || !selectedFolderId) return []
    const trail: FolderData[] = []; let cur: string | null = selectedFolderId
    while (cur) { const f = selectedVault.folders.find(x => x.id === cur); if (!f) break; trail.unshift(f); cur = f.parentId }
    return trail
  }

  if (loading) return <div className="flex items-center justify-center py-20 text-[14px] text-[#64748d]">Loading vaults...</div>

  /* ─── Vault detail ─────────────────────────────────────────────────────── */
  if (selectedVault) {
    const breadcrumb = getBreadcrumb()
    return (
      <div className="max-w-6xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-[13px] mb-4 font-normal">
          <Link to="/documents" className="text-[#533afd] hover:underline">Documents</Link>
          <ChevronRight size={11} className="text-[#64748d]" />
          <button onClick={() => { setSelectedVault(null); setSelectedFolderId(null) }} className="text-[#533afd] hover:underline">Vaults</button>
          <ChevronRight size={11} className="text-[#64748d]" />
          <button onClick={() => setSelectedFolderId(null)} className={selectedFolderId ? 'text-[#533afd] hover:underline' : 'text-[#061b31]'}>{selectedVault.name}</button>
          {breadcrumb.map((f, i) => (
            <span key={f.id} className="flex items-center gap-1">
              <ChevronRight size={11} className="text-[#64748d]" />
              <button onClick={() => setSelectedFolderId(f.id)} className={i === breadcrumb.length - 1 ? 'text-[#061b31]' : 'text-[#533afd] hover:underline'}>{f.name}</button>
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => { setSelectedVault(null); setSelectedFolderId(null) }} className="p-2 rounded-sm hover:bg-[#f6f9fc] text-[#64748d] transition-colors"><ArrowLeft size={18} strokeWidth={1.8} /></button>
            <div>
              <h1 className="text-[26px] font-light tracking-[-0.26px] text-[#061b31]">{selectedVault.name}</h1>
              {selectedVault.description && <p className="text-[13px] text-[#64748d] mt-0.5">{selectedVault.description}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowCreateFolder(true)} className="flex h-9 items-center gap-1.5 rounded-sm border border-[#b9b9f9] bg-white px-3 text-[14px] font-normal text-[#533afd] hover:bg-[rgba(83,58,253,0.05)] transition-colors"><FolderPlus size={15} strokeWidth={1.8} /> New Folder</button>
            <label className="flex h-9 items-center gap-1.5 rounded-sm bg-[#533afd] px-4 text-[14px] font-normal text-white hover:bg-[#4434d4] cursor-pointer transition-colors"><Upload size={15} strokeWidth={1.8} /> Upload<input type="file" className="hidden" multiple onChange={e => e.target.files && handleUpload(e.target.files)} /></label>
          </div>
        </div>

        {/* Drop zone — click anywhere opens file picker */}
        <label
          className="block rounded-sm border-2 border-dashed border-[#e5edf5] hover:border-[#b9b9f9] bg-white p-6 text-center mb-6 cursor-pointer transition-colors"
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); if (e.dataTransfer.files.length) handleUpload(e.dataTransfer.files) }}
        >
          <input
            type="file"
            className="hidden"
            multiple
            onChange={e => {
              if (e.target.files && e.target.files.length) handleUpload(e.target.files)
              e.target.value = ''
            }}
          />
          <Upload size={28} className="text-[#b9b9f9] mx-auto mb-2" strokeWidth={1.5} />
          <p className="text-[14px] text-[#64748d]">{uploadLoading ? 'Uploading...' : 'Click to upload or drop files here'}</p>
        </label>

        {/* Folders */}
        {currentFolders.length > 0 && (
          <div className="mb-6">
            <h2 className="text-[13px] font-normal text-[#273951] mb-3">Folders</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {currentFolders.map(folder => (
                <div key={folder.id} onClick={() => setSelectedFolderId(folder.id)} className="group flex items-center gap-3 p-3 rounded-md border border-[#e5edf5] bg-white hover:shadow-standard cursor-pointer transition-all">
                  <FolderOpen size={18} className="text-[#533afd] flex-shrink-0" strokeWidth={1.8} />
                  <span className="text-[13px] font-normal text-[#061b31] truncate flex-1">{folder.name}</span>
                  <button onClick={e => { e.stopPropagation(); handleDeleteFolder(folder.id) }} className="p-1 text-[#64748d] hover:text-[#ea2261] opacity-0 group-hover:opacity-100 rounded-sm transition-all"><Trash2 size={13} strokeWidth={1.8} /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Documents table */}
        <div>
          <h2 className="text-[13px] font-normal text-[#273951] mb-3">Documents <span className="text-[#64748d] font-tnum">({currentDocs.length})</span></h2>
          {currentDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 rounded-md border border-[#e5edf5] bg-white">
              <FileText size={24} className="text-[#b9b9f9] mb-2" strokeWidth={1.5} />
              <p className="text-[13px] text-[#64748d]">No documents in this {selectedFolderId ? 'folder' : 'vault'} yet.</p>
            </div>
          ) : (
            <div className="rounded-md border border-[#e5edf5] bg-white overflow-hidden" style={{ boxShadow: 'rgba(23,23,23,0.08) 0px 15px 35px' }}>
              <table className="w-full text-left text-sm">
                <thead className="bg-[#f6f9fc] border-b border-[#e5edf5]">
                  <tr>
                    <th className="px-4 py-3 text-[12px] font-normal text-[#64748d] uppercase tracking-wide">Name</th>
                    <th className="px-4 py-3 text-[12px] font-normal text-[#64748d] uppercase tracking-wide">Uploaded</th>
                    <th className="px-4 py-3 text-[12px] font-normal text-[#64748d] uppercase tracking-wide">Tags</th>
                    <th className="px-4 py-3 text-[12px] font-normal text-[#64748d] uppercase tracking-wide">Confidence</th>
                    <th className="px-4 py-3 text-[12px] font-normal text-[#64748d] uppercase tracking-wide text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5edf5]">
                  {currentDocs.map(doc => {
                    const c = getFileConfig(doc.mimeType); const Icon = c.icon
                    return (
                      <tr key={doc.id} className="hover:bg-[#f6f9fc] transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-8 w-8 items-center justify-center rounded-sm flex-shrink-0 ${c.bg}`}><Icon size={16} className={c.color} strokeWidth={1.8} /></div>
                            <div className="min-w-0"><p className="text-[13px] font-normal text-[#061b31] truncate">{doc.fileName}</p><p className="text-[11px] text-[#64748d]">{c.label}</p></div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[12px] text-[#64748d] font-tnum">{formatDate(doc.createdAt)}</td>
                        <td className="px-4 py-3">{doc.aiTags?.length > 0 ? <span className="inline-flex px-[6px] py-[1px] rounded-sm text-[10px] font-light bg-[rgba(83,58,253,0.08)] text-[#533afd]">{doc.aiTags[0]}</span> : <span className="text-[12px] text-[#64748d]">—</span>}</td>
                        <td className="px-4 py-3">{doc.confidenceScore != null ? <ConfidenceBadge score={doc.confidenceScore} /> : <span className="inline-flex items-center gap-1 text-[10px] text-[#9b6829]"><span className="w-1.5 h-1.5 rounded-full bg-[#9b6829] animate-pulse" /> Extracting</span>}</td>
                        <td className="px-4 py-3 text-center">{doc.extractedData ? <span className="inline-flex items-center gap-1 text-[10px] font-light text-[#108c3d]"><CheckCircle2 size={11} /> Ready</span> : <span className="text-[10px] text-[#64748d]">Processing</span>}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Create Folder Modal */}
        {showCreateFolder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowCreateFolder(false)} />
            <div className="relative w-full max-w-sm rounded-md bg-white p-6" style={{ boxShadow: 'rgba(3,3,39,0.25) 0px 14px 21px -14px, rgba(0,0,0,0.1) 0px 8px 17px -8px' }}>
              <h2 className="text-[18px] font-light text-[#061b31] mb-4">New Folder</h2>
              <input type="text" value={folderName} onChange={e => setFolderName(e.target.value)} placeholder="Folder name" className="w-full h-10 rounded-sm border border-[#e5edf5] px-3 text-[14px] text-[#061b31] placeholder:text-[#64748d] outline-none focus:border-[#533afd] mb-4 transition-colors" autoFocus onKeyDown={e => e.key === 'Enter' && handleCreateFolder()} />
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowCreateFolder(false)} className="h-9 rounded-sm border border-[#e5edf5] px-4 text-[14px] font-normal text-[#273951] hover:bg-[#f6f9fc] transition-colors">Cancel</button>
                <button onClick={handleCreateFolder} className="h-9 rounded-sm bg-[#533afd] px-4 text-[14px] font-normal text-white hover:bg-[#4434d4] transition-colors">Create</button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  /* ─── Vault list ───────────────────────────────────────────────────────── */
  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-1 text-[13px] mb-4 font-normal">
        <Link to="/documents" className="text-[#533afd] hover:underline">Documents</Link>
        <ChevronRight size={11} className="text-[#64748d]" />
        <span className="text-[#061b31]">Vaults</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[26px] font-light tracking-[-0.26px] text-[#061b31]">Document Vaults</h1>
          <p className="text-[13px] text-[#64748d] mt-1">Organize documents by vault. All extracted data feeds into AI advisor.</p>
        </div>
        {isFounder && (
          <button onClick={() => setShowCreateVault(true)} className="flex h-9 items-center gap-1.5 rounded-sm bg-[#533afd] px-4 text-[14px] font-normal text-white hover:bg-[#4434d4] transition-colors"><Plus size={15} /> New Vault</button>
        )}
      </div>

      {vaults.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-md border border-[#e5edf5] bg-white">
          <Vault size={36} className="text-[#b9b9f9] mb-3" strokeWidth={1.5} />
          <p className="text-[14px] text-[#64748d] mb-1">No vaults yet.</p>
          {isFounder && <p className="text-[12px] text-[#64748d]">Create a vault to organize your documents.</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {vaults.map((vault: any) => (
            <div key={vault.id} onClick={() => fetchVaultDetail(vault.id)} className="group bg-white border border-[#e5edf5] rounded-md p-5 cursor-pointer transition-all hover:shadow-standard">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-[rgba(83,58,253,0.08)]"><Vault size={18} className="text-[#533afd]" strokeWidth={1.8} /></div>
                  <div>
                    <h3 className="text-[14px] font-normal text-[#061b31]">{vault.name}</h3>
                    <p className="text-[11px] text-[#64748d] font-tnum">Created {formatDate(vault.createdAt)}</p>
                  </div>
                </div>
                {isFounder && (
                  <button onClick={e => { e.stopPropagation(); handleDeleteVault(vault.id) }} className="p-1.5 text-[#64748d] hover:text-[#ea2261] opacity-0 group-hover:opacity-100 rounded-sm transition-all"><Trash2 size={14} strokeWidth={1.8} /></button>
                )}
              </div>
              {vault.description && <p className="text-[12px] text-[#64748d] line-clamp-2">{vault.description}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Create Vault Modal */}
      {showCreateVault && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowCreateVault(false)} />
          <div className="relative w-full max-w-sm rounded-md bg-white p-6" style={{ boxShadow: 'rgba(3,3,39,0.25) 0px 14px 21px -14px, rgba(0,0,0,0.1) 0px 8px 17px -8px' }}>
            <h2 className="text-[18px] font-light text-[#061b31] mb-4">Create Vault</h2>
            <div className="space-y-3">
              <input type="text" value={vaultName} onChange={e => setVaultName(e.target.value)} placeholder="Vault name" className="w-full h-10 rounded-sm border border-[#e5edf5] px-3 text-[14px] text-[#061b31] placeholder:text-[#64748d] outline-none focus:border-[#533afd] transition-colors" autoFocus />
              <textarea value={vaultDesc} onChange={e => setVaultDesc(e.target.value)} placeholder="Description (optional)" className="w-full h-20 rounded-sm border border-[#e5edf5] px-3 py-2 text-[14px] text-[#061b31] placeholder:text-[#64748d] outline-none focus:border-[#533afd] resize-none transition-colors" />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowCreateVault(false)} className="h-9 rounded-sm border border-[#e5edf5] px-4 text-[14px] font-normal text-[#273951] hover:bg-[#f6f9fc] transition-colors">Cancel</button>
              <button onClick={handleCreateVault} className="h-9 rounded-sm bg-[#533afd] px-4 text-[14px] font-normal text-white hover:bg-[#4434d4] transition-colors">Create Vault</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
