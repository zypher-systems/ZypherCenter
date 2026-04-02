import { useState } from 'react'
import { Link } from 'react-router'
import { Database, Pencil, Plus, Trash2 } from 'lucide-react'
import { useStorage, useCreateStorage, useDeleteStorage, useUpdateStorage } from '@/lib/queries/storage'
import type { StorageConfig } from '@zyphercenter/proxmox-types'
import { useClusterResources } from '@/lib/queries/cluster'
import { Card, CardContent } from '@/components/ui/Card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import { formatBytes, formatPercent } from '@/lib/utils'

const STORAGE_TYPES = ['dir', 'nfs', 'cifs', 'btrfs', 'lvm', 'lvmthin', 'zfspool', 'rbd', 'cephfs', 'iscsi', 'iscsidirect', 'glusterfs', 'pbs']
const CONTENT_OPTS = ['images', 'rootdir', 'vztmpl', 'iso', 'backup', 'snippets']

const inpCls = 'w-full rounded border border-border-subtle bg-bg-input px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent [color-scheme:dark]'

function CreateStorageDialog({ onClose }: { onClose: () => void }) {
  const [storage, setStorage] = useState('')
  const [type, setType] = useState('dir')
  const [content, setContent] = useState<string[]>(['images'])
  const create = useCreateStorage()

  // type-specific fields
  const [path,     setPath]     = useState('')   // dir, btrfs
  const [server,   setServer]   = useState('')   // nfs, cifs
  const [nfsExport, setNfsExport] = useState('') // nfs
  const [share,    setShare]    = useState('')   // cifs
  const [username, setUsername] = useState('')   // cifs, rbd
  const [password, setPassword] = useState('')   // cifs
  const [monhost,  setMonhost]  = useState('')   // rbd, cephfs
  const [pool,     setPool]     = useState('rbd') // rbd
  const [vgname,   setVgname]   = useState('')   // lvm, lvmthin
  const [thinpool, setThinpool] = useState('')   // lvmthin
  const [zfsPool,  setZfsPool]  = useState('')   // zfspool
  const [nodes,    setNodes]    = useState('')   // all types optional

  function toggleContent(c: string) {
    setContent((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c])
  }

  function submit() {
    if (!storage.trim()) return
    const params: Record<string, unknown> = {
      storage: storage.trim(),
      type,
      content: content.join(','),
    }
    if (nodes.trim()) params.nodes = nodes.trim()

    if (type === 'dir' || type === 'btrfs') {
      if (path) params.path = path
    } else if (type === 'nfs') {
      params.server = server
      params.export = nfsExport
    } else if (type === 'cifs') {
      params.server = server
      params.share = share
      if (username) params.username = username
      if (password) params.password = password
    } else if (type === 'rbd') {
      if (monhost) params.monhost = monhost
      params.pool = pool || 'rbd'
      if (username) params.username = username
    } else if (type === 'cephfs') {
      if (monhost) params.monhost = monhost
      if (username) params.username = username
    } else if (type === 'lvm') {
      params.vgname = vgname
    } else if (type === 'lvmthin') {
      params.vgname = vgname
      params.thinpool = thinpool
    } else if (type === 'zfspool') {
      params.pool = zfsPool
    }

    create.mutate(params, { onSuccess: () => onClose() })
  }

  const needsServer = type === 'nfs' || type === 'cifs'
  const isNetworkType = needsServer || type === 'rbd' || type === 'cephfs'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-bg-card border border-border-subtle rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-text-primary">Create Storage</h2>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-secondary mb-1">ID <span className="text-status-error">*</span></label>
              <input value={storage} onChange={(e) => setStorage(e.target.value)} placeholder="e.g. local-backup" className={inpCls} />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Type <span className="text-status-error">*</span></label>
              <select value={type} onChange={(e) => setType(e.target.value)} className={inpCls}>
                {STORAGE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {(type === 'dir' || type === 'btrfs') && (
            <div>
              <label className="block text-xs text-text-secondary mb-1">Path</label>
              <input value={path} onChange={(e) => setPath(e.target.value)} placeholder="/mnt/storage" className={inpCls} />
            </div>
          )}

          {needsServer && (
            <div>
              <label className="block text-xs text-text-secondary mb-1">Server <span className="text-status-error">*</span></label>
              <input value={server} onChange={(e) => setServer(e.target.value)} placeholder="192.168.1.10" className={inpCls} required />
            </div>
          )}
          {type === 'nfs' && (
            <div>
              <label className="block text-xs text-text-secondary mb-1">Export path <span className="text-status-error">*</span></label>
              <input value={nfsExport} onChange={(e) => setNfsExport(e.target.value)} placeholder="/export/backup" className={inpCls} required />
            </div>
          )}
          {type === 'cifs' && (
            <>
              <div>
                <label className="block text-xs text-text-secondary mb-1">Share <span className="text-status-error">*</span></label>
                <input value={share} onChange={(e) => setShare(e.target.value)} placeholder="backup" className={inpCls} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Username</label>
                  <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="guest" className={inpCls} />
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Password</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inpCls} />
                </div>
              </div>
            </>
          )}
          {(type === 'rbd' || type === 'cephfs') && (
            <>
              <div>
                <label className="block text-xs text-text-secondary mb-1">Monitor hosts</label>
                <input value={monhost} onChange={(e) => setMonhost(e.target.value)} placeholder="192.168.1.10:6789" className={inpCls} />
                <p className="text-xs text-text-muted mt-0.5">Leave blank to use local Ceph config</p>
              </div>
              {type === 'rbd' && (
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Ceph pool</label>
                  <input value={pool} onChange={(e) => setPool(e.target.value)} placeholder="rbd" className={inpCls} />
                </div>
              )}
              <div>
                <label className="block text-xs text-text-secondary mb-1">Username</label>
                <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin" className={inpCls} />
              </div>
            </>
          )}
          {type === 'lvm' && (
            <div>
              <label className="block text-xs text-text-secondary mb-1">Volume group <span className="text-status-error">*</span></label>
              <input value={vgname} onChange={(e) => setVgname(e.target.value)} placeholder="vg0" className={inpCls} required />
            </div>
          )}
          {type === 'lvmthin' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-text-secondary mb-1">Volume group <span className="text-status-error">*</span></label>
                <input value={vgname} onChange={(e) => setVgname(e.target.value)} placeholder="vg0" className={inpCls} required />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">Thin pool <span className="text-status-error">*</span></label>
                <input value={thinpool} onChange={(e) => setThinpool(e.target.value)} placeholder="data" className={inpCls} required />
              </div>
            </div>
          )}
          {type === 'zfspool' && (
            <div>
              <label className="block text-xs text-text-secondary mb-1">ZFS pool <span className="text-status-error">*</span></label>
              <input value={zfsPool} onChange={(e) => setZfsPool(e.target.value)} placeholder="rpool" className={inpCls} required />
            </div>
          )}

          <div>
            <label className="block text-xs text-text-secondary mb-1.5">Content Types <span className="text-status-error">*</span></label>
            <div className="flex flex-wrap gap-2">
              {CONTENT_OPTS.map((c) => (
                <label key={c} className="flex items-center gap-1.5 text-sm text-text-secondary cursor-pointer select-none">
                  <input type="checkbox" checked={content.includes(c)} onChange={() => toggleContent(c)} className="accent-accent" />
                  {c}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-text-secondary mb-1">Restrict to nodes (optional, comma-separated)</label>
            <input value={nodes} onChange={(e) => setNodes(e.target.value)} placeholder="pve1,pve2" className={inpCls} />
            <p className="text-xs text-text-muted mt-0.5">Leave blank to allow on all nodes</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={submit} disabled={!storage.trim() || content.length === 0 || create.isPending}>
            {create.isPending ? 'Creating…' : 'Create'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function EditStorageDialog({ storage, onClose }: { storage: StorageConfig; onClose: () => void }) {
  const updateStorage = useUpdateStorage()
  const [content, setContent] = useState<string[]>(
    storage.content ? storage.content.split(',').map((c) => c.trim()).filter(Boolean) : []
  )
  const [nodes,   setNodes]   = useState(storage.nodes ?? '')
  const [comment, setComment] = useState((storage as unknown as Record<string, unknown>)['comment'] as string ?? '')
  const [disabled, setDisabled] = useState(storage.disable === 1)

  function toggleContent(c: string) {
    setContent((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c])
  }

  function submit() {
    updateStorage.mutate({
      storageId: storage.storage,
      params: {
        content: content.join(','),
        nodes:   nodes.trim() || undefined,
        comment: comment.trim() || undefined,
        disable: disabled ? 1 : 0,
      },
    }, { onSuccess: () => onClose() })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-bg-card border border-border-subtle rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div>
          <h2 className="text-base font-semibold text-text-primary">Edit Storage — {storage.storage}</h2>
          <p className="text-xs text-text-muted mt-0.5">Type: {storage.type}</p>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-text-secondary mb-1">Comment</label>
            <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Optional description" className={inpCls} />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1.5">Content Types</label>
            <div className="flex flex-wrap gap-2">
              {CONTENT_OPTS.map((c) => (
                <label key={c} className="flex items-center gap-1.5 text-sm text-text-secondary cursor-pointer select-none">
                  <input type="checkbox" checked={content.includes(c)} onChange={() => toggleContent(c)} className="accent-accent" />
                  {c}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">Restrict to nodes (comma-separated)</label>
            <input value={nodes} onChange={(e) => setNodes(e.target.value)} placeholder="pve1,pve2 — leave blank for all" className={inpCls} />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={disabled} onChange={(e) => setDisabled(e.target.checked)} className="accent-accent size-4" />
            <span className="text-sm text-text-secondary">Disabled</span>
          </label>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={submit} disabled={updateStorage.isPending}>
            {updateStorage.isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export function StorageListPage() {
  const { data: storages, isLoading } = useStorage()
  const { data: resources } = useClusterResources()
  const deleteStorage = useDeleteStorage()
  const [showCreate, setShowCreate] = useState(false)
  const [editingStorage, setEditingStorage] = useState<StorageConfig | null>(null)

  // aggregate disk usage per storage name from cluster resources
  const capacityMap = new Map<string, { used: number; total: number }>()
  resources?.filter((r) => r.type === 'storage').forEach((r) => {
    const key = r.storage ?? r.id?.split('/')?.[2] ?? ''
    if (!key) return
    const existing = capacityMap.get(key) ?? { used: 0, total: 0 }
    capacityMap.set(key, {
      used:  existing.used  + (r.disk    ?? 0),
      total: existing.total + (r.maxdisk ?? 0),
    })
  })

  return (
    <div className="space-y-4">
      {showCreate && <CreateStorageDialog onClose={() => setShowCreate(false)} />}
      {editingStorage && <EditStorageDialog storage={editingStorage} onClose={() => setEditingStorage(null)} />}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Storage</h1>
          <p className="text-sm text-text-muted mt-0.5">All configured storage pools in the cluster</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="size-3.5 mr-1" />Add Storage
        </Button>
      </div>

      {isLoading ? (
        <SkeletonCard />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Content Types</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Nodes</TableHead>
                  <TableHead>Enabled</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {storages?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-text-muted py-10">
                      No storage configured
                    </TableCell>
                  </TableRow>
                ) : (
                  storages?.map((s) => {
                    const cap = capacityMap.get(s.storage)
                    const pct = cap && cap.total > 0 ? cap.used / cap.total : null
                    return (
                      <TableRow key={s.storage}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Database className="size-3.5 text-text-muted shrink-0" />
                            <Link
                              to={`/storage/${s.storage}`}
                              className="font-medium text-text-primary hover:text-accent transition-colors"
                            >
                              {s.storage}
                            </Link>
                          </div>
                        </TableCell>
                        <TableCell className="text-text-secondary text-sm">{s.type}</TableCell>
                        <TableCell className="text-text-muted text-xs">
                          {s.content?.replace(/,/g, ', ') ?? '—'}
                        </TableCell>
                        <TableCell className="min-w-[140px]">
                          {cap && cap.total > 0 ? (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs text-text-muted">
                                <span className="tabular-nums">{formatBytes(cap.used)}</span>
                                <span className="tabular-nums text-text-disabled">{formatPercent(pct!)}</span>
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-bg-muted overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    pct! > 0.9 ? 'bg-status-error' : pct! > 0.75 ? 'bg-amber-400' : 'bg-accent'
                                  }`}
                                  style={{ width: `${Math.min(pct! * 100, 100).toFixed(1)}%` }}
                                />
                              </div>
                              <p className="text-xs text-text-disabled tabular-nums">of {formatBytes(cap.total)}</p>
                            </div>
                          ) : (
                            <span className="text-text-disabled text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-text-secondary text-sm">
                          {s.nodes ?? <span className="text-text-muted">All</span>}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center gap-1.5 text-xs ${
                              s.disable ? 'text-status-stopped' : 'text-status-running'
                            }`}
                          >
                            <span
                              className={`inline-flex size-1.5 rounded-full ${
                                s.disable ? 'bg-status-stopped' : 'bg-status-running'
                              }`}
                            />
                            {s.disable ? 'Disabled' : 'Enabled'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setEditingStorage(s)}
                              className="inline-flex items-center gap-1 rounded border border-border-subtle px-2 py-0.5 text-xs text-text-muted hover:text-text-primary hover:bg-bg-elevated"
                            >
                              <Pencil className="size-3" />Edit
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Delete storage "${s.storage}"? This only removes the configuration.`)) {
                                  deleteStorage.mutate(s.storage)
                                }
                              }}
                              disabled={deleteStorage.isPending}
                              className="inline-flex items-center gap-1 rounded border border-status-error/40 px-2 py-0.5 text-xs text-status-error hover:bg-status-error/10 disabled:opacity-50"
                            >
                              <Trash2 className="size-3" />Remove
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
