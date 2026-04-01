import { useState } from 'react'
import { useParams, Link } from 'react-router'
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
import { useNodeStatus, useNodeRrdData, useNodePower, useNodeSubscription } from '@/lib/queries/nodes'
import { useVMs } from '@/lib/queries/vms'
import { useLXCs } from '@/lib/queries/lxc'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { ResourceGauge } from '@/components/ui/ResourceGauge'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { formatBytes, formatUptime, formatPercent, cn } from '@/lib/utils'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

// ── Node performance history section ──────────────────────────────────────────────────

type NTF = 'hour' | 'day'
const NTF_OPTS: { v: NTF; l: string }[] = [
  { v: 'hour', l: '1h' }, { v: 'day', l: '24h' },
]

function fmtNTs(ts: number, tf: NTF) {
  const d = new Date(ts * 1000)
  return tf === 'hour' || tf === 'day'
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

const NT: React.CSSProperties = {
  background: 'rgb(15 15 18)', border: '1px solid rgb(39 39 50)',
  borderRadius: '6px', fontSize: '11px', color: 'rgb(228 228 235)', padding: '6px 10px',
}
const NAX = { fontSize: 9, fill: 'rgb(113 113 122)' }

function NodePerfSection({ node }: { node: string }) {
  const [tf, setTf] = useState<NTF>('hour')
  const { data } = useNodeRrdData(node, tf)
  const raw = data ?? []
  const step = raw.length > 120 ? Math.ceil(raw.length / 120) : 1
  const pts = step > 1 ? raw.filter((_, i) => i % step === 0) : raw
  const xFmt = (v: number) => fmtNTs(v, tf)

  const cpuPts = pts.map((p) => ({ t: p.time, v: +((p.cpu ?? 0) * 100).toFixed(2) }))
  const memPts = pts.map((p) => ({ t: p.time, used: p.memused ?? 0, total: p.maxmem ?? 0 }))
  const netPts = pts.map((p) => ({ t: p.time, i: p.netin ?? 0, o: p.netout ?? 0 }))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-text-secondary">Performance History</h2>
        <div className="flex gap-1">
          {NTF_OPTS.map((t) => (
            <button
              key={t.v}
              onClick={() => setTf(t.v)}
              className={cn(
                'px-3 py-1 rounded-md text-xs font-medium transition-colors',
                tf === t.v ? 'bg-accent text-white' : 'text-text-muted hover:text-text-secondary hover:bg-bg-hover',
              )}
            >
              {t.l}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* CPU */}
        <Card>
          <CardHeader className="pb-1.5"><CardTitle className="text-sm font-medium">CPU Usage</CardTitle></CardHeader>
          <CardContent>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cpuPts} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gNdCPU" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="rgb(234 88 12)"  stopOpacity={0.25} />
                      <stop offset="95%" stopColor="rgb(234 88 12)"  stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="t" tickFormatter={xFmt} tick={NAX} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis domain={[0, 100]} tick={NAX} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                  <Tooltip contentStyle={NT} formatter={(v) => [`${(v as number).toFixed(1)}%`, 'CPU']} labelFormatter={(l) => fmtNTs(l as number, tf)} />
                  <Area type="monotone" dataKey="v" stroke="rgb(234 88 12)" strokeWidth={1.5} fill="url(#gNdCPU)" dot={false} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Memory */}
        <Card>
          <CardHeader className="pb-1.5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Memory</CardTitle>
              <div className="flex items-center gap-3">
                {[{ color: 'rgb(56 189 248)', label: 'Used' }, { color: 'rgb(71 85 105)', label: 'Total' }].map(({ color, label }) => (
                  <span key={label} className="flex items-center gap-1.5 text-xs text-text-muted">
                    <span className="inline-block h-[2px] w-4 rounded-full" style={{ background: color }} />{label}
                  </span>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={memPts} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gNdMEM" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="rgb(56 189 248)" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="rgb(56 189 248)" stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="t" tickFormatter={xFmt} tick={NAX} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tick={NAX} tickLine={false} axisLine={false} tickFormatter={(v) => formatBytes(v as number)} />
                  <Tooltip contentStyle={NT} formatter={(v, name) => [formatBytes(v as number), name === 'total' ? 'Total' : 'Used']} labelFormatter={(l) => fmtNTs(l as number, tf)} />
                  <Area type="monotone" dataKey="total" stroke="rgb(71 85 105)"  strokeWidth={1}   strokeDasharray="4 2" fill="none"            dot={false} isAnimationActive={false} />
                  <Area type="monotone" dataKey="used"  stroke="rgb(56 189 248)" strokeWidth={1.5} fill="url(#gNdMEM)"                         dot={false} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Network */}
        <Card>
          <CardHeader className="pb-1.5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Network</CardTitle>
              <div className="flex items-center gap-3">
                {[{ color: 'rgb(99 102 241)', label: 'In' }, { color: 'rgb(168 85 247)', label: 'Out' }].map(({ color, label }) => (
                  <span key={label} className="flex items-center gap-1.5 text-xs text-text-muted">
                    <span className="inline-block h-[2px] w-4 rounded-full" style={{ background: color }} />{label}
                  </span>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={netPts} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gNdNI" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="rgb(99 102 241)"  stopOpacity={0.2} />
                      <stop offset="95%" stopColor="rgb(99 102 241)"  stopOpacity={0}   />
                    </linearGradient>
                    <linearGradient id="gNdNO" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="rgb(168 85 247)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="rgb(168 85 247)" stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="t" tickFormatter={xFmt} tick={NAX} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tick={NAX} tickLine={false} axisLine={false} tickFormatter={(v) => formatBytes(v as number)} />
                  <Tooltip contentStyle={NT} formatter={(v, name) => [`${formatBytes(v as number)}/s`, name === 'i' ? 'In' : 'Out']} labelFormatter={(l) => fmtNTs(l as number, tf)} />
                  <Area type="monotone" dataKey="i" stroke="rgb(99 102 241)"  strokeWidth={1.5} fill="url(#gNdNI)" dot={false} isAnimationActive={false} />
                  <Area type="monotone" dataKey="o" stroke="rgb(168 85 247)" strokeWidth={1.5} fill="url(#gNdNO)" dot={false} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export function NodeSummaryPage() {
  const { node } = useParams<{ node: string }>()
  const { data: status, isLoading } = useNodeStatus(node!)
  const { data: vms } = useVMs(node!)
  const { data: lxcs } = useLXCs(node!)
  const nodePower = useNodePower(node!)
  const { data: sub } = useNodeSubscription(node!)

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
        <button
          type="button"
          disabled={nodePower.isPending}
          onClick={() => {
            if (confirm(`Reboot node ${node}?`)) nodePower.mutate('reboot')
          }}
          className="inline-flex items-center gap-1.5 rounded border border-border-subtle px-2.5 py-1.5 text-xs text-text-secondary hover:border-accent/50 hover:text-text-primary disabled:opacity-50"
        >
          <RefreshCw className="size-3.5" />
          Reboot
        </button>
        <button
          type="button"
          disabled={nodePower.isPending}
          onClick={() => {
            if (confirm(`Shutdown node ${node}? This will stop all guests.`)) nodePower.mutate('shutdown')
          }}
          className="inline-flex items-center gap-1.5 rounded border border-status-error/40 px-2.5 py-1.5 text-xs text-status-error hover:bg-status-error/10 disabled:opacity-50"
        >
          <Power className="size-3.5" />
          Shutdown
        </button>
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
      <NodePerfSection node={node!} />
    </div>
  )
}
