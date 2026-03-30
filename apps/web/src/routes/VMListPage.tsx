import { useState } from 'react'
import { useParams, Link } from 'react-router'
import { Play, Square, RotateCcw, Power, Terminal, Plus, Search } from 'lucide-react'
import { useVMs, useVMStart, useVMStop, useVMShutdown, useVMReboot } from '@/lib/queries/vms'
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

function VMRow({ vm, node }: { vm: { vmid: number; name?: string; status: string; cpu?: number; mem?: number; maxmem?: number; disk?: number; maxdisk?: number; uptime?: number; template?: number }; node: string }) {
  const start = useVMStart(node, vm.vmid)
  const stop = useVMStop(node, vm.vmid)
  const shutdown = useVMShutdown(node, vm.vmid)
  const reboot = useVMReboot(node, vm.vmid)

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
        </div>
      </TableCell>
    </TableRow>
  )
}

export function VMListPage() {
  const { node } = useParams<{ node: string }>()
  const { data: vms, isLoading } = useVMs(node!)
  const [search, setSearch] = useState('')

  const filtered = (vms ?? []).filter(
    (vm) =>
      vm.template !== 1 &&
      (search === '' ||
        String(vm.vmid).includes(search) ||
        (vm.name ?? '').toLowerCase().includes(search.toLowerCase())),
  )

  return (
    <div className="space-y-4">
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
          <Button size="sm">
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
