import { useParams, Link } from 'react-router'
import {
  Cpu,
  MemoryStick,
  HardDrive,
  Clock,
  Server,
  Activity,
} from 'lucide-react'
import { useNodeStatus } from '@/lib/queries/nodes'
import { useVMs } from '@/lib/queries/vms'
import { useLXCs } from '@/lib/queries/lxc'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { ResourceGauge } from '@/components/ui/ResourceGauge'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { formatBytes, formatUptime, formatPercent } from '@/lib/utils'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

export function NodeSummaryPage() {
  const { node } = useParams<{ node: string }>()
  const { data: status, isLoading } = useNodeStatus(node!)
  const { data: vms } = useVMs(node!)
  const { data: lxcs } = useLXCs(node!)

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
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
      </div>

      {/* Resource summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-text-muted font-medium">CPU</p>
              <Cpu className="size-4 text-text-muted" />
            </div>
            <p className="text-2xl font-semibold tabular-nums">{formatPercent(cpuPct)}</p>
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
            <p className="text-2xl font-semibold tabular-nums">{formatBytes(status.memory.used)}</p>
            <p className="text-xs text-text-muted mt-0.5">of {formatBytes(status.memory.total)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-text-muted font-medium">Root FS</p>
              <HardDrive className="size-4 text-text-muted" />
            </div>
            <p className="text-2xl font-semibold tabular-nums">{formatBytes(status.rootfs.used)}</p>
            <p className="text-xs text-text-muted mt-0.5">of {formatBytes(status.rootfs.total)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-text-muted font-medium">Uptime</p>
              <Clock className="size-4 text-text-muted" />
            </div>
            <p className="text-2xl font-semibold">{formatUptime(status.uptime)}</p>
            <p className="text-xs text-text-muted mt-0.5">
              Load: {status.loadavg.join(' · ')}
            </p>
          </CardContent>
        </Card>
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

        <Card>
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
    </div>
  )
}
