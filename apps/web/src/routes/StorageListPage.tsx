import { useState } from 'react'
import { Link } from 'react-router'
import { Database, Plus, Trash2 } from 'lucide-react'
import { useStorage, useCreateStorage, useDeleteStorage } from '@/lib/queries/storage'
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

function CreateStorageDialog({ onClose }: { onClose: () => void }) {
  const [storage, setStorage] = useState('')
  const [type, setType] = useState('dir')
  const [path, setPath] = useState('')
  const [content, setContent] = useState<string[]>(['images'])
  const create = useCreateStorage()

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
    if (path) params.path = path
    create.mutate(params, { onSuccess: () => onClose() })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-bg-card border border-border-subtle rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">Create Storage</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-text-secondary mb-1">ID <span className="text-status-error">*</span></label>
            <input
              value={storage}
              onChange={(e) => setStorage(e.target.value)}
              placeholder="e.g. local-backup"
              className="w-full rounded border border-border-subtle bg-bg-input px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Type <span className="text-status-error">*</span></label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded border border-border-subtle bg-bg-input px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent"
            >
              {STORAGE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          {(type === 'dir' || type === 'btrfs') && (
            <div>
              <label className="block text-sm text-text-secondary mb-1">Path</label>
              <input
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="/mnt/storage"
                className="w-full rounded border border-border-subtle bg-bg-input px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent"
              />
            </div>
          )}
          <div>
            <label className="block text-sm text-text-secondary mb-2">Content Types</label>
            <div className="flex flex-wrap gap-2">
              {CONTENT_OPTS.map((c) => (
                <label key={c} className="flex items-center gap-1.5 text-sm text-text-secondary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={content.includes(c)}
                    onChange={() => toggleContent(c)}
                    className="accent-accent"
                  />
                  {c}
                </label>
              ))}
            </div>
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

export function StorageListPage() {
  const { data: storages, isLoading } = useStorage()
  const { data: resources } = useClusterResources()
  const deleteStorage = useDeleteStorage()
  const [showCreate, setShowCreate] = useState(false)

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
