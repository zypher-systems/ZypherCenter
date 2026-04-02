import { useState, useRef } from 'react'
import { useParams } from 'react-router'
import { HardDrive, Package, Server, Trash2, Upload, RotateCcw, Scissors } from 'lucide-react'
import { useStorage, useStorageContent, useDeleteStorageContent, useUploadContent, usePruneBackups } from '@/lib/queries/storage'
import { useNodeStorage } from '@/lib/queries/nodes'
import { useRestoreVM } from '@/lib/queries/vms'
import { useRestoreLXC } from '@/lib/queries/lxc'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { ResourceGauge } from '@/components/ui/ResourceGauge'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { formatBytes, formatPercent, formatTimestamp } from '@/lib/utils'
import type { StorageContentItem } from '@zyphercenter/proxmox-types'

const CONTENT_TYPES = [
  { value: '', label: 'All' },
  { value: 'vztmpl', label: 'Templates' },
  { value: 'iso', label: 'ISOs' },
  { value: 'images', label: 'Disk Images' },
  { value: 'backup', label: 'Backups' },
  { value: 'snippets', label: 'Snippets' },
]

function contentIcon(type?: string) {
  if (type === 'iso') return <Package className="size-3.5 text-text-muted" />
  if (type === 'backup') return <HardDrive className="size-3.5 text-text-muted" />
  return <Server className="size-3.5 text-text-muted" />
}

function detectBackupType(volid: string): 'qemu' | 'lxc' | null {
  const filename = volid.split('/').pop() ?? ''
  if (filename.includes('vzdump-qemu-')) return 'qemu'
  if (filename.includes('vzdump-lxc-') || filename.includes('vzdump-openvz-')) return 'lxc'
  return null
}

