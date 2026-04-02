import { useState } from 'react'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Database,
  HardDrive,
  Server,
  Plus,
  Trash2,
  RefreshCw,
  Layers,
  Cpu,
  Pencil,
} from 'lucide-react'
import {
  useCephStatus,
  useCephOSDs,
  useCephPools,
  useCephMons,
  useCephMDS,
  useCreateCephPool,
  useDeleteCephPool,
  useUpdateCephPool,
  useDestroyOSD,
  useCreateCephOSD,
  useOSDInOut,
  useCreateCephMon,
  useDestroyCephMon,
  useCreateCephMDS,
  useDestroyCephMDS,
  flattenOSDs,
  type CephStatus,
  type CephOSD,
  type CephOSDTreeItem,
  type CephPool,
  type CephMon,
  type CephMDS,
} from '@/lib/queries/ceph'
import { useClusterResources } from '@/lib/queries/cluster'
import { useNodeDisks } from '@/lib/queries/nodes'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { ResourceGauge } from '@/components/ui/ResourceGauge'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table'
import { formatBytes } from '@/lib/utils'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTip,
  ResponsiveContainer,
} from 'recharts'

// ── Constants & helpers ───────────────────────────────────────────────────────

// API now returns type as string enum ('replicated' | 'erasure' | 'unknown'), not a number
const POOL_TYPE_LABELS: Record<string, string> = { replicated: 'replicated', erasure: 'erasure', unknown: 'unknown' }
const POOL_APPS = ['rbd', 'cephfs', 'rgw', '']

const TIP_STYLE: React.CSSProperties = {
  background: 'rgb(15 15 18)',
  border: '1px solid rgb(39 39 50)',
  borderRadius: '6px',
  fontSize: '11px',
  color: 'rgb(228 228 235)',
  padding: '6px 10px',
}
const AX = { fontSize: 9, fill: 'rgb(113 113 122)' }

function healthColor(status: string) {
  if (status === 'HEALTH_OK')   return { bg: 'bg-status-running/10',  text: 'text-status-running',  border: 'border-status-running/30',  icon: CheckCircle2 }
  if (status === 'HEALTH_WARN') return { bg: 'bg-status-paused/10',   text: 'text-status-paused',   border: 'border-status-paused/30',   icon: AlertTriangle }
  return                               { bg: 'bg-status-error/10',    text: 'text-status-error',    border: 'border-status-error/30',    icon: XCircle }
}

function fmtRate(bytesPerSec: number | undefined): string {
  if (!bytesPerSec) return '0 B/s'
  return `${formatBytes(bytesPerSec)}/s`
}

function fmtOps(ops: number | undefined): string {
  if (!ops) return '0 ops/s'
  if (ops >= 1000) return `${(ops / 1000).toFixed(1)}k ops/s`
  return `${ops} ops/s`
}

// ── History sparkline (ring buffer maintained in component state) ─────────────

interface IOPoint { t: number; readOps: number; writeOps: number; readMB: number; writeMB: number }

function useIOHistory(status: CephStatus | undefined) {
  const [history, setHistory] = useState<IOPoint[]>([])

  if (status) {
    const last = history[history.length - 1]
    const now = Date.now()
    if (!last || now - last.t > 8_000) {
      const point: IOPoint = {
        t: now,
        readOps:  status.pgmap.read_op_per_sec  ?? 0,
        writeOps: status.pgmap.write_op_per_sec ?? 0,
        readMB:   (status.pgmap.read_bytes_sec  ?? 0) / 1_048_576,
        writeMB:  (status.pgmap.write_bytes_sec ?? 0) / 1_048_576,
      }
      setHistory((h) => [...h.slice(-59), point])
    }
  }

  return history
}

// ── Status tab ────────────────────────────────────────────────────────────────

