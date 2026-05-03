import { Server, Activity, Cpu, MemoryStick, HardDrive } from 'lucide-react'
import { Link } from 'react-router'
import { useClusterResources } from '@/lib/queries/cluster'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ResourceGauge } from '@/components/ui/ResourceGauge'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { useQueries } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { ResponsiveContainer, AreaChart, Area, Tooltip } from 'recharts'

function NodeCpuSparkline({ node }: { node: string }) {
  const { data } = useQueries({
    queries: [
      {
        queryKey: ['nodes', node, 'rrddata', 'hour'],
        queryFn: () => api.get<any[]>(`nodes/${node}/rrddata?timeframe=hour&cf=AVERAGE`),
        refetchInterval: 30_000,
      }
    ]
  })[0]

  if (!data || data.length < 2) return <div className="h-10 mt-2" />

  const points = data
    .filter((d) => d.cpu != null)
    .map((d) => ({ t: d.time, cpu: Math.round((d.cpu ?? 0) * 1000) / 10 }))

  return (
    <div className="h-10 w-full mt-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points}>
          <defs>
            <linearGradient id={`cpu-grad-list-${node}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="rgb(234 88 12)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="rgb(234 88 12)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="cpu"
            stroke="rgb(234 88 12)"
            strokeWidth={1.5}
            fill={`url(#cpu-grad-list-${node})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function NodeCard({ node }: { node: any }) {
  const nodeName = node.node ?? node.name ?? node.id
  const isOnline = (node.status ?? '') !== 'offline'
  const cpuPct = node.cpu ?? 0
  const memUsed = node.mem ?? 0
  const memTotal = node.maxmem ?? 0
  const diskUsed = node.disk ?? 0
  const diskTotal = node.maxdisk ?? 0

  return (
    <Link to={`/nodes/${nodeName}`} className="block group">
      <Card className="transition-all hover:border-accent/40 hover:shadow-lg hover:shadow-accent/5">
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

export function NodeListPage() {
  const { data: resources, isLoading } = useClusterResources()
  const nodes = resources?.filter((r) => r.type === 'node') ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
          <Server className="size-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-text-primary tracking-tight">Nodes</h1>
          <p className="text-sm text-text-muted mt-0.5">
            Manage and monitor your cluster nodes
          </p>
        </div>
      </div>

      {isLoading ? (
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
  )
}
