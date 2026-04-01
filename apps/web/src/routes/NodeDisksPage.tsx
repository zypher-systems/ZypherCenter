import { useState } from 'react'
import { useParams } from 'react-router'
import { HardDrive, Database, Plus, RefreshCw, ShieldHalf } from 'lucide-react'
import { useNodeDisks, useWipeDisk, useInitDisk, useNodeZFSPools, useCreateZFSPool, useNodeZFSScrub } from '@/lib/queries/nodes'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
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
import { formatBytes } from '@/lib/utils'

function DiskHealth({ health }: { health?: string }) {
  if (!health) return <span className="text-text-muted">—</span>
  const isHealthy = health === 'PASSED' || health.toLowerCase().includes('ok')
  return (
    <span className={isHealthy ? 'text-status-running' : 'text-status-error'}>
      {health}
    </span>
  )
}

function ZFSPoolHealth({ state }: { state?: string }) {
  if (!state) return <span className="text-text-muted">—</span>
  const s = state.toUpperCase()
  const color = s === 'ONLINE' ? 'text-status-running' : s === 'DEGRADED' ? 'text-status-paused' : 'text-status-error'
  return <span className={color}>{state}</span>
}

const RAID_LEVELS = ['single', 'mirror', 'raidz', 'raidz2', 'raidz3']

