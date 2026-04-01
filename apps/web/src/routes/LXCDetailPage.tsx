import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router'
import {
  Play,
  Square,
  RotateCcw,
  Power,
  Terminal,
  Camera,
  HardDrive,
  Settings,
  ChevronLeft,
  Activity,
  Archive,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
} from 'lucide-react'
import {
  useLXCStatus,
  useLXCConfig,
  useLXCSnapshots,
  useLXCStart,
  useLXCStop,
  useLXCShutdown,
  useLXCReboot,
  useLXCFirewallRules,
  useLXCFirewallOptions,
  useCreateLXCFirewallRule,
  useDeleteLXCFirewallRule,
  useCreateLXCSnapshot,
  useDeleteLXCSnapshot,
  useRollbackLXCSnapshot,
  useMigrateLXC,
  useCloneLXC,
  useUpdateLXCConfig,
  useDeleteLXC,
  useResizeLXCDisk,
  useTemplateLXC,
} from '@/lib/queries/lxc'
import { useClusterBackupJobs, useClusterResources } from '@/lib/queries/cluster'
import { useNodeTasksFiltered, useVzdump, useNodeNetwork } from '@/lib/queries/nodes'
import { useStorage } from '@/lib/queries/storage'
import { useNextVMId } from '@/lib/queries/vms'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { ResourceGauge } from '@/components/ui/ResourceGauge'
import { SkeletonCard } from '@/components/ui/Skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table'
import { formatBytes, formatPercent, formatUptime, formatTimestamp } from '@/lib/utils'
import { ResourceCharts } from '@/components/features/ResourceCharts'

// ── Firewall tab ────────────────────────────────────────────────────────────────────────

function FWActionBadge({ action }: { action: string }) {
  const color =
    action === 'ACCEPT' ? 'text-status-running bg-status-running/10' :
    action === 'DROP'   ? 'text-status-error bg-status-error/10' :
    action === 'REJECT' ? 'text-status-stopped bg-status-stopped/10' :
                          'text-text-muted bg-bg-elevated'
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color}`}>{action}</span>
}

function LXCFirewallTab({ node, vmid }: { node: string; vmid: number }) {
  const { data: rules   } = useLXCFirewallRules(node, vmid)
  const { data: options } = useLXCFirewallOptions(node, vmid)
  const createRule = useCreateLXCFirewallRule(node, vmid)
  const deleteRule = useDeleteLXCFirewallRule(node, vmid)
  const [showAdd, setShowAdd] = useState(false)
  const [dir, setDir] = useState('in')
  const [action, setAction] = useState('ACCEPT')
  const [macro, setMacro] = useState('')
  const [proto, setProto] = useState('')
  const [src, setSrc] = useState('')
  const [dest, setDest] = useState('')
  const [dport, setDport] = useState('')
  const [comment, setComment] = useState('')
  const enabled = options?.enable === 1
  const inp = 'w-full rounded border border-border-subtle bg-bg-input px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent [color-scheme:dark]'

  function submitRule() {
    createRule.mutate(
      { type: dir, action, macro: macro || undefined, proto: proto || undefined, source: src || undefined, dest: dest || undefined, dport: dport || undefined, enable: 1 },
      { onSuccess: () => { setShowAdd(false); setMacro(''); setSrc(''); setDest(''); setDport(''); setComment('') } }
    )
  }

  return (
    <div className="space-y-4">
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-bg-card border border-border-subtle rounded-xl shadow-2xl w-full max-w-md p-6 space-y-3">
            <h2 className="text-base font-semibold text-text-primary">Add Firewall Rule</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-text-secondary mb-1">Direction</label>
                <select value={dir} onChange={(e) => setDir(e.target.value)} className={inp}>
                  <option value="in">IN</option><option value="out">OUT</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">Action</label>
                <select value={action} onChange={(e) => setAction(e.target.value)} className={inp}>
                  <option>ACCEPT</option><option>DROP</option><option>REJECT</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Macro (optional)</label>
              <input value={macro} onChange={(e) => setMacro(e.target.value)} placeholder="SSH, HTTP, HTTPS…" className={inp} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-text-secondary mb-1">Source</label>
                <input value={src} onChange={(e) => setSrc(e.target.value)} placeholder="any" className={inp} />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">Dest</label>
                <input value={dest} onChange={(e) => setDest(e.target.value)} placeholder="any" className={inp} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-text-secondary mb-1">Protocol</label>
                <select value={proto} onChange={(e) => setProto(e.target.value)} className={inp}>
                  <option value="">any</option><option value="tcp">tcp</option><option value="udp">udp</option><option value="icmp">icmp</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">Dest Port</label>
                <input value={dport} onChange={(e) => setDport(e.target.value)} placeholder="80,443" className={inp} />
              </div>
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Comment</label>
              <input value={comment} onChange={(e) => setComment(e.target.value)} className={inp} />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button size="sm" onClick={submitRule} disabled={createRule.isPending}>
                <Plus className="size-3.5 mr-1" />{createRule.isPending ? 'Adding…' : 'Add Rule'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {options && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Firewall Status</CardTitle>
              <span className={`text-xs font-medium px-2 py-0.5 rounded ${enabled ? 'bg-status-running/10 text-status-running' : 'bg-bg-elevated text-text-muted'}`}>
                {enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border-muted">
              {(['policy_in', 'policy_out'] as const).map((key) => {
                const val = options[key]
                if (!val) return null
                return (
                  <div key={key} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <span className="text-text-muted">{key === 'policy_in' ? 'Default policy (in)' : 'Default policy (out)'}</span>
                    <FWActionBadge action={val} />
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">
              Rules
              <span className="ml-2 text-xs font-normal text-text-muted">{rules?.length ?? 0} rule{rules?.length !== 1 ? 's' : ''}</span>
            </CardTitle>
            <Button size="sm" onClick={() => setShowAdd(true)}>
              <Plus className="size-3.5 mr-1" />Add Rule
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {!rules?.length ? (
            <p className="text-center text-text-muted text-sm py-10">No firewall rules defined</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Dir</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Macro / Proto</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Dest</TableHead>
                  <TableHead>Port</TableHead>
                  <TableHead>Comment</TableHead>
                  <TableHead className="w-10">On</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.pos} className={rule.enable === 0 ? 'opacity-40' : ''}>
                    <TableCell className="font-mono text-xs text-text-muted">{rule.pos}</TableCell>
                    <TableCell><span className="text-xs uppercase font-medium text-text-secondary">{rule.type}</span></TableCell>
                    <TableCell><FWActionBadge action={rule.action} /></TableCell>
                    <TableCell className="text-text-secondary text-sm">{rule.macro ?? rule.proto ?? '—'}</TableCell>
                    <TableCell className="font-mono text-xs text-text-secondary">{rule.source ?? '—'}</TableCell>
                    <TableCell className="font-mono text-xs text-text-secondary">{rule.dest ?? '—'}</TableCell>
                    <TableCell className="font-mono text-xs text-text-secondary">{rule.dport ?? rule.sport ?? '—'}</TableCell>
                    <TableCell className="text-text-muted text-xs max-w-[180px] truncate">{rule.comment ?? ''}</TableCell>
                    <TableCell>
                      <span className={`inline-block size-2 rounded-full ${rule.enable !== 0 ? 'bg-status-running' : 'bg-border'}`} />
                    </TableCell>
                    <TableCell className="text-right">
                      <button
                        onClick={() => { if (confirm(`Delete rule #${rule.pos}?`)) deleteRule.mutate(rule.pos) }}
                        disabled={deleteRule.isPending}
                        className="inline-flex items-center gap-1 rounded border border-status-error/40 px-2 py-0.5 text-xs text-status-error hover:bg-status-error/10 disabled:opacity-50"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ── Backups tab ────────────────────────────────────────────────────────────────────────