function StatusTab({ node }: { node: string }) {
  const { data: status, isLoading, isError, refetch, isFetching } = useCephStatus(node)
  const history = useIOHistory(status)

  if (isLoading) return <SkeletonCard />
  if (isError || !status) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-center gap-3">
        <Database className="size-10 text-text-disabled" />
        <p className="text-text-muted">Ceph is not configured or not reachable on this node.</p>
      </div>
    )
  }

  const { health, osdmap, pgmap, monmap } = status
  const colors = healthColor(health.status)
  const HealthIcon = colors.icon
  const usedPct = pgmap.bytes_total > 0 ? pgmap.bytes_used / pgmap.bytes_total : 0
  const checks = Object.entries(health.checks ?? {})

  return (
    <div className="space-y-5">
      {/* Health banner */}
      <div className={`flex items-start gap-4 rounded-xl border p-4 ${colors.bg} ${colors.border}`}>
        <HealthIcon className={`size-6 shrink-0 mt-0.5 ${colors.text}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className={`text-base font-semibold ${colors.text}`}>{health.status}</p>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="text-text-muted hover:text-text-primary"
            >
              <RefreshCw className={`size-4 ${isFetching ? 'animate-spin' : ''}`} />
            </button>
          </div>
          {checks.length > 0 ? (
            <ul className="mt-1.5 space-y-0.5">
              {checks.map(([code, check]) => (
                <li key={code} className={`text-sm ${colors.text} opacity-80`}>
                  <span className="font-mono text-xs">[{code}]</span>{' '}
                  {check.summary.message}
                  {check.summary.count > 1 && (
                    <span className="ml-1 opacity-60">×{check.summary.count}</span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className={`text-sm mt-0.5 opacity-70 ${colors.text}`}>No active health warnings</p>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: 'Total Capacity',
            value: formatBytes(pgmap.bytes_total),
            sub: `${formatBytes(pgmap.bytes_avail)} free`,
            icon: <Database className="size-4" />,
          },
          {
            label: 'Used',
            value: formatBytes(pgmap.bytes_used),
            sub: `${(usedPct * 100).toFixed(1)}% utilization`,
            icon: <HardDrive className="size-4" />,
            color: usedPct >= 0.9 ? 'text-status-error' : usedPct >= 0.75 ? 'text-status-paused' : undefined,
          },
          {
            label: 'OSDs',
            value: `${osdmap.num_up_osds} / ${osdmap.num_osds} up`,
            sub: `${osdmap.num_in_osds} / ${osdmap.num_osds} in`,
            icon: <Server className="size-4" />,
            color: osdmap.num_up_osds < osdmap.num_osds ? 'text-status-error' : undefined,
          },
          {
            label: 'PGs',
            value: pgmap.num_pgs.toString(),
            sub: pgmap.degraded_objects
              ? `${pgmap.degraded_objects} objects degraded`
              : 'healthy',
            icon: <Layers className="size-4" />,
            color: pgmap.degraded_objects ? 'text-status-paused' : undefined,
          },
        ].map(({ label, value, sub, icon, color }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-text-muted">{label}</p>
                  <p className={`text-xl font-semibold mt-0.5 ${color ?? 'text-text-primary'}`}>
                    {value}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">{sub}</p>
                </div>
                <span className="text-text-disabled">{icon}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Capacity gauge */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Cluster Storage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ResourceGauge
            label="Used"
            used={pgmap.bytes_used}
            total={pgmap.bytes_total}
            format="bytes"
          />
          {pgmap.degraded_total != null && pgmap.degraded_total > 0 && pgmap.num_objects != null && (
            <ResourceGauge
              label="Degraded Objects"
              used={pgmap.degraded_objects ?? 0}
              total={pgmap.num_objects}
              format="count"
            />
          )}
          {pgmap.recovering_objects_per_sec != null && pgmap.recovering_objects_per_sec > 0 && (
            <div className="flex items-center gap-2 text-xs text-status-migrating">
              <Activity className="size-3.5" />
              <span>Recovery in progress — {pgmap.recovering_objects_per_sec.toFixed(0)} objects/s</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* I/O stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Read IOPS',   value: fmtOps(status.pgmap.read_op_per_sec),  color: 'text-blue-400' },
          { label: 'Write IOPS',  value: fmtOps(status.pgmap.write_op_per_sec), color: 'text-orange-400' },
          { label: 'Read Tput',   value: fmtRate(status.pgmap.read_bytes_sec),  color: 'text-blue-400' },
          { label: 'Write Tput',  value: fmtRate(status.pgmap.write_bytes_sec), color: 'text-orange-400' },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <p className="text-xs text-text-muted">{label}</p>
              <p className={`text-lg font-semibold tabular-nums mt-0.5 ${color}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* IO sparkline charts */}
      {history.length > 2 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-text-muted">IOPS (ops/s)</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 pb-3">
              <ResponsiveContainer width="100%" height={80}>
                <AreaChart data={history} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="cgReadOps" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="rgb(96 165 250)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="rgb(96 165 250)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="cgWriteOps" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="rgb(251 146 60)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="rgb(251 146 60)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="t" tickFormatter={(t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} tick={AX} tickLine={false} axisLine={false} />
                  <YAxis tick={AX} tickLine={false} axisLine={false} width={28} />
                  <RechartsTip contentStyle={TIP_STYLE} formatter={(v: number, name: string) => [`${v} ops/s`, name === 'readOps' ? 'Read' : 'Write']} labelFormatter={(t: number) => new Date(t).toLocaleTimeString()} />
                  <Area type="monotone" dataKey="readOps"  stroke="rgb(96 165 250)"  fill="url(#cgReadOps)"  strokeWidth={1.5} dot={false} name="Read" />
                  <Area type="monotone" dataKey="writeOps" stroke="rgb(251 146 60)"  fill="url(#cgWriteOps)" strokeWidth={1.5} dot={false} name="Write" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-text-muted">Throughput (MB/s)</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 pb-3">
              <ResponsiveContainer width="100%" height={80}>
                <AreaChart data={history} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="cgReadMB" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="rgb(96 165 250)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="rgb(96 165 250)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="cgWriteMB" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="rgb(251 146 60)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="rgb(251 146 60)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="t" tickFormatter={(t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} tick={AX} tickLine={false} axisLine={false} />
                  <YAxis tick={AX} tickLine={false} axisLine={false} width={38} tickFormatter={(v) => `${v.toFixed(1)}`} />
                  <RechartsTip contentStyle={TIP_STYLE} formatter={(v: number, name: string) => [`${v.toFixed(2)} MB/s`, name === 'readMB' ? 'Read' : 'Write']} labelFormatter={(t: number) => new Date(t).toLocaleTimeString()} />
                  <Area type="monotone" dataKey="readMB"  stroke="rgb(96 165 250)"  fill="url(#cgReadMB)"  strokeWidth={1.5} dot={false} name="Read" />
                  <Area type="monotone" dataKey="writeMB" stroke="rgb(251 146 60)"  fill="url(#cgWriteMB)" strokeWidth={1.5} dot={false} name="Write" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Monitor + MGR summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-text-muted">Monitors</p>
            <p className="text-xl font-semibold text-text-primary mt-0.5">{monmap.num_mons}</p>
            <p className="text-xs text-status-running mt-0.5">in quorum</p>
          </CardContent>
        </Card>
        {status.mgrmap && (
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-text-muted">Manager</p>
              <p className="text-base font-semibold text-text-primary mt-0.5 truncate">
                {status.mgrmap.active_name ?? '—'}
              </p>
              <p className={`text-xs mt-0.5 ${status.mgrmap.available ? 'text-status-running' : 'text-status-error'}`}>
                {status.mgrmap.available ? 'available' : 'unavailable'}
              </p>
            </CardContent>
          </Card>
        )}
        {status.fsmap && (
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-text-muted">CephFS</p>
              <p className="text-xl font-semibold text-text-primary mt-0.5">
                {status.fsmap.num_filesystems ?? 0}
              </p>
              <p className="text-xs text-text-muted mt-0.5">
                {status.fsmap.num_standby_mds ?? 0} standby MDS
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

// ── OSDs tab ──────────────────────────────────────────────────────────────────

const inp = 'w-full rounded border border-border-subtle bg-bg-input px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent [color-scheme:dark]'

function CreateOSDDialog({ node, onClose }: { node: string; onClose: () => void }) {
  const { data: disks } = useNodeDisks(node)
  const createOSD = useCreateCephOSD(node)

  const freeDisks = (disks ?? []).filter((d) => !d.used && !d.osdid)
  const allDisks  = disks ?? []

  const [dev, setDev]         = useState('')
  const [dbDev, setDbDev]     = useState('')
  const [walDev, setWalDev]   = useState('')
  const [encrypted, setEncrypted] = useState(false)

  function submit() {
    if (!dev) return
    const params: { dev: string; db_dev?: string; wal_dev?: string; encrypted?: number } = { dev }
    if (dbDev)  params.db_dev  = dbDev
    if (walDev) params.wal_dev = walDev
    if (encrypted) params.encrypted = 1
    createOSD.mutate(params, { onSuccess: () => onClose() })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-bg-card border border-border-subtle rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-text-primary">Create OSD</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-text-secondary mb-1">Device <span className="text-status-error">*</span></label>
            <select value={dev} onChange={(e) => setDev(e.target.value)} className={inp}>
              <option value="">Select a disk…</option>
              {freeDisks.map((d) => (
                <option key={d.devpath} value={d.devpath}>
                  {d.devpath} — {formatBytes(d.size)}{d.model ? ` (${d.model})` : ''}
                </option>
              ))}
            </select>
            {freeDisks.length === 0 && (
              <p className="text-xs text-status-paused mt-1">No free disks detected on this node.</p>
            )}
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">DB Device <span className="text-text-disabled">(optional)</span></label>
            <select value={dbDev} onChange={(e) => setDbDev(e.target.value)} className={inp}>
              <option value="">None (co-located on OSD device)</option>
              {allDisks.map((d) => (
                <option key={d.devpath} value={d.devpath}>
                  {d.devpath} — {formatBytes(d.size)}{d.model ? ` (${d.model})` : ''}{d.used ? ` [${d.used}]` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">WAL Device <span className="text-text-disabled">(optional)</span></label>
            <select value={walDev} onChange={(e) => setWalDev(e.target.value)} className={inp}>
              <option value="">None (co-located on OSD device)</option>
              {allDisks.map((d) => (
                <option key={d.devpath} value={d.devpath}>
                  {d.devpath} — {formatBytes(d.size)}{d.model ? ` (${d.model})` : ''}{d.used ? ` [${d.used}]` : ''}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
            <input type="checkbox" checked={encrypted} onChange={(e) => setEncrypted(e.target.checked)} className="accent-accent" />
            Encrypt OSD (LUKS)
          </label>
        </div>
        <p className="text-xs text-status-error/80 bg-status-error/5 border border-status-error/20 rounded px-3 py-2">
          Creating an OSD will wipe all data on the selected disk. This cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={submit} disabled={!dev || createOSD.isPending}>
            {createOSD.isPending ? 'Creating…' : 'Create OSD'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function OSDsTab({ node }: { node: string }) {
  const { data: raw, isLoading, isError, error } = useCephOSDs(node)
  const destroyOSD = useDestroyOSD(node)
  const osdInOut = useOSDInOut(node)
  const [showCreate, setShowCreate] = useState(false)

  if (isLoading) return <SkeletonCard />
  if (isError) return (
    <div className="flex flex-col items-center justify-center h-32 text-center gap-2">
      <p className="text-sm text-status-error">Failed to load OSD data.</p>
      {error instanceof Error && (
        <p className="text-xs text-text-muted font-mono">{error.message}</p>
      )}
      <p className="text-xs text-text-disabled">Ensure Ceph is configured and this node has OSD services running.</p>
    </div>
  )

  // Multi-strategy OSD extraction to handle different PVE versions:
  // PVE 8+/Squid: { nodes: [...flat array of all CRUSH items...], root_list: [...] }
  // PVE 7: { root_list: [...nested tree...] } where children are integer IDs
  // Some versions: raw array directly
  // Fallback: deep scan the entire response object for OSD-type items
  let flatNodes: CephOSDTreeItem[] = []

  if (Array.isArray(raw)) {
    flatNodes = raw as CephOSDTreeItem[]
  } else if (raw && typeof raw === 'object') {
    const r = raw as Record<string, unknown>
    // Try 'nodes' key first (standard in PVE 8+)
    if (Array.isArray(r.nodes) && (r.nodes as unknown[]).length > 0) {
      flatNodes = r.nodes as CephOSDTreeItem[]
    }
    // Also try 'root_list' — includes host/root nodes that reference OSD child IDs
    // Merge both arrays so flattenOSDs has ALL nodes to build its ID map
    if (Array.isArray(r.root_list) && (r.root_list as unknown[]).length > 0) {
      const rootNodes = r.root_list as CephOSDTreeItem[]
      const existingIds = new Set(flatNodes.map((n) => n.id))
      flatNodes = [...flatNodes, ...rootNodes.filter((n) => !existingIds.has(n.id))]
    }
    // Deep-scan: if still no OSD-type items found after standard keys, walk all array values
    if (!flatNodes.some((n) => n.type === 'osd' || n.type_id === 0)) {
      for (const val of Object.values(r)) {
        if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object') {
          const candidates = val as CephOSDTreeItem[]
          if (candidates.some((c) => c.type === 'osd' || c.type_id === 0)) {
            flatNodes = candidates
            break
          }
        }
      }
    }
  }

  const osds: CephOSD[] = flattenOSDs(flatNodes)

  // Debug info — shown only when no OSDs extracted, helps diagnose PVE API shape
  const debugInfo = osds.length === 0 && raw != null
    ? JSON.stringify(
        typeof raw === 'object' && !Array.isArray(raw)
          ? Object.fromEntries(Object.entries(raw as object).map(([k, v]) =>
              [k, Array.isArray(v) ? `[Array(${v.length})] first=${JSON.stringify(v[0]).slice(0, 80)}` : v]
            ))
          : { type: typeof raw, isArray: Array.isArray(raw), length: Array.isArray(raw) ? raw.length : 0 },
        null, 2
      )
    : null
  const upCount = osds.filter((o) => o.up).length
  const inCount = osds.filter((o) => o.inCluster).length

  const deviceClasses = [...new Set(osds.map((o) => o.deviceClass))]

  return (
    <div className="space-y-4">
      {showCreate && <CreateOSDDialog node={node} onClose={() => setShowCreate(false)} />}
      {/* Summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6 text-sm">
          <span className="text-text-muted">
            <span className={`font-semibold ${upCount < osds.length ? 'text-status-error' : 'text-status-running'}`}>
              {upCount}
            </span>
            <span className="text-text-disabled"> / {osds.length} up</span>
          </span>
          <span className="text-text-muted">
            <span className="font-semibold text-text-primary">{inCount}</span>
            <span className="text-text-disabled"> / {osds.length} in</span>
          </span>
          {deviceClasses.map((cls) => (
            <span key={cls} className="text-text-muted">
              <span className="font-mono text-xs bg-bg-elevated px-1.5 py-0.5 rounded">{cls.toUpperCase()}</span>
              <span className="ml-1">{osds.filter((o) => o.deviceClass === cls).length}</span>
            </span>
          ))}
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="size-3.5 mr-1" />Create OSD
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {!osds.length ? (
            <div className="py-10 text-center space-y-3">
              <p className="text-text-muted text-sm">No OSDs found</p>
              {debugInfo && (
                <details className="text-left mx-auto max-w-2xl">
                  <summary className="text-xs text-text-disabled cursor-pointer hover:text-text-muted">
                    Debug: show raw API response shape
                  </summary>
                  <pre className="mt-2 text-xs bg-bg-elevated rounded p-3 text-text-muted overflow-auto max-h-48 font-mono">
                    {debugInfo}
                  </pre>
                </details>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">OSD</TableHead>
                  <TableHead>Host</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead className="min-w-[160px]">Usage</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {osds.sort((a, b) => a.id - b.id).map((osd) => {
                  const totalBytes  = osd.kb * 1024
                  const usedBytes   = osd.kbUsed * 1024
                  const usedPct     = totalBytes > 0 ? usedBytes / totalBytes : 0
                  const barColor    = usedPct >= 0.9 ? 'bg-status-error' : usedPct >= 0.75 ? 'bg-status-paused' : 'bg-accent'

                  return (
                    <TableRow key={osd.id}>
                      <TableCell className="font-mono font-semibold text-text-primary">
                        osd.{osd.id}
                      </TableCell>
                      <TableCell className="text-text-secondary text-sm">{osd.host || '—'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded font-medium ${osd.up ? 'bg-status-running/10 text-status-running' : 'bg-status-error/10 text-status-error'}`}>
                            <span className={`size-1.5 rounded-full ${osd.up ? 'bg-status-running' : 'bg-status-error'}`} />
                            {osd.up ? 'up' : 'down'}
                          </span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${osd.inCluster ? 'bg-bg-elevated text-text-muted' : 'bg-status-paused/10 text-status-paused'}`}>
                            {osd.inCluster ? 'in' : 'out'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs bg-bg-elevated px-1.5 py-0.5 rounded text-text-muted uppercase">
                          {osd.deviceClass}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-sm text-text-muted">
                        {osd.crushWeight.toFixed(4)}
                      </TableCell>
                      <TableCell className="text-sm text-text-secondary tabular-nums">
                        {totalBytes > 0 ? formatBytes(totalBytes) : '—'}
                      </TableCell>
                      <TableCell>
                        {totalBytes > 0 ? (
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-text-muted tabular-nums">
                              <span>{formatBytes(usedBytes)}</span>
                              <span>{(usedPct * 100).toFixed(1)}%</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-bg-muted overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${barColor}`}
                                style={{ width: `${usedPct * 100}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-text-disabled text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <button
                            title={osd.inCluster ? 'Mark out' : 'Mark in'}
                            disabled={osdInOut.isPending}
                            onClick={() => osdInOut.mutate({ osdid: osd.id, action: osd.inCluster ? 'out' : 'in' })}
                            className="inline-flex items-center gap-1 rounded border border-border-subtle px-2 py-0.5 text-xs text-text-secondary hover:bg-bg-elevated disabled:opacity-50"
                          >
                            {osd.inCluster ? 'Mark out' : 'Mark in'}
                          </button>
                          {!osd.up && (
                            <button
                              title="Destroy OSD"
                              disabled={destroyOSD.isPending}
                              onClick={() => {
                                if (confirm(`Destroy OSD ${osd.id} on ${osd.host}? This will permanently remove it.`)) {
                                  destroyOSD.mutate({ osdid: osd.id, cleanup: true })
                                }
                              }}
                              className="inline-flex items-center gap-1 rounded border border-status-error/40 px-2 py-0.5 text-xs text-status-error hover:bg-status-error/10 disabled:opacity-50"
                            >
                              <Trash2 className="size-3" />
                            </button>
                          )}
                        </div>
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

// ── Pools tab ─────────────────────────────────────────────────────────────────

function CreatePoolDialog({ node, onClose }: { node: string; onClose: () => void }) {
  const create = useCreateCephPool(node)
  const [name, setName]       = useState('')
  const [size, setSize]       = useState('3')
  const [pgNum, setPgNum]     = useState('32')
  const [minSize, setMinSize] = useState('2')
  const [app, setApp]         = useState('rbd')

  const inp = 'w-full rounded border border-border-subtle bg-bg-input px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent [color-scheme:dark]'

  function submit() {
    if (!name.trim()) return
    create.mutate(
      {
        name: name.trim(),
        size: Number(size),
        pg_num: Number(pgNum),
        min_size: minSize ? Number(minSize) : undefined,
        application: app || undefined,
      },
      { onSuccess: () => onClose() },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-bg-card border border-border-subtle rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">Create Pool</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-text-secondary mb-1">Name <span className="text-status-error">*</span></label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. mypool" className={inp} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm text-text-secondary mb-1">Size</label>
              <input type="number" min={1} max={10} value={size} onChange={(e) => setSize(e.target.value)} className={inp} />
              <p className="text-xs text-text-disabled mt-0.5">replicas</p>
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">Min Size</label>
              <input type="number" min={1} max={10} value={minSize} onChange={(e) => setMinSize(e.target.value)} className={inp} />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">PG Count</label>
              <input type="number" min={1} value={pgNum} onChange={(e) => setPgNum(e.target.value)} className={inp} />
            </div>
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Application</label>
            <select value={app} onChange={(e) => setApp(e.target.value)} className={inp}>
              {POOL_APPS.map((a) => (
                <option key={a} value={a}>{a || '— none —'}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={submit} disabled={!name.trim() || create.isPending}>
            {create.isPending ? 'Creating…' : 'Create Pool'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function EditPoolDialog({ pool, node, onClose }: { pool: CephPool; node: string; onClose: () => void }) {
  const [size,    setSize]    = useState(String(pool.size    ?? 3))
  const [minSize, setMinSize] = useState(String(pool.min_size ?? 2))
  const [pgNum,   setPgNum]   = useState(String(pool.pg_num  ?? 64))
  const [autoscale, setAutoscale] = useState(pool.pg_autoscale_mode ?? 'on')
  const update = useUpdateCephPool(node)
  const inp = 'w-full rounded border border-border-subtle bg-bg-input px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent [color-scheme:dark]'

  function submit() {
    update.mutate(
      {
        name: pool.pool_name,
        params: {
          size: Number(size),
          min_size: Number(minSize),
          pg_num: Number(pgNum),
          pg_autoscale_mode: autoscale,
        },
      },
      { onSuccess: () => onClose() },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-bg-card border border-border-subtle rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-text-primary">Edit Pool</h2>
        <p className="text-sm font-mono text-text-muted">{pool.pool_name}</p>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-text-secondary mb-1">Size (replicas)</label>
              <input type="number" min="1" max="9" value={size} onChange={(e) => setSize(e.target.value)} className={inp} />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">Min Size</label>
              <input type="number" min="1" max="9" value={minSize} onChange={(e) => setMinSize(e.target.value)} className={inp} />
            </div>
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">PG Count</label>
            <input type="number" min="1" value={pgNum} onChange={(e) => setPgNum(e.target.value)} className={inp} />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">PG Autoscale Mode</label>
            <select value={autoscale} onChange={(e) => setAutoscale(e.target.value)} className={inp}>
              <option value="on">On</option>
              <option value="warn">Warn</option>
              <option value="off">Off</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="rounded border border-border-subtle px-3 py-1.5 text-sm text-text-muted hover:bg-bg-elevated">Cancel</button>
          <button onClick={submit} disabled={update.isPending} className="rounded bg-accent px-3 py-1.5 text-sm text-white hover:bg-accent/90 disabled:opacity-50">
            {update.isPending ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

function PoolsTab({ node }: { node: string }) {
  const { data: pools, isLoading, isError, error } = useCephPools(node)
  const deletePool = useDeleteCephPool(node)
  const [showCreate, setShowCreate] = useState(false)
  const [editingPool, setEditingPool] = useState<CephPool | null>(null)

  if (isLoading) return <SkeletonCard />
  if (isError) return (
    <div className="flex flex-col items-center justify-center h-32 text-center gap-2">
      <p className="text-sm text-status-error">Failed to load pool data.</p>
      {error instanceof Error && (
        <p className="text-xs text-text-muted font-mono">{error.message}</p>
      )}
      <p className="text-xs text-text-disabled">Ensure Ceph is configured and accessible on this node.</p>
    </div>
  )

  return (
    <div className="space-y-4">
      {showCreate && <CreatePoolDialog node={node} onClose={() => setShowCreate(false)} />}
      {editingPool && <EditPoolDialog pool={editingPool} node={node} onClose={() => setEditingPool(null)} />}
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">{pools?.length ?? 0} pool(s)</p>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="size-3.5 mr-1" />Create Pool
        </Button>
      </div>
      <Card>
        <CardContent className="p-0">
          {!pools?.length ? (
            <p className="text-center text-text-muted text-sm py-10">No pools configured</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>PGs</TableHead>
                  <TableHead>Application</TableHead>
                  <TableHead className="min-w-[200px]">Usage</TableHead>
                  <TableHead>Available</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {pools.map((pool: CephPool) => {
                  const usedBytes = pool.bytes_used ?? 0
                  const maxAvail  = pool.max_avail  ?? 0
                  const totalEst  = usedBytes + maxAvail
                  const usedPct   = pool.percent_used != null
                    ? pool.percent_used / 100
                    : (totalEst > 0 ? usedBytes / totalEst : 0)
                  const barColor  = usedPct >= 0.9 ? 'bg-status-error' : usedPct >= 0.75 ? 'bg-status-paused' : 'bg-accent'

                  return (
                    <TableRow key={pool.pool}>
                      <TableCell className="font-medium text-text-primary font-mono text-sm">
                        {pool.pool_name}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs uppercase tracking-wide bg-bg-elevated text-text-muted px-1.5 py-0.5 rounded">
                          {POOL_TYPE_LABELS[pool.type] ?? pool.type}
                        </span>
                      </TableCell>
                      <TableCell className="text-text-secondary text-sm">
                        {pool.size != null ? `${pool.size}×` : '—'}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-text-muted">
                        {pool.pg_num ?? '—'}
                      </TableCell>
                      <TableCell className="text-sm text-text-muted">
                        {pool.application_metadata
                          ? Object.keys(pool.application_metadata).join(', ') || '—'
                          : (pool.application || '—')}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-text-muted tabular-nums">
                            <span>{formatBytes(usedBytes)}</span>
                            <span>{(usedPct * 100).toFixed(1)}%</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${barColor}`}
                              style={{ width: `${Math.min(usedPct * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-text-secondary tabular-nums">
                        {maxAvail > 0 ? formatBytes(maxAvail) : '—'}
                      </TableCell>
                      <TableCell>
                        {!pool.pool_name.startsWith('.') && (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setEditingPool(pool)}
                              className="inline-flex items-center gap-1 rounded border border-border-subtle px-2 py-0.5 text-xs text-text-muted hover:text-text-primary hover:bg-bg-elevated"
                            >
                              <Pencil className="size-3" />
                            </button>
                            <button
                              disabled={deletePool.isPending}
                              onClick={() => {
                                if (confirm(`Delete pool "${pool.pool_name}"? All data will be lost.`)) {
                                  deletePool.mutate({ name: pool.pool_name })
                                }
                              }}
                              className="inline-flex items-center rounded border border-status-error/40 px-2 py-0.5 text-xs text-status-error hover:bg-status-error/10 disabled:opacity-50"
                            >
                              <Trash2 className="size-3" />
                            </button>
                          </div>
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

// ── Monitors tab ─────────────────────────────────────────────────────────────

function MonsTab({ node }: { node: string }) {
  const { data: mons, isLoading } = useCephMons(node)
  const createMon = useCreateCephMon(node)
  const destroyMon = useDestroyCephMon(node)

  if (isLoading) return <SkeletonCard />

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={() => createMon.mutate({})}
          disabled={createMon.isPending}
        >
          <Plus className="size-4 mr-1.5" />
          {createMon.isPending ? 'Creating…' : 'Create Monitor'}
        </Button>
      </div>
      <Card>
        <CardContent className="p-0">
          {!mons?.length ? (
            <p className="text-center text-text-muted text-sm py-10">No monitors found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Rank</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(mons as CephMon[]).map((mon) => (
                  <TableRow key={mon.name}>
                    <TableCell className="font-medium font-mono text-text-primary">{mon.name}</TableCell>
                    <TableCell className="font-mono text-xs text-text-secondary">{mon.addr ?? '—'}</TableCell>
                    <TableCell className="text-text-muted text-sm">{mon.rank ?? '—'}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded font-medium ${
                        mon.quorum !== false
                          ? 'bg-status-running/10 text-status-running'
                          : 'bg-status-error/10 text-status-error'
                      }`}>
                        <span className={`size-1.5 rounded-full ${mon.quorum !== false ? 'bg-status-running' : 'bg-status-error'}`} />
                        {mon.quorum !== false ? 'in quorum' : 'out of quorum'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Remove monitor"
                        disabled={destroyMon.isPending}
                        onClick={() => {
                          if (confirm(`Remove Ceph monitor ${mon.name}?`)) {
                            destroyMon.mutate(mon.name)
                          }
                        }}
                      >
                        <Trash2 className="size-3.5 text-text-muted hover:text-status-error" />
                      </Button>
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

// ── MDS tab ───────────────────────────────────────────────────────────────────

function MDSTab({ node }: { node: string }) {
  const { data: mdsServers, isLoading } = useCephMDS(node)
  const createMDS = useCreateCephMDS(node)
  const destroyMDS = useDestroyCephMDS(node)
  const [showCreate, setShowCreate] = useState(false)
  const [mdsName, setMdsName] = useState('')

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!mdsName.trim()) return
    createMDS.mutate(mdsName.trim(), {
      onSuccess: () => { setShowCreate(false); setMdsName('') },
    })
  }

  if (isLoading) return <SkeletonCard />

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="size-4 mr-1.5" />
          Create MDS
        </Button>
      </div>
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowCreate(false)}>
          <div className="bg-bg-card border border-border-subtle rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-semibold text-text-primary">Create Ceph MDS</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-primary" htmlFor="mds-name">MDS Name</label>
                <input
                  id="mds-name"
                  value={mdsName}
                  onChange={(e) => setMdsName(e.target.value)}
                  placeholder="mds1"
                  required
                  autoFocus
                  className="flex h-9 w-full rounded-md border border-border bg-bg-input px-3 py-1 text-sm text-text-primary shadow-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button type="submit" size="sm" disabled={createMDS.isPending}>
                  {createMDS.isPending ? 'Creating…' : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      <Card>
        <CardContent className="p-0">
          {!mdsServers?.length ? (
            <p className="text-center text-text-muted text-sm py-10">
              No MDS (CephFS metadata servers) configured
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Rank</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(mdsServers as CephMDS[]).map((mds) => {
                  const isActive = mds.state?.toLowerCase().includes('active')
                  return (
                    <TableRow key={mds.name}>
                      <TableCell className="font-medium font-mono text-text-primary">{mds.name}</TableCell>
                      <TableCell className="font-mono text-xs text-text-secondary">{mds.addr ?? '—'}</TableCell>
                      <TableCell className="text-text-muted text-sm">{mds.rank ?? '—'}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded font-medium ${
                          isActive
                            ? 'bg-status-running/10 text-status-running'
                            : 'bg-bg-elevated text-text-muted'
                        }`}>
                          <span className={`size-1.5 rounded-full ${isActive ? 'bg-status-running' : 'bg-border'}`} />
                          {mds.state ?? 'unknown'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Remove MDS"
                          disabled={destroyMDS.isPending}
                          onClick={() => {
                            if (confirm(`Remove Ceph MDS ${mds.name}?`)) {
                              destroyMDS.mutate(mds.name)
                            }
                          }}
                        >
                          <Trash2 className="size-3.5 text-text-muted hover:text-status-error" />
                        </Button>
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

// ── Main page ─────────────────────────────────────────────────────────────────

export function CephPage() {
  const { data: clusterNodes } = useClusterResources('node')
  const nodeList = (clusterNodes ?? []).map((n) => n.node ?? n.name ?? '').filter(Boolean)
  const [selectedNode, setSelectedNode] = useState<string>('')
  const [tab, setTab] = useState('status')

  // Use first available node as default
  const node = selectedNode || nodeList[0] || ''

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="size-5 text-accent" />
            <h1 className="text-xl font-semibold text-text-primary">Ceph Storage</h1>
          </div>
          <p className="text-sm text-text-muted mt-0.5">
            Distributed storage cluster — pools, OSDs, monitors
          </p>
        </div>
        {nodeList.length > 1 && (
          <div className="flex items-center gap-2 shrink-0">
            <label className="text-xs text-text-muted">Query via node:</label>
            <select
              value={node}
              onChange={(e) => setSelectedNode(e.target.value)}
              className="rounded border border-border-subtle bg-bg-input px-2 py-1 text-sm text-text-primary outline-none focus:border-accent"
            >
              {nodeList.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {!node ? (
        <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-border">
          <p className="text-text-muted text-sm">No cluster nodes available</p>
        </div>
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="status">
              <Activity className="size-3.5 mr-1.5" />Status
            </TabsTrigger>
            <TabsTrigger value="osds">
              <HardDrive className="size-3.5 mr-1.5" />OSDs
            </TabsTrigger>
            <TabsTrigger value="pools">
              <Database className="size-3.5 mr-1.5" />Pools
            </TabsTrigger>
            <TabsTrigger value="monitors">
              <Server className="size-3.5 mr-1.5" />Monitors
            </TabsTrigger>
            <TabsTrigger value="mds">
              <Layers className="size-3.5 mr-1.5" />MDS
            </TabsTrigger>
          </TabsList>

          <TabsContent value="status">   <StatusTab  node={node} /></TabsContent>
          <TabsContent value="osds">    <OSDsTab    node={node} /></TabsContent>
          <TabsContent value="pools">   <PoolsTab   node={node} /></TabsContent>
          <TabsContent value="monitors"><MonsTab    node={node} /></TabsContent>
          <TabsContent value="mds">     <MDSTab     node={node} /></TabsContent>
        </Tabs>
      )}
    </div>
  )
}
