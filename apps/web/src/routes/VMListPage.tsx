import { useState } from 'react'
import { useParams, Link } from 'react-router'
import { Play, Square, RotateCcw, Power, Terminal, Plus, Search, Trash2 } from 'lucide-react'
import { useVMs, useVMStart, useVMStop, useVMShutdown, useVMReboot, useCreateVM, useNextVMId, useDeleteVM } from '@/lib/queries/vms'
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
import { Skeleton } from '@/components/ui/Skeleton'
import { formatBytes, formatPercent, formatUptime } from '@/lib/utils'

const OS_TYPES = [
  { value: 'l26', label: 'Linux 2.6 / 3.x / 4.x / 5.x / 6.x' },
  { value: 'l24', label: 'Linux 2.4' },
  { value: 'win11', label: 'Windows 11/2022/2025' },
  { value: 'win10', label: 'Windows 10/2016/2019' },
  { value: 'win8', label: 'Windows 8/2012' },
  { value: 'win7', label: 'Windows 7/2008R2' },
  { value: 'other', label: 'Other' },
]

function CreateVMDialog({ node, onClose }: { node: string; onClose: () => void }) {
  const { data: nextId } = useNextVMId()
  const { data: storages } = useNodeStorage(node)
  const { data: network } = useNodeNetwork(node)
  const createVM = useCreateVM(node)

  const [vmid, setVmid] = useState('')
  const [name, setName] = useState('')
  const [memory, setMemory] = useState('2048')
  const [cores, setCores] = useState('1')
  const [cpuType, setCpuType] = useState('kvm64')
  const [ostype, setOstype] = useState('l26')
  const [diskStorage, setDiskStorage] = useState('')
  const [diskSize, setDiskSize] = useState('32')
  const [diskDiscard, setDiskDiscard] = useState(true)
  const [diskSSD, setDiskSSD] = useState(false)
  const [onboot, setOnboot] = useState(false)
  // network
  const [bridge, setBridge] = useState('')
  const [netModel, setNetModel] = useState('virtio')
  const [netVlan, setNetVlan] = useState('')

  const diskStores = (storages ?? []).filter((s) =>
    s.content?.split(',').some((c) => ['images', 'rootdir'].includes(c.trim()))
  )
  const bridges = (network ?? []).filter((n) => n.type === 'bridge' || n.type === 'OVSBridge')

  const inp = 'w-full rounded border border-border-subtle bg-bg-input px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent [color-scheme:dark]'

  function submit() {
    const id = Number(vmid) || nextId
    if (!id) return
    const params: Parameters<typeof createVM.mutate>[0] = {
      vmid: id,
      name: name.trim() || `vm-${id}`,
      memory: Number(memory),
      cores: Number(cores),
      cpu: cpuType,
      ostype,
      onboot: onboot ? 1 : 0,
    }
    if (diskStorage) {
      const diskFlags = [diskDiscard ? 'discard=on' : '', diskSSD ? 'ssd=1' : ''].filter(Boolean).join(',')
      params.scsi0 = `${diskStorage}:${diskSize}${diskFlags ? `,${diskFlags}` : ''}`
      params.boot = 'order=scsi0'
    }
    if (bridge) {
      const netVlanPart = netVlan.trim() ? `,tag=${netVlan.trim()}` : ''
      params.net0 = `${netModel},bridge=${bridge}${netVlanPart}`
    }
    createVM.mutate(params, { onSuccess: () => onClose() })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-bg-card border border-border-subtle rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">Create Virtual Machine</h2>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-text-secondary mb-1">VM ID *</label>
            <input type="number" value={vmid} onChange={(e) => setVmid(e.target.value)} placeholder={String(nextId ?? '100')} className={inp} />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={`vm-${vmid || nextId || '100'}`} className={inp} />
          </div>
        </div>

        <div>
          <label className="block text-xs text-text-secondary mb-1">OS Type</label>
          <select value={ostype} onChange={(e) => setOstype(e.target.value)} className={inp}>
            {OS_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-text-secondary mb-1">Memory (MiB) *</label>
            <input type="number" value={memory} onChange={(e) => setMemory(e.target.value)} className={inp} />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">CPU Cores *</label>
            <input type="number" min="1" value={cores} onChange={(e) => setCores(e.target.value)} className={inp} />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">CPU Type</label>
            <select value={cpuType} onChange={(e) => setCpuType(e.target.value)} className={inp}>
              <option value="kvm64">kvm64 (default)</option>
              <option value="host">host (best performance)</option>
              <option value="x86-64-v2-AES">x86-64-v2-AES</option>
              <option value="x86-64-v3">x86-64-v3</option>
              <option value="x86-64-v4">x86-64-v4</option>
              <option value="Haswell">Haswell</option>
              <option value="Broadwell">Broadwell</option>
              <option value="SandyBridge">SandyBridge</option>
              <option value="IvyBridge">IvyBridge</option>
              <option value="qemu64">qemu64</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-text-secondary mb-1">Disk Storage</label>
            <select value={diskStorage} onChange={(e) => setDiskStorage(e.target.value)} className={inp}>
              <option value="">— none —</option>
              {diskStores.map((s) => <option key={s.storage} value={s.storage}>{s.storage}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">Disk Size (GiB)</label>
            <input type="number" min="1" value={diskSize} onChange={(e) => setDiskSize(e.target.value)} disabled={!diskStorage} className={inp} />
          </div>
        </div>

        {diskStorage && (
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer select-none">
              <input type="checkbox" checked={diskDiscard} onChange={(e) => setDiskDiscard(e.target.checked)} className="rounded" />
              Discard (TRIM/UNMAP)
            </label>
            <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer select-none">
              <input type="checkbox" checked={diskSSD} onChange={(e) => setDiskSSD(e.target.checked)} className="rounded" />
              SSD emulation
            </label>
          </div>
        )}

        <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer select-none">
          <input type="checkbox" checked={onboot} onChange={(e) => setOnboot(e.target.checked)} className="rounded" />
          Start at boot
        </label>

        <div>
          <p className="text-xs font-medium text-text-secondary mb-2">Network (net0)</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
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
            <div className="mt-2">
              <label className="block text-xs text-text-muted mb-1">Adapter Model</label>
              <select value={netModel} onChange={(e) => setNetModel(e.target.value)} className={inp}>
                <option value="virtio">VirtIO (paravirtualized)</option>
                <option value="e1000">Intel E1000</option>
                <option value="e1000e">Intel E1000e</option>
                <option value="rtl8139">Realtek RTL8139</option>
                <option value="vmxnet3">VMware vmxnet3</option>
              </select>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={submit} disabled={createVM.isPending}>
            <Plus className="size-3.5 mr-1" />{createVM.isPending ? 'Creating…' : 'Create VM'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function VMRow({ vm, node }: { vm: { vmid: number; name?: string; status: string; cpu?: number; mem?: number; maxmem?: number; disk?: number; maxdisk?: number; uptime?: number; template?: number }; node: string }) {
  const start = useVMStart(node, vm.vmid)
  const stop = useVMStop(node, vm.vmid)
  const shutdown = useVMShutdown(node, vm.vmid)
  const reboot = useVMReboot(node, vm.vmid)
  const deleteVM = useDeleteVM(node)

  const isRunning = vm.status === 'running'
  const isStopped = vm.status === 'stopped'
  const isTemplate = vm.template === 1

  if (isTemplate) return null

  return (
    <TableRow>
      <TableCell className="font-mono text-text-muted w-16">{vm.vmid}</TableCell>
      <TableCell>
        <Link
          to={`/nodes/${node}/vms/${vm.vmid}`}
          className="font-medium text-text-primary hover:text-accent transition-colors"
        >
          {vm.name ?? `VM ${vm.vmid}`}
        </Link>
      </TableCell>
      <TableCell><StatusBadge status={vm.status} /></TableCell>
      <TableCell className="tabular-nums text-text-secondary">
        {isRunning && vm.cpu != null ? formatPercent(vm.cpu) : '—'}
      </TableCell>
      <TableCell className="tabular-nums text-text-secondary">
        {vm.mem && vm.maxmem ? `${formatBytes(vm.mem)} / ${formatBytes(vm.maxmem)}` : '—'}
      </TableCell>
      <TableCell className="tabular-nums text-text-secondary">
        {isRunning && vm.uptime ? formatUptime(vm.uptime) : '—'}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          {isStopped && (
            <Button
              variant="ghost"
              size="icon-sm"
              title="Start"
              onClick={() => start.mutate()}
              disabled={start.isPending}
            >
              <Play className="size-3.5 text-status-running" />
            </Button>
          )}
          {isRunning && (
            <>
              <Button variant="ghost" size="icon-sm" title="Shutdown" onClick={() => shutdown.mutate()} disabled={shutdown.isPending}>
                <Power className="size-3.5 text-status-paused" />
              </Button>
              <Button variant="ghost" size="icon-sm" title="Reboot" onClick={() => reboot.mutate()} disabled={reboot.isPending}>
                <RotateCcw className="size-3.5" />
              </Button>
              <Button variant="ghost" size="icon-sm" title="Force Stop" onClick={() => stop.mutate()} disabled={stop.isPending}>
                <Square className="size-3.5 text-status-error" />
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon-sm" title="Console" asChild>
            <Link to={`/nodes/${node}/vms/${vm.vmid}/console`}>
              <Terminal className="size-3.5" />
            </Link>
          </Button>
          {isStopped && (
            <Button
              variant="ghost"
              size="icon-sm"
              title="Delete VM"
              disabled={deleteVM.isPending}
              onClick={() => {
                if (confirm(`Delete VM ${vm.vmid} (${vm.name ?? ''})? This cannot be undone.`)) {
                  deleteVM.mutate({ vmid: vm.vmid, purge: true })
                }
              }}
            >
              <Trash2 className="size-3.5 text-text-muted hover:text-status-error" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  )
}

export function VMListPage() {
  const { node } = useParams<{ node: string }>()
  const { data: vms, isLoading } = useVMs(node!)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  const filtered = (vms ?? []).filter(
    (vm) =>
      vm.template !== 1 &&
      (search === '' ||
        String(vm.vmid).includes(search) ||
        (vm.name ?? '').toLowerCase().includes(search.toLowerCase())),
  )

  return (
    <div className="space-y-4">
      {showCreate && <CreateVMDialog node={node!} onClose={() => setShowCreate(false)} />}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Virtual Machines</h1>
          <p className="text-sm text-text-muted">
            Node: <span className="font-medium text-text-secondary">{node}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-text-muted" />
            <Input
              placeholder="Filter VMs…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 w-48"
            />
          </div>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="size-4" />
            New VM
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>CPU</TableHead>
                  <TableHead>Memory</TableHead>
                  <TableHead>Uptime</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-text-muted py-12">
                      No virtual machines found on {node}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((vm) => <VMRow key={vm.vmid} vm={vm} node={node!} />)
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