function LXCBackupsTab({ node, vmid }: { node: string; vmid: number }) {
  const { data: jobs  } = useClusterBackupJobs()
  const { data: tasks } = useNodeTasksFiltered(node, { vmid, typefilter: 'vzdump', limit: 20 })
  const { data: allStorages } = useStorage()
  const vzdump = useVzdump(node)

  const [showBackupForm, setShowBackupForm] = useState(false)
  const [bkStorage, setBkStorage] = useState('')
  const [bkMode, setBkMode] = useState('snapshot')
  const [bkCompress, setBkCompress] = useState('zstd')

  const backupStorages = (allStorages ?? []).filter((s) =>
    s.content?.split(',').map((c) => c.trim()).includes('backup')
  )

  function runBackup() {
    if (!bkStorage) return
    vzdump.mutate(
      { vmid, storage: bkStorage, mode: bkMode, compress: bkCompress },
      { onSuccess: () => setShowBackupForm(false) }
    )
  }

  const relatedJobs = (jobs ?? []).filter((j) => {
    if (!j.vmid) return true
    return String(j.vmid).split(',').map(Number).includes(vmid)
  })

  return (
    <div className="space-y-4">
      {/* Backup Now */}
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={() => setShowBackupForm((v) => !v)}>
          <Archive className="size-3.5 mr-1.5" />{showBackupForm ? 'Cancel' : 'Backup Now'}
        </Button>
      </div>
      {showBackupForm && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">On-Demand Backup</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-text-muted mb-1">Storage</label>
                <select
                  value={bkStorage}
                  onChange={(e) => setBkStorage(e.target.value)}
                  className="w-full rounded border border-border bg-bg-card text-text-primary text-sm px-2 py-1.5 [color-scheme:dark]"
                >
                  <option value="">— select —</option>
                  {backupStorages.map((s) => (
                    <option key={s.storage} value={s.storage}>{s.storage}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">Mode</label>
                <select
                  value={bkMode}
                  onChange={(e) => setBkMode(e.target.value)}
                  className="w-full rounded border border-border bg-bg-card text-text-primary text-sm px-2 py-1.5 [color-scheme:dark]"
                >
                  <option value="snapshot">Snapshot</option>
                  <option value="suspend">Suspend</option>
                  <option value="stop">Stop</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">Compression</label>
                <select
                  value={bkCompress}
                  onChange={(e) => setBkCompress(e.target.value)}
                  className="w-full rounded border border-border bg-bg-card text-text-primary text-sm px-2 py-1.5 [color-scheme:dark]"
                >
                  <option value="zstd">zstd (fast)</option>
                  <option value="lzo">lzo (faster)</option>
                  <option value="gzip">gzip (best)</option>
                  <option value="0">None</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end">
              <Button size="sm" disabled={!bkStorage || vzdump.isPending} onClick={runBackup}>
                {vzdump.isPending ? 'Starting…' : 'Start Backup'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Scheduled Backup Jobs</CardTitle></CardHeader>
        <CardContent className="p-0">
          {!relatedJobs.length ? (
            <p className="text-center text-text-muted text-sm py-8">No scheduled backup jobs include this container</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job ID</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Storage</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Enabled</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {relatedJobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-mono text-sm">{job.id}</TableCell>
                    <TableCell className="text-text-secondary">{job.schedule ?? job.dow ?? '—'}</TableCell>
                    <TableCell className="text-text-secondary">{job.storage}</TableCell>
                    <TableCell>
                      <span className="text-xs uppercase tracking-wide text-text-muted bg-bg-elevated px-2 py-0.5 rounded">
                        {job.mode ?? 'snapshot'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs ${!job.enabled || job.enabled === 1 ? 'text-status-running' : 'text-text-disabled'}`}>
                        {!job.enabled || job.enabled === 1 ? 'Yes' : 'No'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Recent Backup Tasks</CardTitle></CardHeader>
        <CardContent className="p-0">
          {!tasks?.length ? (
            <p className="text-center text-text-muted text-sm py-8">No recent backup tasks</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Start Time</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => {
                  const upid = task['upid'] as string
                  const st = task['starttime'] as number
                  const et = task['endtime'] as number | undefined
                  const es = task['exitstatus'] as string | undefined
                  const ok = es === 'OK'
                  return (
                    <TableRow key={upid}>
                      <TableCell className="text-sm text-text-secondary tabular-nums">{formatTimestamp(st)}</TableCell>
                      <TableCell className="text-sm text-text-muted">{et ? formatUptime(et - st) : '—'}</TableCell>
                      <TableCell className="text-sm text-text-muted">{task['user'] as string ?? '—'}</TableCell>
                      <TableCell>
                        {!es ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-status-migrating">
                            <span className="size-1.5 rounded-full bg-status-migrating animate-pulse" />Running
                          </span>
                        ) : (
                          <span className={`inline-flex items-center gap-1.5 text-xs ${ok ? 'text-status-running' : 'text-status-error'}`}>
                            <span className={`size-1.5 rounded-full ${ok ? 'bg-status-running' : 'bg-status-error'}`} />
                            {es}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function LXCNotesCard({ node, vmid }: { node: string; vmid: number }) {
  const { data: config } = useLXCConfig(node, vmid)
  const updateConfig = useUpdateLXCConfig(node, vmid)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const notes = (config?.description as string | undefined) ?? ''

  function startEdit() { setDraft(notes); setEditing(true) }
  function cancel() { setEditing(false) }
  function save() {
    updateConfig.mutate({ description: draft }, { onSuccess: () => setEditing(false) })
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Notes</CardTitle>
          {!editing ? (
            <button onClick={startEdit} className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-accent">
              <Pencil className="size-3" />Edit
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={cancel} className="text-xs text-text-muted hover:text-text-secondary"><X className="size-3.5" /></button>
              <button onClick={save} disabled={updateConfig.isPending} className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent-hover disabled:opacity-50">
                <Check className="size-3" />{updateConfig.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {editing ? (
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={5}
            className="w-full rounded border border-border-subtle bg-bg-input px-3 py-2 text-sm text-text-primary outline-none focus:border-accent resize-y font-mono"
            placeholder="Add notes…"
            autoFocus
          />
        ) : notes ? (
          <pre className="text-sm text-text-secondary whitespace-pre-wrap font-sans leading-relaxed">{notes}</pre>
        ) : (
          <p className="text-sm text-text-disabled italic">No notes — click Edit to add</p>
        )}
      </CardContent>
    </Card>
  )
}

function SummaryTab({ node, vmid }: { node: string; vmid: number }) {
  const { data: status } = useLXCStatus(node, vmid)
  const { data: config } = useLXCConfig(node, vmid)
  const updateConfig = useUpdateLXCConfig(node, vmid)
  const [addingTag, setAddingTag] = useState(false)
  const [newTag, setNewTag] = useState('')
  if (!status) return null

  const tags = (config?.tags as string | undefined)?.split(/[;,]/).map((t) => t.trim()).filter(Boolean) ?? []

  function removeTag(tag: string) {
    const next = tags.filter((t) => t !== tag).join(';')
    updateConfig.mutate({ tags: next })
  }

  function commitTag() {
    const t = newTag.trim()
    if (t && !tags.includes(t)) {
      updateConfig.mutate({ tags: [...tags, t].join(';') })
    }
    setNewTag('')
    setAddingTag(false)
  }

  const stats: { label: string; value: string }[] = [
    { label: 'Status', value: status.status },
    ...(status.uptime ? [{ label: 'Uptime', value: formatUptime(status.uptime) }] : []),
    ...(status.cpus ? [{ label: 'CPUs', value: String(status.cpus) }] : []),
    ...(status.netin != null ? [{ label: 'Net In', value: formatBytes(status.netin) }] : []),
    ...(status.netout != null ? [{ label: 'Net Out', value: formatBytes(status.netout) }] : []),
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5 flex-wrap">
        {tags.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent border border-accent/20">
            {tag}
            <button onClick={() => removeTag(tag)} disabled={updateConfig.isPending} className="opacity-60 hover:opacity-100 disabled:opacity-30">
              <X className="size-3" />
            </button>
          </span>
        ))}
        {addingTag ? (
          <span className="inline-flex items-center gap-1">
            <input
              autoFocus
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') commitTag(); if (e.key === 'Escape') { setAddingTag(false); setNewTag('') } }}
              className="rounded border border-border-subtle bg-bg-input px-2 py-0.5 text-xs text-text-primary outline-none focus:border-accent w-24"
              placeholder="tag name"
            />
            <button onClick={commitTag} disabled={updateConfig.isPending} className="text-xs text-accent hover:opacity-80 disabled:opacity-30">
              <Check className="size-3" />
            </button>
            <button onClick={() => { setAddingTag(false); setNewTag('') }} className="text-xs text-text-muted hover:opacity-80">
              <X className="size-3" />
            </button>
          </span>
        ) : (
          <button onClick={() => setAddingTag(true)} className="inline-flex items-center gap-0.5 rounded-full border border-dashed border-border-subtle px-2 py-0.5 text-xs text-text-muted hover:border-accent hover:text-accent">
            <Plus className="size-3" /> tag
          </button>
        )}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Resources</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {status.cpu != null && (
              <ResourceGauge label="CPU" used={status.cpu} total={1} format="percent" />
            )}
            {status.mem != null && status.maxmem != null && (
              <ResourceGauge label="Memory" used={status.mem} total={status.maxmem} />
            )}
            {status.disk != null && status.maxdisk != null && (
              <ResourceGauge label="Disk" used={status.disk} total={status.maxdisk} />
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Info</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2">
                {stats.map(({ label, value }) => (
                  <div key={label} className="flex justify-between text-sm">
                    <dt className="text-text-muted">{label}</dt>
                    <dd className="text-text-primary font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
          <LXCNotesCard node={node} vmid={vmid} />
        </div>
      </div>
    </div>
  )
}

function ConfigTab({ node, vmid }: { node: string; vmid: number }) {
  const { data: config, isLoading } = useLXCConfig(node, vmid)
  const updateConfig = useUpdateLXCConfig(node, vmid)
  const resizeDisk = useResizeLXCDisk(node, vmid)
  const { data: allStorages } = useStorage()
  const { data: nodeNetwork } = useNodeNetwork(node)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [resizingKey, setResizingKey] = useState<string | null>(null)
  const [resizeAmount, setResizeAmount] = useState('+10G')
  const [showAddMp, setShowAddMp] = useState(false)
  const [addMpStorage, setAddMpStorage] = useState('')
  const [addMpSize, setAddMpSize] = useState('8')
  const [addMpPath, setAddMpPath] = useState('')
  const [showAddNet, setShowAddNet] = useState(false)
  const [addNetBridge, setAddNetBridge] = useState('')
  const [addNetIp, setAddNetIp] = useState('dhcp')
  const [addNetIp6, setAddNetIp6] = useState('auto')
  const [addNetTag, setAddNetTag] = useState('')

  if (isLoading) return <SkeletonCard />
  if (!config) return null

  const cfgRecord = config as Record<string, unknown>

  // Storages that support rootdir (LXC volumes)
  const mpStorages = (allStorages ?? []).filter(
    (s) => s.content?.split(',').map((c) => c.trim()).some((c) => ['rootdir', 'images', 'dir'].includes(c))
  )

  function getNextMpKey() {
    const existing = Object.keys(cfgRecord).filter((k) => /^mp\d+$/.test(k)).map((k) => parseInt(k.slice(2), 10))
    for (let i = 0; i <= 255; i++) { if (!existing.includes(i)) return `mp${i}` }
    return 'mp0'
  }

  function addMountPoint() {
    if (!addMpStorage || !addMpPath) return
    const key = getNextMpKey()
    updateConfig.mutate(
      { [key]: `${addMpStorage}:${addMpSize},mp=${addMpPath}` },
      { onSuccess: () => { setShowAddMp(false); setAddMpStorage(''); setAddMpSize('8'); setAddMpPath('') } }
    )
  }

  // Editable numeric/text fields
  const editableFields: { key: string; label: string; type?: string }[] = [
    { key: 'hostname',    label: 'Hostname' },
    { key: 'cores',       label: 'CPU Cores',      type: 'number' },
    { key: 'memory',      label: 'Memory (MiB)',    type: 'number' },
    { key: 'swap',        label: 'Swap (MiB)',      type: 'number' },
    { key: 'description', label: 'Description' },
    { key: 'ostype',      label: 'OS Type' },
  ]

  // Read-only fields (rootfs gets its own resize UI)
  const readonlyFields = ['arch']

  const bridges = (nodeNetwork ?? []).filter((n) => n.type === 'bridge').map((n) => n.iface).filter(Boolean)

  function addNetInterface() {
    if (!addNetBridge) return
    const existingNets = Object.keys(cfgRecord).filter((k) => /^net\d+$/.test(k)).map((k) => parseInt(k.slice(3), 10))
    const nextIdx = existingNets.length ? Math.max(...existingNets) + 1 : 0
    const key = `net${nextIdx}`
    const name = `eth${nextIdx}`
    let val = `name=${name},bridge=${addNetBridge},ip=${addNetIp},ip6=${addNetIp6}`
    if (addNetTag) val += `,tag=${addNetTag}`
    updateConfig.mutate(
      { [key]: val },
      { onSuccess: () => { setShowAddNet(false); setAddNetBridge(''); setAddNetTag('') } }
    )
  }

  // Network and mount keys
  const netKeys = Object.keys(cfgRecord).filter((k) => /^net\d+$/.test(k))
  const mpKeys = Object.keys(cfgRecord).filter((k) => /^(mp\d+|rootfs)$/.test(k))

  function startEdit(key: string) {
    setEditingKey(key)
    setEditValue(cfgRecord[key] != null ? String(cfgRecord[key]) : '')
  }
  function cancelEdit() { setEditingKey(null); setEditValue('') }
  function saveEdit(key: string) {
    updateConfig.mutate({ [key]: editValue }, { onSuccess: cancelEdit })
  }

  function parseNetConfig(str: string): Record<string, string> {
    return Object.fromEntries(
      String(str).split(',').map((seg) => { const i = seg.indexOf('='); return i === -1 ? [seg, ''] : [seg.slice(0, i), seg.slice(i + 1)] })
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>General</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border-muted">
            {editableFields.filter(({ key }) => cfgRecord[key] != null).map(({ key, label, type }) => {
              const isEditing = editingKey === key
              return (
                <div key={key} className="flex items-center justify-between px-4 py-2.5 text-sm gap-4">
                  <span className="text-text-muted shrink-0">{label}</span>
                  {isEditing ? (
                    <div className="flex items-center gap-1.5 flex-1 justify-end">
                      <input
                        autoFocus
                        type={type ?? 'text'}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(key); if (e.key === 'Escape') cancelEdit() }}
                        className="w-full max-w-xs rounded border border-border-subtle bg-bg-input px-2 py-0.5 text-sm text-text-primary outline-none focus:border-accent"
                      />
                      <button onClick={() => saveEdit(key)} disabled={updateConfig.isPending} className="text-status-running hover:opacity-80 disabled:opacity-50">
                        <Check className="size-3.5" />
                      </button>
                      <button onClick={cancelEdit} className="text-text-muted hover:opacity-80">
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-text-primary font-medium break-all">{String(cfgRecord[key])}</span>
                      <button onClick={() => startEdit(key)} className="text-text-muted hover:text-text-primary">
                        <Pencil className="size-3" />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
            {readonlyFields.filter((k) => cfgRecord[k] != null).map((k) => (
              <div key={k} className="flex items-center justify-between px-4 py-2.5 text-sm gap-4">
                <span className="text-text-muted shrink-0 capitalize">{k}</span>
                <span className="text-text-primary font-medium break-all">{String(cfgRecord[k])}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {(netKeys.length > 0 || true) && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Network</CardTitle>
              <button
                onClick={() => setShowAddNet((v) => !v)}
                className="flex items-center gap-1 text-xs text-text-muted hover:text-accent border border-border-subtle rounded px-2 py-1"
              >
                <Plus className="size-3" /> {showAddNet ? 'Cancel' : 'Add Interface'}
              </button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {showAddNet && (
              <div className="flex flex-wrap items-end gap-2 px-4 py-3 border-b border-border-muted bg-bg-elevated">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-text-muted">Bridge</label>
                  {bridges.length > 0 ? (
                    <select
                      value={addNetBridge}
                      onChange={(e) => setAddNetBridge(e.target.value)}
                      className="rounded border border-border-subtle bg-bg-input px-2 py-1 text-xs text-text-primary outline-none [color-scheme:dark]"
                    >
                      <option value="">Select…</option>
                      {bridges.map((b) => <option key={b} value={b}>{b}</option>)}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={addNetBridge}
                      onChange={(e) => setAddNetBridge(e.target.value)}
                      placeholder="vmbr0"
                      className="w-24 rounded border border-border-subtle bg-bg-input px-2 py-1 text-xs text-text-primary outline-none focus:border-accent"
                    />
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-text-muted">IPv4</label>
                  <select
                    value={addNetIp}
                    onChange={(e) => setAddNetIp(e.target.value)}
                    className="rounded border border-border-subtle bg-bg-input px-2 py-1 text-xs text-text-primary outline-none [color-scheme:dark]"
                  >
                    <option value="dhcp">dhcp</option>
                    <option value="manual">manual</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-text-muted">IPv6</label>
                  <select
                    value={addNetIp6}
                    onChange={(e) => setAddNetIp6(e.target.value)}
                    className="rounded border border-border-subtle bg-bg-input px-2 py-1 text-xs text-text-primary outline-none [color-scheme:dark]"
                  >
                    <option value="auto">auto</option>
                    <option value="dhcp">dhcp</option>
                    <option value="manual">manual</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-text-muted">VLAN Tag</label>
                  <input
                    type="number"
                    min={1}
                    max={4094}
                    value={addNetTag}
                    onChange={(e) => setAddNetTag(e.target.value)}
                    placeholder="none"
                    className="w-20 rounded border border-border-subtle bg-bg-input px-2 py-1 text-xs text-text-primary outline-none focus:border-accent [color-scheme:dark]"
                  />
                </div>
                <Button size="sm" disabled={updateConfig.isPending || !addNetBridge} onClick={addNetInterface}>
                  {updateConfig.isPending ? '…' : 'Add'}
                </Button>
                <button onClick={() => setShowAddNet(false)} className="text-text-muted hover:text-text-primary text-xs">Cancel</button>
              </div>
            )}
            <div className="divide-y divide-border-muted">
              {netKeys.map((k) => {
                const isEditing = editingKey === k
                return (
                  <div key={k} className="flex items-center justify-between px-4 py-2.5 text-sm gap-4">
                    <span className="text-text-muted shrink-0 font-medium">{k}</span>
                    {isEditing ? (
                      <div className="flex items-center gap-1.5 flex-1 justify-end">
                        <input
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(k); if (e.key === 'Escape') cancelEdit() }}
                          className="w-full rounded border border-border-subtle bg-bg-input px-2 py-0.5 text-xs font-mono text-text-primary outline-none focus:border-accent"
                        />
                        <button onClick={() => saveEdit(k)} disabled={updateConfig.isPending} className="text-status-running hover:opacity-80 disabled:opacity-50">
                          <Check className="size-3.5" />
                        </button>
                        <button onClick={cancelEdit} className="text-text-muted hover:opacity-80">
                          <X className="size-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                        {(() => {
                          const parsed = parseNetConfig(String(cfgRecord[k]))
                          const labels: [string, string][] = [
                            ['name', 'Interface'],
                            ['bridge', 'Bridge'],
                            ['hwaddr', 'MAC'],
                            ['ip', 'IPv4'],
                            ['ip6', 'IPv6'],
                            ['tag', 'VLAN'],
                            ['rate', 'Rate'],
                          ]
                          return (
                            <>
                              <div className="flex flex-wrap gap-x-4 gap-y-1">
                                {labels.filter(([key]) => parsed[key]).map(([key, label]) => (
                                  <span key={key} className="text-xs">
                                    <span className="text-text-muted">{label}: </span>
                                    <span className="text-text-primary font-medium">{parsed[key]}</span>
                                  </span>
                                ))}
                                {parsed.firewall === '1' && (
                                  <span className="text-xs text-status-running">Firewall</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-text-muted font-mono text-xs truncate opacity-50">{String(cfgRecord[k])}</span>
                                <button onClick={() => startEdit(k)} className="text-text-muted hover:text-text-primary shrink-0">
                                  <Pencil className="size-3" />
                                </button>
                              </div>
                            </>
                          )
                        })()}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {mpKeys.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Disks &amp; Mount Points</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setShowAddMp((v) => !v)}>
                <Plus className="size-3.5 mr-1" />{showAddMp ? 'Cancel' : 'Add MP'}
              </Button>
            </div>
          </CardHeader>
          {showAddMp && (
            <div className="px-4 pb-3 flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs text-text-muted mb-1">Storage</label>
                <select value={addMpStorage} onChange={(e) => setAddMpStorage(e.target.value)}
                  className="rounded border border-border-subtle bg-bg-input px-2 py-1.5 text-sm text-text-primary outline-none focus:border-accent [color-scheme:dark]">
                  <option value="">— select —</option>
                  {mpStorages.map((s) => <option key={s.storage} value={s.storage}>{s.storage}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">Size (GiB)</label>
                <input type="number" min={1} value={addMpSize} onChange={(e) => setAddMpSize(e.target.value)}
                  className="w-20 rounded border border-border-subtle bg-bg-input px-2 py-1.5 text-sm text-text-primary outline-none focus:border-accent" />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">Mount Path</label>
                <input type="text" value={addMpPath} onChange={(e) => setAddMpPath(e.target.value)}
                  placeholder="/mnt/data"
                  className="w-36 rounded border border-border-subtle bg-bg-input px-2 py-1.5 text-sm text-text-primary outline-none focus:border-accent" />
              </div>
              <Button size="sm" disabled={updateConfig.isPending || !addMpStorage || !addMpPath} onClick={addMountPoint}>
                {updateConfig.isPending ? '…' : 'Add'}
              </Button>
            </div>
          )}
          <CardContent className="p-0">
            <div className="divide-y divide-border-muted">
              {mpKeys.map((k) => {
                const isResizing = resizingKey === k
                return (
                  <div key={k} className="space-y-2 px-4 py-2.5 text-sm">
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-text-muted shrink-0 font-medium">{k}</span>
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <span className="text-text-primary font-mono text-xs break-all flex-1">{String(cfgRecord[k])}</span>
                        <button
                          onClick={() => { setResizingKey(isResizing ? null : k); setResizeAmount('+10G') }}
                          className="shrink-0 text-xs text-text-muted hover:text-accent border border-border-subtle rounded px-1.5 py-0.5"
                        >
                          Resize
                        </button>
                        {k !== 'rootfs' && (
                          <button
                            onClick={() => { if (confirm(`Detach ${k}? The volume will remain in storage.`)) updateConfig.mutate({ delete: k }) }}
                            className="shrink-0 text-xs text-text-muted hover:text-status-error border border-border-subtle rounded px-1.5 py-0.5"
                          >
                            Detach
                          </button>
                        )}
                      </div>
                    </div>
                    {isResizing && (
                      <div className="flex items-center gap-2 pl-16">
                        <input
                          autoFocus
                          value={resizeAmount}
                          onChange={(e) => setResizeAmount(e.target.value)}
                          placeholder="+10G"
                          className="w-24 rounded border border-border-subtle bg-bg-input px-2 py-0.5 text-xs text-text-primary outline-none focus:border-accent"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') resizeDisk.mutate({ disk: k, size: resizeAmount }, { onSuccess: () => setResizingKey(null) })
                            if (e.key === 'Escape') setResizingKey(null)
                          }}
                        />
                        <Button size="sm" disabled={resizeDisk.isPending}
                          onClick={() => resizeDisk.mutate({ disk: k, size: resizeAmount }, { onSuccess: () => setResizingKey(null) })}>
                          {resizeDisk.isPending ? '…' : 'Apply'}
                        </Button>
                        <button onClick={() => setResizingKey(null)} className="text-text-muted hover:text-text-primary text-xs">Cancel</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ── Options tab ──────────────────────────────────────────────────────────────

function LXCOptionsTab({ node, vmid }: { node: string; vmid: number }) {
  const { data: config } = useLXCConfig(node, vmid)
  const updateConfig = useUpdateLXCConfig(node, vmid)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  if (!config) return null

  const cfgRecord = config as Record<string, unknown>

  // Boolean toggles
  const boolOpts: { key: string; label: string }[] = [
    { key: 'onboot',       label: 'Start at boot' },
    { key: 'protection',   label: 'Protection' },
    { key: 'unprivileged', label: 'Unprivileged' },
  ]

  // Text-editable options
  const textOpts: { key: string; label: string }[] = [
    { key: 'description', label: 'Description' },
    { key: 'tags',        label: 'Tags' },
    { key: 'hookscript',  label: 'Hook script' },
    { key: 'hostname',    label: 'Hostname' },
    { key: 'timezone',    label: 'Timezone' },
  ]

  // Read-only options
  const readOpts: { key: string; label: string }[] = [
    { key: 'startup', label: 'Startup order' },
    { key: 'lock',    label: 'Lock' },
  ]

  // Parse features string into a set of enabled features
  const featuresStr = cfgRecord.features ? String(cfgRecord.features) : ''
  const featuresMap: Record<string, string> = {}
  featuresStr.split(',').forEach((seg) => {
    const [k, v] = seg.split('=')
    if (k) featuresMap[k.trim()] = v ?? '1'
  })

  const FEATURES = [
    { key: 'nesting', label: 'Nesting', desc: 'Allow nested containers (Docker)' },
    { key: 'keyctl',  label: 'Keyctl',  desc: 'Allow use of keyctl()' },
    { key: 'fuse',    label: 'FUSE',    desc: 'Allow use of FUSE mounts' },
    { key: 'mknod',   label: 'Mknod',   desc: 'Allow mknod for device files' },
  ]

  function toggleFeature(key: string) {
    const nextMap = { ...featuresMap }
    if (nextMap[key]) { delete nextMap[key] } else { nextMap[key] = '1' }
    const next = Object.entries(nextMap).map(([k, v]) => `${k}=${v}`).join(',')
    updateConfig.mutate({ features: next || undefined })
  }

  function startEdit(key: string) {
    setEditingKey(key)
    setEditValue(cfgRecord[key] != null ? String(cfgRecord[key]) : '')
  }
  function cancelEdit() { setEditingKey(null); setEditValue('') }
  function saveEdit(key: string) {
    updateConfig.mutate({ [key]: editValue }, { onSuccess: cancelEdit })
  }
  function toggleBool(key: string) {
    updateConfig.mutate({ [key]: cfgRecord[key] ? 0 : 1 })
  }

  return (
    <Card>
      <CardHeader><CardTitle>Container Options</CardTitle></CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border-muted">
          {boolOpts.map(({ key, label }) => {
            const isOn = !!cfgRecord[key]
            return (
              <div key={key} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="text-text-muted">{label}</span>
                <button
                  onClick={() => toggleBool(key)}
                  disabled={updateConfig.isPending}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${isOn ? 'bg-accent' : 'bg-border-muted'}`}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${isOn ? 'translate-x-4' : 'translate-x-1'}`} />
                </button>
              </div>
            )
          })}
          {textOpts.map(({ key, label }) => {
            const isEditing = editingKey === key
            const val = cfgRecord[key]
            return (
              <div key={key} className="flex items-center justify-between px-4 py-2.5 text-sm gap-4">
                <span className="text-text-muted shrink-0">{label}</span>
                {isEditing ? (
                  <div className="flex items-center gap-1.5 flex-1 justify-end">
                    <input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(key); if (e.key === 'Escape') cancelEdit() }}
                      className="w-full max-w-xs rounded border border-border-subtle bg-bg-input px-2 py-0.5 text-sm text-text-primary outline-none focus:border-accent"
                    />
                    <button onClick={() => saveEdit(key)} disabled={updateConfig.isPending} className="text-status-running hover:opacity-80 disabled:opacity-50">
                      <Check className="size-3.5" />
                    </button>
                    <button onClick={cancelEdit} className="text-text-muted hover:opacity-80">
                      <X className="size-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-text-primary text-right break-all">{val != null ? String(val) : '—'}</span>
                    <button onClick={() => startEdit(key)} className="text-text-muted hover:text-text-primary">
                      <Pencil className="size-3" />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
          {readOpts.map(({ key, label }) => {
            const val = cfgRecord[key]
            if (val == null) return null
            return (
              <div key={key} className="flex items-start justify-between px-4 py-2.5 text-sm gap-4">
                <span className="text-text-muted shrink-0">{label}</span>
                <span className="text-text-primary text-right break-all">{String(val)}</span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function SnapshotsTab({ node, vmid }: { node: string; vmid: number }) {
  const { data: snapshots, isLoading } = useLXCSnapshots(node, vmid)
  const createSnap = useCreateLXCSnapshot(node, vmid)
  const deleteSnap = useDeleteLXCSnapshot(node, vmid)
  const rollbackSnap = useRollbackLXCSnapshot(node, vmid)

  const [showForm, setShowForm] = useState(false)
  const [snapname, setSnapname] = useState('')
  const [description, setDescription] = useState('')

  function handleCreate() {
    if (!snapname.trim()) return
    createSnap.mutate(
      { snapname: snapname.trim(), description: description.trim() || undefined },
      {
        onSuccess: () => {
          setSnapname('')
          setDescription('')
          setShowForm(false)
        },
      }
    )
  }

  if (isLoading) return <SkeletonCard />

  const snaps = snapshots?.filter((s) => s.name !== 'current') ?? []

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent/90"
        >
          <Camera className="size-3.5" />
          Take Snapshot
        </button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>New Snapshot</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="block text-xs text-text-muted mb-1">Name *</label>
              <input
                className="w-full rounded-md border border-border-muted bg-bg-input px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
                placeholder="snapshot-name"
                value={snapname}
                onChange={(e) => setSnapname(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Description</label>
              <input
                className="w-full rounded-md border border-border-muted bg-bg-input px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
                placeholder="Optional description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={createSnap.isPending || !snapname.trim()}
                className="inline-flex items-center rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
              >
                {createSnap.isPending ? 'Creating…' : 'Create'}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="inline-flex items-center rounded-md border border-border-muted px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-hover"
              >
                Cancel
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Date</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {snaps.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-text-muted py-10">
                    No snapshots
                  </TableCell>
                </TableRow>
              ) : (
                snaps.map((s) => (
                  <TableRow key={s.name}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-text-muted">{s.description ?? '—'}</TableCell>
                    <TableCell className="text-text-secondary tabular-nums">
                      {s.snaptime ? formatTimestamp(s.snaptime) : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-1.5">
                        <button
                          onClick={() => rollbackSnap.mutate(s.name)}
                          disabled={rollbackSnap.isPending}
                          className="inline-flex items-center gap-1 rounded border border-border-muted px-2 py-0.5 text-xs text-text-secondary hover:bg-bg-hover disabled:opacity-50"
                        >
                          <RotateCcw className="size-3" />
                          Rollback
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete snapshot "${s.name}"?`)) deleteSnap.mutate(s.name)
                          }}
                          disabled={deleteSnap.isPending}
                          className="inline-flex items-center gap-1 rounded border border-status-error/40 px-2 py-0.5 text-xs text-status-error hover:bg-status-error/10 disabled:opacity-50"
                        >
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
    </div>
  )
}

export function LXCDetailPage() {
  const { node, vmid: vmidParam } = useParams<{ node: string; vmid: string }>()
  const vmid = Number(vmidParam)
  const { data: status, isLoading } = useLXCStatus(node!, vmid)
  const [showMigrate, setShowMigrate] = useState(false)
  const [showClone, setShowClone] = useState(false)

  const start = useLXCStart(node!, vmid)
  const stop = useLXCStop(node!, vmid)
  const shutdown = useLXCShutdown(node!, vmid)
  const reboot = useLXCReboot(node!, vmid)
  const migrate = useMigrateLXC(node!, vmid)
  const clone = useCloneLXC(node!, vmid)
  const deleteLXC = useDeleteLXC(node!)
  const navigate = useNavigate()

  const { data: nodes } = useClusterResources('node')
  const { data: nextId } = useNextVMId()

  const isRunning = status?.status === 'running'
  const isStopped = status?.status === 'stopped'
  const isTemplate = !!(status as Record<string, unknown> | undefined)?.template
  const convertToTemplate = useTemplateLXC(node!, vmid)

  const otherNodes = (nodes ?? []).map((n) => n.node).filter((n) => n && n !== node)

  // ── Migrate state
  const [migrTarget, setMigrTarget] = useState('')
  // ── Clone state
  const [cloneId, setCloneId] = useState('')
  const [cloneName, setCloneName] = useState('')

  return (
    <div className="space-y-4">
      {/* Migrate modal */}
      {showMigrate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowMigrate(false)}>
          <div className="bg-bg-card border border-border-muted rounded-xl p-6 w-full max-w-sm shadow-xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-semibold text-text-primary">Migrate CT {vmid}</h2>
            <div>
              <label className="block text-xs text-text-muted mb-1">Target Node *</label>
              <select className="w-full rounded-md border border-border-muted bg-bg-input px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent [color-scheme:dark]" value={migrTarget} onChange={(e) => setMigrTarget(e.target.value)}>
                <option value="">Select node…</option>
                {otherNodes.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            {isRunning && <p className="text-xs text-status-migrating">Container is running — online migration will be attempted.</p>}
            <div className="flex gap-2">
              <button onClick={() => { if (migrTarget) migrate.mutate({ target: migrTarget, online: isRunning ? 1 : 0 }, { onSuccess: () => setShowMigrate(false) }) }} disabled={migrate.isPending || !migrTarget} className="flex-1 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50">
                {migrate.isPending ? 'Migrating…' : 'Migrate'}
              </button>
              <button onClick={() => setShowMigrate(false)} className="flex-1 rounded-md border border-border-muted px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-hover">Cancel</button>
            </div>
          </div>
        </div>
      )}
      {/* Clone modal */}
      {showClone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowClone(false)}>
          <div className="bg-bg-card border border-border-muted rounded-xl p-6 w-full max-w-sm shadow-xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-semibold text-text-primary">Clone CT {vmid}</h2>
            <div>
              <label className="block text-xs text-text-muted mb-1">New CT ID *</label>
              <input className="w-full rounded-md border border-border-muted bg-bg-input px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent" type="number" placeholder={String(nextId ?? '')} value={cloneId} onChange={(e) => setCloneId(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Hostname</label>
              <input className="w-full rounded-md border border-border-muted bg-bg-input px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent" placeholder="Optional hostname" value={cloneName} onChange={(e) => setCloneName(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <button onClick={() => { const id = Number(cloneId); if (id) clone.mutate({ newid: id, hostname: cloneName.trim() || undefined }, { onSuccess: () => setShowClone(false) }) }} disabled={clone.isPending || !cloneId} className="flex-1 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50">
                {clone.isPending ? 'Cloning…' : 'Clone'}
              </button>
              <button onClick={() => setShowClone(false)} className="flex-1 rounded-md border border-border-muted px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-hover">Cancel</button>
            </div>
          </div>
        </div>
      )}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" asChild>
            <Link to={`/nodes/${node}/lxc`}>
              <ChevronLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-text-primary">
                {isLoading ? `CT ${vmid}` : (status?.name ?? `CT ${vmid}`)}
              </h1>
              {status && <StatusBadge status={status.status} />}
            </div>
            <p className="text-sm text-text-muted mt-0.5">
              Container {vmid} · {node}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isStopped && (
            <>
              <Button size="sm" onClick={() => start.mutate()} disabled={start.isPending}>
                <Play className="size-4 mr-1.5" />
                Start
              </Button>
              {!isTemplate && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={convertToTemplate.isPending}
                  onClick={() => {
                    if (confirm(`Convert CT ${vmid} to a template? This cannot be undone.`)) {
                      convertToTemplate.mutate()
                    }
                  }}
                >
                  To Template
                </Button>
              )}
              <Button
                variant="destructive"
                size="sm"
                disabled={deleteLXC.isPending}
                onClick={() => {
                  if (confirm(`Delete container ${vmid} (${status?.name ?? ''})? This cannot be undone.`)) {
                    deleteLXC.mutate({ vmid, purge: true }, { onSuccess: () => navigate(`/nodes/${node}/lxc`) })
                  }
                }}
              >
                <Trash2 className="size-4 mr-1.5" />
                Delete
              </Button>
            </>
          )}
          {isRunning && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => shutdown.mutate()}
                disabled={shutdown.isPending}
              >
                <Power className="size-4 mr-1.5" />
                Shutdown
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => reboot.mutate()}
                disabled={reboot.isPending}
              >
                <RotateCcw className="size-4 mr-1.5" />
                Reboot
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => stop.mutate()}
                disabled={stop.isPending}
              >
                <Square className="size-4 mr-1.5" />
                Stop
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to={`/nodes/${node}/lxc/${vmid}/console`}>
                  <Terminal className="size-4 mr-1.5" />
                  Console
                </Link>
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowMigrate(true)}>
                Migrate
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowClone(true)}>
                Clone
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="summary">
        <TabsList>
          <TabsTrigger value="summary">
            <HardDrive className="size-3.5 mr-1.5" />
            Summary
          </TabsTrigger>
          <TabsTrigger value="perf">
            <Activity className="size-3.5 mr-1.5" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="config">
            <Settings className="size-3.5 mr-1.5" />
            Config
          </TabsTrigger>
          <TabsTrigger value="options">
            <Settings className="size-3.5 mr-1.5" />
            Options
          </TabsTrigger>
          <TabsTrigger value="snapshots">
            <Camera className="size-3.5 mr-1.5" />
            Snapshots
          </TabsTrigger>
          <TabsTrigger value="backups">
            <HardDrive className="size-3.5 mr-1.5" />
            Backups
          </TabsTrigger>
          <TabsTrigger value="firewall">
            <Settings className="size-3.5 mr-1.5" />
            Firewall
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          <SummaryTab node={node!} vmid={vmid} />
        </TabsContent>
        <TabsContent value="perf">
          <ResourceCharts node={node!} vmid={vmid} type="lxc" />
        </TabsContent>
        <TabsContent value="config">
          <ConfigTab node={node!} vmid={vmid} />
        </TabsContent>
        <TabsContent value="options">
          <LXCOptionsTab node={node!} vmid={vmid} />
        </TabsContent>
        <TabsContent value="snapshots">
          <SnapshotsTab node={node!} vmid={vmid} />
        </TabsContent>
        <TabsContent value="backups">
          <LXCBackupsTab node={node!} vmid={vmid} />
        </TabsContent>
        <TabsContent value="firewall">
          <LXCFirewallTab node={node!} vmid={vmid} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
