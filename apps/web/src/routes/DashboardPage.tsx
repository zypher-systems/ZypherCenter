import { Link } from 'react-router'
import { Server, Monitor, Box, Database, CheckCircle, AlertCircle, Activity, Cpu, MemoryStick, HardDrive, TrendingUp } from 'lucide-react'
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts'
import { useClusterResources, useClusterStatus } from '@/lib/queries/cluster'
import { useClusterTasks } from '@/lib/queries/tasks'
import { useNodeRrdData } from '@/lib/queries/nodes'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ResourceGauge } from '@/components/ui/ResourceGauge'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { formatBytes, formatPercent, formatTimestamp } from '@/lib/utils'
import type { ClusterResource } from '@zyphercenter/proxmox-types'

// ── Summary stat card ─────────────────────────────────────────────────────────

function StatCard({ label, value, icon, sub, to }: {
  label: string
  value: string | number
  icon: React.ReactNode
  sub?: string
  to?: string
}) {
  const inner = (
    <CardContent className="pt-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-text-muted font-medium">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-text-primary tabular-nums">{value}</p>
          {sub && <p className="text-xs text-text-muted mt-0.5">{sub}</p>}
        </div>
        <span className="text-text-muted [&_svg]:size-5">{icon}</span>
      </div>
    </CardContent>
  )
  if (to) {
    return (
      <Link to={to} className="block group">
        <Card className="transition-colors hover:border-accent/40">{inner}</Card>
      </Link>
    )
  }
  return <Card>{inner}</Card>
}

// ── Node chart sparkline ──────────────────────────────────────────────────────

