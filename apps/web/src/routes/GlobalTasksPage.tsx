import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { useClusterTasks } from '@/lib/queries/tasks'
import { Card, CardContent } from '@/components/ui/Card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { formatTimestamp, formatUptime } from '@/lib/utils'

function TaskStatusBadge({ exitstatus }: { exitstatus?: string | null }) {
  if (!exitstatus) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-status-migrating">
        <span className="inline-block size-1.5 rounded-full bg-status-migrating animate-pulse" />
        Running
      </span>
    )
  }
  const ok = exitstatus === 'OK'
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs ${
        ok ? 'text-status-running' : 'text-status-error'
      }`}
    >
      <span
        className={`inline-block size-1.5 rounded-full ${
          ok ? 'bg-status-running' : 'bg-status-error'
        }`}
      />
      {exitstatus}
    </span>
  )
}

export function GlobalTasksPage() {
  const { data: tasks, isLoading, refetch, isFetching } = useClusterTasks()
  const [typeFilter, setTypeFilter] = useState('')
  const [nodeFilter, setNodeFilter] = useState('')

  const taskList = (tasks as Record<string, unknown>[] | undefined) ?? []
  const types = [...new Set(taskList.map((t) => t['type'] as string))].sort()
  const nodes = [...new Set(taskList.map((t) => t['node'] as string))].sort()
  const filtered = taskList.filter((t) =>
    (!typeFilter || t['type'] === typeFilter) &&
    (!nodeFilter || t['node'] === nodeFilter)
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Tasks</h1>
          <p className="text-sm text-text-muted mt-0.5">Recent tasks across all cluster nodes</p>
        </div>
        <div className="flex items-center gap-2">
          {nodes.length > 0 && (
            <select
              value={nodeFilter}
              onChange={(e) => setNodeFilter(e.target.value)}
              className="rounded border border-border-subtle bg-bg-input px-2 py-1.5 text-sm text-text-primary outline-none focus:border-accent"
            >
              <option value="">All nodes</option>
              {nodes.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          )}
          {types.length > 0 && (
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded border border-border-subtle bg-bg-input px-2 py-1.5 text-sm text-text-primary outline-none focus:border-accent"
            >
              <option value="">All types</option>
              {types.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`size-4 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {isLoading ? (
        <SkeletonCard />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Start Time</TableHead>
                  <TableHead>Node</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((task) => {
                  const starttime = task['starttime'] as number
                  const endtime = task['endtime'] as number | undefined
                  const duration = endtime ? endtime - starttime : undefined
                  return (
                    <TableRow key={task['upid'] as string}>
                      <TableCell className="tabular-nums text-text-secondary text-sm">
                        {starttime ? formatTimestamp(starttime) : '—'}
                      </TableCell>
                      <TableCell className="text-text-secondary text-sm">
                        {task['node'] as string}
                      </TableCell>
                      <TableCell className="font-medium text-text-primary text-sm">
                        {task['type'] as string}
                      </TableCell>
                      <TableCell className="text-text-muted text-sm font-mono">
                        {(task['id'] as string) ?? '—'}
                      </TableCell>
                      <TableCell className="text-text-secondary text-sm">
                        {task['user'] as string}
                      </TableCell>
                      <TableCell className="tabular-nums text-text-secondary text-sm">
                        {duration ? formatUptime(duration) : '—'}
                      </TableCell>
                      <TableCell>
                        <TaskStatusBadge exitstatus={task['exitstatus'] as string | null | undefined} />
                      </TableCell>
                    </TableRow>
                  )
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-text-muted py-12">
                      No tasks
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
