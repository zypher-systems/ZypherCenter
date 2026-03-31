import { useState } from 'react'
import { Link } from 'react-router'
import { Play, Square, RotateCcw, Power, Terminal, Search, Trash2 } from 'lucide-react'
import { useClusterResources } from '@/lib/queries/cluster'
import { useVMStart, useVMStop, useVMShutdown, useVMReboot, useDeleteVM } from '@/lib/queries/vms'
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

function VMRow({ vm }: { vm: ClusterResource }) {
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
    <TableRow>
      <TableCell className="font-mono text-text-muted w-16">{vmid}</TableCell>
      <TableCell>
        <Link
          to={`/nodes/${node}/vms/${vmid}`}
          className="font-medium text-text-primary hover:text-accent transition-colors"
        >
          {vm.name ?? `VM ${vmid}`}
        </Link>
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
  const [search, setSearch] = useState('')

  const vms = (resources ?? [])
    .filter((r) => r.type === 'qemu' && r.template !== 1)
    .filter(
      (r) =>
        search === '' ||
        String(r.vmid).includes(search) ||
        (r.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (r.node ?? '').toLowerCase().includes(search.toLowerCase()),
    )

  const running = vms.filter((v) => v.status === 'running').length

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
                    <TableCell colSpan={8} className="text-center text-text-muted py-12">
                      No virtual machines found
                    </TableCell>
                  </TableRow>
                ) : (
                  vms.map((vm) => <VMRow key={vm.id} vm={vm} />)
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
