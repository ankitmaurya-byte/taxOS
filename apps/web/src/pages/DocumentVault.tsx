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
  ChevronDown,
  ChevronUp,
  Vault,
  ArrowLeft,
  CheckCircle2,
  Edit3,
  MoreHorizontal,
} from 'lucide-react'

interface VaultData {
  id: string
  orgId: string
  name: string
  description: string | null
  createdById: string
  createdAt: string
  updatedAt: string
  folders: FolderData[]
  documents: DocData[]
}

interface FolderData {
  id: string
  vaultId: string
  parentId: string | null
  name: string
  createdById: string
  createdAt: string
}

interface DocData {
  id: string
  fileName: string
  mimeType: string
  storageUrl: string
  extractedData: any
  aiTags: string[]
  confidenceScore: number | null
  reviewedByHuman: boolean
  vaultId: string | null
  folderId: string | null
  createdAt: string
}

const FILE_ICONS: Record<string, { icon: typeof FileText; color: string; bg: string; label: string }> = {
  'application/pdf': { icon: FileText, color: 'text-red-500', bg: 'bg-red-50', label: 'PDF' },
  'text/csv': { icon: FileSpreadsheet, color: 'text-green-600', bg: 'bg-green-50', label: 'CSV' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { icon: FileSpreadsheet, color: 'text-green-600', bg: 'bg-green-50', label: 'XLS' },
  'image/png': { icon: Image, color: 'text-blue-500', bg: 'bg-blue-50', label: 'PNG' },
  'image/jpeg': { icon: Image, color: 'text-blue-500', bg: 'bg-blue-50', label: 'JPG' },
  'text/plain': { icon: FileText, color: 'text-gray-500', bg: 'bg-gray-50', label: 'TXT' },
  'application/json': { icon: FileText, color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'JSON' },
}

export function DocumentVault() {
  const user = useAuthStore(s => s.user)
  const isFounder = user?.role === 'founder' || user?.role === 'admin'

  const [vaults, setVaults] = useState<any[]>([])
  const [selectedVault, setSelectedVault] = useState<VaultData | null>(null)
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploadLoading, setUploadLoading] = useState(false)

  // Modal states
  const [showCreateVault, setShowCreateVault] = useState(false)
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [vaultName, setVaultName] = useState('')
  const [vaultDesc, setVaultDesc] = useState('')
  const [folderName, setFolderName] = useState('')

  const fetchVaults = useCallback(async () => {
    try {
      const data = await api.getVaults()
      setVaults(data)
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  const fetchVaultDetail = useCallback(async (id: string) => {
    try {
      const data = await api.getVault(id)
      setSelectedVault(data)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { fetchVaults() }, [fetchVaults])

  const handleCreateVault = async () => {
    if (!vaultName.trim()) return
    await api.createVault({ name: vaultName.trim(), description: vaultDesc.trim() || undefined })
    setVaultName('')
    setVaultDesc('')
    setShowCreateVault(false)
    fetchVaults()
  }

  const handleDeleteVault = async (id: string) => {
    await api.deleteVault(id)
    if (selectedVault?.id === id) {
      setSelectedVault(null)
      setSelectedFolderId(null)
    }
    fetchVaults()
  }

  const handleCreateFolder = async () => {
    if (!selectedVault || !folderName.trim()) return
    await api.createFolder(selectedVault.id, {
      name: folderName.trim(),
      parentId: selectedFolderId || undefined,
    })
    setFolderName('')
    setShowCreateFolder(false)
    fetchVaultDetail(selectedVault.id)
  }

  const handleDeleteFolder = async (folderId: string) => {
    if (!selectedVault) return
    await api.deleteFolder(selectedVault.id, folderId)
    if (selectedFolderId === folderId) setSelectedFolderId(null)
    fetchVaultDetail(selectedVault.id)
  }

  const handleUpload = async (files: FileList | File[]) => {
    if (!selectedVault) return
    setUploadLoading(true)
    try {
      for (const file of Array.from(files)) {
        await api.uploadDocumentToVault(file, selectedVault.id, selectedFolderId || undefined)
      }
      fetchVaultDetail(selectedVault.id)
    } finally {
      setUploadLoading(false)
    }
  }

  const getFileConfig = (mimeType: string) =>
    FILE_ICONS[mimeType] || { icon: FileText, color: 'text-[#9CA3AF]', bg: 'bg-[#F3F4F6]', label: 'FILE' }

  // Get folders for current level
  const currentFolders = selectedVault?.folders.filter(f =>
    selectedFolderId ? f.parentId === selectedFolderId : !f.parentId
  ) || []

  // Get docs for current folder/vault root
  const currentDocs = selectedVault?.documents.filter(d =>
    selectedFolderId ? d.folderId === selectedFolderId : !d.folderId
  ) || []

  // Breadcrumb for folder navigation
  const getBreadcrumb = (): FolderData[] => {
    if (!selectedVault || !selectedFolderId) return []
    const trail: FolderData[] = []
    let currentId: string | null = selectedFolderId
    while (currentId) {
      const folder = selectedVault.folders.find(f => f.id === currentId)
      if (!folder) break
      trail.unshift(folder)
      currentId = folder.parentId
    }
    return trail
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-[#6B7280]">Loading vaults...</div>
    )
  }

  // ─── Vault Detail View ─────────────────────────────
  if (selectedVault) {
    const breadcrumb = getBreadcrumb()

    return (
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-1 text-[13px] mb-4">
          <Link to="/documents" className="text-[#6B7280] hover:text-[#374151]">Documents</Link>
          <ChevronRight size={12} className="text-[#9CA3AF]" />
          <button onClick={() => { setSelectedVault(null); setSelectedFolderId(null) }} className="text-[#6B7280] hover:text-[#374151]">Vaults</button>
          <ChevronRight size={12} className="text-[#9CA3AF]" />
          <button onClick={() => setSelectedFolderId(null)} className="text-[#6B7280] hover:text-[#374151]">{selectedVault.name}</button>
          {breadcrumb.map(f => (
            <span key={f.id} className="flex items-center gap-1">
              <ChevronRight size={12} className="text-[#9CA3AF]" />
              <button onClick={() => setSelectedFolderId(f.id)} className="text-[#6B7280] hover:text-[#374151]">{f.name}</button>
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => { setSelectedVault(null); setSelectedFolderId(null) }} className="p-2 rounded-lg hover:bg-[#F3F4F6]">
              <ArrowLeft size={18} className="text-[#6B7280]" />
            </button>
            <div>
              <h1 className="text-2xl font-semibold text-[#111827]">{selectedVault.name}</h1>
              {selectedVault.description && <p className="text-sm text-[#6B7280] mt-0.5">{selectedVault.description}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateFolder(true)}
              className="flex h-9 items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm text-[#374151] hover:bg-[#F3F4F6]"
            >
              <FolderPlus size={15} />
              New Folder
            </button>
            <label className="flex h-9 items-center gap-1.5 rounded-lg bg-[#6C5CE7] px-4 text-sm font-medium text-white hover:bg-[#5B4BD5] cursor-pointer">
              <Upload size={15} />
              Upload
              <input type="file" className="hidden" multiple onChange={(e) => e.target.files && handleUpload(e.target.files)} />
            </label>
          </div>
        </div>

        {/* Upload zone */}
        <div
          className="rounded-xl border-2 border-dashed border-[#E5E7EB] hover:border-[#D1D5DB] bg-white p-6 text-center mb-6 cursor-pointer"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            if (e.dataTransfer.files.length) handleUpload(e.dataTransfer.files)
          }}
        >
          <Upload size={32} className="text-[#D1D5DB] mx-auto mb-2" />
          <p className="text-sm text-[#6B7280]">
            {uploadLoading ? 'Uploading...' : 'Drop files here or click Upload button'}
          </p>
          <p className="text-xs text-[#9CA3AF] mt-1">Files auto-extracted for AI context</p>
        </div>

        {/* Folders */}
        {currentFolders.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-medium text-[#374151] mb-3">Folders</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {currentFolders.map(folder => (
                <div
                  key={folder.id}
                  onClick={() => setSelectedFolderId(folder.id)}
                  className="group flex items-center gap-3 p-3 rounded-xl border border-[#E5E7EB] bg-white hover:shadow-md cursor-pointer transition-shadow"
                >
                  <FolderOpen size={20} className="text-[#6C5CE7] flex-shrink-0" />
                  <span className="text-sm font-medium text-[#111827] truncate flex-1">{folder.name}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id) }}
                    className="p-1 text-[#9CA3AF] hover:text-red-500 opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Documents */}
        <div>
          <h2 className="text-sm font-medium text-[#374151] mb-3">
            Documents ({currentDocs.length})
          </h2>
          {currentDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 rounded-xl border border-[#E5E7EB] bg-white">
              <FileText size={28} className="text-[#D1D5DB] mb-2" />
              <p className="text-sm text-[#6B7280]">No documents in this {selectedFolderId ? 'folder' : 'vault'} yet.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-[#E5E7EB] bg-white overflow-hidden shadow-sm">
              {/* Table header */}
              <div className="flex items-center px-4 py-3 bg-[#F9FAFB] border-b border-[#E5E7EB] text-xs font-medium uppercase text-[#6B7280] tracking-wider">
                <div className="flex-1 min-w-0">Name</div>
                <div className="w-32">Uploaded</div>
                <div className="w-24">Tags</div>
                <div className="w-24">Confidence</div>
                <div className="w-24 text-center">Status</div>
              </div>
              {currentDocs.map(doc => {
                const config = getFileConfig(doc.mimeType)
                const Icon = config.icon
                return (
                  <div key={doc.id} className="flex items-center px-4 py-3 border-b border-[#F3F4F6] hover:bg-[#F9FAFB] transition-colors">
                    <div className="flex-1 min-w-0 flex items-center gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0 ${config.bg}`}>
                        <Icon size={18} className={config.color} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#111827] truncate">{doc.fileName}</p>
                        <p className="text-xs text-[#9CA3AF]">{config.label}</p>
                      </div>
                    </div>
                    <div className="w-32 text-sm text-[#6B7280]">{formatDate(doc.createdAt)}</div>
                    <div className="w-24">
                      {doc.aiTags?.length > 0 ? (
                        <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#EDE9FD] text-[#6C5CE7]">
                          {doc.aiTags[0]}
                        </span>
                      ) : (
                        <span className="text-xs text-[#9CA3AF]">—</span>
                      )}
                    </div>
                    <div className="w-24">
                      {doc.confidenceScore != null ? (
                        <ConfidenceBadge score={doc.confidenceScore} />
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-[#D97706]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#D97706] animate-pulse" />
                          Extracting...
                        </span>
                      )}
                    </div>
                    <div className="w-24 text-center">
                      {doc.extractedData ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#065F46]">
                          <CheckCircle2 size={12} /> Ready
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#9CA3AF]">Processing</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Create Folder Modal */}
        {showCreateFolder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button className="absolute inset-0 bg-black/40" onClick={() => setShowCreateFolder(false)} />
            <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl p-6">
              <h2 className="text-lg font-semibold text-[#111827] mb-4">New Folder</h2>
              <input
                type="text"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="Folder name"
                className="w-full h-10 rounded-lg border border-[#E5E7EB] px-3 text-sm outline-none focus:ring-2 focus:ring-[#6C5CE7] mb-4"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowCreateFolder(false)} className="h-9 rounded-lg border border-[#E5E7EB] px-4 text-sm text-[#374151] hover:bg-[#F3F4F6]">Cancel</button>
                <button onClick={handleCreateFolder} className="h-9 rounded-lg bg-[#6C5CE7] px-4 text-sm font-medium text-white hover:bg-[#5B4BD5]">Create</button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ─── Vault List View ───────────────────────────────
  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center gap-1 text-[13px] mb-4">
        <Link to="/documents" className="text-[#6B7280] hover:text-[#374151]">Documents</Link>
        <ChevronRight size={12} className="text-[#9CA3AF]" />
        <span className="text-[#111827]">Vaults</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#111827]">Document Vaults</h1>
          <p className="text-sm text-[#6B7280] mt-1">Organize documents by vault. All extracted data feeds into AI advisor.</p>
        </div>
        {isFounder && (
          <button
            onClick={() => setShowCreateVault(true)}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-[#6C5CE7] px-4 text-sm font-medium text-white hover:bg-[#5B4BD5]"
          >
            <Plus size={15} />
            New Vault
          </button>
        )}
      </div>

      {vaults.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-xl border border-[#E5E7EB] bg-white">
          <Vault size={40} className="text-[#D1D5DB] mb-3" />
          <p className="text-sm text-[#6B7280] mb-1">No vaults yet.</p>
          {isFounder && (
            <p className="text-xs text-[#9CA3AF]">Create a vault to organize your documents.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {vaults.map((vault: any) => (
            <div
              key={vault.id}
              onClick={() => { fetchVaultDetail(vault.id); }}
              className="group bg-white border border-[#E5E7EB] rounded-xl p-5 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EDE9FD]">
                    <Vault size={20} className="text-[#6C5CE7]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#111827]">{vault.name}</h3>
                    <p className="text-xs text-[#6B7280]">Created {formatDate(vault.createdAt)}</p>
                  </div>
                </div>
                {isFounder && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteVault(vault.id) }}
                    className="p-1.5 text-[#9CA3AF] hover:text-red-500 opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              {vault.description && (
                <p className="text-xs text-[#6B7280] line-clamp-2">{vault.description}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Vault Modal */}
      {showCreateVault && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button className="absolute inset-0 bg-black/40" onClick={() => setShowCreateVault(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl p-6">
            <h2 className="text-lg font-semibold text-[#111827] mb-4">Create Vault</h2>
            <div className="space-y-3">
              <input
                type="text"
                value={vaultName}
                onChange={(e) => setVaultName(e.target.value)}
                placeholder="Vault name"
                className="w-full h-10 rounded-lg border border-[#E5E7EB] px-3 text-sm outline-none focus:ring-2 focus:ring-[#6C5CE7]"
                autoFocus
              />
              <textarea
                value={vaultDesc}
                onChange={(e) => setVaultDesc(e.target.value)}
                placeholder="Description (optional)"
                className="w-full h-20 rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#6C5CE7] resize-none"
              />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowCreateVault(false)} className="h-9 rounded-lg border border-[#E5E7EB] px-4 text-sm text-[#374151] hover:bg-[#F3F4F6]">Cancel</button>
              <button onClick={handleCreateVault} className="h-9 rounded-lg bg-[#6C5CE7] px-4 text-sm font-medium text-white hover:bg-[#5B4BD5]">Create Vault</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