function CreateZFSForm({ node, disks, onCancel }: { node: string; disks: string[]; onCancel: () => void }) {
  const create = useCreateZFSPool(node)
  const [name, setName] = useState('')
  const [raidlevel, setRaidlevel] = useState('single')
  const [selectedDisks, setSelectedDisks] = useState<string[]>([])
  const [addStorage, setAddStorage] = useState(true)

  function toggleDisk(d: string) {
    setSelectedDisks((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d])
  }

  function submit() {
    if (!name.trim() || selectedDisks.length === 0) return
    create.mutate(
      { name: name.trim(), raidlevel, devices: selectedDisks.join(';'), add_storage: addStorage ? 1 : 0 },
      { onSuccess: () => onCancel() },
    )
  }

  const inp = 'w-full rounded border border-border-subtle bg-bg-input px-2 py-1.5 text-sm text-text-primary outline-none focus:border-accent [color-scheme:dark]'

  return (
    <div className="border-t border-border-muted bg-bg-elevated px-4 py-4 space-y-3">
      <p className="text-sm font-medium text-text-primary">Create ZFS Pool</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-text-muted mb-1">Pool Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. tank"
            className={inp}
          />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">RAID Level</label>
          <select value={raidlevel} onChange={(e) => setRaidlevel(e.target.value)} className={inp}>
            {RAID_LEVELS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs text-text-muted mb-1">Devices (select one or more)</label>
        <div className="flex flex-wrap gap-2 mt-1">
          {disks.map((d) => (
            <button
              key={d}
              onClick={() => toggleDisk(d)}
              className={`rounded border px-2 py-0.5 text-xs font-mono transition-colors ${
                selectedDisks.includes(d)
                  ? 'border-accent bg-accent/20 text-text-primary'
                  : 'border-border-subtle text-text-muted hover:border-accent/50'
              }`}
            >
              {d}
            </button>
          ))}
          {disks.length === 0 && <span className="text-xs text-text-muted">No available disks</span>}
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
        <input type="checkbox" checked={addStorage} onChange={(e) => setAddStorage(e.target.checked)} className="rounded" />
        Add as storage to Proxmox
      </label>
      <div className="flex items-center gap-2 pt-1">
        <Button size="sm" onClick={submit} disabled={create.isPending || !name.trim() || selectedDisks.length === 0}>
          {create.isPending ? 'Creating…' : 'Create Pool'}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  )
}

export function NodeDisksPage() {
  const { node } = useParams<{ node: string }>()
  const [tab, setTab] = useState<'disks' | 'zfs'>('disks')
  const [showCreate, setShowCreate] = useState(false)
  const { data: disks, isLoading } = useNodeDisks(node!)
  const wipe = useWipeDisk(node!)
  const init = useInitDisk(node!)
  const { data: zfsPools, isLoading: zfsLoading, refetch: refetchZFS } = useNodeZFSPools(node!)
  const scrub = useNodeZFSScrub(node!)

  const diskPaths = (disks ?? []).map((d) => d.devpath).filter(Boolean) as string[]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Disks</h1>
          <p className="text-sm text-text-muted mt-0.5">Physical storage devices on {node}</p>
        </div>
        {tab === 'zfs' && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetchZFS()}>
              <RefreshCw className="size-3.5 mr-1" />Refresh
            </Button>
            <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
              <Plus className="size-3.5 mr-1" />Create Pool
            </Button>
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border-muted">
        <button
          onClick={() => setTab('disks')}
          className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'disks' ? 'border-accent text-text-primary' : 'border-transparent text-text-muted hover:text-text-secondary'
          }`}
        >
          <HardDrive className="size-3.5" />Disks
        </button>
        <button
          onClick={() => setTab('zfs')}
          className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'zfs' ? 'border-accent text-text-primary' : 'border-transparent text-text-muted hover:text-text-secondary'
          }`}
        >
          <Database className="size-3.5" />ZFS Pools
        </button>
      </div>

      {tab === 'disks' && (
        isLoading ? (
          <SkeletonCard />
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Device</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>S.M.A.R.T.</TableHead>
                    <TableHead>Wearout</TableHead>
                    <TableHead>Serial</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {disks?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-text-muted py-10">
                        No disks found
                      </TableCell>
                    </TableRow>
                  ) : (
                    disks?.map((disk) => (
                      <TableRow key={disk.devpath}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <HardDrive className="size-3.5 text-text-muted shrink-0" />
                            <span className="font-mono text-sm text-text-primary">
                              {disk.devpath}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-text-secondary text-sm">
                          {disk.model ?? '—'}
                        </TableCell>
                        <TableCell className="tabular-nums text-text-secondary">
                          {disk.size ? formatBytes(disk.size) : '—'}
                        </TableCell>
                        <TableCell>
                          <span className="text-xs uppercase tracking-wide text-text-muted bg-bg-elevated px-2 py-0.5 rounded">
                            {disk.type ?? 'unknown'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <DiskHealth health={disk.health} />
                        </TableCell>
                        <TableCell className="text-text-secondary">
                          {disk.wearout != null ? `${disk.wearout}%` : '—'}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-text-muted">
                          {disk.serial ?? '—'}
                        </TableCell>                      <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                if (confirm(`Initialize (GPT) ${disk.devpath}? This will wipe all data!`)) {
                                  init.mutate({ disk: disk.devpath })
                                }
                              }}
                              disabled={init.isPending}
                              className="inline-flex items-center gap-1 rounded border border-border-subtle px-2 py-0.5 text-xs text-text-secondary hover:bg-bg-elevated disabled:opacity-50"
                            >
                              Init GPT
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Wipe disk ${disk.devpath}? ALL DATA WILL BE LOST!`)) {
                                  wipe.mutate(disk.devpath)
                                }
                              }}
                              disabled={wipe.isPending}
                              className="inline-flex items-center gap-1 rounded border border-status-error/40 px-2 py-0.5 text-xs text-status-error hover:bg-status-error/10 disabled:opacity-50"
                            >
                              Wipe
                            </button>
                          </div>
                        </TableCell>                    </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )
      )}

      {tab === 'zfs' && (
        <Card>
          {showCreate && (
            <CreateZFSForm node={node!} disks={diskPaths} onCancel={() => setShowCreate(false)} />
          )}
          <CardContent className="p-0">
            {zfsLoading ? (
              <div className="p-6 text-center text-text-muted text-sm">Loading ZFS pools…</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Alloc</TableHead>
                    <TableHead>Free</TableHead>
                    <TableHead>Scan</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(zfsPools ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-text-muted py-10">
                        No ZFS pools found. Use "Create Pool" to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (zfsPools ?? []).map((pool) => (
                      <TableRow key={pool.name}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Database className="size-3.5 text-text-muted shrink-0" />
                            <span className="font-mono text-sm text-text-primary">{pool.name}</span>
                          </div>
                        </TableCell>
                        <TableCell><ZFSPoolHealth state={pool.state} /></TableCell>
                        <TableCell className="tabular-nums text-text-secondary text-sm">
                          {pool.size ? formatBytes(pool.size) : '—'}
                        </TableCell>
                        <TableCell className="tabular-nums text-text-secondary text-sm">
                          {pool.alloc ? formatBytes(pool.alloc) : '—'}
                        </TableCell>
                        <TableCell className="tabular-nums text-text-secondary text-sm">
                          {pool.free ? formatBytes(pool.free) : '—'}
                        </TableCell>
                        <TableCell className="text-xs text-text-muted max-w-[180px] truncate">
                          {pool.scan ?? '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <button
                            onClick={() => scrub.mutate(pool.name)}
                            disabled={scrub.isPending}
                            className="inline-flex items-center gap-1 rounded border border-border-subtle px-2 py-0.5 text-xs text-text-secondary hover:bg-bg-elevated disabled:opacity-50"
                          >
                            <ShieldHalf className="size-3" />
                            Scrub
                          </button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
