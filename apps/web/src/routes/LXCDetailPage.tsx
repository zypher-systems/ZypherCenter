import { useState } from 'react'
import { useParams, Link } from 'react-router'
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
  Plus,
  Trash2,
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
} from '@/lib/queries/lxc'
import { useClusterBackupJobs, useClusterResources } from '@/lib/queries/cluster'
import { useNodeTasksFiltered } from '@/lib/queries/nodes'
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
  const inp = 'w-full rounded border border-border-subtle bg-bg-input px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent'

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

  const relatedJobs = (jobs ?? []).filter((j) => {
    if (!j.vmid) return true
    return String(j.vmid).split(',').map(Number).includes(vmid)
  })

  return (
    <div className="space-y-4">
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

function SummaryTab({ node, vmid }: { node: string; vmid: number }) {
  const { data: status } = useLXCStatus(node, vmid)
  if (!status) return null

  const stats: { label: string; value: string }[] = [
    { label: 'Status', value: status.status },
    ...(status.uptime ? [{ label: 'Uptime', value: formatUptime(status.uptime) }] : []),
    ...(status.cpus ? [{ label: 'CPUs', value: String(status.cpus) }] : []),
  ]

  return (
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
    </div>
  )
}

function ConfigTab({ node, vmid }: { node: string; vmid: number }) {
  const { data: config, isLoading } = useLXCConfig(node, vmid)

  if (isLoading) return <SkeletonCard />
  if (!config) return null

  // Static fields to show first
  const staticFields = ['hostname', 'ostype', 'arch', 'cores', 'memory', 'swap', 'rootfs', 'description']
  // Network and mount keys
  const netKeys = Object.keys(config as Record<string, unknown>).filter((k) => /^net\d+$/.test(k))
  const mpKeys = Object.keys(config as Record<string, unknown>).filter((k) => /^mp\d+$/.test(k))

  const cfgRecord = config as Record<string, unknown>

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            {staticFields
              .filter((k) => cfgRecord[k] != null)
              .map((k) => (
                <div key={k} className="flex flex-col">
                  <dt className="text-text-muted capitalize">{k}</dt>
                  <dd className="text-text-primary font-medium break-all">
                    {String(cfgRecord[k])}
                  </dd>
                </div>
              ))}
          </dl>
        </CardContent>
      </Card>

      {netKeys.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Network</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              {netKeys.map((k) => (
                <div key={k}>
                  <dt className="text-text-muted font-medium mb-1">{k}</dt>
                  <dd className="text-text-primary font-mono text-xs break-all bg-bg-elevated rounded px-2 py-1">
                    {String(cfgRecord[k])}
                  </dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      )}

      {mpKeys.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Mount Points</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              {mpKeys.map((k) => (
                <div key={k}>
                  <dt className="text-text-muted font-medium mb-1">{k}</dt>
                  <dd className="text-text-primary font-mono text-xs break-all bg-bg-elevated rounded px-2 py-1">
                    {String(cfgRecord[k])}
                  </dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ── Options tab ──────────────────────────────────────────────────────────────

function LXCOptionsTab({ node, vmid }: { node: string; vmid: number }) {
  const { data: config } = useLXCConfig(node, vmid)
  if (!config) return null

  const cfgRecord = config as Record<string, unknown>

  const rows: { key: string; label: string; fmt?: (v: unknown) => string }[] = [
    { key: 'onboot',       label: 'Start at boot',     fmt: (v) => v ? 'Yes' : 'No' },
    { key: 'protection',   label: 'Protection',         fmt: (v) => v ? 'Enabled' : 'Disabled' },
    { key: 'unprivileged', label: 'Unprivileged',       fmt: (v) => v ? 'Yes' : 'No' },
    { key: 'timezone',     label: 'Timezone',           fmt: (v) => String(v ?? '—') },
    { key: 'startup',      label: 'Startup order',      fmt: (v) => String(v ?? '—') },
    { key: 'tags',         label: 'Tags',               fmt: (v) => String(v ?? '—') },
    { key: 'description',  label: 'Description',        fmt: (v) => String(v ?? '—') },
    { key: 'hookscript',   label: 'Hook script',        fmt: (v) => String(v ?? '—') },
    { key: 'hostname',     label: 'Hostname',           fmt: (v) => String(v ?? '—') },
    { key: 'lock',         label: 'Lock',               fmt: (v) => String(v ?? '—') },
    { key: 'features',     label: 'Features',           fmt: (v) => String(v ?? '—') },
  ]

  return (
    <Card>
      <CardHeader><CardTitle>Container Options</CardTitle></CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border-muted">
          {rows.map(({ key, label, fmt }) => {
            const val = cfgRecord[key]
            if (val == null) return null
            return (
              <div key={key} className="flex items-start justify-between px-4 py-2.5 text-sm gap-4">
                <span className="text-text-muted shrink-0">{label}</span>
                <span className="text-text-primary text-right font-medium break-all">
                  {fmt ? fmt(val) : String(val)}
                </span>
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

  const { data: nodes } = useClusterResources('node')
  const { data: nextId } = useNextVMId()

  const isRunning = status?.status === 'running'
  const isStopped = status?.status === 'stopped'

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
              <select className="w-full rounded-md border border-border-muted bg-bg-input px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent" value={migrTarget} onChange={(e) => setMigrTarget(e.target.value)}>
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
            <Button size="sm" onClick={() => start.mutate()} disabled={start.isPending}>
              <Play className="size-4 mr-1.5" />
              Start
            </Button>
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
