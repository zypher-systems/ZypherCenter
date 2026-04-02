import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTip,
  ResponsiveContainer,
} from 'recharts'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { cn, formatBytes } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

type Timeframe = 'hour' | 'day' | 'week' | 'month'

interface RrdPoint {
  time: number
  cpu?: number
  mem?: number
  maxmem?: number
  netin?: number
  netout?: number
  diskread?: number
  diskwrite?: number
  [key: string]: number | undefined
}

const TF_OPTIONS: { value: Timeframe; label: string }[] = [
  { value: 'hour', label: '1h' },
  { value: 'day', label: '24h' },
  { value: 'week', label: '7d' },
  { value: 'month', label: '30d' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTime(ts: number, tf: Timeframe): string {
  const d = new Date(ts * 1000)
  if (tf === 'hour' || tf === 'day')
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

const TIP: React.CSSProperties = {
  background: 'rgb(15 15 18)',
  border: '1px solid rgb(39 39 50)',
  borderRadius: '6px',
  fontSize: '11px',
  color: 'rgb(228 228 235)',
  padding: '6px 10px',
}

const AX = { fontSize: 9, fill: 'rgb(113 113 122)' }

const C = {
  cpu:       'rgb(234 88 12)',
  memUsed:   'rgb(56 189 248)',
  memTotal:  'rgb(71 85 105)',
  diskRead:  'rgb(34 197 94)',
  diskWrite: 'rgb(251 146 60)',
  netIn:     'rgb(99 102 241)',
  netOut:    'rgb(168 85 247)',
} as const

// ── Sub-components ────────────────────────────────────────────────────────────

function Legend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div className="flex items-center gap-3">
      {items.map(({ color, label }) => (
        <span key={label} className="flex items-center gap-1.5 text-xs text-text-muted">
          <span className="inline-block h-[2px] w-4 rounded-full" style={{ background: color }} />
          {label}
        </span>
      ))}
    </div>
  )
}

function ChartCard({
  title,
  legend,
  children,
}: {
  title: string
  legend?: { color: string; label: string }[]
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader className="pb-1.5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {legend && <Legend items={legend} />}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-36">{children}</div>
      </CardContent>
    </Card>
  )
}

function TimeframeBar({ tf, onChange }: { tf: Timeframe; onChange: (t: Timeframe) => void }) {
  return (
    <div className="flex items-center gap-1">
      {TF_OPTIONS.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            'px-3 py-1 rounded-md text-xs font-medium transition-colors',
            tf === t.value
              ? 'bg-accent text-white'
              : 'text-text-muted hover:text-text-secondary hover:bg-bg-hover',
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

// ── ResourceCharts (for qemu / lxc guests) ────────────────────────────────────

export function ResourceCharts({
  node,
  vmid,
  type,
}: {
  node: string
  vmid: number
  type: 'qemu' | 'lxc'
}) {
  const [tf, setTf] = useState<Timeframe>('hour')

  const { data, isLoading } = useQuery({
    queryKey: [type === 'qemu' ? 'vms' : 'lxc', node, vmid, 'rrddata', tf],
    queryFn: () =>
      api.get<RrdPoint[]>(
        `nodes/${node}/${type}/${vmid}/rrddata?timeframe=${tf}&cf=AVERAGE`,
      ),
    refetchInterval: 30_000,
    enabled: !!node && !!vmid,
  })

  const raw = (data ?? []).filter((p) => p.time != null)
  const step = raw.length > 120 ? Math.ceil(raw.length / 120) : 1
  const pts = step > 1 ? raw.filter((_, i) => i % step === 0) : raw

  // Unique gradient IDs per instance (avoids SVG ID collisions when multiple charts in page)
  const uid = `${node}-${vmid}-${type}`

  const cpuPts  = pts.map((p) => ({ t: p.time, v: +((p.cpu  ?? 0) * 100).toFixed(2) }))
  const memPts  = pts.map((p) => ({ t: p.time, used: p.mem ?? 0, total: p.maxmem ?? 0 }))
  const diskPts = pts.map((p) => ({ t: p.time, r: p.diskread  ?? 0, w: p.diskwrite ?? 0 }))
  const netPts  = pts.map((p) => ({ t: p.time, i: p.netin ?? 0, o: p.netout ?? 0 }))

  const xFmt = (v: number) => fmtTime(v, tf)

  return (
    <div className="space-y-4">
      <TimeframeBar tf={tf} onChange={setTf} />

      {!isLoading && pts.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border">
          <p className="text-sm text-text-muted">No performance data — guest may be offline</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* CPU */}
          <ChartCard title="CPU Usage">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cpuPts} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id={`gCPU-${uid}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.cpu} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={C.cpu} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="t" tickFormatter={xFmt} tick={AX} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis domain={[0, 100]} tick={AX} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                <RechartsTip
                  contentStyle={TIP}
                  formatter={(v) => [`${(v as number).toFixed(1)}%`, 'CPU']}
                  labelFormatter={(l) => fmtTime(l as number, tf)}
                />
                <Area
                  type="monotone" dataKey="v" name="CPU"
                  stroke={C.cpu} strokeWidth={1.5}
                  fill={`url(#gCPU-${uid})`} dot={false} isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Memory */}
          <ChartCard
            title="Memory"
            legend={[{ color: C.memUsed, label: 'Used' }, { color: C.memTotal, label: 'Total' }]}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={memPts} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id={`gMEM-${uid}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.memUsed} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={C.memUsed} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="t" tickFormatter={xFmt} tick={AX} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={AX} tickLine={false} axisLine={false} tickFormatter={(v) => formatBytes(v as number)} />
                <RechartsTip
                  contentStyle={TIP}
                  formatter={(v, name) => [formatBytes(v as number), name === 'total' ? 'Total' : 'Used']}
                  labelFormatter={(l) => fmtTime(l as number, tf)}
                />
                <Area type="monotone" dataKey="total" name="total" stroke={C.memTotal} strokeWidth={1} strokeDasharray="4 2" fill="none" dot={false} isAnimationActive={false} />
                <Area type="monotone" dataKey="used"  name="used"  stroke={C.memUsed}  strokeWidth={1.5} fill={`url(#gMEM-${uid})`} dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Disk I/O */}
          <ChartCard
            title="Disk I/O"
            legend={[{ color: C.diskRead, label: 'Read' }, { color: C.diskWrite, label: 'Write' }]}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={diskPts} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id={`gDR-${uid}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.diskRead}  stopOpacity={0.2} />
                    <stop offset="95%" stopColor={C.diskRead}  stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id={`gDW-${uid}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.diskWrite} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={C.diskWrite} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="t" tickFormatter={xFmt} tick={AX} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={AX} tickLine={false} axisLine={false} tickFormatter={(v) => formatBytes(v as number)} />
                <RechartsTip
                  contentStyle={TIP}
                  formatter={(v, name) => [`${formatBytes(v as number)}/s`, name === 'r' ? 'Read' : 'Write']}
                  labelFormatter={(l) => fmtTime(l as number, tf)}
                />
                <Area type="monotone" dataKey="r" name="r" stroke={C.diskRead}  strokeWidth={1.5} fill={`url(#gDR-${uid})`} dot={false} isAnimationActive={false} />
                <Area type="monotone" dataKey="w" name="w" stroke={C.diskWrite} strokeWidth={1.5} fill={`url(#gDW-${uid})`} dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Network */}
          <ChartCard
            title="Network"
            legend={[{ color: C.netIn, label: 'In' }, { color: C.netOut, label: 'Out' }]}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={netPts} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id={`gNI-${uid}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.netIn}  stopOpacity={0.2} />
                    <stop offset="95%" stopColor={C.netIn}  stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id={`gNO-${uid}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.netOut} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={C.netOut} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="t" tickFormatter={xFmt} tick={AX} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={AX} tickLine={false} axisLine={false} tickFormatter={(v) => formatBytes(v as number)} />
                <RechartsTip
                  contentStyle={TIP}
                  formatter={(v, name) => [`${formatBytes(v as number)}/s`, name === 'i' ? 'In' : 'Out']}
                  labelFormatter={(l) => fmtTime(l as number, tf)}
                />
                <Area type="monotone" dataKey="i" name="i" stroke={C.netIn}  strokeWidth={1.5} fill={`url(#gNI-${uid})`} dot={false} isAnimationActive={false} />
                <Area type="monotone" dataKey="o" name="o" stroke={C.netOut} strokeWidth={1.5} fill={`url(#gNO-${uid})`} dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

        </div>
      )}
    </div>
  )
}

// ── NodeResourceCharts (for physical nodes) ───────────────────────────────────

interface NodeRrdPoint {
  time: number
  cpu?: number
  memused?: number
  maxmem?: number
  netin?: number
  netout?: number
  [key: string]: number | undefined
}

export function NodeResourceCharts({ node }: { node: string }) {
  const [tf, setTf] = useState<Timeframe>('hour')

  const { data, isLoading } = useQuery({
    queryKey: ['nodes', node, 'rrddata', tf],
    queryFn: () =>
      api.get<NodeRrdPoint[]>(
        `nodes/${node}/rrddata?timeframe=${tf}&cf=AVERAGE`,
      ),
    refetchInterval: 30_000,
    enabled: !!node,
  })

  const raw = (data ?? []).filter((p) => p.time != null)
  const step = raw.length > 120 ? Math.ceil(raw.length / 120) : 1
  const pts = step > 1 ? raw.filter((_, i) => i % step === 0) : raw

  const uid = `node-${node}`

  const cpuPts = pts.map((p) => ({ t: p.time, v: +((p.cpu ?? 0) * 100).toFixed(2) }))
  const memPts = pts.map((p) => ({ t: p.time, used: p.memused ?? 0, total: p.maxmem ?? 0 }))
  const netPts = pts.map((p) => ({ t: p.time, i: p.netin ?? 0, o: p.netout ?? 0 }))

  const xFmt = (v: number) => fmtTime(v, tf)

  return (
    <div className="space-y-4">
      <TimeframeBar tf={tf} onChange={setTf} />

      {!isLoading && pts.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border">
          <p className="text-sm text-text-muted">No performance data available</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* CPU */}
          <ChartCard title="CPU Usage">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cpuPts} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id={`gCPU-${uid}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.cpu} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={C.cpu} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="t" tickFormatter={xFmt} tick={AX} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis domain={[0, 100]} tick={AX} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                <RechartsTip
                  contentStyle={TIP}
                  formatter={(v) => [`${(v as number).toFixed(1)}%`, 'CPU']}
                  labelFormatter={(l) => fmtTime(l as number, tf)}
                />
                <Area
                  type="monotone" dataKey="v" name="CPU"
                  stroke={C.cpu} strokeWidth={1.5}
                  fill={`url(#gCPU-${uid})`} dot={false} isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Memory */}
          <ChartCard
            title="Memory"
            legend={[{ color: C.memUsed, label: 'Used' }, { color: C.memTotal, label: 'Total' }]}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={memPts} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id={`gMEM-${uid}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.memUsed} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={C.memUsed} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="t" tickFormatter={xFmt} tick={AX} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={AX} tickLine={false} axisLine={false} tickFormatter={(v) => formatBytes(v as number)} />
                <RechartsTip
                  contentStyle={TIP}
                  formatter={(v, name) => [formatBytes(v as number), name === 'total' ? 'Total' : 'Used']}
                  labelFormatter={(l) => fmtTime(l as number, tf)}
                />
                <Area type="monotone" dataKey="total" name="total" stroke={C.memTotal} strokeWidth={1} strokeDasharray="4 2" fill="none" dot={false} isAnimationActive={false} />
                <Area type="monotone" dataKey="used"  name="used"  stroke={C.memUsed}  strokeWidth={1.5} fill={`url(#gMEM-${uid})`} dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Network */}
          <ChartCard
            title="Network"
            legend={[{ color: C.netIn, label: 'In' }, { color: C.netOut, label: 'Out' }]}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={netPts} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id={`gNI-${uid}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.netIn}  stopOpacity={0.2} />
                    <stop offset="95%" stopColor={C.netIn}  stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id={`gNO-${uid}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.netOut} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={C.netOut} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="t" tickFormatter={xFmt} tick={AX} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={AX} tickLine={false} axisLine={false} tickFormatter={(v) => formatBytes(v as number)} />
                <RechartsTip
                  contentStyle={TIP}
                  formatter={(v, name) => [`${formatBytes(v as number)}/s`, name === 'i' ? 'In' : 'Out']}
                  labelFormatter={(l) => fmtTime(l as number, tf)}
                />
                <Area type="monotone" dataKey="i" name="i" stroke={C.netIn}  strokeWidth={1.5} fill={`url(#gNI-${uid})`} dot={false} isAnimationActive={false} />
                <Area type="monotone" dataKey="o" name="o" stroke={C.netOut} strokeWidth={1.5} fill={`url(#gNO-${uid})`} dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

        </div>
      )}
    </div>
  )
}
