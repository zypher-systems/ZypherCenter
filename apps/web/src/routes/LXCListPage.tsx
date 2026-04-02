import { useState } from 'react'
import { useParams, Link } from 'react-router'
import { Play, Square, RotateCcw, Power, Terminal, Search, Plus, Trash2 } from 'lucide-react'
import { useLXCs, useLXCStart, useLXCStop, useLXCShutdown, useLXCReboot, useCreateLXC, useDeleteLXC } from '@/lib/queries/lxc'
import { useNextVMId } from '@/lib/queries/vms'
import { useNodeStorage, useNodeNetwork } from '@/lib/queries/nodes'
import { Card, CardContent } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { formatBytes, formatPercent, formatUptime } from '@/lib/utils'

function CreateLXCDialog({ node, onClose }: { node: string; onClose: () => void }) {
  const { data: nextId } = useNextVMId()
  const { data: storages } = useNodeStorage(node)
  const { data: network } = useNodeNetwork(node)
  const createLXC = useCreateLXC(node)

  const [vmid, setVmid] = useState('')
  const [hostname, setHostname] = useState('')
  const [password, setPassword] = useState('')
  const [ostemplate, setOstemplate] = useState('')
  const [memory, setMemory] = useState('512')
  const [swap, setSwap] = useState('512')
  const [cores, setCores] = useState('1')
  const [rootStorage, setRootStorage] = useState('')
  const [rootSize, setRootSize] = useState('8')
  const [onboot, setOnboot] = useState(false)
  const [unprivileged, setUnprivileged] = useState(true)
  const [start, setStart] = useState(false)
  // network
  const [bridge, setBridge] = useState('')
  const [netIp, setNetIp] = useState('dhcp')
  const [netIp6, setNetIp6] = useState('auto')
  const [netVlan, setNetVlan] = useState('')
  const [netStaticIp, setNetStaticIp] = useState('')
  const [netGateway, setNetGateway] = useState('')

  const rootStores = (storages ?? []).filter((s) =>
    s.content?.split(',').some((c) => ['images', 'rootdir'].includes(c.trim()))
  )
  const bridges = (network ?? []).filter((n) => n.type === 'bridge' || n.type === 'OVSBridge')

  const inp = 'w-full rounded border border-border-subtle bg-bg-input px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent [color-scheme:dark]'

  function submit() {
    const id = Number(vmid) || nextId
    if (!id || !hostname.trim() || !password || !ostemplate.trim()) return
    const params: Parameters<typeof createLXC.mutate>[0] = {
      vmid: id,
      hostname: hostname.trim(),
      password,
      memory: Number(memory),
      swap: Number(swap),
      cores: Number(cores),
      ostemplate: ostemplate.trim(),
      rootfs: rootStorage ? `${rootStorage}:${rootSize}` : 'local-lvm:8',
      onboot: onboot ? 1 : 0,
      unprivileged: unprivileged ? 1 : 0,
      start: start ? 1 : 0,
    }
    if (bridge) {
      const vlanPart = netVlan.trim() ? `,tag=${netVlan.trim()}` : ''
      let ipPart = `ip=${netIp}`
      if (netIp === 'static' && netStaticIp.trim()) {
        ipPart = `ip=${netStaticIp.trim()}`
        if (netGateway.trim()) ipPart += `,gw=${netGateway.trim()}`
      }
      params.net0 = `name=eth0,bridge=${bridge},${ipPart},ip6=${netIp6}${vlanPart}`
    }
    createLXC.mutate(params, { onSuccess: () => onClose() })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-bg-card border border-border-subtle rounded-xl shadow-2xl w-full max-w-md p-6 space-y-3 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-text-primary">Create Container</h2>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-text-secondary mb-1">CT ID *</label>
            <input type="number" value={vmid} onChange={(e) => setVmid(e.target.value)} placeholder={String(nextId ?? '100')} className={inp} />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">Hostname *</label>
            <input value={hostname} onChange={(e) => setHostname(e.target.value)} placeholder="my-container" className={inp} />
          </div>
        </div>

        <div>
          <label className="block text-xs text-text-secondary mb-1">Password *</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Root password" className={inp} />
        </div>

        <div>
          <label className="block text-xs text-text-secondary mb-1">OS Template *</label>
          <input value={ostemplate} onChange={(e) => setOstemplate(e.target.value)} placeholder="local:vztmpl/debian-12-standard_12.2-1_amd64.tar.zst" className={inp} />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-text-secondary mb-1">Memory (MiB)</label>
            <input type="number" value={memory} onChange={(e) => setMemory(e.target.value)} className={inp} />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">Swap (MiB)</label>
            <input type="number" value={swap} onChange={(e) => setSwap(e.target.value)} className={inp} />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">Cores</label>
            <input type="number" min="1" value={cores} onChange={(e) => setCores(e.target.value)} className={inp} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-text-secondary mb-1">Root Storage</label>
            <select value={rootStorage} onChange={(e) => setRootStorage(e.target.value)} className={inp}>
              <option value="">local-lvm (default)</option>
              {rootStores.map((s) => <option key={s.storage} value={s.storage}>{s.storage}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">Disk Size (GiB)</label>
            <input type="number" min="1" value={rootSize} onChange={(e) => setRootSize(e.target.value)} className={inp} />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer select-none">
            <input type="checkbox" checked={unprivileged} onChange={(e) => setUnprivileged(e.target.checked)} />
            Unprivileged container
          </label>
          <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer select-none">
            <input type="checkbox" checked={onboot} onChange={(e) => setOnboot(e.target.checked)} />
            Start at boot
          </label>
          <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer select-none">
            <input type="checkbox" checked={start} onChange={(e) => setStart(e.target.checked)} />
            Start after creation
          </label>
        </div>

        <div>
          <p className="text-xs font-medium text-text-secondary mb-2">Network (net0)</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-text-muted mb-1">Bridge</label>
              <select value={bridge} onChange={(e) => setBridge(e.target.value)} className={inp}>
                <option value="">— none —</option>
                {bridges.map((b) => <option key={b.iface} value={b.iface}>{b.iface}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">VLAN Tag</label>
              <input type="number" value={netVlan} onChange={(e) => setNetVlan(e.target.value)} placeholder="none" disabled={!bridge} className={inp} />
            </div>
          </div>
          {bridge && (
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <label className="block text-xs text-text-muted mb-1">IPv4</label>
                <select value={netIp} onChange={(e) => setNetIp(e.target.value)} className={inp}>
                  <option value="dhcp">DHCP</option>
                  <option value="static">Static</option>
                  <option value="manual">Manual</option>
                </select>
              </div>
              {netIp === 'static' && (
                <>
                  <div>
                    <label className="block text-xs text-text-muted mb-1">IP/CIDR</label>
                    <input value={netStaticIp} onChange={(e) => setNetStaticIp(e.target.value)} placeholder="192.168.1.100/24" className={inp} />
                  </div>
                  <div>
                    <label className="block text-xs text-text-muted mb-1">Gateway</label>
                    <input value={netGateway} onChange={(e) => setNetGateway(e.target.value)} placeholder="192.168.1.1" className={inp} />
                  </div>
                </>
              )}
              <div>
                <label className="block text-xs text-text-muted mb-1">IPv6</label>
                <select value={netIp6} onChange={(e) => setNetIp6(e.target.value)} className={inp}>
                  <option value="auto">SLAAC</option>
                  <option value="dhcp">DHCPv6</option>
                  <option value="manual">Manual</option>
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={submit} disabled={createLXC.isPending || !hostname || !password || !ostemplate}>
            <Plus className="size-3.5 mr-1" />{createLXC.isPending ? 'Creating…' : 'Create CT'}
          </Button>
        </div>
      </div>
    </div>
  )
}

type LXCItem = {
  vmid: number
  name?: string
  status: string
  cpu?: number
  cpus?: number
  mem?: number
  maxmem?: number
  disk?: number
  maxdisk?: number
  uptime?: number
  template?: number
}

function LXCRow({ ct, node }: { ct: LXCItem; node: string }) {
  const start = useLXCStart(node, ct.vmid)
  const stop = useLXCStop(node, ct.vmid)
  const shutdown = useLXCShutdown(node, ct.vmid)
  const reboot = useLXCReboot(node, ct.vmid)
  const deleteLXC = useDeleteLXC(node)

  const isRunning = ct.status === 'running'
  const isStopped = ct.status === 'stopped'
  const isTemplate = ct.template === 1

  if (isTemplate) return null

  return (
    <TableRow>
      <TableCell className="font-mono text-text-muted w-16">{ct.vmid}</TableCell>
      <TableCell>
        <Link
          to={`/nodes/${node}/lxc/${ct.vmid}`}
          className="font-medium text-text-primary hover:text-accent transition-colors"
        >
          {ct.name ?? `CT ${ct.vmid}`}
        </Link>
      </TableCell>
      <TableCell>
        <StatusBadge status={ct.status} />
      </TableCell>
      <TableCell className="tabular-nums text-text-secondary">
        {isRunning && ct.cpu != null ? formatPercent(ct.cpu) : '—'}
      </TableCell>
      <TableCell className="tabular-nums text-text-secondary">
        {ct.mem && ct.maxmem ? `${formatBytes(ct.mem)} / ${formatBytes(ct.maxmem)}` : '—'}
      </TableCell>
      <TableCell className="tabular-nums text-text-secondary">
        {isRunning && ct.uptime ? formatUptime(ct.uptime) : '—'}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          {isStopped && (
            <>
              <Button
                variant="ghost"
                size="icon-sm"
                title="Start"
                onClick={() => start.mutate()}
                disabled={start.isPending}
              >
                <Play className="size-3.5" />
              </Button>
              <Button variant="ghost" size="icon-sm" title="Console" asChild>
                <Link to={`/nodes/${node}/lxc/${ct.vmid}/console`}>
                  <Terminal className="size-3.5" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                title="Delete container"
                disabled={deleteLXC.isPending}
                onClick={() => {
                  if (confirm(`Delete container ${ct.vmid} (${ct.name ?? ''})? This cannot be undone.`)) {
                    deleteLXC.mutate({ vmid: ct.vmid, purge: true })
                  }
                }}
              >
                <Trash2 className="size-3.5 text-text-muted hover:text-status-error" />
              </Button>
            </>
          )}
          {isRunning && (
            <>
              <Button
                variant="ghost"
                size="icon-sm"
                title="Shutdown"
                onClick={() => shutdown.mutate()}
                disabled={shutdown.isPending}
              >
                <Power className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                title="Stop (force)"
                onClick={() => stop.mutate()}
                disabled={stop.isPending}
              >
                <Square className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                title="Reboot"
                onClick={() => reboot.mutate()}
                disabled={reboot.isPending}
              >
                <RotateCcw className="size-3.5" />
              </Button>
              <Button variant="ghost" size="icon-sm" title="Console" asChild>
                <Link to={`/nodes/${node}/lxc/${ct.vmid}/console`}>
                  <Terminal className="size-3.5" />
                </Link>
              </Button>
            </>
          )}
        </div>
      </TableCell>
    </TableRow>
  )
}

export function LXCListPage() {
  const { node } = useParams<{ node: string }>()
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const { data: lxcs, isLoading } = useLXCs(node!)

  const filtered = lxcs?.filter((ct) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      String(ct.vmid).includes(q) ||
      (ct.name ?? '').toLowerCase().includes(q) ||
      ct.status.includes(q)
    )
  })

  return (
    <div className="space-y-4">
      {showCreate && <CreateLXCDialog node={node!} onClose={() => setShowCreate(false)} />}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Containers</h1>
          <p className="text-sm text-text-muted mt-0.5">LXC containers on {node}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-text-muted" />
            <Input
              placeholder="Filter containers…"
              className="pl-8 w-56 h-8 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="size-4 mr-1" />New CT
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">VMID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>CPU</TableHead>
                  <TableHead>Memory</TableHead>
                  <TableHead>Uptime</TableHead>
                  <TableHead className="w-36">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-text-muted py-12">
                      No containers found
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered?.map((ct) => (
                    <LXCRow key={ct.vmid} ct={ct} node={node!} />
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