function NodeCpuSparkline({ node }: { node: string }) {
  const { data } = useNodeRrdData(node, 'hour')
  if (!data || data.length < 2) return null

  const points = data
    .filter((d) => d.cpu != null)
    .map((d) => ({ t: d.time, cpu: Math.round((d.cpu ?? 0) * 1000) / 10 }))

  if (points.length < 2) return null

  return (
    <div className="h-10 w-full mt-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`cpu-grad-${node}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="rgb(234 88 12)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="rgb(234 88 12)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="cpu"
            stroke="rgb(234 88 12)"
            strokeWidth={1.5}
            fill={`url(#cpu-grad-${node})`}
            dot={false}
            isAnimationActive={false}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              return (
                <div className="rounded bg-bg-elevated border border-border px-2 py-1 text-xs text-text-secondary">
                  CPU {payload[0]?.value}%
                </div>
              )
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Node card ─────────────────────────────────────────────────────────────────

function NodeCard({ node }: { node: ClusterResource }) {
  const nodeName = node.node ?? node.name ?? node.id
  const isOnline = (node.status ?? '') !== 'offline'
  const cpuPct = node.cpu ?? 0
  const memUsed = node.mem ?? 0
  const memTotal = node.maxmem ?? 0
  const diskUsed = node.disk ?? 0
  const diskTotal = node.maxdisk ?? 0

  return (
    <Link to={`/nodes/${nodeName}`} className="block group">
      <Card className="transition-colors hover:border-accent/40">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="size-4 text-text-muted" />
              <CardTitle>{nodeName}</CardTitle>
            </div>
            <StatusBadge
              status={isOnline ? 'running' : 'stopped'}
              label={isOnline ? 'Online' : 'Offline'}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <ResourceGauge label="CPU" used={cpuPct} total={1} format="percent" />
          <ResourceGauge label="Memory" used={memUsed} total={memTotal} />
          <ResourceGauge label="Root FS" used={diskUsed} total={diskTotal} />
          <NodeCpuSparkline node={nodeName} />
        </CardContent>
      </Card>
    </Link>
  )
}

// ── Cluster aggregate resource bar ───────────────────────────────────────────

function ClusterResourceSummary({ nodes, storages }: { nodes: ClusterResource[]; storages: ClusterResource[] }) {
  const onlineNodes = nodes.filter((n) => n.status !== 'offline')

  const totalCpuCores  = onlineNodes.reduce((s, n) => s + (n.maxcpu ?? 0), 0)
  const usedCpuCores   = onlineNodes.reduce((s, n) => s + ((n.cpu ?? 0) * (n.maxcpu ?? 0)), 0)
  const totalRam       = onlineNodes.reduce((s, n) => s + (n.maxmem ?? 0), 0)
  const usedRam        = onlineNodes.reduce((s, n) => s + (n.mem ?? 0), 0)
  const totalDisk      = storages.reduce((s, st) => s + (st.maxdisk ?? 0), 0)
  const usedDisk       = storages.reduce((s, st) => s + (st.disk ?? 0), 0)

  if (onlineNodes.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="size-4 text-accent" />
          <CardTitle className="text-sm font-medium">Cluster Resources</CardTitle>
          <span className="ml-1 text-xs text-text-disabled">{onlineNodes.length} node{onlineNodes.length !== 1 ? 's' : ''} online</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-text-muted">
              <Cpu className="size-3.5" /> CPU
            </div>
            <ResourceGauge
              label=""
              used={usedCpuCores}
              total={totalCpuCores}
              format="count"
            />
            <p className="text-xs text-text-disabled tabular-nums">
              {usedCpuCores.toFixed(1)} / {totalCpuCores} vCPUs
              <span className="ml-1">({formatPercent(totalCpuCores > 0 ? usedCpuCores / totalCpuCores : 0)})</span>
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-text-muted">
              <MemoryStick className="size-3.5" /> Memory
            </div>
            <ResourceGauge label="" used={usedRam} total={totalRam} format="bytes" />
            <p className="text-xs text-text-disabled tabular-nums">
              {formatBytes(usedRam)} / {formatBytes(totalRam)}
              <span className="ml-1">({formatPercent(totalRam > 0 ? usedRam / totalRam : 0)})</span>
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-text-muted">
              <HardDrive className="size-3.5" /> Storage
            </div>
            <ResourceGauge label="" used={usedDisk} total={totalDisk} format="bytes" />
            <p className="text-xs text-text-disabled tabular-nums">
              {formatBytes(usedDisk)} / {formatBytes(totalDisk)}
              <span className="ml-1">({formatPercent(totalDisk > 0 ? usedDisk / totalDisk : 0)})</span>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Top resource consumers ────────────────────────────────────────────────────

function TopConsumers({ guests }: { guests: ClusterResource[] }) {
  const running = guests.filter((g) => g.status === 'running' && (g.cpu ?? 0) > 0)
  if (running.length === 0) return null

  const topCPU = [...running].sort((a, b) => ((b.cpu ?? 0) * (b.maxcpu ?? 1)) - ((a.cpu ?? 0) * (a.maxcpu ?? 1))).slice(0, 5)
  const topMem = [...running].sort((a, b) => (b.mem ?? 0) - (a.mem ?? 0)).slice(0, 5)

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {/* Top CPU */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Cpu className="size-3.5 text-text-muted" />
            <CardTitle className="text-sm font-medium">Top CPU Consumers</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border-muted">
            {topCPU.map((g) => {
              const name = g.name ?? `${g.type === 'qemu' ? 'VM' : 'CT'} ${g.vmid}`
              const pct  = (g.cpu ?? 0)
              const path = g.type === 'qemu'
                ? `/nodes/${g.node}/vms/${g.vmid}`
                : `/nodes/${g.node}/lxc/${g.vmid}`
              return (
                <Link key={g.id} to={path} className="flex items-center gap-3 px-4 py-2.5 hover:bg-bg-hover group">
                  <span className={`size-1.5 rounded-full shrink-0 ${g.type === 'qemu' ? 'bg-blue-400' : 'bg-purple-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate group-hover:text-accent">{name}</p>
                    <p className="text-xs text-text-disabled">{g.node}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold tabular-nums text-text-primary">{formatPercent(pct)}</p>
                    <p className="text-xs text-text-muted">{g.maxcpu} vCPU</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Top Memory */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <MemoryStick className="size-3.5 text-text-muted" />
            <CardTitle className="text-sm font-medium">Top Memory Consumers</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border-muted">
            {topMem.map((g) => {
              const name = g.name ?? `${g.type === 'qemu' ? 'VM' : 'CT'} ${g.vmid}`
              const pct  = g.maxmem ? (g.mem ?? 0) / g.maxmem : 0
              const path = g.type === 'qemu'
                ? `/nodes/${g.node}/vms/${g.vmid}`
                : `/nodes/${g.node}/lxc/${g.vmid}`
              return (
                <Link key={g.id} to={path} className="flex items-center gap-3 px-4 py-2.5 hover:bg-bg-hover group">
                  <span className={`size-1.5 rounded-full shrink-0 ${g.type === 'qemu' ? 'bg-blue-400' : 'bg-purple-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate group-hover:text-accent">{name}</p>
                    <p className="text-xs text-text-disabled">{g.node}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold tabular-nums text-text-primary">{formatBytes(g.mem ?? 0)}</p>
                    <p className="text-xs text-text-muted">{formatPercent(pct)}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { data: resources, isLoading: resLoading } = useClusterResources()
  const { data: status, isLoading: statusLoading } = useClusterStatus()
  const { data: tasks } = useClusterTasks()

  const nodes    = resources?.filter((r) => r.type === 'node')    ?? []
  const vms      = resources?.filter((r) => r.type === 'qemu')    ?? []
  const lxcs     = resources?.filter((r) => r.type === 'lxc')     ?? []
  const storages = resources?.filter((r) => r.type === 'storage') ?? []
  const guests   = [...vms, ...lxcs]

  const runningVMs  = vms.filter((v) => v.status === 'running').length
  const runningLXCs = lxcs.filter((l) => l.status === 'running').length
  const stoppedVMs  = vms.length - runningVMs
  const stoppedLXCs = lxcs.length - runningLXCs
  const clusterInfo = status?.find((s) => s.type === 'cluster')
  const quorate     = clusterInfo && 'quorate' in clusterInfo ? clusterInfo.quorate : undefined
  const recentTasks = tasks?.slice(0, 8) ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Datacenter Overview</h1>
        <p className="text-sm text-text-muted mt-0.5">
          {clusterInfo && 'name' in clusterInfo ? String(clusterInfo.name) : 'Proxmox Cluster'}
          {quorate != null && (
            <span className={`ml-2 inline-flex items-center gap-1 text-xs ${quorate ? 'text-status-running' : 'text-status-error'}`}>
              {quorate ? <CheckCircle className="size-3" /> : <AlertCircle className="size-3" />}
              {quorate ? 'Quorate' : 'No Quorum'}
            </span>
          )}
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Nodes"
          value={nodes.length}
          icon={<Server />}
          sub={`${nodes.filter(n => n.status !== 'offline').length} online`}
        />
        <StatCard
          label="Virtual Machines"
          value={vms.length}
          icon={<Monitor />}
          sub={`${runningVMs} running · ${stoppedVMs} stopped`}
          to="/vms"
        />
        <StatCard
          label="Containers"
          value={lxcs.length}
          icon={<Box />}
          sub={`${runningLXCs} running · ${stoppedLXCs} stopped`}
          to="/lxc"
        />
        <StatCard
          label="Storage Pools"
          value={storages.length}
          icon={<Database />}
          sub={`${storages.filter(s => s.status === 'available').length} available`}
          to="/storage"
        />
      </div>

      {/* Cluster aggregate */}
      {!resLoading && (
        <ClusterResourceSummary nodes={nodes} storages={storages} />
      )}

      {/* Node cards */}
      <div>
        <h2 className="text-sm font-medium text-text-secondary mb-3">Nodes</h2>
        {resLoading || statusLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {nodes.map((node) => (
              <NodeCard key={node.id} node={node} />
            ))}
          </div>
        )}
      </div>

      {/* Top consumers */}
      {!resLoading && guests.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-text-secondary mb-3">Resource Consumers</h2>
          <TopConsumers guests={guests} />
        </div>
      )}

      {/* Recent tasks */}
      {recentTasks.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-text-secondary">Recent Tasks</h2>
            <Link to="/tasks" className="text-xs text-accent hover:text-accent-hover">
              View all
            </Link>
          </div>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border-muted">
                {recentTasks.map((task: Record<string, unknown>, i) => {
                  const isOk      = task.exitstatus === 'OK'
                  const isRunning = !task.exitstatus
                  const isError   = !!task.exitstatus && !isOk
                  return (
                    <div key={i} className="flex items-center justify-between px-4 py-3 text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <Activity className="size-3.5 text-text-muted shrink-0" />
                        <div className="min-w-0">
                          <p className="text-text-secondary truncate">
                            <span className="font-medium text-text-primary">{String(task.type ?? '')}</span>
                            {task.id != null && <span className="ml-1 font-mono text-xs text-text-muted">{String(task.id)}</span>}
                          </p>
                          <p className="text-xs text-text-disabled">{String(task.node ?? '')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-4">
                        <span className="text-xs text-text-muted tabular-nums">
                          {task.starttime ? formatTimestamp(Number(task.starttime)) : ''}
                        </span>
                        <StatusBadge
                          status={isOk ? 'running' : isRunning ? 'paused' : 'error'}
                          label={isRunning ? 'running' : isOk ? 'OK' : String(task.exitstatus)}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
