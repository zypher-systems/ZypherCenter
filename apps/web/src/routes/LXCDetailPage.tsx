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
} from '@/lib/queries/lxc'
import { useClusterBackupJobs } from '@/lib/queries/cluster'
import { useNodeTasksFiltered } from '@/lib/queries/nodes'
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
  const enabled = options?.enable === 1
  return (
    <div className="space-y-4">
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
          <CardTitle className="text-sm font-medium">
            Rules
            <span className="ml-2 text-xs font-normal text-text-muted">{rules?.length ?? 0} rule{rules?.length !== 1 ? 's' : ''}</span>
          </CardTitle>
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

function SnapshotsTab({ node, vmid }: { node: string; vmid: number }) {
  const { data: snapshots, isLoading } = useLXCSnapshots(node, vmid)

  if (isLoading) return <SkeletonCard />

  const snaps = snapshots?.filter((s) => s.name !== 'current') ?? []

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {snaps.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-text-muted py-10">
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
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

export function LXCDetailPage() {
  const { node, vmid: vmidParam } = useParams<{ node: string; vmid: string }>()
  const vmid = Number(vmidParam)
  const { data: status, isLoading } = useLXCStatus(node!, vmid)

  const start = useLXCStart(node!, vmid)
  const stop = useLXCStop(node!, vmid)
  const shutdown = useLXCShutdown(node!, vmid)
  const reboot = useLXCReboot(node!, vmid)

  const isRunning = status?.status === 'running'
  const isStopped = status?.status === 'stopped'

  return (
    <div className="space-y-4">
      {/* Header */}
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