function RestoreDialog({
  item,
  node,
  onClose,
}: {
  item: StorageContentItem
  node: string
  onClose: () => void
}) {
  const { data: storages } = useStorage()
  const restoreVM = useRestoreVM(node)
  const restoreLXC = useRestoreLXC(node)

  const backupType = detectBackupType(item.volid)
  const [vmid, setVmid] = useState(String(item.vmid ?? ''))
  const [storage, setStorage] = useState('local')
  const [unique, setUnique] = useState(true)
  const [startAfter, setStartAfter] = useState(false)

  const eligibleStorages = storages?.filter((s) => {
    const c = s.content ?? ''
    return backupType === 'lxc'
      ? c.includes('rootdir') || c.includes('images')
      : c.includes('images')
  }) ?? []

  const isPending = restoreVM.isPending || restoreLXC.isPending

  function handleRestore() {
    const vid = parseInt(vmid)
    if (!vid || vid < 100) return
    const params = { archive: item.volid, vmid: vid, storage, unique: unique ? 1 : 0, start: startAfter ? 1 : 0 }
    if (backupType === 'qemu') {
      restoreVM.mutate(params, { onSuccess: onClose })
    } else {
      restoreLXC.mutate(params, { onSuccess: onClose })
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <RotateCcw className="size-4 text-text-muted" />
            Restore Backup
          </CardTitle>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">✕</button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs font-mono text-text-muted truncate">{item.volid.split(':').pop()}</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-text-muted">Type</label>
            <p className="text-sm text-text-primary font-medium capitalize">{backupType ?? 'Unknown'}</p>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-text-muted">Target VMID</label>
            <input
              type="number"
              min={100}
              max={999999999}
              value={vmid}
              onChange={(e) => setVmid(e.target.value)}
              className="w-full rounded border border-border-subtle bg-bg-input px-2 py-1 text-sm text-text-primary outline-none focus:border-accent"
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-text-muted">Target Storage</label>
          <select
            value={storage}
            onChange={(e) => setStorage(e.target.value)}
            className="w-full rounded border border-border-subtle bg-bg-input px-2 py-1.5 text-sm text-text-primary outline-none focus:border-accent [color-scheme:dark]"
          >
            {eligibleStorages.length > 0
              ? eligibleStorages.map((s) => <option key={s.storage} value={s.storage}>{s.storage}</option>)
              : storages?.map((s) => <option key={s.storage} value={s.storage}>{s.storage}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-1.5 text-sm cursor-pointer">
            <input type="checkbox" checked={unique} onChange={(e) => setUnique(e.target.checked)} className="accent-accent" />
            <span className="text-text-secondary">Unique MACs/IDs</span>
          </label>
          <label className="flex items-center gap-1.5 text-sm cursor-pointer">
            <input type="checkbox" checked={startAfter} onChange={(e) => setStartAfter(e.target.checked)} className="accent-accent" />
            <span className="text-text-secondary">Start after restore</span>
          </label>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button size="sm" variant="ghost" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button size="sm" onClick={handleRestore} disabled={isPending || !vmid || backupType === null}>
            {isPending ? 'Starting…' : 'Restore'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function StorageDetailPage() {
  const { storageid } = useParams<{ storageid: string }>()
  const [activeNode, setActiveNode] = useState<string>('')
  const [contentFilter, setContentFilter] = useState<string>('')
  const [showUpload, setShowUpload] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadType, setUploadType] = useState<'iso' | 'vztmpl'>('iso')
  const [restoreItem, setRestoreItem] = useState<StorageContentItem | null>(null)
  const [selectedVolids, setSelectedVolids] = useState<Set<string>>(new Set())
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: storages } = useStorage()
  const storageInfo = storages?.find((s) => s.storage === storageid)

  const targetNode = activeNode || storageInfo?.nodes?.split(',')[0]?.trim() || 'pve'

  const { data: nodeStorages } = useNodeStorage(targetNode)
  const capacityInfo = nodeStorages?.find((ns) => ns.storage === storageid)

  const { data: content, isLoading } = useStorageContent(
    targetNode,
    storageid!,
    contentFilter || undefined,
  )
  const deleteContent = useDeleteStorageContent(targetNode, storageid!)
  const uploadContent = useUploadContent(targetNode, storageid!)
  const pruneBackups = usePruneBackups(targetNode, storageid!)

  function toggleSelect(volid: string) {
    setSelectedVolids((prev) => {
      const next = new Set(prev)
      if (next.has(volid)) next.delete(volid); else next.add(volid)
      return next
    })
  }

  async function bulkDelete() {
    if (selectedVolids.size === 0) return
    if (!confirm(`Delete ${selectedVolids.size} item${selectedVolids.size !== 1 ? 's' : ''}? This cannot be undone.`)) return
    for (const volid of selectedVolids) {
      await new Promise<void>((resolve) => deleteContent.mutate(volid, { onSettled: () => resolve() }))
    }
    setSelectedVolids(new Set())
  }

  // Allowed content types for upload
  const supportedContent = storageInfo?.content?.split(',').map((s) => s.trim()) ?? []
  const canUploadIso = supportedContent.includes('iso') || supportedContent.length === 0
  const canUploadTemplate = supportedContent.includes('vztmpl') || supportedContent.length === 0
  const canUpload = canUploadIso || canUploadTemplate
  const hasBackupContent = supportedContent.includes('backup')

  function handleUpload() {
    if (!uploadFile) return
    uploadContent.mutate(
      { file: uploadFile, content: uploadType },
      {
        onSuccess: () => {
          setShowUpload(false)
          setUploadFile(null)
          if (fileInputRef.current) fileInputRef.current.value = ''
        },
      },
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">{storageid}</h1>
          <p className="text-sm text-text-muted mt-0.5">
            {storageInfo?.type ?? 'storage'} · {storageInfo?.content?.replace(/,/g, ', ') ?? ''}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {canUpload && (
            <Button size="sm" variant="default" onClick={() => setShowUpload(true)}>
              <Upload className="size-3.5" /> Upload
            </Button>
          )}
          {hasBackupContent && (
            <Button
              size="sm"
              variant="outline"
              disabled={pruneBackups.isPending}
              onClick={() => {
                if (confirm(`Prune old backups from ${storageid}? Backups exceeding the configured retention policy will be deleted.`)) {
                  pruneBackups.mutate({ type: 'backup' })
                }
              }}
            >
              <Scissors className="size-3.5" />{pruneBackups.isPending ? ' Pruning…' : ' Prune Backups'}
            </Button>
          )}
          {storageInfo?.nodes && storageInfo.nodes.includes(',') && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted">Node:</span>
              <select
                value={activeNode || (storageInfo.nodes!.split(',')[0] ?? '').trim()}
                onChange={(e) => setActiveNode(e.target.value)}
                className="rounded border border-border-subtle bg-bg-input px-2 py-1.5 text-sm text-text-primary outline-none focus:border-accent [color-scheme:dark]"
              >
                {storageInfo.nodes.split(',').map((n) => n.trim()).map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Upload dialog */}
      {showUpload && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Upload className="size-4 text-text-muted" /> Upload ISO / Template
              </CardTitle>
              <button onClick={() => { setShowUpload(false); setUploadFile(null) }} className="text-text-muted hover:text-text-primary">
                ✕
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-xs text-text-muted w-20">Type</span>
              <select
                value={uploadType}
                onChange={(e) => setUploadType(e.target.value as 'iso' | 'vztmpl')}
                className="rounded border border-border-subtle bg-bg-input px-2 py-1.5 text-sm text-text-primary outline-none focus:border-accent [color-scheme:dark]"
              >
                {canUploadIso && <option value="iso">ISO Image</option>}
                {canUploadTemplate && <option value="vztmpl">CT Template</option>}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-text-muted w-20">File</span>
              <input
                ref={fileInputRef}
                type="file"
                accept={uploadType === 'iso' ? '.iso,.img' : '.tar.gz,.tar.xz,.tar.zst'}
                onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                className="flex-1 text-sm text-text-primary file:mr-3 file:rounded file:border-0 file:bg-bg-surface file:px-2 file:py-1 file:text-xs file:text-text-secondary hover:file:bg-bg-surface/70"
              />
            </div>
            {uploadFile && (
              <p className="text-xs text-text-muted pl-[6rem]">{uploadFile.name} ({(uploadFile.size / 1024 / 1024).toFixed(1)} MB)</p>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <Button size="sm" variant="ghost" onClick={() => { setShowUpload(false); setUploadFile(null) }}>Cancel</Button>
              <Button size="sm" onClick={handleUpload} disabled={!uploadFile || uploadContent.isPending}>
                {uploadContent.isPending ? 'Uploading…' : 'Upload'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Capacity card */}
      {capacityInfo && capacityInfo.total != null && capacityInfo.total > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <HardDrive className="size-4 text-text-muted" />
              <CardTitle className="text-sm font-medium">Capacity</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-6">
              <div className="space-y-1.5">
                <p className="text-xs text-text-muted">Used</p>
                <p className="text-lg font-semibold tabular-nums text-text-primary">
                  {formatBytes(capacityInfo.used ?? 0)}
                </p>
                <p className="text-xs text-text-disabled">
                  {formatPercent(capacityInfo.used_fraction ?? ((capacityInfo.used ?? 0) / capacityInfo.total))} of total
                </p>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs text-text-muted">Available</p>
                <p className="text-lg font-semibold tabular-nums text-text-primary">
                  {formatBytes(capacityInfo.avail ?? 0)}
                </p>
                <p className="text-xs text-text-disabled">free space</p>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs text-text-muted">Total</p>
                <p className="text-lg font-semibold tabular-nums text-text-primary">
                  {formatBytes(capacityInfo.total)}
                </p>
                <p className="text-xs text-text-disabled">{targetNode}</p>
              </div>
            </div>
            <div className="mt-4">
              <ResourceGauge
                label=""
                used={capacityInfo.used ?? 0}
                total={capacityInfo.total}
                format="bytes"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Restore dialog */}
      {restoreItem && (
        <RestoreDialog
          item={restoreItem}
          node={targetNode}
          onClose={() => setRestoreItem(null)}
        />
      )}

      {/* Content type filter */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1 flex-wrap">
          {CONTENT_TYPES.map((ct) => (
            <Button
              key={ct.value}
              size="sm"
              variant={contentFilter === ct.value ? 'default' : 'ghost'}
              onClick={() => { setContentFilter(ct.value); setSelectedVolids(new Set()) }}
            >
              {ct.label}
            </Button>
          ))}
        </div>
        {selectedVolids.size > 0 && (
          <Button size="sm" variant="destructive" onClick={bulkDelete} disabled={deleteContent.isPending}>
            <Trash2 className="size-3.5 mr-1" />
            Delete {selectedVolids.size} selected
          </Button>
        )}
      </div>

      {isLoading ? (
        <SkeletonCard />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">
                    <input
                      type="checkbox"
                      className="accent-accent cursor-pointer"
                      checked={!!content?.length && content.length === selectedVolids.size}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedVolids(new Set(content?.map((i) => i.volid) ?? []))
                        else setSelectedVolids(new Set())
                      }}
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>VM</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {content?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-text-muted py-10">
                      No content
                    </TableCell>
                  </TableRow>
                ) : (
                  content?.map((item) => (
                    <TableRow key={item.volid} className={selectedVolids.has(item.volid) ? 'bg-accent/5' : ''}>
                      <TableCell className="w-8">
                        <input
                          type="checkbox"
                          className="accent-accent cursor-pointer"
                          checked={selectedVolids.has(item.volid)}
                          onChange={() => toggleSelect(item.volid)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {contentIcon(item.content)}
                          <span className="font-mono text-sm text-text-primary">
                            {item.volid.split(':').pop() ?? item.volid}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-text-secondary text-xs uppercase tracking-wide">
                        {item.content}
                      </TableCell>
                      <TableCell className="tabular-nums text-text-secondary">
                        {item.size ? formatBytes(item.size) : '—'}
                      </TableCell>
                      <TableCell className="tabular-nums text-text-secondary text-sm">
                        {item.ctime ? formatTimestamp(item.ctime) : '—'}
                      </TableCell>
                      <TableCell className="font-mono text-text-muted text-sm">
                        {item.vmid ?? '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {item.content === 'backup' && (
                            <button
                              onClick={() => setRestoreItem(item)}
                              className="inline-flex items-center gap-1 rounded border border-accent/40 px-2 py-0.5 text-xs text-accent hover:bg-accent/10 disabled:opacity-50"
                            >
                              <RotateCcw className="size-3" />
                              Restore
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (confirm(`Delete "${item.volid.split(':').pop()}"?`)) {
                                deleteContent.mutate(item.volid)
                              }
                            }}
                            disabled={deleteContent.isPending}
                            className="inline-flex items-center gap-1 rounded border border-status-error/40 px-2 py-0.5 text-xs text-status-error hover:bg-status-error/10 disabled:opacity-50"
                          >
                            <Trash2 className="size-3" />
                            Delete
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
