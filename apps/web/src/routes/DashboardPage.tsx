import { Link } from 'react-router'
import { Server, Monitor, Box, Database, CheckCircle, AlertCircle, Activity } from 'lucide-react'
import { useClusterResources, useClusterStatus } from '@/lib/queries/cluster'
import { useClusterTasks } from '@/lib/queries/tasks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ResourceGauge } from '@/components/ui/ResourceGauge'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { formatBytes, formatTimestamp } from '@/lib/utils'
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
        </CardContent>
      </Card>
    </Link>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { data: resources, isLoading: resLoading } = useClusterResources()
  const { data: status, isLoading: statusLoading } = useClusterStatus()
  const { data: tasks } = useClusterTasks()

  const nodes = resources?.filter((r) => r.type === 'node') ?? []
  const vms = resources?.filter((r) => r.type === 'qemu') ?? []
  const lxcs = resources?.filter((r) => r.type === 'lxc') ?? []
  const storages = resources?.filter((r) => r.type === 'storage') ?? []

  const runningVMs = vms.filter((v) => v.status === 'running').length
  const runningLXCs = lxcs.filter((l) => l.status === 'running').length
  const clusterInfo = status?.find((s) => s.type === 'cluster')
  const quorate = clusterInfo && 'quorate' in clusterInfo ? clusterInfo.quorate : undefined
  const recentTasks = tasks?.slice(0, 8) ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Datacenter Overview</h1>
        <p className="text-sm text-text-muted mt-0.5">
          {clusterInfo && 'name' in clusterInfo ? clusterInfo.name : 'Proxmox Cluster'}
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
        <StatCard label="Nodes" value={nodes.length} icon={<Server />} sub={`${nodes.filter(n => n.status !== 'offline').length} online`} />
        <StatCard label="Virtual Machines" value={vms.length} icon={<Monitor />} sub={`${runningVMs} running`} to="/vms" />
        <StatCard label="Containers" value={lxcs.length} icon={<Box />} sub={`${runningLXCs} running`} to="/lxc" />
        <StatCard label="Storage" value={storages.length} icon={<Database />} sub="configured" to="/storage" />
      </div>

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
                {recentTasks.map((task: Record<string, unknown>, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <Activity className="size-3.5 text-text-muted shrink-0" />
                      <span className="text-text-secondary truncate">
                        {String(task.type ?? '')} {String(task.id ?? '')}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      <span className="text-xs text-text-muted">
                        {task.starttime ? formatTimestamp(Number(task.starttime)) : ''}
                      </span>
                      <StatusBadge
                        status={task.exitstatus === 'OK' ? 'running' : task.exitstatus ? 'error' : 'paused'}
                        label={task.exitstatus ? String(task.exitstatus) : 'running'}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
