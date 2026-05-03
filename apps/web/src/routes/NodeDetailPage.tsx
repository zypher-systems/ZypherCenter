import { useParams, Link } from 'react-router'
import { useState } from 'react'
import {
  Cpu,
  MemoryStick,
  HardDrive,
  Clock,
  Server,
  Activity,
  Power,
  RefreshCw,
} from 'lucide-react'
import { useNodeStatus, useNodePower, useNodeConfig, useUpdateNodeConfig, useNodeSubscription, useNodeHardwarePCI, useNodeZFSPools, useNodeDisks, useNodeStorage, useNodeTasks } from '@/lib/queries/nodes'
import { useVMs } from '@/lib/queries/vms'
import { useLXCs } from '@/lib/queries/lxc'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { ResourceGauge } from '@/components/ui/ResourceGauge'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { formatBytes, formatUptime, formatPercent, cn } from '@/lib/utils'
import { NodeResourceCharts } from '@/components/features/ResourceCharts'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { NotesPanel } from '@/components/features/NotesPanel'

import { NodeUpdatesCard } from '@/components/features/NodeUpdatesCard'

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { NodeShellPage } from './NodeShellPage'
import { NodeNetworkPage } from './NodeNetworkPage'
import { NodeDisksPage } from './NodeDisksPage'
import { NodeStoragePage } from './NodeStoragePage'
import { NodeUpdatesPage } from './NodeUpdatesPage'
import { NodeSyslogPage } from './NodeSyslogPage'
import { NodeTasksPage } from './NodeTasksPage'
import { NodeDNSPage } from './NodeDNSPage'
import { NodeTimePage } from './NodeTimePage'
import { NodeServicesPage } from './NodeServicesPage'
import { NodeFirewallPage } from './NodeFirewallPage'
import { NodeCertificatesPage } from './NodeCertificatesPage'
import { NodeCephPage } from './CephPage'
import { NodePCIPage } from './NodePCIPage'

