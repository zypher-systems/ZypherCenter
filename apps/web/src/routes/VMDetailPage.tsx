import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router'
import {
  Play,
  Square,
  RotateCcw,
  Power,
  Terminal,
  Camera,
  HardDrive,
  Settings,
  Cloud,
  Shield,
  Archive,
  Activity,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Cpu,
  Network,
  PauseCircle,
  PlayCircle,
} from 'lucide-react'
import {
  useVMStatus,
  useVMConfig,
  useVMSnapshots,
  useVMStart,
  useVMStop,
  useVMShutdown,
  useVMReboot,
  useVMSuspend,
  useVMResume,
  useVMFirewallRules,
  useVMFirewallOptions,
  useCreateVMFirewallRule,
  useDeleteVMFirewallRule,
  useUpdateVMFirewallRule,
  useUpdateVMFirewallOptions,
  useCreateVMSnapshot,
  useDeleteVMSnapshot,
  useRollbackVMSnapshot,
  useMigrateVM,
  useCloneVM,
  useUpdateVMConfig,
  useDeleteVM,
  useResizeVMDisk,
  useTemplateVM,
  useVMAgentOsInfo,
  useVMAgentNetworkInterfaces,
  useVMAgentFsInfo,
  useMoveVMDisk,
  useRegenerateCloudInit,
  useVMRrdData,
} from '@/lib/queries/vms'
import { useClusterBackupJobs, useClusterResources } from '@/lib/queries/cluster'
import { useNodeTasksFiltered, useNodeStorage, useNodeNetwork, useVzdump, useNodeHardwarePCI, useNodeHardwareUSB } from '@/lib/queries/nodes'
import { useStorage, useStorageContent } from '@/lib/queries/storage'
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
import { formatBytes, formatPercent, formatUptime, formatTimestamp, cn } from '@/lib/utils'
import { ResourceCharts } from '@/components/features/ResourceCharts'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

// ── VM performance history ─────────────────────────────────────────────────────────────

const VT: React.CSSProperties = {
  background: 'rgb(15 15 18)', border: '1px solid rgb(39 39 50)',
  borderRadius: '6px', fontSize: '11px', color: 'rgb(228 228 235)', padding: '6px 10px',
}
const VAX = { fontSize: 9, fill: 'rgb(113 113 122)' }

