import { useState } from 'react'
import { Link } from 'react-router'
import { Play, Square, RotateCcw, Power, Terminal, Search, Trash2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useClusterResources, clusterKeys } from '@/lib/queries/cluster'
import { useLXCStart, useLXCStop, useLXCShutdown, useLXCReboot, useDeleteLXC } from '@/lib/queries/lxc'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { CreateLXCDialog } from '@/components/features/CreateLXCDialog'
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

function TagChips({ tags }: { tags?: string }) {
  if (!tags) return null
  const list = tags.split(/[;,]/).map((t) => t.trim()).filter(Boolean)
  if (!list.length) return null
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {list.map((tag) => (
        <span key={tag} className="inline-flex items-center rounded-full bg-accent/10 px-1.5 py-px text-[10px] font-medium text-accent border border-accent/20">{tag}</span>
      ))}
    </div>
  )
}

function LXCRow({ ct, isSelected, onToggle }: { ct: ClusterResource; isSelected?: boolean; onToggle?: () => void }) {
  const node = ct.node ?? ''
  const vmid = ct.vmid ?? 0
  const start = useLXCStart(node, vmid)
  const stop = useLXCStop(node, vmid)
  const shutdown = useLXCShutdown(node, vmid)
  const reboot = useLXCReboot(node, vmid)
  const deleteLXC = useDeleteLXC(node)

  const isRunning = ct.status === 'running'
  const isStopped = ct.status === 'stopped'

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
          to={`/nodes/${node}/lxc/${vmid}`}
          className="font-medium text-text-primary hover:text-accent transition-colors"
        >
          {ct.name ?? `CT ${vmid}`}
        </Link>
        <TagChips tags={ct.tags} />
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
            <>
              <Button variant="ghost" size="icon-sm" title="Start" onClick={() => start.mutate()} disabled={start.isPending}>
                <Play className="size-3.5 text-status-running" />
              </Button>
              <Button
                variant="ghost" size="icon-sm" title="Delete container"
                disabled={deleteLXC.isPending}
                onClick={() => {
                  if (confirm(`Delete container ${vmid} (${ct.name ?? ''})? This cannot be undone.`)) {
                    deleteLXC.mutate({ vmid, purge: true })
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
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [nodeFilter, setNodeFilter] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const allContainers = (resources ?? []).filter((r) => r.type === 'lxc')
  const nodeList = [...new Set(allContainers.map((c) => c.node ?? '').filter(Boolean))].sort()

  const containers = allContainers
    .filter((r) => !nodeFilter || r.node === nodeFilter)
    .filter(
      (r) =>
        search === '' ||
        String(r.vmid).includes(search) ||
        (r.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (r.node ?? '').toLowerCase().includes(search.toLowerCase()),
    )

  const running = containers.filter((c) => c.status === 'running').length

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selected.size === containers.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(containers.map((c) => c.id ?? '').filter(Boolean)))
    }
  }

  async function bulkAction(action: 'start' | 'stop' | 'shutdown') {
    const targets = containers.filter((c) => selected.has(c.id ?? ''))
    const eligible = targets.filter((c) =>
      action === 'start' ? c.status === 'stopped' : c.status === 'running'
    )
    if (!eligible.length) { toast.info('No eligible containers for that action'); return }
    await Promise.allSettled(
      eligible.map((ct) => {
        const suffix = action === 'start' ? 'start' : action === 'stop' ? 'stop' : 'shutdown'
        return api.post(`nodes/${ct.node}/lxc/${ct.vmid}/status/${suffix}`, {})
      })
    )
    toast.success(`${action.charAt(0).toUpperCase() + action.slice(1)} sent to ${eligible.length} container(s)`)
    setSelected(new Set())
    qc.invalidateQueries({ queryKey: clusterKeys.resources() })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Containers</h1>
          <p className="text-sm text-text-muted">
            {containers.length} total &mdash; <span className="text-status-running">{running} running</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CreateLXCDialog />
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
              placeholder="Filter containers…"
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
                      checked={containers.length > 0 && selected.size === containers.length}
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
                {containers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-text-muted py-12">
                      No containers found
                    </TableCell>
                  </TableRow>
                ) : (
                  containers.map((ct) => (
                    <LXCRow
                      key={ct.id}
                      ct={ct}
                      isSelected={selected.has(ct.id ?? '')}
                      onToggle={() => toggleSelect(ct.id ?? '')}
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