function SummaryTab({ status, cpuPct, totalVMs, runningVMs, totalLXCs, runningLXCs, sub, tasks }: any) {
  const { node } = useParams<{ node: string }>()
  const { data: config } = useNodeConfig(node!)
  const updateConfig = useUpdateNodeConfig(node!)

  return (
    <div className="space-y-6">
      {/* Resource summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-text-muted font-medium">CPU</p>
              <Cpu className="size-4 text-text-muted" />
            </div>
            <p className="text-xl font-bold tracking-tight tabular-nums sm:text-2xl">{formatPercent(cpuPct)}</p>
            <p className="text-xs text-text-muted mt-0.5">
              {status.cpuinfo?.cores} cores · {status.cpuinfo?.sockets} socket{status.cpuinfo?.sockets !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-text-muted font-medium">Memory</p>
              <MemoryStick className="size-4 text-text-muted" />
            </div>
            <p className="text-xl font-bold tracking-tight tabular-nums sm:text-2xl truncate" title={formatBytes(status.memory.used)}>
              {formatBytes(status.memory.used)}
            </p>
            <p className="text-xs text-text-muted mt-0.5">of {formatBytes(status.memory.total)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-text-muted font-medium">Root FS</p>
              <HardDrive className="size-4 text-text-muted" />
            </div>
            <p className="text-xl font-bold tracking-tight tabular-nums sm:text-2xl truncate" title={formatBytes(status.rootfs.used)}>
              {formatBytes(status.rootfs.used)}
            </p>
            <p className="text-xs text-text-muted mt-0.5">of {formatBytes(status.rootfs.total)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-text-muted font-medium">Uptime</p>
              <Clock className="size-4 text-text-muted" />
            </div>
            <p className="text-xl font-bold tracking-tight sm:text-2xl truncate" title={formatUptime(status.uptime)}>{formatUptime(status.uptime)}</p>
            <p className="text-xs text-text-muted mt-0.5">
              Load: {status.loadavg.join(' · ')}
            </p>
          </CardContent>
        </Card>

        <NodeUpdatesCard node={node!} />
      </div>


      {/* Resource gauges + guest summary */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Resources</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <ResourceGauge label="CPU Usage" used={cpuPct} total={1} format="percent" />
            <ResourceGauge label="Memory" used={status.memory.used} total={status.memory.total} />
            <ResourceGauge label="Swap" used={status.swap.used} total={status.swap.total} />
            <ResourceGauge label="Root FS" used={status.rootfs.used} total={status.rootfs.total} />
          </CardContent>
        </Card>

        <NotesPanel
          notes={config?.description as string}
          onSave={(description) => updateConfig.mutate({ description })}
          isPending={updateConfig.isPending}
        />

        <Card className="lg:col-span-2 xl:col-span-1">
          <CardHeader><CardTitle>Guests</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <Activity className="size-4" />
                Virtual Machines
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-text-primary font-medium">{runningVMs}</span>
                <span className="text-text-muted">/ {totalVMs} running</span>
                <Link to={`/nodes/${node}/vms`} className="text-xs text-accent hover:underline">
                  View
                </Link>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <Activity className="size-4" />
                LXC Containers
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-text-primary font-medium">{runningLXCs}</span>
                <span className="text-text-muted">/ {totalLXCs} running</span>
                <Link to={`/nodes/${node}/lxc`} className="text-xs text-accent hover:underline">
                  View
                </Link>
              </div>
            </div>

            <div className="pt-2 border-t border-border-muted space-y-1 text-xs text-text-muted">
              <div className="flex justify-between">
                <span>Kernel</span>
                <span className="text-text-secondary font-mono">
                  {status.current_kernel?.release ?? status.kversion ?? '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>CPUs</span>
                <span className="text-text-secondary">
                  {status.cpuinfo?.cpus} CPUs ({status.cpuinfo?.sockets}S / {status.cpuinfo?.cores}C)
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subscription status */}
      {sub && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Subscription</CardTitle>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  sub.status === 'Active'
                    ? 'bg-status-running/10 text-status-running border border-status-running/20'
                    : sub.status === 'None'
                    ? 'bg-border-muted/30 text-text-muted border border-border-muted'
                    : 'bg-status-error/10 text-status-error border border-status-error/20'
                }`}
              >
                {sub.status}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-x-8 gap-y-1 text-xs sm:grid-cols-2 lg:grid-cols-4">
              {sub.productname && (
                <div className="flex justify-between gap-2">
                  <span className="text-text-muted">Product</span>
                  <span className="text-text-secondary font-medium">{sub.productname}</span>
                </div>
              )}
              {sub.level && (
                <div className="flex justify-between gap-2">
                  <span className="text-text-muted">Level</span>
                  <span className="text-text-secondary font-mono uppercase">{sub.level}</span>
                </div>
              )}
              {sub.nextduedate && (
                <div className="flex justify-between gap-2">
                  <span className="text-text-muted">Next Due</span>
                  <span className="text-text-secondary font-mono">{sub.nextduedate}</span>
                </div>
              )}
              {sub.key && (
                <div className="flex justify-between gap-2 min-w-0">
                  <span className="text-text-muted shrink-0">Key</span>
                  <span className="text-text-secondary font-mono truncate">{sub.key}</span>
                </div>
              )}
              {sub.status === 'None' && !sub.key && (
                <div className="col-span-full text-text-muted">
                  No subscription key registered for this node.
                </div>
              )}
              {sub.message && sub.status !== 'Active' && (
                <div className="col-span-full text-status-error">{sub.message}</div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance history */}
      <NodeResourceCharts node={node!} />

      {/* Recent Tasks */}
      {tasks && tasks.length > 0 && (() => {
        const taskList = tasks as Record<string, unknown>[]
        const recent = taskList.slice(0, 6)
        const runningCount = taskList.filter((t) => !t['exitstatus']).length
        return (
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="size-3.5 text-text-muted" />
                Recent Tasks
                {runningCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs text-status-migrating bg-status-migrating/10 rounded px-1.5 py-0.5">
                    <span className="inline-block size-1.5 rounded-full bg-status-migrating animate-pulse" />
                    {runningCount} running
                  </span>
                )}
              </CardTitle>
              <Link
                to={`/nodes/${node}/tasks`}
                className="text-xs text-accent hover:underline"
              >
                View all →
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border-muted">
                {recent.map((t: any) => {
                  const upid = t['upid'] as string
                  const type = t['type'] as string
                  const exitstatus = t['exitstatus'] as string | undefined
                  const starttime = t['starttime'] as number | undefined
                  const user = t['user'] as string | undefined
                  const statusColor = !exitstatus
                    ? 'text-status-migrating'
                    : exitstatus === 'OK'
                    ? 'text-status-running'
                    : 'text-status-error'
                  const statusDot = !exitstatus
                    ? 'bg-status-migrating animate-pulse'
                    : exitstatus === 'OK'
                    ? 'bg-status-running'
                    : 'bg-status-error'
                  return (
                    <div key={upid} className="flex items-center gap-3 px-4 py-2.5">
                      <span className={`inline-block size-1.5 rounded-full shrink-0 ${statusDot}`} />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-mono text-text-primary truncate block">{type}</span>
                        {user && <span className="text-xs text-text-muted">{user}</span>}
                      </div>
                      <div className="text-right shrink-0">
                        {starttime && (
                          <p className="text-xs text-text-muted tabular-nums">
                            {new Date(starttime * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                        <p className={`text-xs font-medium ${statusColor}`}>
                          {exitstatus ?? 'running'}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )
      })()}



    </div>
  )
}

export function NodeDetailPage() {
  const { node } = useParams<{ node: string }>()
  const { data: status, isLoading } = useNodeStatus(node!)
  const { data: vms } = useVMs(node!)
  const { data: lxcs } = useLXCs(node!)
  const nodePower = useNodePower(node!)
  const { data: sub } = useNodeSubscription(node!)
  const { data: tasks } = useNodeTasks(node!)
  
  const [confirmAction, setConfirmAction] = useState<'reboot' | 'shutdown' | null>(null)
  const [currentTab, setCurrentTab] = useState('summary')

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {[...Array(5)].map((_, i) => <SkeletonCard key={i} />)}
      </div>
    )
  }

  if (!status) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-bg-card">
        <p className="text-text-muted">No data available for node <strong>{node}</strong></p>
      </div>
    )
  }

  const cpuPct = status.cpu
  const totalVMs = vms?.length ?? 0
  const runningVMs = vms?.filter((v) => v.status === 'running').length ?? 0
  const totalLXCs = lxcs?.length ?? 0
  const runningLXCs = lxcs?.filter((l) => l.status === 'running').length ?? 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-bg-card border border-border">
          <Server className="size-5 text-text-muted" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-text-primary">{node}</h1>
          <p className="text-sm text-text-muted">
            {status.cpuinfo?.model ?? 'Unknown CPU'} · {status.pveversion ?? ''}
          </p>
        </div>
        <StatusBadge status="running" label="Online" className="ml-auto" />
        <button
          type="button"
          disabled={nodePower.isPending}
          onClick={() => setConfirmAction('reboot')}
          className="inline-flex items-center gap-1.5 rounded border border-border-subtle px-2.5 py-1.5 text-xs text-text-secondary hover:border-accent/50 hover:text-text-primary disabled:opacity-50"
        >
          <RefreshCw className="size-3.5" />
          Reboot
        </button>
        <button
          type="button"
          disabled={nodePower.isPending}
          onClick={() => setConfirmAction('shutdown')}
          className="inline-flex items-center gap-1.5 rounded border border-status-error/40 px-2.5 py-1.5 text-xs text-status-error hover:bg-status-error/10 disabled:opacity-50"
        >
          <Power className="size-3.5" />
          Shutdown
        </button>
      </div>

      <ConfirmDialog
        open={confirmAction !== null}
        onOpenChange={(open) => { if (!open) setConfirmAction(null) }}
        title={confirmAction === 'reboot' ? `Reboot node ${node}?` : `Shutdown node ${node}?`}
        description={confirmAction === 'shutdown' ? 'This will stop all guests.' : 'Are you sure you want to reboot this node?'}
        variant={confirmAction === 'shutdown' ? 'destructive' : 'default'}
        onConfirm={() => {
          if (confirmAction) {
            nodePower.mutate(confirmAction)
            setConfirmAction(null)
          }
        }}
      />

      <Tabs defaultValue="summary" value={currentTab} onValueChange={setCurrentTab} orientation="vertical" className="w-full flex flex-row gap-6">
        <TabsList className="bg-transparent p-0 flex-shrink-0">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="shell">Shell</TabsTrigger>
          <TabsTrigger value="network">Network</TabsTrigger>
          <TabsTrigger value="disks">Disks</TabsTrigger>
          <TabsTrigger value="storage">Storage</TabsTrigger>
          <TabsTrigger value="pci">PCIe</TabsTrigger>
          <TabsTrigger value="ceph">Ceph</TabsTrigger>
          <TabsTrigger value="updates">Updates</TabsTrigger>
          <TabsTrigger value="firewall">Firewall</TabsTrigger>
          <TabsTrigger value="certificates">Certificates</TabsTrigger>
          <TabsTrigger value="syslog">Syslog</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="dns">DNS</TabsTrigger>
          <TabsTrigger value="time">Time</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
        </TabsList>
        <div className="flex-1 min-w-0 overflow-y-auto">
          <TabsContent value="summary">
            <SummaryTab
              status={status}
              cpuPct={cpuPct}
              totalVMs={totalVMs}
              runningVMs={runningVMs}
              totalLXCs={totalLXCs}
              runningLXCs={runningLXCs}
              sub={sub}
              tasks={tasks}
            />
          </TabsContent>
          <TabsContent value="shell"><NodeShellPage /></TabsContent>
          <TabsContent value="network"><NodeNetworkPage /></TabsContent>
          <TabsContent value="disks"><NodeDisksPage /></TabsContent>
          <TabsContent value="storage"><NodeStoragePage /></TabsContent>
          <TabsContent value="pci"><NodePCIPage /></TabsContent>
          <TabsContent value="ceph"><NodeCephPage /></TabsContent>
          <TabsContent value="updates"><NodeUpdatesPage /></TabsContent>
          <TabsContent value="firewall"><NodeFirewallPage /></TabsContent>
          <TabsContent value="certificates"><NodeCertificatesPage /></TabsContent>
          <TabsContent value="syslog"><NodeSyslogPage /></TabsContent>
          <TabsContent value="tasks"><NodeTasksPage /></TabsContent>
          <TabsContent value="dns"><NodeDNSPage /></TabsContent>
          <TabsContent value="time"><NodeTimePage /></TabsContent>
          <TabsContent value="services"><NodeServicesPage /></TabsContent>
        </div>
      </Tabs>
    </div>
  )
}

