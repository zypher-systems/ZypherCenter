import { useState } from 'react'
import { Link } from 'react-router'
import { Play, Square, RotateCcw, Power, Terminal, Search, Trash2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useClusterResources } from '@/lib/queries/cluster'
import { clusterKeys } from '@/lib/queries/cluster'
import { useVMStart, useVMStop, useVMShutdown, useVMReboot, useDeleteVM } from '@/lib/queries/vms'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { CreateVMDialog } from '@/components/features/CreateVMDialog'
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
import type { ClusterResource } from '@zyphercenter/proxmox-types'

function VMRow({ vm, isSelected, onToggle }: { vm: ClusterResource; isSelected?: boolean; onToggle?: () => void }) {
  const node = vm.node ?? ''
  const vmid = vm.vmid ?? 0
  const start = useVMStart(node, vmid)
  const stop = useVMStop(node, vmid)
  const shutdown = useVMShutdown(node, vmid)
  const reboot = useVMReboot(node, vmid)
  const deleteVM = useDeleteVM(node)

  const isRunning = vm.status === 'running'
  const isStopped = vm.status === 'stopped'

  return (
    <TableRow className={isSelected ? 'bg-accent/5' : ''}>
      {onToggle !== undefined && (
        <TableCell className="w-8">
          <input type="checkbox" checked={!!isSelected} onChange={onToggle}
            className="accent-accent cursor-pointer" />
        </TableCell>
      )}
      <TableCell className="font-mono text-text-muted w-16">{vmid}</TableCell>
      <TableCell>
        <Link
          to={`/nodes/${node}/vms/${vmid}`}
          className="font-medium text-text-primary hover:text-accent transition-colors"
        >
          {vm.name ?? `VM ${vmid}`}
        </Link>
        {vm.tags && (
          <div className="flex flex-wrap gap-1 mt-1">
            {vm.tags.split(/[;,]/).map((t) => t.trim()).filter(Boolean).map((tag) => (
              <span key={tag} className="inline-flex items-center rounded-full bg-accent/10 px-1.5 py-px text-[10px] font-medium text-accent border border-accent/20">{tag}</span>
            ))}
          </div>
        )}
      </TableCell>
      <TableCell>
        <Link to={`/nodes/${node}`} className="text-text-secondary hover:text-accent text-sm">
          {node}
        </Link>
      </TableCell>
      <TableCell><StatusBadge status={vm.status ?? 'unknown'} /></TableCell>
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
            <>
              <Button variant="ghost" size="icon-sm" title="Start" onClick={() => start.mutate()} disabled={start.isPending}>
                <Play className="size-3.5 text-status-running" />
              </Button>
              <Button
                variant="ghost" size="icon-sm" title="Delete VM"
                disabled={deleteVM.isPending}
                onClick={() => {
                  if (confirm(`Delete VM ${vmid} (${vm.name ?? ''})? This cannot be undone.`)) {
                    deleteVM.mutate({ vmid, purge: true })
                  }
                }}
              >
                <Trash2 className="size-3.5 text-text-muted hover:text-status-error" />
              </Button>
            </>
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
            <Link to={`/nodes/${node}/vms/${vmid}/console`}>
              <Terminal className="size-3.5" />
            </Link>
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

export function AllVMsPage() {
  const { data: resources, isLoading } = useClusterResources()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [nodeFilter, setNodeFilter] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const allVms = (resources ?? []).filter((r) => r.type === 'qemu' && r.template !== 1)
  const nodeList = [...new Set(allVms.map((v) => v.node ?? '').filter(Boolean))].sort()

  const vms = allVms
    .filter((r) => !nodeFilter || r.node === nodeFilter)
    .filter(
      (r) =>
        search === '' ||
        String(r.vmid).includes(search) ||
        (r.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (r.node ?? '').toLowerCase().includes(search.toLowerCase()),
    )

  const running = vms.filter((v) => v.status === 'running').length

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selected.size === vms.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(vms.map((v) => v.id ?? '').filter(Boolean)))
    }
  }

  async function bulkAction(action: 'start' | 'stop' | 'shutdown') {
    const targets = vms.filter((v) => selected.has(v.id ?? ''))
    const eligible = targets.filter((v) =>
      action === 'start' ? v.status === 'stopped' : v.status === 'running'
    )
    if (!eligible.length) { toast.info('No eligible VMs for that action'); return }
    await Promise.allSettled(
      eligible.map((vm) => {
        const suffix = action === 'start' ? 'start' : action === 'stop' ? 'stop' : 'shutdown'
        return api.post(`nodes/${vm.node}/qemu/${vm.vmid}/status/${suffix}`, {})
      })
    )
    toast.success(`${action.charAt(0).toUpperCase() + action.slice(1)} sent to ${eligible.length} VM(s)`)
    setSelected(new Set())
    qc.invalidateQueries({ queryKey: clusterKeys.resources() })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Virtual Machines</h1>
          <p className="text-sm text-text-muted">
            {vms.length} total &mdash; <span className="text-status-running">{running} running</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CreateVMDialog />
          {nodeList.length > 1 && (
            <select
              value={nodeFilter}
              onChange={(e) => setNodeFilter(e.target.value)}
              className="rounded border border-border-subtle bg-bg-input px-2 py-1.5 text-sm text-text-primary outline-none focus:border-accent [color-scheme:dark]"
            >
              <option value="">All nodes</option>
              {nodeList.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          )}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-text-muted" />
            <Input
              placeholder="Filter VMs…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 w-56"
            />
          </div>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/5 px-4 py-2 text-sm">
          <span className="text-text-secondary">{selected.size} selected</span>
          <div className="flex items-center gap-1.5 ml-auto">
            <Button size="sm" variant="outline" onClick={() => bulkAction('start')}>
              <Play className="size-3.5 mr-1 text-status-running" />Start
            </Button>
            <Button size="sm" variant="outline" onClick={() => bulkAction('shutdown')}>
              <Power className="size-3.5 mr-1 text-status-paused" />Shutdown
            </Button>
            <Button size="sm" variant="outline" onClick={() => bulkAction('stop')}>
              <Square className="size-3.5 mr-1 text-status-error" />Force Stop
            </Button>
            <button onClick={() => setSelected(new Set())} className="ml-2 text-xs text-text-muted hover:text-text-primary">Clear</button>
          </div>
        </div>
      )}
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
                  <TableHead className="w-8">
                    <input type="checkbox"
                      checked={vms.length > 0 && selected.size === vms.length}
                      onChange={toggleSelectAll}
                      className="accent-accent cursor-pointer" />
                  </TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Node</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>CPU</TableHead>
                  <TableHead>Memory</TableHead>
                  <TableHead>Uptime</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vms.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-text-muted py-12">
                      No virtual machines found
                    </TableCell>
                  </TableRow>
                ) : (
                  vms.map((vm) => (
                    <VMRow
                      key={vm.id}
                      vm={vm}
                      isSelected={selected.has(vm.id ?? '')}
                      onToggle={() => toggleSelect(vm.id ?? '')}
                    />
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
