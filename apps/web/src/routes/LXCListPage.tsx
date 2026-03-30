import { useState } from 'react'
import { useParams, Link } from 'react-router'
import { Play, Square, RotateCcw, Power, Terminal, Search } from 'lucide-react'
import { useLXCs, useLXCStart, useLXCStop, useLXCShutdown, useLXCReboot } from '@/lib/queries/lxc'
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
            <Button
              variant="ghost"
              size="icon-sm"
              title="Start"
              onClick={() => start.mutate()}
              disabled={start.isPending}
            >
              <Play className="size-3.5" />
            </Button>
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
