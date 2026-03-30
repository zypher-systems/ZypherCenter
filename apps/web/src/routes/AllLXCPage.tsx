import { useState } from 'react'
import { Link } from 'react-router'
import { Play, Square, RotateCcw, Power, Terminal, Search } from 'lucide-react'
import { useClusterResources } from '@/lib/queries/cluster'
import { useLXCStart, useLXCStop, useLXCShutdown, useLXCReboot } from '@/lib/queries/lxc'
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

function LXCRow({ ct }: { ct: ClusterResource }) {
  const node = ct.node ?? ''
  const vmid = ct.vmid ?? 0
  const start = useLXCStart(node, vmid)
  const stop = useLXCStop(node, vmid)
  const shutdown = useLXCShutdown(node, vmid)
  const reboot = useLXCReboot(node, vmid)

  const isRunning = ct.status === 'running'
  const isStopped = ct.status === 'stopped'

  return (
    <TableRow>
      <TableCell className="font-mono text-text-muted w-16">{vmid}</TableCell>
      <TableCell>
        <Link
          to={`/nodes/${node}/lxc/${vmid}`}
          className="font-medium text-text-primary hover:text-accent transition-colors"
        >
          {ct.name ?? `CT ${vmid}`}
        </Link>
      </TableCell>
      <TableCell>
        <Link to={`/nodes/${node}`} className="text-text-secondary hover:text-accent text-sm">
          {node}
        </Link>
      </TableCell>
      <TableCell><StatusBadge status={ct.status ?? 'unknown'} /></TableCell>
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
            <Button variant="ghost" size="icon-sm" title="Start" onClick={() => start.mutate()} disabled={start.isPending}>
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
            <Link to={`/nodes/${node}/lxc/${vmid}/console`}>
              <Terminal className="size-3.5" />
            </Link>
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

export function AllLXCPage() {
  const { data: resources, isLoading } = useClusterResources()
  const [search, setSearch] = useState('')

  const containers = (resources ?? [])
    .filter((r) => r.type === 'lxc')
    .filter(
      (r) =>
        search === '' ||
        String(r.vmid).includes(search) ||
        (r.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (r.node ?? '').toLowerCase().includes(search.toLowerCase()),
    )

  const running = containers.filter((c) => c.status === 'running').length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Containers</h1>
          <p className="text-sm text-text-muted">
            {containers.length} total &mdash; <span className="text-status-running">{running} running</span>
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-text-muted" />
          <Input
            placeholder="Filter containers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 w-56"
          />
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
                {containers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-text-muted py-12">
                      No containers found
                    </TableCell>
                  </TableRow>
                ) : (
                  containers.map((ct) => <LXCRow key={ct.id} ct={ct} />)
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