function VMPerfSection({ node, vmid }: { node: string; vmid: number }) {
  const [tf, setTf] = useState<'hour' | 'day'>('hour')
  const { data } = useVMRrdData(node, vmid, tf)
  const raw = data ?? []
  const step = raw.length > 120 ? Math.ceil(raw.length / 120) : 1
  const pts = step > 1 ? raw.filter((_, i) => i % step === 0) : raw
  function xFmt(v: number) {
    const d = new Date(v * 1000)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const cpuPts = pts.map((p) => ({ t: p.time, v: +((p.cpu ?? 0) * 100).toFixed(2) }))
  const memPts = pts.map((p) => ({ t: p.time, used: p.mem ?? 0, total: p.maxmem ?? 0 }))
  const netPts = pts.map((p) => ({ t: p.time, i: p.netin ?? 0, o: p.netout ?? 0 }))
  const diskPts = pts.map((p) => ({ t: p.time, r: p.diskread ?? 0, w: p.diskwrite ?? 0 }))

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-text-secondary">Performance History</h2>
        <div className="flex gap-1">
          {(['hour', 'day'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTf(t)}
              className={cn(
                'px-3 py-1 rounded-md text-xs font-medium transition-colors',
                tf === t ? 'bg-accent text-white' : 'text-text-muted hover:text-text-secondary hover:bg-bg-hover',
              )}
            >
              {t === 'hour' ? '1h' : '24h'}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        {/* CPU */}
        <Card>
          <CardHeader className="pb-1.5"><CardTitle className="text-sm font-medium">CPU Usage</CardTitle></CardHeader>
          <CardContent>
            <div className="h-28">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cpuPts} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gVmCPU" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="rgb(234 88 12)"  stopOpacity={0.25} />
                      <stop offset="95%" stopColor="rgb(234 88 12)"  stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="t" tickFormatter={xFmt} tick={VAX} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis domain={[0, 100]} tick={VAX} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                  <Tooltip contentStyle={VT} formatter={(v) => [`${(v as number).toFixed(1)}%`, 'CPU']} labelFormatter={(l) => xFmt(l as number)} />
                  <Area type="monotone" dataKey="v" stroke="rgb(234 88 12)" strokeWidth={1.5} fill="url(#gVmCPU)" dot={false} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        {/* Memory */}
        <Card>
          <CardHeader className="pb-1.5"><CardTitle className="text-sm font-medium">Memory</CardTitle></CardHeader>
          <CardContent>
            <div className="h-28">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={memPts} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gVmMEM" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="rgb(56 189 248)" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="rgb(56 189 248)" stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="t" tickFormatter={xFmt} tick={VAX} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tick={VAX} tickLine={false} axisLine={false} tickFormatter={(v) => formatBytes(v as number)} />
                  <Tooltip contentStyle={VT} formatter={(v, name) => [formatBytes(v as number), name === 'total' ? 'Total' : 'Used']} labelFormatter={(l) => xFmt(l as number)} />
                  <Area type="monotone" dataKey="total" stroke="rgb(71 85 105)"  strokeWidth={1}   strokeDasharray="4 2" fill="none"            dot={false} isAnimationActive={false} />
                  <Area type="monotone" dataKey="used"  stroke="rgb(56 189 248)" strokeWidth={1.5} fill="url(#gVmMEM)"                         dot={false} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        {/* Network */}
        <Card>
          <CardHeader className="pb-1.5"><CardTitle className="text-sm font-medium">Network</CardTitle></CardHeader>
          <CardContent>
            <div className="h-28">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={netPts} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gVmNI" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="rgb(99 102 241)"  stopOpacity={0.2} />
                      <stop offset="95%" stopColor="rgb(99 102 241)"  stopOpacity={0}   />
                    </linearGradient>
                    <linearGradient id="gVmNO" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="rgb(168 85 247)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="rgb(168 85 247)" stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="t" tickFormatter={xFmt} tick={VAX} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tick={VAX} tickLine={false} axisLine={false} tickFormatter={(v) => formatBytes(v as number)} />
                  <Tooltip contentStyle={VT} formatter={(v, name) => [`${formatBytes(v as number)}/s`, name === 'i' ? 'In' : 'Out']} labelFormatter={(l) => xFmt(l as number)} />
                  <Area type="monotone" dataKey="i" stroke="rgb(99 102 241)"  strokeWidth={1.5} fill="url(#gVmNI)" dot={false} isAnimationActive={false} />
                  <Area type="monotone" dataKey="o" stroke="rgb(168 85 247)" strokeWidth={1.5} fill="url(#gVmNO)" dot={false} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        {/* Disk I/O */}
        <Card>
          <CardHeader className="pb-1.5"><CardTitle className="text-sm font-medium">Disk I/O</CardTitle></CardHeader>
          <CardContent>
            <div className="h-28">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={diskPts} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gVmDR" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="rgb(34 197 94)"  stopOpacity={0.2} />
                      <stop offset="95%" stopColor="rgb(34 197 94)"  stopOpacity={0}   />
                    </linearGradient>
                    <linearGradient id="gVmDW" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="rgb(251 191 36)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="rgb(251 191 36)" stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="t" tickFormatter={xFmt} tick={VAX} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tick={VAX} tickLine={false} axisLine={false} tickFormatter={(v) => formatBytes(v as number)} />
                  <Tooltip contentStyle={VT} formatter={(v, name) => [`${formatBytes(v as number)}/s`, name === 'r' ? 'Read' : 'Write']} labelFormatter={(l) => xFmt(l as number)} />
                  <Area type="monotone" dataKey="r" stroke="rgb(34 197 94)"  strokeWidth={1.5} fill="url(#gVmDR)" dot={false} isAnimationActive={false} />
                  <Area type="monotone" dataKey="w" stroke="rgb(251 191 36)" strokeWidth={1.5} fill="url(#gVmDW)" dot={false} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ── Summary tab ───────────────────────────────────────────────────────────────

function NotesCard({ node, vmid }: { node: string; vmid: number }) {
  const { data: config } = useVMConfig(node, vmid)
  const updateConfig = useUpdateVMConfig(node, vmid)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const notes = (config?.description as string | undefined) ?? ''

  function startEdit() { setDraft(notes); setEditing(true) }
  function cancel() { setEditing(false) }
  function save() {
    updateConfig.mutate({ description: draft }, { onSuccess: () => setEditing(false) })
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Notes</CardTitle>
          {!editing ? (
            <button
              onClick={startEdit}
              className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-accent"
            >
              <Pencil className="size-3" />Edit
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={cancel} className="text-xs text-text-muted hover:text-text-secondary"><X className="size-3.5" /></button>
              <button onClick={save} disabled={updateConfig.isPending} className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent-hover disabled:opacity-50">
                <Check className="size-3" />{updateConfig.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {editing ? (
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={5}
            className="w-full rounded border border-border-subtle bg-bg-input px-3 py-2 text-sm text-text-primary outline-none focus:border-accent resize-y font-mono"
            placeholder="Add notes…"
            autoFocus
          />
        ) : notes ? (
          <div
            className="prose prose-sm prose-invert max-w-none text-text-secondary [&_a]:text-accent [&_a]:underline [&_pre]:bg-bg-elevated [&_code]:bg-bg-elevated [&_code]:px-1 [&_code]:rounded [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_li]:my-0.5 [&_ul]:my-1 [&_ol]:my-1"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(notes) as string) }}
          />
        ) : (
          <p className="text-sm text-text-disabled italic">No notes — click Edit to add</p>
        )}
      </CardContent>
    </Card>
  )
}

function SummaryTab({ node, vmid }: { node: string; vmid: number }) {
  const { data: status } = useVMStatus(node, vmid)
  const { data: config } = useVMConfig(node, vmid)
  const updateConfig = useUpdateVMConfig(node, vmid)
  const isRunning = status?.status === 'running'
  const { data: netRaw } = useVMAgentNetworkInterfaces(node, vmid, isRunning)
  const [addingTag, setAddingTag] = useState(false)
  const [newTag, setNewTag] = useState('')
  if (!status) return null

  // Extract non-loopback IPs from agent
  const agentIfaces = ((netRaw as Record<string, unknown> | undefined)?.result as { name: string; 'ip-addresses'?: { 'ip-address': string; 'ip-address-type': string; prefix: number }[] }[] | undefined) ?? []
  const guestIPs = agentIfaces
    .filter((iface) => iface.name !== 'lo')
    .flatMap((iface) => (iface['ip-addresses'] ?? []).map((ip) => ({ iface: iface.name, addr: ip['ip-address'], prefix: ip.prefix, type: ip['ip-address-type'] })))
    .filter((ip) => !ip.addr.startsWith('fe80') && ip.addr !== '127.0.0.1' && ip.addr !== '::1')

  const tags = (config?.tags as string | undefined)?.split(/[;,]/).map((t) => t.trim()).filter(Boolean) ?? []

  function removeTag(tag: string) {
    const next = tags.filter((t) => t !== tag).join(';')
    updateConfig.mutate({ tags: next })
  }

  function commitTag() {
    const t = newTag.trim()
    if (t && !tags.includes(t)) {
      updateConfig.mutate({ tags: [...tags, t].join(';') })
    }
    setNewTag('')
    setAddingTag(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5 flex-wrap">
        {tags.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent border border-accent/20">
            {tag}
            <button onClick={() => removeTag(tag)} disabled={updateConfig.isPending} className="opacity-60 hover:opacity-100 disabled:opacity-30">
              <X className="size-3" />
            </button>
          </span>
        ))}
        {addingTag ? (
          <span className="inline-flex items-center gap-1">
            <input
              autoFocus
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') commitTag(); if (e.key === 'Escape') { setAddingTag(false); setNewTag('') } }}
              className="rounded border border-border-subtle bg-bg-input px-2 py-0.5 text-xs text-text-primary outline-none focus:border-accent w-24"
              placeholder="tag name"
            />
            <button onClick={commitTag} disabled={updateConfig.isPending} className="text-xs text-accent hover:opacity-80 disabled:opacity-30">
              <Check className="size-3" />
            </button>
            <button onClick={() => { setAddingTag(false); setNewTag('') }} className="text-xs text-text-muted hover:opacity-80">
              <X className="size-3" />
            </button>
          </span>
        ) : (
          <button onClick={() => setAddingTag(true)} className="inline-flex items-center gap-0.5 rounded-full border border-dashed border-border-subtle px-2 py-0.5 text-xs text-text-muted hover:border-accent hover:text-accent">
            <Plus className="size-3" /> tag
          </button>
        )}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Resources</CardTitle></CardHeader>          <CardContent className="space-y-4">
            {status.cpu != null && (
              <ResourceGauge label="CPU" used={status.cpu} total={1} format="percent" />
            )}
            {status.mem != null && status.maxmem != null && (
              <ResourceGauge label="Memory" used={status.mem} total={status.maxmem} />
            )}
            {status.disk != null && status.maxdisk != null && (
              <ResourceGauge label="Disk" used={status.disk} total={status.maxdisk} />
            )}
            <div className="pt-2 border-t border-border-muted text-xs space-y-1">
              <div className="flex justify-between text-text-muted">
                <span>Uptime</span>
                <span className="text-text-secondary">{status.uptime ? formatUptime(status.uptime) : '—'}</span>
              </div>
              <div className="flex justify-between text-text-muted">
                <span>Net In / Out</span>
                <span className="text-text-secondary font-mono">
                  {formatBytes(status.netin ?? 0)} / {formatBytes(status.netout ?? 0)}
                </span>
              </div>
              <div className="flex justify-between text-text-muted">
                <span>Disk Read / Write</span>
                <span className="text-text-secondary font-mono">
                  {formatBytes(status.diskread ?? 0)} / {formatBytes(status.diskwrite ?? 0)}
                </span>
              </div>
              {status.pid && (
                <div className="flex justify-between text-text-muted">
                  <span>PID</span>
                  <span className="text-text-secondary font-mono">{status.pid}</span>
                </div>
              )}
              {guestIPs.length > 0 && (
                <div className="pt-1 border-t border-border-muted">
                  <span className="text-text-muted">IP Addresses</span>
                  <div className="mt-0.5 space-y-0.5">
                    {guestIPs.slice(0, 6).map((ip) => (
                      <div key={`${ip.iface}-${ip.addr}`} className="flex items-center justify-between">
                        <span className="text-text-muted opacity-70">{ip.iface}</span>
                        <span className="text-text-secondary font-mono">{ip.addr}/{ip.prefix}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        <NotesCard node={node} vmid={vmid} />
      </div>
      <VMPerfSection node={node} vmid={vmid} />
    </div>
  )
}

// ── Hardware tab ─────────────────────────────────────────────────────────────

// ── CD-ROM ISO picker row ────────────────────────────────────────────────────

function ISOPickerRow({
  diskKey, rawValue, node, isoStorages, onMount, onEject, isPending,
}: {
  diskKey: string
  rawValue: string
  node: string
  isoStorages: { storage: string }[]
  onMount: (key: string, volid: string) => void
  onEject: (key: string) => void
  isPending: boolean
}) {
  const [picking, setPicking] = useState(false)
  const [pickerStorage, setPickerStorage] = useState('')
  const [pickerISO, setPickerISO] = useState('')
  const { data: isoContent } = useStorageContent(node, pickerStorage, 'iso')

  const currentVolid = rawValue.split(',')[0] === 'none' ? null : rawValue.split(',')[0]
  const isoName = currentVolid ? (currentVolid.split('/').pop() ?? currentVolid) : null

  function openPicker() {
    setPickerStorage(''); setPickerISO(''); setPicking(true)
  }

  return (
    <div className="px-4 py-2.5 text-sm border-b border-border-muted last:border-0 space-y-2">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-text-muted shrink-0 font-medium w-12">{diskKey}</span>
          <span className="text-text-secondary text-xs">{isoName ?? <span className="text-text-disabled italic">Empty</span>}</span>
        </div>
        <div className="flex gap-1.5">
          {currentVolid && (
            <Button size="sm" variant="outline" disabled={isPending} onClick={() => onEject(diskKey)}>
              Eject
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => picking ? setPicking(false) : openPicker()}>
            {picking ? 'Cancel' : 'Mount ISO'}
          </Button>
        </div>
      </div>
      {picking && (
        <div className="grid grid-cols-2 gap-2 pl-15">
          <select
            value={pickerStorage}
            onChange={(e) => { setPickerStorage(e.target.value); setPickerISO('') }}
            className="rounded border border-border bg-bg-card text-text-primary text-xs px-2 py-1 [color-scheme:dark]"
          >
            <option value="">— storage —</option>
            {isoStorages.map((s) => (
              <option key={s.storage} value={s.storage}>{s.storage}</option>
            ))}
          </select>
          <select
            value={pickerISO}
            onChange={(e) => setPickerISO(e.target.value)}
            disabled={!pickerStorage}
            className="rounded border border-border bg-bg-card text-text-primary text-xs px-2 py-1 [color-scheme:dark] disabled:opacity-50"
          >
            <option value="">— iso file —</option>
            {(isoContent ?? []).map((item) => (
              <option key={item.volid} value={item.volid}>
                {item.volid.split('/').pop() ?? item.volid}
              </option>
            ))}
          </select>
          <div className="col-span-2 flex justify-end">
            <Button size="sm" disabled={!pickerISO || isPending}
              onClick={() => { onMount(diskKey, pickerISO); setPicking(false) }}>
              Mount
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Hardware tab ─────────────────────────────────────────────────────────────

function HardwareTab({ node, vmid }: { node: string; vmid: number }) {
  const { data: config } = useVMConfig(node, vmid)
  const updateConfig = useUpdateVMConfig(node, vmid)
  const resizeDisk = useResizeVMDisk(node, vmid)
  const moveDisk = useMoveVMDisk(node, vmid)
  const { data: nodeStorages } = useNodeStorage(node)
  const { data: nodeNetwork } = useNodeNetwork(node)
  const { data: nodePCIDevices } = useNodeHardwarePCI(node)
  const { data: nodeUSBDevices } = useNodeHardwareUSB(node)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [resizingKey, setResizingKey] = useState<string | null>(null)
  const [resizeAmount, setResizeAmount] = useState('+10G')
  const [movingKey, setMovingKey] = useState<string | null>(null)
  const [moveTargetStorage, setMoveTargetStorage] = useState('')
  const [moveDeleteOld, setMoveDeleteOld] = useState(true)
  const [showAddDisk, setShowAddDisk] = useState(false)
  const [addDiskType, setAddDiskType] = useState('scsi')
  const [addDiskStorage, setAddDiskStorage] = useState('')
  const [addDiskSize, setAddDiskSize] = useState('32')
  const [showAddNet, setShowAddNet] = useState(false)
  const [addNetModel, setAddNetModel] = useState('virtio')
  const [addNetBridge, setAddNetBridge] = useState('')
  const [addNetTag, setAddNetTag] = useState('')
  const [editingNetKey, setEditingNetKey] = useState<string | null>(null)
  const [editNetBridge, setEditNetBridge] = useState('')
  const [editNetTag, setEditNetTag] = useState('')
  const [editNetRate, setEditNetRate] = useState('')
  const [showAddPCI, setShowAddPCI] = useState(false)
  const [addPCIId, setAddPCIId] = useState('')
  const [addPCIPcie, setAddPCIPcie] = useState(false)
  const [showAddUSB, setShowAddUSB] = useState(false)
  const [addUSBId, setAddUSBId] = useState('')

  if (!config) return null

  const cfg = config as Record<string, unknown>

  const diskStorages = (nodeStorages ?? []).filter((s) =>
    s.content?.split(',').map((c) => c.trim()).includes('images'),
  )

  const bridges = (nodeNetwork ?? []).filter((n) => n.type === 'bridge').map((n) => n.iface).filter(Boolean)

  function getNextDiskKey(type: string) {
    const existing = Object.keys(cfg).filter((k) => k.startsWith(type) && /\d+$/.test(k))
    const nums = existing.map((k) => parseInt(k.replace(type, ''), 10)).filter((n) => !isNaN(n))
    const next = nums.length ? Math.max(...nums) + 1 : 0
    return `${type}${next}`
  }

  function addDisk() {
    if (!addDiskStorage) return
    const key = getNextDiskKey(addDiskType)
    updateConfig.mutate(
      { [key]: `${addDiskStorage}:${addDiskSize},format=qcow2` },
      { onSuccess: () => { setShowAddDisk(false); setAddDiskSize('32') } },
    )
  }

  function addNetInterface() {
    if (!addNetBridge) return
    const existingNets = Object.keys(cfg).filter((k) => /^net\d+$/.test(k)).map((k) => parseInt(k.slice(3), 10))
    const nextIdx = existingNets.length ? Math.max(...existingNets) + 1 : 0
    const key = `net${nextIdx}`
    const val = addNetTag ? `${addNetModel}=,bridge=${addNetBridge},tag=${addNetTag}` : `${addNetModel}=,bridge=${addNetBridge}`
    updateConfig.mutate(
      { [key]: val },
      { onSuccess: () => { setShowAddNet(false); setAddNetTag('') } }
    )
  }

  function startNetEdit(key: string, parsed: Record<string, string>) {
    setEditingNetKey(key)
    setEditNetBridge(parsed.bridge ?? '')
    setEditNetTag(parsed.tag ?? '')
    setEditNetRate(parsed.rate ?? '')
  }

  function saveNetEdit(key: string, rawVal: string) {
    // Rebuild the net string: preserve model=mac prefix, update bridge/tag/rate
    const parts = rawVal.split(',')
    const prefix = parts[0] // e.g. "virtio=AA:BB:..."
    const existing = Object.fromEntries(parts.slice(1).map((s) => { const i = s.indexOf('='); return i === -1 ? [s, ''] : [s.slice(0, i), s.slice(i + 1)] }))
    const updated: Record<string, string> = { ...existing }
    if (editNetBridge) updated['bridge'] = editNetBridge; else delete updated['bridge']
    if (editNetTag) updated['tag'] = editNetTag; else delete updated['tag']
    if (editNetRate) updated['rate'] = editNetRate; else delete updated['rate']
    const newVal = [prefix, ...Object.entries(updated).map(([k, v]) => v ? `${k}=${v}` : k)].join(',')
    updateConfig.mutate(
      { [key]: newVal },
      { onSuccess: () => setEditingNetKey(null) }
    )
  }

  function startEdit(key: string) {
    setEditingKey(key)
    setEditValue(cfg[key] != null ? String(cfg[key]) : '')
  }
  function cancelEdit() { setEditingKey(null); setEditValue('') }
  function saveEdit(key: string, asNumber?: boolean) {
    const value = asNumber ? Number(editValue) : editValue
    updateConfig.mutate({ [key]: value }, { onSuccess: cancelEdit })
  }

  function mountISO(key: string, volid: string) {
    updateConfig.mutate({ [key]: `${volid},media=cdrom` })
  }
  function ejectISO(key: string) {
    updateConfig.mutate({ [key]: 'none,media=cdrom' })
  }

  const isoStorages = (nodeStorages ?? []).filter((s) =>
    s.content?.split(',').map((c) => c.trim()).includes('iso')
  )

  const editableRows: { key: string; label: string; numeric?: boolean }[] = [
    { key: 'cores',   label: 'CPU Cores',       numeric: true },
    { key: 'sockets', label: 'Sockets',          numeric: true },
    { key: 'cpu',     label: 'CPU Type' },
    { key: 'memory',  label: 'Memory (MiB)',      numeric: true },
    { key: 'balloon', label: 'Balloon Min (MiB)', numeric: true },
  ]
  const selectRows: { key: string; label: string; options: string[] }[] = [
    { key: 'bios',    label: 'BIOS',            options: ['seabios', 'ovmf'] },
    { key: 'machine', label: 'Machine',          options: ['pc', 'q35', 'pc-i440fx-8.1', 'pc-q35-8.1'] },
    { key: 'scsihw',  label: 'SCSI Controller', options: ['virtio-scsi-pci', 'virtio-scsi-single', 'lsi', 'lsi53c810', 'megasas', 'pvscsi'] },
    { key: 'ostype',  label: 'OS Type',          options: ['l26', 'l24', 'other', 'win11', 'win10', 'win8', 'win7', 'w2k8', 'w2k3', 'w2k', 'wvista', 'wxp', 'solaris'] },
  ]
  const readonlyRows: { key: string; label: string }[] = [
    { key: 'vga',     label: 'VGA' },
    { key: 'agent',   label: 'QEMU Agent' },
    { key: 'boot',    label: 'Boot Order' },
  ]

  // Dynamic disk/network keys, split into cdrom vs regular
  const allDriveNetKeys = Object.keys(cfg).filter(
    (k) => /^(scsi|ide|sata|virtio|net)\d+$/.test(k),
  )
  const cdromKeys = allDriveNetKeys.filter((k) => String(cfg[k]).includes('media=cdrom'))
  const diskNetKeys = allDriveNetKeys.filter((k) => !String(cfg[k]).includes('media=cdrom'))

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>CPU &amp; Memory</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border-muted">
            {editableRows.map(({ key, label, numeric }) => {
              const val = cfg[key]
              if (val == null) return null
              const isEditing = editingKey === key
              return (
                <div key={key} className="flex items-center justify-between px-4 py-2.5 text-sm gap-4">
                  <span className="text-text-muted shrink-0">{label}</span>
                  {isEditing ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        autoFocus
                        type={numeric ? 'number' : 'text'}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(key, numeric); if (e.key === 'Escape') cancelEdit() }}
                        className="w-28 rounded border border-border-subtle bg-bg-input px-2 py-0.5 text-sm text-text-primary outline-none focus:border-accent"
                      />
                      <button onClick={() => saveEdit(key, numeric)} disabled={updateConfig.isPending} className="text-status-running hover:opacity-80 disabled:opacity-50">
                        <Check className="size-3.5" />
                      </button>
                      <button onClick={cancelEdit} className="text-text-muted hover:opacity-80">
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-text-primary font-mono">{String(val)}</span>
                      <button onClick={() => startEdit(key)} className="text-text-muted hover:text-text-primary">
                        <Pencil className="size-3" />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>System</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border-muted">
            {selectRows.map(({ key, label, options }) => {
              const val = cfg[key]
              if (val == null) return null
              const isEditing = editingKey === key
              return (
                <div key={key} className="flex items-center justify-between px-4 py-2.5 text-sm gap-4">
                  <span className="text-text-muted shrink-0">{label}</span>
                  {isEditing ? (
                    <div className="flex items-center gap-1.5">
                      <select
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="rounded border border-border-subtle bg-bg-input px-2 py-0.5 text-sm text-text-primary outline-none focus:border-accent [color-scheme:dark]"
                      >
                        {[...new Set([String(val), ...options])].map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                      <button onClick={() => saveEdit(key)} disabled={updateConfig.isPending} className="text-status-running hover:opacity-80 disabled:opacity-50">
                        <Check className="size-3.5" />
                      </button>
                      <button onClick={cancelEdit} className="text-text-muted hover:opacity-80">
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-text-primary font-mono">{String(val)}</span>
                      <button onClick={() => startEdit(key)} className="text-text-muted hover:text-text-primary">
                        <Pencil className="size-3" />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
            {readonlyRows.map(({ key, label }) => {
              const val = cfg[key]
              if (val == null) return null
              return (
                <div key={key} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="text-text-muted">{label}</span>
                  <span className="text-text-primary font-mono">{String(val)}</span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {cdromKeys.length > 0 && (
        <Card>
          <CardHeader><CardTitle>CD-ROM / ISO</CardTitle></CardHeader>
          <CardContent className="p-0">
            {cdromKeys.map((key) => (
              <ISOPickerRow
                key={key}
                diskKey={key}
                rawValue={String(cfg[key])}
                node={node}
                isoStorages={isoStorages}
                onMount={mountISO}
                onEject={ejectISO}
                isPending={updateConfig.isPending}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {diskNetKeys.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle>Disks &amp; Network</CardTitle>
            <div className="flex items-center gap-2">
              {diskStorages.length > 0 && (
                <button
                  onClick={() => { setShowAddDisk((v) => !v); setShowAddNet(false) }}
                  className="flex items-center gap-1 text-xs text-text-muted hover:text-accent border border-border-subtle rounded px-2 py-1"
                >
                  <Plus className="size-3" /> Add Disk
                </button>
              )}
              <button
                onClick={() => { setShowAddNet((v) => !v); setShowAddDisk(false) }}
                className="flex items-center gap-1 text-xs text-text-muted hover:text-accent border border-border-subtle rounded px-2 py-1"
              >
                <Plus className="size-3" /> Add Interface
              </button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {showAddNet && (
              <div className="flex flex-wrap items-end gap-2 px-4 py-3 border-b border-border-muted bg-bg-elevated">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-text-muted">Model</label>
                  <select
                    value={addNetModel}
                    onChange={(e) => setAddNetModel(e.target.value)}
                    className="rounded border border-border-subtle bg-bg-input px-2 py-1 text-xs text-text-primary outline-none [color-scheme:dark]"
                  >
                    {['virtio', 'e1000', 'e1000e', 'rtl8139', 'vmxnet3'].map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-text-muted">Bridge</label>
                  {bridges.length > 0 ? (
                    <select
                      value={addNetBridge}
                      onChange={(e) => setAddNetBridge(e.target.value)}
                      className="rounded border border-border-subtle bg-bg-input px-2 py-1 text-xs text-text-primary outline-none [color-scheme:dark]"
                    >
                      <option value="">Select…</option>
                      {bridges.map((b) => <option key={b} value={b}>{b}</option>)}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={addNetBridge}
                      onChange={(e) => setAddNetBridge(e.target.value)}
                      placeholder="vmbr0"
                      className="w-24 rounded border border-border-subtle bg-bg-input px-2 py-1 text-xs text-text-primary outline-none focus:border-accent"
                    />
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-text-muted">VLAN Tag</label>
                  <input
                    type="number"
                    min={1}
                    max={4094}
                    value={addNetTag}
                    onChange={(e) => setAddNetTag(e.target.value)}
                    placeholder="none"
                    className="w-20 rounded border border-border-subtle bg-bg-input px-2 py-1 text-xs text-text-primary outline-none focus:border-accent [color-scheme:dark]"
                  />
                </div>
                <Button size="sm" disabled={updateConfig.isPending || !addNetBridge} onClick={addNetInterface}>
                  {updateConfig.isPending ? '…' : 'Add'}
                </Button>
                <button onClick={() => setShowAddNet(false)} className="text-text-muted hover:text-text-primary text-xs">Cancel</button>
              </div>
            )}
            {showAddDisk && (
              <div className="flex flex-wrap items-end gap-2 px-4 py-3 border-b border-border-muted bg-bg-elevated">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-text-muted">Bus</label>
                  <select
                    value={addDiskType}
                    onChange={(e) => setAddDiskType(e.target.value)}
                    className="rounded border border-border-subtle bg-bg-input px-2 py-1 text-xs text-text-primary outline-none [color-scheme:dark]"
                  >
                    {['scsi', 'virtio', 'sata', 'ide'].map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-text-muted">Storage</label>
                  <select
                    value={addDiskStorage}
                    onChange={(e) => setAddDiskStorage(e.target.value)}
                    className="rounded border border-border-subtle bg-bg-input px-2 py-1 text-xs text-text-primary outline-none [color-scheme:dark]"
                  >
                    <option value="">Select…</option>
                    {diskStorages.map((s) => <option key={s.storage} value={s.storage}>{s.storage}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-text-muted">Size (GB)</label>
                  <input
                    type="number"
                    min={1}
                    value={addDiskSize}
                    onChange={(e) => setAddDiskSize(e.target.value)}
                    className="w-20 rounded border border-border-subtle bg-bg-input px-2 py-1 text-xs text-text-primary outline-none focus:border-accent [color-scheme:dark]"
                  />
                </div>
                <Button size="sm" disabled={updateConfig.isPending || !addDiskStorage} onClick={addDisk}>
                  {updateConfig.isPending ? '…' : 'Add'}
                </Button>
                <button onClick={() => setShowAddDisk(false)} className="text-text-muted hover:text-text-primary text-xs">Cancel</button>
              </div>
            )}
            <div className="divide-y divide-border-muted">
              {diskNetKeys.map((key) => {
                const isDisk = /^(scsi|ide|sata|virtio)\d+$/.test(key)
                const isResizing = resizingKey === key
                const rawVal = String(cfg[key])
                // Parse network interface properties
                const parsedNet = !isDisk ? Object.fromEntries(
                  rawVal.split(',').map((seg) => { const i = seg.indexOf('='); return i === -1 ? [seg, ''] : [seg.slice(0, i), seg.slice(i + 1)] })
                ) : null
                const netModel = !isDisk ? rawVal.split(',')[0]?.split('=')[0] : null
                const netMac = !isDisk ? rawVal.split(',')[0]?.split('=')[1] : null
                const isMoving = movingKey === key
                return (
                  <div key={key} className="space-y-2 px-4 py-2.5 text-sm">
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-text-muted shrink-0 font-medium">{key}</span>
                      {isDisk ? (
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <span className="text-text-primary font-mono text-right break-all text-xs flex-1">
                            {rawVal}
                          </span>
                          <button
                            onClick={() => { setResizingKey(isResizing ? null : key); setMovingKey(null); setResizeAmount('+10G') }}
                            className="shrink-0 text-xs text-text-muted hover:text-accent border border-border-subtle rounded px-1.5 py-0.5"
                          >
                            Resize
                          </button>
                          <button
                            onClick={() => { setMovingKey(isMoving ? null : key); setResizingKey(null); setMoveTargetStorage('') }}
                            className="shrink-0 text-xs text-text-muted hover:text-accent border border-border-subtle rounded px-1.5 py-0.5"
                          >
                            Move
                          </button>
                          <button
                            onClick={() => { if (confirm(`Detach disk ${key}? The volume will remain in storage.`)) updateConfig.mutate({ delete: key }) }}
                            className="shrink-0 text-xs text-text-muted hover:text-status-error border border-border-subtle rounded px-1.5 py-0.5"
                          >
                            Detach
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1 flex-1 min-w-0">
                          <div className="flex flex-wrap gap-x-4 gap-y-1 items-center">
                            {netModel && <span className="text-xs"><span className="text-text-muted">Model: </span><span className="text-text-primary font-medium">{netModel}</span></span>}
                            {netMac && <span className="text-xs"><span className="text-text-muted">MAC: </span><span className="text-text-primary font-mono">{netMac}</span></span>}
                            {parsedNet?.bridge && <span className="text-xs"><span className="text-text-muted">Bridge: </span><span className="text-text-primary font-medium">{parsedNet.bridge}</span></span>}
                            {parsedNet?.tag && <span className="text-xs"><span className="text-text-muted">VLAN: </span><span className="text-text-primary font-medium">{parsedNet.tag}</span></span>}
                            {parsedNet?.rate && <span className="text-xs"><span className="text-text-muted">Rate: </span><span className="text-text-primary font-medium">{parsedNet.rate}</span></span>}
                            {parsedNet?.firewall === '1' && <span className="text-xs text-status-running">Firewall</span>}
                            {parsedNet?.link_down === '1' && <span className="text-xs text-status-error">Disconnected</span>}
                            <button
                              onClick={() => editingNetKey === key ? setEditingNetKey(null) : startNetEdit(key, parsedNet ?? {})}
                              className="shrink-0 text-xs text-text-muted hover:text-accent border border-border-subtle rounded px-1.5 py-0.5 ml-1"
                            >
                              {editingNetKey === key ? 'Cancel' : 'Edit'}
                            </button>
                          </div>
                          <span className="text-text-muted font-mono text-xs opacity-50 truncate">{rawVal}</span>
                        </div>
                      )}
                    </div>
                    {!isDisk && editingNetKey === key && (
                      <div className="flex items-end gap-3 pl-16 flex-wrap py-1">
                        <div>
                          <label className="block text-xs text-text-muted mb-0.5">Bridge</label>
                          {bridges.length > 0 ? (
                            <select value={editNetBridge} onChange={(e) => setEditNetBridge(e.target.value)}
                              className="rounded border border-border-subtle bg-bg-input px-2 py-1 text-xs text-text-primary outline-none focus:border-accent [color-scheme:dark]">
                              <option value="">— select —</option>
                              {bridges.map((b) => <option key={b} value={b!}>{b}</option>)}
                            </select>
                          ) : (
                            <input value={editNetBridge} onChange={(e) => setEditNetBridge(e.target.value)}
                              className="w-24 rounded border border-border-subtle bg-bg-input px-2 py-1 text-xs text-text-primary outline-none focus:border-accent" />
                          )}
                        </div>
                        <div>
                          <label className="block text-xs text-text-muted mb-0.5">VLAN Tag</label>
                          <input value={editNetTag} onChange={(e) => setEditNetTag(e.target.value)} placeholder="None"
                            className="w-20 rounded border border-border-subtle bg-bg-input px-2 py-1 text-xs text-text-primary outline-none focus:border-accent" />
                        </div>
                        <div>
                          <label className="block text-xs text-text-muted mb-0.5">Rate (MB/s)</label>
                          <input value={editNetRate} onChange={(e) => setEditNetRate(e.target.value)} placeholder="Unlimited"
                            className="w-24 rounded border border-border-subtle bg-bg-input px-2 py-1 text-xs text-text-primary outline-none focus:border-accent" />
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" disabled={updateConfig.isPending} onClick={() => saveNetEdit(key, rawVal)}>
                            {updateConfig.isPending ? '…' : 'Apply'}
                          </Button>
                          <button onClick={() => setEditingNetKey(null)} className="text-text-muted hover:text-text-primary text-xs">Cancel</button>
                        </div>
                      </div>
                    )}
                    {isDisk && isResizing && (
                      <div className="flex items-center gap-2 pl-16">
                        <input
                          autoFocus
                          value={resizeAmount}
                          onChange={(e) => setResizeAmount(e.target.value)}
                          placeholder="+10G"
                          className="w-24 rounded border border-border-subtle bg-bg-input px-2 py-0.5 text-xs text-text-primary outline-none focus:border-accent"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              resizeDisk.mutate({ disk: key, size: resizeAmount }, { onSuccess: () => setResizingKey(null) })
                            }
                            if (e.key === 'Escape') setResizingKey(null)
                          }}
                        />
                        <Button size="sm" disabled={resizeDisk.isPending}
                          onClick={() => resizeDisk.mutate({ disk: key, size: resizeAmount }, { onSuccess: () => setResizingKey(null) })}>
                          {resizeDisk.isPending ? '…' : 'Apply'}
                        </Button>
                        <button onClick={() => setResizingKey(null)} className="text-text-muted hover:text-text-primary text-xs">Cancel</button>
                      </div>
                    )}
                    {isDisk && isMoving && (
                      <div className="flex items-center gap-3 pl-16 flex-wrap">
                        <select value={moveTargetStorage} onChange={(e) => setMoveTargetStorage(e.target.value)}
                          className="rounded border border-border-subtle bg-bg-input px-2 py-1.5 text-xs text-text-primary outline-none focus:border-accent [color-scheme:dark]">
                          <option value="">Target storage…</option>
                          {diskStorages.map((s) => <option key={s.storage} value={s.storage}>{s.storage}</option>)}
                        </select>
                        <label className="flex items-center gap-1.5 text-xs text-text-muted cursor-pointer">
                          <input type="checkbox" checked={moveDeleteOld} onChange={(e) => setMoveDeleteOld(e.target.checked)} />
                          Delete source
                        </label>
                        <Button size="sm" disabled={moveDisk.isPending || !moveTargetStorage}
                          onClick={() => moveDisk.mutate({ disk: key, storage: moveTargetStorage, deleteOld: moveDeleteOld }, { onSuccess: () => setMovingKey(null) })}>
                          {moveDisk.isPending ? '…' : 'Move'}
                        </Button>
                        <button onClick={() => setMovingKey(null)} className="text-text-muted hover:text-text-primary text-xs">Cancel</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* PCI Passthrough */}
      {(() => {
        const pciKeys = Object.keys(cfg).filter((k) => /^hostpci\d+$/.test(k))
        const nextPciKey = `hostpci${pciKeys.length}`
        function addPCI() {
          if (!addPCIId.trim()) return
          const val = addPCIPcie ? `${addPCIId.trim()},pcie=1` : addPCIId.trim()
          updateConfig.mutate({ [nextPciKey]: val }, {
            onSuccess: () => { setShowAddPCI(false); setAddPCIId(''); setAddPCIPcie(false) },
          })
        }
        return (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>PCI Devices</CardTitle>
                <button
                  onClick={() => setShowAddPCI((v) => !v)}
                  className="flex items-center gap-1 text-xs text-text-muted hover:text-accent border border-border-subtle rounded px-2 py-1"
                >
                  <Plus className="size-3" /> Add PCI
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {showAddPCI && (
                <div className="flex flex-wrap items-end gap-2 px-4 py-3 border-b border-border-muted bg-bg-elevated">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-text-muted">PCI Device</label>
                    {nodePCIDevices && nodePCIDevices.length > 0 ? (
                      <select
                        value={addPCIId}
                        onChange={(e) => setAddPCIId(e.target.value)}
                        className="rounded border border-border-subtle bg-bg-input px-2 py-1 text-xs text-text-primary outline-none focus:border-accent [color-scheme:dark]"
                      >
                        <option value="">— select —</option>
                        {nodePCIDevices.map((d) => (
                          <option key={d.id} value={d.id}>{d.id} — {d.device_name ?? d.vendor_name ?? 'Unknown'}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        value={addPCIId}
                        onChange={(e) => setAddPCIId(e.target.value)}
                        placeholder="0000:00:02.0"
                        className="w-36 rounded border border-border-subtle bg-bg-input px-2 py-1 text-xs font-mono text-text-primary outline-none focus:border-accent"
                      />
                    )}
                  </div>
                  <label className="flex items-center gap-1.5 text-xs text-text-muted cursor-pointer">
                    <input type="checkbox" checked={addPCIPcie} onChange={(e) => setAddPCIPcie(e.target.checked)} />
                    PCIe
                  </label>
                  <Button size="sm" disabled={updateConfig.isPending || !addPCIId.trim()} onClick={addPCI}>
                    {updateConfig.isPending ? '…' : 'Add'}
                  </Button>
                  <button onClick={() => setShowAddPCI(false)} className="text-xs text-text-muted hover:text-text-primary">Cancel</button>
                </div>
              )}
              {pciKeys.length === 0 && !showAddPCI ? (
                <p className="px-4 py-6 text-sm text-text-muted text-center">No PCI devices attached</p>
              ) : (
                <div className="divide-y divide-border-muted">
                  {pciKeys.map((k) => (
                    <div key={k} className="flex items-center justify-between px-4 py-2.5 text-sm gap-4">
                      <span className="text-text-muted shrink-0 font-medium">{k}</span>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-text-primary font-mono text-xs break-all flex-1">{String(cfg[k])}</span>
                        <button
                          onClick={() => { if (confirm(`Detach ${k}?`)) updateConfig.mutate({ delete: k }) }}
                          className="shrink-0 text-xs text-text-muted hover:text-status-error border border-border-subtle rounded px-1.5 py-0.5"
                        >
                          Detach
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })()}

      {/* USB Passthrough */}
      {(() => {
        const usbKeys = Object.keys(cfg).filter((k) => /^usb\d+$/.test(k))
        const nextUsbKey = `usb${usbKeys.length}`
        function addUSB() {
          if (!addUSBId.trim()) return
          updateConfig.mutate({ [nextUsbKey]: `host=${addUSBId.trim()}` }, {
            onSuccess: () => { setShowAddUSB(false); setAddUSBId('') },
          })
        }
        return (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>USB Devices</CardTitle>
                <button
                  onClick={() => setShowAddUSB((v) => !v)}
                  className="flex items-center gap-1 text-xs text-text-muted hover:text-accent border border-border-subtle rounded px-2 py-1"
                >
                  <Plus className="size-3" /> Add USB
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {showAddUSB && (
                <div className="flex flex-wrap items-end gap-2 px-4 py-3 border-b border-border-muted bg-bg-elevated">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-text-muted">USB Device</label>
                    {nodeUSBDevices && nodeUSBDevices.length > 0 ? (
                      <select
                        value={addUSBId}
                        onChange={(e) => setAddUSBId(e.target.value)}
                        className="rounded border border-border-subtle bg-bg-input px-2 py-1 text-xs text-text-primary outline-none focus:border-accent [color-scheme:dark]"
                      >
                        <option value="">— select —</option>
                        {nodeUSBDevices.map((d) => {
                          const id = `${d.vendid}:${d.prodid}`
                          const label = d.product ?? d.manufacturer ?? id
                          return <option key={`${d.busnum}-${d.devnum}`} value={id}>{id} — {label}</option>
                        })}
                      </select>
                    ) : (
                      <input
                        value={addUSBId}
                        onChange={(e) => setAddUSBId(e.target.value)}
                        placeholder="1234:5678"
                        className="w-36 rounded border border-border-subtle bg-bg-input px-2 py-1 text-xs font-mono text-text-primary outline-none focus:border-accent"
                      />
                    )}
                  </div>
                  <Button size="sm" disabled={updateConfig.isPending || !addUSBId.trim()} onClick={addUSB}>
                    {updateConfig.isPending ? '…' : 'Add'}
                  </Button>
                  <button onClick={() => setShowAddUSB(false)} className="text-xs text-text-muted hover:text-text-primary">Cancel</button>
                </div>
              )}
              {usbKeys.length === 0 && !showAddUSB ? (
                <p className="px-4 py-6 text-sm text-text-muted text-center">No USB devices attached</p>
              ) : (
                <div className="divide-y divide-border-muted">
                  {usbKeys.map((k) => (
                    <div key={k} className="flex items-center justify-between px-4 py-2.5 text-sm gap-4">
                      <span className="text-text-muted shrink-0 font-medium">{k}</span>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-text-primary font-mono text-xs break-all flex-1">{String(cfg[k])}</span>
                        <button
                          onClick={() => { if (confirm(`Detach ${k}?`)) updateConfig.mutate({ delete: k }) }}
                          className="shrink-0 text-xs text-text-muted hover:text-status-error border border-border-subtle rounded px-1.5 py-0.5"
                        >
                          Detach
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })()}
    </div>
  )
}

// ── Agent tab ────────────────────────────────────────────────────────────────

function AgentTab({ node, vmid, isRunning }: { node: string; vmid: number; isRunning: boolean }) {
  const { data: osRaw, isLoading: osLoading, isError: osErr } = useVMAgentOsInfo(node, vmid, isRunning)
  const { data: netRaw, isLoading: netLoading, isError: netErr } = useVMAgentNetworkInterfaces(node, vmid, isRunning)
  const { data: fsRaw, isLoading: fsLoading } = useVMAgentFsInfo(node, vmid, isRunning)

  if (!isRunning) {
    return (
      <div className="flex items-center justify-center py-20 text-text-muted text-sm">
        VM must be running to read guest agent data.
      </div>
    )
  }

  const osInfo = (osRaw as Record<string, unknown> | undefined)?.result as Record<string, unknown> | undefined
  const ifaces = ((netRaw as Record<string, unknown> | undefined)?.result as { name: string; 'ip-addresses'?: { 'ip-address': string; 'ip-address-type': string; prefix: number }[]; statistics?: Record<string, number> }[] | undefined) ?? []
  type FsEntry = { name: string; mountpoint: string; type: string; 'total-bytes'?: number; 'used-bytes'?: number; disk?: { dev: string }[] }
  const fsEntries = ((fsRaw as Record<string, unknown> | undefined)?.result as FsEntry[] | undefined) ?? []

  return (
    <div className="space-y-4">
      {/* OS info */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Cpu className="size-4" />Guest OS Information</CardTitle></CardHeader>
        <CardContent className="p-0">
          {osLoading && <p className="px-4 py-6 text-sm text-text-muted animate-pulse">Loading…</p>}
          {osErr && <p className="px-4 py-6 text-sm text-status-error">Agent not available — make sure QEMU Guest Agent is installed and running.</p>}
          {osInfo && (
            <dl className="divide-y divide-border-muted">
              {([
                ['Name',    osInfo['name']],
                ['Version', osInfo['version']],
                ['Kernel',  osInfo['kernel-version']],
                ['Machine', osInfo['machine']],
                ['Vendor',  osInfo['vendor']],
              ] as [string, unknown][]).filter(([, v]) => v != null).map(([label, value]) => (
                <div key={label} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="text-text-muted">{label}</span>
                  <span className="text-text-primary font-mono text-xs">{String(value)}</span>
                </div>
              ))}
            </dl>
          )}
        </CardContent>
      </Card>

      {/* Filesystem info */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><HardDrive className="size-4" />Guest Filesystems</CardTitle></CardHeader>
        <CardContent className="p-0">
          {fsLoading && <p className="px-4 py-6 text-sm text-text-muted animate-pulse">Loading…</p>}
          {!fsLoading && fsEntries.length === 0 && (
            <p className="px-4 py-6 text-sm text-text-muted">Filesystem data unavailable.</p>
          )}
          {fsEntries.length > 0 && (
            <div className="divide-y divide-border-muted">
              {fsEntries.map((fs) => {
                const total = fs['total-bytes'] ?? 0
                const used = fs['used-bytes'] ?? 0
                const pct = total > 0 ? Math.round((used / total) * 100) : null
                const fmt = (b: number) => b >= 1e9 ? `${(b / 1e9).toFixed(1)} GB` : b >= 1e6 ? `${(b / 1e6).toFixed(0)} MB` : `${b} B`
                const barColor = pct == null ? 'bg-accent' : pct >= 90 ? 'bg-status-error' : pct >= 75 ? 'bg-status-warning' : 'bg-accent'
                return (
                  <div key={fs.mountpoint} className="px-4 py-3 space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-text-primary truncate">{fs.mountpoint}</span>
                        <span className="text-xs text-text-muted shrink-0 bg-bg-elevated border border-border-muted rounded px-1.5 py-0.5">{fs.type}</span>
                      </div>
                      <span className="text-xs text-text-muted shrink-0 ml-3">
                        {total > 0 ? `${fmt(used)} / ${fmt(total)}` : '—'}
                      </span>
                    </div>
                    {pct != null && (
                      <div className="w-full h-1.5 rounded-full bg-bg-elevated overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                      </div>
                    )}
                    {fs.disk && fs.disk.length > 0 && (
                      <p className="text-xs text-text-muted font-mono">{fs.disk.map((d) => d.dev).join(', ')}</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Network interfaces */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Network className="size-4" />Guest Network Interfaces</CardTitle></CardHeader>
        <CardContent className="p-0">
          {netLoading && <p className="px-4 py-6 text-sm text-text-muted animate-pulse">Loading…</p>}
          {netErr && <p className="px-4 py-6 text-sm text-status-error">Network interface data unavailable.</p>}
          {ifaces.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Interface</TableHead>
                  <TableHead>IP Addresses</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ifaces.map((iface) => (
                  <TableRow key={iface.name}>
                    <TableCell className="font-mono text-sm text-text-primary">{iface.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        {(iface['ip-addresses'] ?? []).map((ip) => (
                          <span key={`${ip['ip-address']}`} className="font-mono text-xs text-text-secondary">
                            {ip['ip-address']}/{ip.prefix}
                            <span className="ml-1.5 text-text-muted">({ip['ip-address-type']})</span>
                          </span>
                        ))}
                        {(!iface['ip-addresses'] || iface['ip-addresses'].length === 0) && (
                          <span className="text-text-muted text-xs">—</span>
                        )}
                      </div>
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

// ── Snapshots tab ────────────────────────────────────────────────────────────

function SnapshotsTab({ node, vmid }: { node: string; vmid: number }) {
  const { data: snapshots } = useVMSnapshots(node, vmid)
  const createSnap = useCreateVMSnapshot(node, vmid)
  const deleteSnap = useDeleteVMSnapshot(node, vmid)
  const rollbackSnap = useRollbackVMSnapshot(node, vmid)

  const [showForm, setShowForm] = useState(false)
  const [snapname, setSnapname] = useState('')
  const [description, setDescription] = useState('')
  const [vmstate, setVmstate] = useState(false)

  function handleCreate() {
    if (!snapname.trim()) return
    createSnap.mutate(
      { snapname: snapname.trim(), description: description.trim() || undefined, vmstate: vmstate ? 1 : 0 },
      {
        onSuccess: () => {
          setSnapname('')
          setDescription('')
          setVmstate(false)
          setShowForm(false)
        },
      }
    )
  }

  const listed = snapshots?.filter((s) => s.name !== 'current') ?? []

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
            <div className="flex items-center gap-2">
              <input
                id="vmstate-cb"
                type="checkbox"
                checked={vmstate}
                onChange={(e) => setVmstate(e.target.checked)}
                className="accent-accent"
              />
              <label htmlFor="vmstate-cb" className="text-sm text-text-secondary cursor-pointer">
                Include RAM (vmstate)
              </label>
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
          <div className="divide-y divide-border-muted">
            {listed.length === 0 ? (
              <p className="text-center text-text-muted text-sm py-10">No snapshots</p>
            ) : (
              listed.map((snap) => (
                <div key={snap.name} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium text-text-primary">{snap.name}</p>
                    {snap.description && (
                      <p className="text-xs text-text-muted">{snap.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {snap.snaptime && (
                      <span className="text-xs text-text-muted mr-2">
                        {new Date(snap.snaptime * 1000).toLocaleDateString()}
                      </span>
                    )}
                    <button
                      onClick={() => rollbackSnap.mutate(snap.name)}
                      disabled={rollbackSnap.isPending}
                      className="inline-flex items-center gap-1 rounded border border-border-muted px-2 py-0.5 text-xs text-text-secondary hover:bg-bg-hover disabled:opacity-50"
                    >
                      <RotateCcw className="size-3" />
                      Rollback
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete snapshot "${snap.name}"?`)) deleteSnap.mutate(snap.name)
                      }}
                      disabled={deleteSnap.isPending}
                      className="inline-flex items-center gap-1 rounded border border-status-error/40 px-2 py-0.5 text-xs text-status-error hover:bg-status-error/10 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Options tab ──────────────────────────────────────────────────────────────

function VMOptionsTab({ node, vmid }: { node: string; vmid: number }) {
  const { data: config } = useVMConfig(node, vmid)
  const updateConfig = useUpdateVMConfig(node, vmid)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [editStartup, setEditStartup] = useState(false)
  const [sOrder, setSOrder] = useState('')
  const [sUp, setSUp] = useState('')
  const [sDown, setSDown] = useState('')

  if (!config) return null

  // Boolean toggle options
  const boolOpts: { key: string; label: string }[] = [
    { key: 'onboot',     label: 'Start at boot' },
    { key: 'protection', label: 'Protection' },
    { key: 'acpi',       label: 'ACPI' },
    { key: 'tablet',     label: 'USB Tablet' },
    { key: 'numa',       label: 'NUMA' },
    { key: 'localtime',  label: 'Local time' },
  ]

  // Text-editable options
  const textOpts: { key: string; label: string }[] = [
    { key: 'description', label: 'Description' },
    { key: 'tags',        label: 'Tags' },
    { key: 'hookscript',  label: 'Hook script' },
  ]

  // Read-only display options
  const readOpts: { key: string; label: string; fmt?: (v: unknown) => string }[] = [
    { key: 'kvm',      label: 'KVM',          fmt: (v) => v != null ? (v ? 'Enabled' : 'Disabled') : 'Default' },
    { key: 'agent',    label: 'QEMU Agent',   fmt: (v) => String(v ?? '—') },
    { key: 'balloon',  label: 'Balloon',      fmt: (v) => String(v ?? '0') },
    { key: 'startdate', label: 'Start date',  fmt: (v) => String(v ?? '—') },
  ]

  // Startup order
  const startupRaw = config['startup' as keyof typeof config] as string | undefined
  function parseStartup(raw: unknown) {
    const s = String(raw ?? '')
    const get = (k: string) => s.split(',').find((p) => p.startsWith(`${k}=`))?.slice(k.length + 1) ?? ''
    return { order: get('order'), up: get('up'), down: get('down') }
  }
  const startupParsed = parseStartup(startupRaw)

  function openStartupEdit() {
    setSOrder(startupParsed.order)
    setSUp(startupParsed.up)
    setSDown(startupParsed.down)
    setEditStartup(true)
  }
  function saveStartup() {
    const parts: string[] = []
    if (sOrder) parts.push(`order=${sOrder}`)
    if (sUp)    parts.push(`up=${sUp}`)
    if (sDown)  parts.push(`down=${sDown}`)
    updateConfig.mutate({ startup: parts.join(',') || undefined }, { onSuccess: () => setEditStartup(false) })
  }

  const HOTPLUG_FEATURES = ['network', 'disk', 'cpu', 'memory', 'usb'] as const
  const hotplugRaw = config['hotplug' as keyof typeof config] as string | number | undefined
  const hotplugEnabled: string[] = (() => {
    if (hotplugRaw == null) return ['network', 'disk']
    if (hotplugRaw === 1 || hotplugRaw === '1') return [...HOTPLUG_FEATURES]
    if (hotplugRaw === 0 || hotplugRaw === '0') return []
    return String(hotplugRaw).split(',').map((s) => s.trim()).filter(Boolean)
  })()

  function toggleHotplug(feature: string) {
    const newSet = hotplugEnabled.includes(feature)
      ? hotplugEnabled.filter((f) => f !== feature)
      : [...hotplugEnabled, feature]
    updateConfig.mutate({ hotplug: newSet.join(',') || '0' })
  }

  function startEdit(key: string) {
    setEditingKey(key)
    const val = config![key as keyof typeof config]
    setEditValue(val != null ? String(val) : '')
  }

  function cancelEdit() { setEditingKey(null); setEditValue('') }

  function saveEdit(key: string) {
    updateConfig.mutate({ [key]: editValue }, { onSuccess: cancelEdit })
  }

  function toggleBool(key: string) {
    const cur = config![key as keyof typeof config]
    updateConfig.mutate({ [key]: cur ? 0 : 1 })
  }

  return (
    <Card>
      <CardHeader><CardTitle>VM Options</CardTitle></CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border-muted">
          {/* Boolean toggles */}
          {boolOpts.map(({ key, label }) => {
            const val = config[key as keyof typeof config]
            const isOn = !!val
            return (
              <div key={key} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="text-text-muted">{label}</span>
                <button
                  onClick={() => toggleBool(key)}
                  disabled={updateConfig.isPending}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${
                    isOn ? 'bg-accent' : 'bg-border-muted'
                  }`}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    isOn ? 'translate-x-4' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            )
          })}

          {/* Text-editable options */}
          {textOpts.map(({ key, label }) => {
            const val = config[key as keyof typeof config]
            const isEditing = editingKey === key
            return (
              <div key={key} className="flex items-center justify-between px-4 py-2.5 text-sm gap-4">
                <span className="text-text-muted shrink-0">{label}</span>
                {isEditing ? (
                  <div className="flex items-center gap-1.5 flex-1 justify-end">
                    <input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(key); if (e.key === 'Escape') cancelEdit() }}
                      className="w-full max-w-xs rounded border border-border-subtle bg-bg-input px-2 py-0.5 text-sm text-text-primary outline-none focus:border-accent"
                    />
                    <button
                      onClick={() => saveEdit(key)}
                      disabled={updateConfig.isPending}
                      className="text-status-running hover:opacity-80 disabled:opacity-50"
                    >
                      <Check className="size-3.5" />
                    </button>
                    <button onClick={cancelEdit} className="text-text-muted hover:opacity-80">
                      <X className="size-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-text-primary text-right">{val != null ? String(val) : '—'}</span>
                    <button
                      onClick={() => startEdit(key)}
                      className="text-text-muted hover:text-text-primary"
                    >
                      <Pencil className="size-3" />
                    </button>
                  </div>
                )}
              </div>
            )
          })}

          {/* Read-only options */}
          {readOpts.map(({ key, label, fmt }) => {
            const val = config[key as keyof typeof config]
            if (val == null) return null
            return (
              <div key={key} className="flex items-start justify-between px-4 py-2.5 text-sm gap-4">
                <span className="text-text-muted shrink-0">{label}</span>
                <span className="text-text-primary text-right">{fmt ? fmt(val) : String(val)}</span>
              </div>
            )
          })}

          {/* Startup order */}
          <div className="flex items-start justify-between px-4 py-2.5 text-sm gap-4">
            <span className="text-text-muted shrink-0 mt-0.5">Startup order</span>
            {editStartup ? (
              <div className="flex flex-col gap-2 flex-1 items-end">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-text-muted w-14 text-right">Order</label>
                  <input value={sOrder} onChange={(e) => setSOrder(e.target.value)} placeholder="1" className="w-20 rounded border border-border-subtle bg-bg-input px-2 py-0.5 text-sm font-mono text-text-primary outline-none focus:border-accent" />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-text-muted w-14 text-right">Up delay</label>
                  <input value={sUp} onChange={(e) => setSUp(e.target.value)} placeholder="0" className="w-20 rounded border border-border-subtle bg-bg-input px-2 py-0.5 text-sm font-mono text-text-primary outline-none focus:border-accent" />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-text-muted w-14 text-right">Down delay</label>
                  <input value={sDown} onChange={(e) => setSDown(e.target.value)} placeholder="0" className="w-20 rounded border border-border-subtle bg-bg-input px-2 py-0.5 text-sm font-mono text-text-primary outline-none focus:border-accent" />
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <button onClick={saveStartup} disabled={updateConfig.isPending} className="text-status-running hover:opacity-80 disabled:opacity-50"><Check className="size-3.5" /></button>
                  <button onClick={() => setEditStartup(false)} className="text-text-muted hover:opacity-80"><X className="size-3.5" /></button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-text-primary font-mono text-right">
                  {startupRaw ?? <span className="text-text-muted not-italic">—</span>}
                </span>
                <button onClick={openStartupEdit} className="text-text-muted hover:text-text-primary"><Pencil className="size-3" /></button>
              </div>
            )}
          </div>

          {/* Hotplug multi-select */}
          <div className="flex items-center justify-between px-4 py-2.5 text-sm gap-4">
            <span className="text-text-muted shrink-0">Hotplug</span>
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              {HOTPLUG_FEATURES.map((feature) => {
                const active = hotplugEnabled.includes(feature)
                return (
                  <button
                    key={feature}
                    onClick={() => toggleHotplug(feature)}
                    disabled={updateConfig.isPending}
                    className={`rounded border px-2 py-0.5 text-xs transition-colors disabled:opacity-50 ${
                      active
                        ? 'border-accent bg-accent/20 text-text-primary'
                        : 'border-border-subtle text-text-muted hover:border-accent/50'
                    }`}
                  >
                    {feature}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Boot order */}
          {(() => {
            const bootVal = config['boot' as keyof typeof config] as string | undefined
            const bootStr = bootVal ?? ''
            const bootDevices = bootStr.replace(/^order=/, '').split(';').filter(Boolean)
            const isEditing = editingKey === 'boot'
            return (
              <div className="flex items-center justify-between px-4 py-2.5 text-sm gap-4">
                <span className="text-text-muted shrink-0">Boot Order</span>
                {isEditing ? (
                  <div className="flex items-center gap-1.5 flex-1 justify-end">
                    <input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      placeholder="order=scsi0;net0;ide2"
                      onKeyDown={(e) => { if (e.key === 'Enter') saveEdit('boot'); if (e.key === 'Escape') cancelEdit() }}
                      className="w-full max-w-xs rounded border border-border-subtle bg-bg-input px-2 py-0.5 text-sm font-mono text-text-primary outline-none focus:border-accent"
                    />
                    <button onClick={() => saveEdit('boot')} disabled={updateConfig.isPending} className="text-status-running hover:opacity-80 disabled:opacity-50">
                      <Check className="size-3.5" />
                    </button>
                    <button onClick={cancelEdit} className="text-text-muted hover:opacity-80">
                      <X className="size-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {bootDevices.length > 0 ? (
                      <div className="flex items-center gap-1 flex-wrap">
                        {bootDevices.map((dev, i) => (
                          <span key={dev} className="inline-flex items-center gap-1 text-xs">
                            {i > 0 && <span className="text-text-muted">→</span>}
                            <span className="rounded bg-bg-elevated border border-border-muted px-1.5 py-0.5 font-mono text-text-primary">{dev}</span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-text-muted">—</span>
                    )}
                    <button
                      onClick={() => { setEditingKey('boot'); setEditValue(bootStr || 'order=') }}
                      className="text-text-muted hover:text-text-primary"
                    >
                      <Pencil className="size-3" />
                    </button>
                  </div>
                )}
              </div>
            )
          })()}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Cloud-Init tab ────────────────────────────────────────────────────────────

function CloudInitTab({ node, vmid }: { node: string; vmid: number }) {
  const { data: config } = useVMConfig(node, vmid)
  const updateConfig = useUpdateVMConfig(node, vmid)
  const regenCI = useRegenerateCloudInit(node, vmid)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  if (!config) return null

  const hasCiDrive = Object.keys(config).some(
    (k) => /^(ide|scsi|sata|virtio)\d+$/.test(k) &&
      String(config[k as keyof typeof config]).includes('cloudinit'),
  )

  if (!hasCiDrive) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-border">
        <p className="text-text-muted text-sm">No Cloud-Init drive detected on this VM</p>
      </div>
    )
  }

  const ipconfigs = Object.keys(config)
    .filter((k) => /^ipconfig\d+$/.test(k))
    .sort()

  const sshkeys = config['sshkeys' as keyof typeof config] as string | undefined

  const editableFields: { key: string; label: string; type?: 'password' }[] = [
    { key: 'ciuser',       label: 'Username' },
    { key: 'cipassword',   label: 'Password', type: 'password' },
    { key: 'nameserver',   label: 'DNS Server' },
    { key: 'searchdomain', label: 'Search Domain' },
  ]

  function startEdit(key: string) {
    setEditingKey(key)
    const val = config![key as keyof typeof config]
    setEditValue(key === 'cipassword' ? '' : (val != null ? String(val) : ''))
  }

  function cancelEdit() { setEditingKey(null); setEditValue('') }

  function saveEdit(key: string) {
    updateConfig.mutate({ [key]: editValue }, { onSuccess: cancelEdit })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-text-secondary">Cloud-Init Configuration</h2>
        <Button
          size="sm"
          variant="outline"
          disabled={regenCI.isPending}
          onClick={() => regenCI.mutate()}
        >
          <RotateCcw className="size-3.5 mr-1.5" />
          {regenCI.isPending ? 'Regenerating…' : 'Regenerate'}
        </Button>
      </div>
      <Card>
        <CardHeader><CardTitle>User &amp; Credentials</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border-muted">
            {editableFields.map(({ key, label, type }) => {
              const val = config[key as keyof typeof config]
              const isEditing = editingKey === key
              const displayVal = key === 'cipassword'
                ? (val != null ? '••••••••' : '—')
                : (val != null ? String(val) : '—')
              return (
                <div key={key} className="flex items-center justify-between px-4 py-2.5 text-sm gap-4">
                  <span className="text-text-muted shrink-0">{label}</span>
                  {isEditing ? (
                    <div className="flex items-center gap-1.5 flex-1 justify-end">
                      <input
                        autoFocus
                        type={type ?? 'text'}
                        value={editValue}
                        placeholder={type === 'password' ? 'New password' : undefined}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(key); if (e.key === 'Escape') cancelEdit() }}
                        className="w-full max-w-xs rounded border border-border-subtle bg-bg-input px-2 py-0.5 text-sm text-text-primary outline-none focus:border-accent"
                      />
                      <button
                        onClick={() => saveEdit(key)}
                        disabled={updateConfig.isPending}
                        className="text-status-running hover:opacity-80 disabled:opacity-50"
                      >
                        <Check className="size-3.5" />
                      </button>
                      <button onClick={cancelEdit} className="text-text-muted hover:opacity-80">
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className={`font-mono ${key === 'cipassword' ? 'text-text-muted tracking-widest' : 'text-text-primary'}`}>
                        {displayVal}
                      </span>
                      <button
                        onClick={() => startEdit(key)}
                        className="text-text-muted hover:text-text-primary"
                      >
                        <Pencil className="size-3" />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {ipconfigs.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Network (IP Config)</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border-muted">
              {ipconfigs.map((key) => {
                const isEditing = editingKey === key
                const val = config[key as keyof typeof config]
                return (
                  <div key={key} className="flex items-center justify-between px-4 py-2.5 text-sm gap-4">
                    <span className="text-text-muted shrink-0">{key}</span>
                    {isEditing ? (
                      <div className="flex items-center gap-1.5 flex-1 justify-end">
                        <input
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(key); if (e.key === 'Escape') cancelEdit() }}
                          className="w-full max-w-xs rounded border border-border-subtle bg-bg-input px-2 py-0.5 text-xs font-mono text-text-primary outline-none focus:border-accent"
                        />
                        <button
                          onClick={() => saveEdit(key)}
                          disabled={updateConfig.isPending}
                          className="text-status-running hover:opacity-80 disabled:opacity-50"
                        >
                          <Check className="size-3.5" />
                        </button>
                        <button onClick={cancelEdit} className="text-text-muted hover:opacity-80">
                          <X className="size-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-text-primary font-mono text-right break-all text-xs">
                          {val != null ? String(val) : '—'}
                        </span>
                        <button
                          onClick={() => startEdit(key)}
                          className="text-text-muted hover:text-text-primary shrink-0"
                        >
                          <Pencil className="size-3" />
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {sshkeys && (
        <Card>
          <CardHeader><CardTitle>SSH Keys</CardTitle></CardHeader>
          <CardContent>
            <pre className="text-xs font-mono text-text-secondary whitespace-pre-wrap break-all">
              {decodeURIComponent(String(sshkeys))}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ── Firewall tab ──────────────────────────────────────────────────────────────

function FirewallActionBadge({ action }: { action: string }) {
  const color =
    action === 'ACCEPT' ? 'text-status-running bg-status-running/10' :
    action === 'DROP'   ? 'text-status-error bg-status-error/10' :
    action === 'REJECT' ? 'text-status-stopped bg-status-stopped/10' :
                          'text-text-muted bg-bg-elevated'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      {action}
    </span>
  )
}

function VMFirewallTab({ node, vmid }: { node: string; vmid: number }) {
  const { data: rules  } = useVMFirewallRules(node, vmid)
  const { data: options } = useVMFirewallOptions(node, vmid)
  const createRule = useCreateVMFirewallRule(node, vmid)
  const deleteRule = useDeleteVMFirewallRule(node, vmid)
  const updateRule = useUpdateVMFirewallRule(node, vmid)
  const updateOptions = useUpdateVMFirewallOptions(node, vmid)
  const [showAdd, setShowAdd] = useState(false)
  const [editingPolicy, setEditingPolicy] = useState<'policy_in' | 'policy_out' | null>(null)
  const [dir, setDir] = useState('in')
  const [action, setAction] = useState('ACCEPT')
  const [macro, setMacro] = useState('')
  const [proto, setProto] = useState('')
  const [src, setSrc] = useState('')
  const [dest, setDest] = useState('')
  const [dport, setDport] = useState('')
  const [comment, setComment] = useState('')

  // Edit rule state
  const [editingPos,  setEditingPos]  = useState<number | null>(null)
  const [editDir,     setEditDir]     = useState('in')
  const [editAction,  setEditAction]  = useState('ACCEPT')
  const [editMacro,   setEditMacro]   = useState('')
  const [editProto,   setEditProto]   = useState('')
  const [editSrc,     setEditSrc]     = useState('')
  const [editDest,    setEditDest]    = useState('')
  const [editDport,   setEditDport]   = useState('')
  const [editComment, setEditComment] = useState('')

  function startEdit(rule: import('@zyphercenter/proxmox-types').FirewallRule) {
    setEditingPos(rule.pos)
    setEditDir(rule.type)
    setEditAction(rule.action)
    setEditMacro(rule.macro ?? '')
    setEditProto(rule.proto ?? '')
    setEditSrc(rule.source ?? '')
    setEditDest(rule.dest ?? '')
    setEditDport(rule.dport ?? rule.sport ?? '')
    setEditComment(rule.comment ?? '')
  }

  function submitEdit() {
    if (editingPos === null) return
    updateRule.mutate(
      {
        pos: editingPos,
        params: {
          type: editDir,
          action: editAction,
          macro: editMacro || undefined,
          proto: editProto || undefined,
          source: editSrc || undefined,
          dest: editDest || undefined,
          dport: editDport || undefined,
          comment: editComment || undefined,
        },
      },
      { onSuccess: () => setEditingPos(null) },
    )
  }

  const enabled = options?.enable === 1
  const inp = 'w-full rounded border border-border-subtle bg-bg-input px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent [color-scheme:dark]'

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
                  <option value="in">IN</option>
                  <option value="out">OUT</option>
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

      {editingPos !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setEditingPos(null)}>
          <div
            className="bg-bg-card border border-border-subtle rounded-xl shadow-2xl w-full max-w-md p-6 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-semibold text-text-primary">Edit Firewall Rule #{editingPos}</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-text-secondary mb-1">Direction</label>
                <select value={editDir} onChange={(e) => setEditDir(e.target.value)} className={inp}>
                  <option value="in">IN</option>
                  <option value="out">OUT</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">Action</label>
                <select value={editAction} onChange={(e) => setEditAction(e.target.value)} className={inp}>
                  <option>ACCEPT</option><option>DROP</option><option>REJECT</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Macro (optional)</label>
              <input value={editMacro} onChange={(e) => setEditMacro(e.target.value)} placeholder="SSH, HTTP, HTTPS…" className={inp} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-text-secondary mb-1">Source</label>
                <input value={editSrc} onChange={(e) => setEditSrc(e.target.value)} placeholder="any" className={inp} />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">Dest</label>
                <input value={editDest} onChange={(e) => setEditDest(e.target.value)} placeholder="any" className={inp} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-text-secondary mb-1">Protocol</label>
                <select value={editProto} onChange={(e) => setEditProto(e.target.value)} className={inp}>
                  <option value="">any</option><option value="tcp">tcp</option><option value="udp">udp</option><option value="icmp">icmp</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">Dest Port</label>
                <input value={editDport} onChange={(e) => setEditDport(e.target.value)} placeholder="80,443" className={inp} />
              </div>
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Comment</label>
              <input value={editComment} onChange={(e) => setEditComment(e.target.value)} className={inp} />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" size="sm" onClick={() => setEditingPos(null)}>Cancel</Button>
              <Button size="sm" onClick={submitEdit} disabled={updateRule.isPending}>
                {updateRule.isPending ? 'Saving…' : 'Save Changes'}
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
              <button
                onClick={() => updateOptions.mutate({ enable: enabled ? 0 : 1 })}
                disabled={updateOptions.isPending}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${enabled ? 'bg-accent' : 'bg-border-muted'}`}
                title={enabled ? 'Enabled — click to disable' : 'Disabled — click to enable'}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-4' : 'translate-x-1'}`} />
              </button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border-muted">
              {(['policy_in', 'policy_out'] as const).map((key) => {
                const val = options[key]
                const isEditing = editingPolicy === key
                return (
                  <div key={key} className="flex items-center justify-between px-4 py-2.5 text-sm gap-4">
                    <span className="text-text-muted">{key === 'policy_in' ? 'Default policy (in)' : 'Default policy (out)'}</span>
                    {isEditing ? (
                      <select
                        autoFocus
                        defaultValue={val ?? 'ACCEPT'}
                        onChange={(e) => {
                          updateOptions.mutate({ [key]: e.target.value }, { onSuccess: () => setEditingPolicy(null) })
                        }}
                        onBlur={() => setEditingPolicy(null)}
                        className="rounded border border-border-subtle bg-bg-input px-2 py-0.5 text-sm text-text-primary outline-none focus:border-accent [color-scheme:dark]"
                      >
                        {['ACCEPT', 'DROP', 'REJECT'].map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    ) : (
                      <button onClick={() => setEditingPolicy(key)} className="flex items-center gap-1.5 hover:opacity-80" title="Click to change policy">
                        <FirewallActionBadge action={val ?? 'ACCEPT'} />
                      </button>
                    )}
                  </div>
                )
              })}
              {(['dhcp', 'ipfilter', 'macfilter', 'ndp', 'radv'] as const).map((key) => {
                const val = options[key]
                if (val == null) return null
                return (
                  <div key={key} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <span className="text-text-muted capitalize">{key.replace(/_/g, ' ')}</span>
                    <button
                      onClick={() => updateOptions.mutate({ [key]: val ? 0 : 1 })}
                      disabled={updateOptions.isPending}
                      className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors disabled:opacity-50 ${val ? 'bg-accent' : 'bg-border-muted'}`}
                    >
                      <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${val ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                    </button>
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
                    <TableCell>
                      <span className="text-xs uppercase font-medium text-text-secondary">{rule.type}</span>
                    </TableCell>
                    <TableCell><FirewallActionBadge action={rule.action} /></TableCell>
                    <TableCell className="text-text-secondary text-sm">{rule.macro ?? rule.proto ?? '—'}</TableCell>
                    <TableCell className="font-mono text-xs text-text-secondary">{rule.source ?? '—'}</TableCell>
                    <TableCell className="font-mono text-xs text-text-secondary">{rule.dest ?? '—'}</TableCell>
                    <TableCell className="font-mono text-xs text-text-secondary">{rule.dport ?? rule.sport ?? '—'}</TableCell>
                    <TableCell className="text-text-muted text-xs max-w-[180px] truncate">{rule.comment ?? ''}</TableCell>
                    <TableCell>
                      <button
                        onClick={() => updateRule.mutate({ pos: rule.pos, params: { enable: rule.enable === 0 ? 1 : 0 } })}
                        disabled={updateRule.isPending}
                        className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors disabled:opacity-50 ${rule.enable !== 0 ? 'bg-accent' : 'bg-border-muted'}`}
                        title={rule.enable !== 0 ? 'Enabled — click to disable' : 'Disabled — click to enable'}
                      >
                        <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${rule.enable !== 0 ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => startEdit(rule)}
                          className="inline-flex items-center gap-1 rounded border border-border-subtle px-2 py-0.5 text-xs text-text-muted hover:text-text-primary hover:bg-bg-elevated"
                        >
                          <Pencil className="size-3" />
                        </button>
                        <button
                          onClick={() => { if (confirm(`Delete rule #${rule.pos}?`)) deleteRule.mutate(rule.pos) }}
                          disabled={deleteRule.isPending}
                          className="inline-flex items-center gap-1 rounded border border-status-error/40 px-2 py-0.5 text-xs text-status-error hover:bg-status-error/10 disabled:opacity-50"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </div>
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

// ── Backups tab ───────────────────────────────────────────────────────────────

function VMBackupsTab({ node, vmid }: { node: string; vmid: number }) {
  const { data: jobs } = useClusterBackupJobs()
  const { data: tasks } = useNodeTasksFiltered(node, { vmid, typefilter: 'vzdump', limit: 20 })
  const { data: allStorages } = useStorage()
  const vzdump = useVzdump(node)

  const [showBackupForm, setShowBackupForm] = useState(false)
  const [bkStorage, setBkStorage] = useState('')
  const [bkMode, setBkMode] = useState('snapshot')
  const [bkCompress, setBkCompress] = useState('zstd')

  const backupStorages = (allStorages ?? []).filter((s) =>
    s.content?.split(',').map((c) => c.trim()).includes('backup')
  )

  function runBackup() {
    if (!bkStorage) return
    vzdump.mutate(
      { vmid, storage: bkStorage, mode: bkMode, compress: bkCompress },
      { onSuccess: () => setShowBackupForm(false) }
    )
  }

  // Filter backup jobs that include this vmid
  const relatedJobs = (jobs ?? []).filter((j) => {
    if (!j.vmid) return true // empty = all VMs
    return String(j.vmid).split(',').map(Number).includes(vmid)
  })

  return (
    <div className="space-y-4">
      {/* Backup Now */}
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={() => setShowBackupForm((v) => !v)}>
          <Archive className="size-3.5 mr-1.5" />{showBackupForm ? 'Cancel' : 'Backup Now'}
        </Button>
      </div>
      {showBackupForm && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">On-Demand Backup</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-text-muted mb-1">Storage</label>
                <select
                  value={bkStorage}
                  onChange={(e) => setBkStorage(e.target.value)}
                  className="w-full rounded border border-border bg-bg-card text-text-primary text-sm px-2 py-1.5 [color-scheme:dark]"
                >
                  <option value="">— select —</option>
                  {backupStorages.map((s) => (
                    <option key={s.storage} value={s.storage}>{s.storage}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">Mode</label>
                <select
                  value={bkMode}
                  onChange={(e) => setBkMode(e.target.value)}
                  className="w-full rounded border border-border bg-bg-card text-text-primary text-sm px-2 py-1.5 [color-scheme:dark]"
                >
                  <option value="snapshot">Snapshot</option>
                  <option value="suspend">Suspend</option>
                  <option value="stop">Stop</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">Compression</label>
                <select
                  value={bkCompress}
                  onChange={(e) => setBkCompress(e.target.value)}
                  className="w-full rounded border border-border bg-bg-card text-text-primary text-sm px-2 py-1.5 [color-scheme:dark]"
                >
                  <option value="zstd">zstd (fast)</option>
                  <option value="lzo">lzo (faster)</option>
                  <option value="gzip">gzip (best)</option>
                  <option value="0">None</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end">
              <Button size="sm" disabled={!bkStorage || vzdump.isPending} onClick={runBackup}>
                {vzdump.isPending ? 'Starting…' : 'Start Backup'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      {/* Scheduled Jobs */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Scheduled Backup Jobs</CardTitle></CardHeader>
        <CardContent className="p-0">
          {!relatedJobs.length ? (
            <p className="text-center text-text-muted text-sm py-8">No scheduled backup jobs include this VM</p>
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

      {/* Recent Backup Tasks */}
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

// ── Migrate / Clone dialogs ───────────────────────────────────────────────────

function MigrateDialog({ node, vmid, isRunning, onClose }: { node: string; vmid: number; isRunning: boolean; onClose: () => void }) {
  const { data: nodes } = useClusterResources('node')
  const migrate = useMigrateVM(node, vmid)
  const [target, setTarget] = useState('')
  const [withDisks, setWithDisks] = useState(false)

  const otherNodes = (nodes ?? []).map((n) => n.node).filter((n) => n && n !== node)

  function submit() {
    if (!target) return
    migrate.mutate(
      { target, online: isRunning ? 1 : 0, with_local_disks: withDisks ? 1 : 0 },
      { onSuccess: onClose },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-bg-card border border-border-muted rounded-xl p-6 w-full max-w-sm shadow-xl space-y-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-base font-semibold text-text-primary">Migrate VM {vmid}</h2>
        <div>
          <label className="block text-xs text-text-muted mb-1">Target Node *</label>
          <select
            className="w-full rounded-md border border-border-muted bg-bg-input px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent [color-scheme:dark]"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          >
            <option value="">Select node…</option>
            {otherNodes.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <input id="wd-cb" type="checkbox" checked={withDisks} onChange={(e) => setWithDisks(e.target.checked)} className="accent-accent" />
          <label htmlFor="wd-cb" className="text-sm text-text-secondary cursor-pointer">With local disks</label>
        </div>
        {isRunning && <p className="text-xs text-status-migrating">VM is running — online migration will be attempted.</p>}
        <div className="flex gap-2 pt-1">
          <button onClick={submit} disabled={migrate.isPending || !target} className="flex-1 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50">
            {migrate.isPending ? 'Migrating…' : 'Migrate'}
          </button>
          <button onClick={onClose} className="flex-1 rounded-md border border-border-muted px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-hover">Cancel</button>
        </div>
      </div>
    </div>
  )
}

function CloneVMDialog({ node, vmid, onClose }: { node: string; vmid: number; onClose: () => void }) {
  const { data: nextId } = useNextVMId()
  const clone = useCloneVM(node, vmid)
  const [newid, setNewid] = useState('')
  const [name, setName] = useState('')
  const [full, setFull] = useState(true)

  // pre-fill with next available ID
  useState(() => { if (nextId && !newid) setNewid(String(nextId)) })

  function submit() {
    const id = Number(newid)
    if (!id) return
    clone.mutate(
      { newid: id, name: name.trim() || undefined, full: full ? 1 : 0 },
      { onSuccess: onClose },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-bg-card border border-border-muted rounded-xl p-6 w-full max-w-sm shadow-xl space-y-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-base font-semibold text-text-primary">Clone VM {vmid}</h2>
        <div>
          <label className="block text-xs text-text-muted mb-1">New VM ID *</label>
          <input className="w-full rounded-md border border-border-muted bg-bg-input px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent" type="number" placeholder={String(nextId ?? '')} value={newid} onChange={(e) => setNewid(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Name</label>
          <input className="w-full rounded-md border border-border-muted bg-bg-input px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent" placeholder="Optional name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <input id="full-cb" type="checkbox" checked={full} onChange={(e) => setFull(e.target.checked)} className="accent-accent" />
          <label htmlFor="full-cb" className="text-sm text-text-secondary cursor-pointer">Full clone (independent copy)</label>
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={submit} disabled={clone.isPending || !newid} className="flex-1 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50">
            {clone.isPending ? 'Cloning…' : 'Clone'}
          </button>
          <button onClick={onClose} className="flex-1 rounded-md border border-border-muted px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-hover">Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── Placeholder tab ───────────────────────────────────────────────────────────

// ── VM Detail Page ────────────────────────────────────────────────────────────

export function VMDetailPage() {
  const { node, vmid: vmidParam } = useParams<{ node: string; vmid: string }>()
  const vmid = Number(vmidParam)
  const [tab, setTab] = useState('summary')
  const [showMigrate, setShowMigrate] = useState(false)
  const [showClone, setShowClone] = useState(false)

  const { data: status, isLoading } = useVMStatus(node!, vmid)
  const start = useVMStart(node!, vmid)
  const stop = useVMStop(node!, vmid)
  const shutdown = useVMShutdown(node!, vmid)
  const reboot = useVMReboot(node!, vmid)
  const suspend = useVMSuspend(node!, vmid)
  const resume = useVMResume(node!, vmid)
  const deleteVM = useDeleteVM(node!)
  const convertToTemplate = useTemplateVM(node!, vmid)
  const navigate = useNavigate()

  if (isLoading) return <SkeletonCard />

  const isRunning = status?.status === 'running'
  const isStopped = status?.status === 'stopped'
  const isPaused = status?.status === 'paused'
  const isTemplate = status?.template === 1

  return (
    <div className="space-y-5">
      {showMigrate && <MigrateDialog node={node!} vmid={vmid} isRunning={isRunning} onClose={() => setShowMigrate(false)} />}
      {showClone && <CloneVMDialog node={node!} vmid={vmid} onClose={() => setShowClone(false)} />}
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">
            {status?.name ?? `VM ${vmid}`}
          </h1>
          <p className="text-sm text-text-muted">
            VMID {vmid} · {node}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {status && <StatusBadge status={status.status} />}
          {isStopped && (
            <Button size="sm" onClick={() => start.mutate()} disabled={start.isPending}>
              <Play className="size-4" /> Start
            </Button>
          )}
          {isPaused && (
            <Button size="sm" onClick={() => resume.mutate()} disabled={resume.isPending}>
              <PlayCircle className="size-4" /> Resume
            </Button>
          )}
          {isRunning && (
            <>
              <Button size="sm" variant="outline" onClick={() => shutdown.mutate()} disabled={shutdown.isPending}>
                <Power className="size-4" /> Shutdown
              </Button>
              <Button size="sm" variant="outline" onClick={() => reboot.mutate()} disabled={reboot.isPending}>
                <RotateCcw className="size-4" /> Reboot
              </Button>
              <Button size="sm" variant="outline" onClick={() => suspend.mutate()} disabled={suspend.isPending}>
                <PauseCircle className="size-4" /> Suspend
              </Button>
              <Button size="sm" variant="destructive" onClick={() => stop.mutate()} disabled={stop.isPending}>
                <Square className="size-4" /> Stop
              </Button>
            </>
          )}
          <Button size="sm" variant="outline" onClick={() => setShowMigrate(true)}>
            Migrate
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowClone(true)}>
            Clone
          </Button>
          {isStopped && !isTemplate && (
            <Button
              size="sm"
              variant="outline"
              disabled={convertToTemplate.isPending}
              onClick={() => {
                if (confirm(`Convert VM ${vmid} to a template? This cannot be undone.`)) {
                  convertToTemplate.mutate()
                }
              }}
            >
              <Cloud className="size-4" /> To Template
            </Button>
          )}
          <Button size="sm" variant="outline" asChild>
            <Link to={`/nodes/${node}/vms/${vmid}/console`}>
              <Terminal className="size-4" /> Console
            </Link>
          </Button>
          {isStopped && (
            <Button
              size="sm"
              variant="destructive"
              disabled={deleteVM.isPending}
              onClick={() => {
                if (confirm(`Delete VM ${vmid} (${status?.name ?? ''})? This cannot be undone.`)) {
                  deleteVM.mutate({ vmid, purge: true }, { onSuccess: () => navigate(`/nodes/${node}/vms`) })
                }
              }}
            >
              <Trash2 className="size-4" /> Delete
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="perf"><Activity className="size-3.5" /> Performance</TabsTrigger>
          <TabsTrigger value="hardware"><HardDrive className="size-3.5" /> Hardware</TabsTrigger>
          <TabsTrigger value="options"><Settings className="size-3.5" /> Options</TabsTrigger>
          <TabsTrigger value="cloudinit"><Cloud className="size-3.5" /> Cloud-Init</TabsTrigger>
          <TabsTrigger value="agent"><Cpu className="size-3.5" /> Agent</TabsTrigger>
          <TabsTrigger value="snapshots"><Camera className="size-3.5" /> Snapshots</TabsTrigger>
          <TabsTrigger value="backups"><Archive className="size-3.5" /> Backups</TabsTrigger>
          <TabsTrigger value="firewall"><Shield className="size-3.5" /> Firewall</TabsTrigger>
        </TabsList>
        <TabsContent value="summary"><SummaryTab node={node!} vmid={vmid} /></TabsContent>
        <TabsContent value="perf"><ResourceCharts node={node!} vmid={vmid} type="qemu" /></TabsContent>
        <TabsContent value="hardware"><HardwareTab node={node!} vmid={vmid} /></TabsContent>
        <TabsContent value="options"><VMOptionsTab node={node!} vmid={vmid} /></TabsContent>
        <TabsContent value="cloudinit"><CloudInitTab node={node!} vmid={vmid} /></TabsContent>
        <TabsContent value="agent"><AgentTab node={node!} vmid={vmid} isRunning={isRunning} /></TabsContent>
        <TabsContent value="snapshots"><SnapshotsTab node={node!} vmid={vmid} /></TabsContent>
        <TabsContent value="backups"><VMBackupsTab node={node!} vmid={vmid} /></TabsContent>
        <TabsContent value="firewall"><VMFirewallTab node={node!} vmid={vmid} /></TabsContent>
      </Tabs>
    </div>
  )
}
