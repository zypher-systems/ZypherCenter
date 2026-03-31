import { useParams } from 'react-router'
import { RefreshCw, Play, Square, RotateCcw, Loader2 } from 'lucide-react'
import { useNodeServices, useNodeServiceAction } from '@/lib/queries/nodes'
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

function ServiceStateBadge({ state }: { state?: string }) {
  const isRunning = state === 'running' || state === 'active'
  const isDead = state === 'dead' || state === 'inactive'

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium ${
        isRunning
          ? 'text-status-running'
          : isDead
          ? 'text-status-stopped'
          : 'text-text-muted'
      }`}
    >
      <span
        className={`inline-block size-1.5 rounded-full ${
          isRunning
            ? 'bg-status-running'
            : isDead
            ? 'bg-status-stopped'
            : 'bg-text-disabled'
        }`}
      />
      {state ?? 'unknown'}
    </span>
  )
}

export function NodeServicesPage() {
  const { node } = useParams<{ node: string }>()
  const { data: services, isLoading, refetch, isFetching } = useNodeServices(node!)
  const action = useNodeServiceAction(node!)

  function doAction(service: string, act: 'start' | 'stop' | 'restart' | 'reload') {
    if ((act === 'stop') && !confirm(`Stop service "${service}"?`)) return
    action.mutate({ service, action: act })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Services</h1>
          <p className="text-sm text-text-muted mt-0.5">System service status on {node}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`size-3.5 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <SkeletonCard />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!services || services.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-text-muted py-10">
                      No services found
                    </TableCell>
                  </TableRow>
                ) : (
                  services.map((svc) => {
                    const isRunning = svc.state === 'running' || svc.state === 'active'
                    const isPending = action.isPending && (action.variables as { service: string } | undefined)?.service === svc.name

                    return (
                      <TableRow key={svc.name}>
                        <TableCell className="font-mono text-sm text-text-primary">
                          {svc.name}
                        </TableCell>
                        <TableCell className="text-text-muted text-sm max-w-xs truncate">
                          {svc.desc ?? '—'}
                        </TableCell>
                        <TableCell>
                          <ServiceStateBadge state={svc.state} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {isPending ? (
                              <Loader2 className="size-3.5 animate-spin text-text-muted" />
                            ) : (
                              <>
                                {!isRunning && (
                                  <button
                                    onClick={() => doAction(svc.name, 'start')}
                                    disabled={action.isPending}
                                    title="Start"
                                    className="inline-flex items-center gap-1 rounded border border-status-running/40 px-2 py-0.5 text-xs text-status-running hover:bg-status-running/10 disabled:opacity-40"
                                  >
                                    <Play className="size-3" />Start
                                  </button>
                                )}
                                {isRunning && (
                                  <button
                                    onClick={() => doAction(svc.name, 'stop')}
                                    disabled={action.isPending}
                                    title="Stop"
                                    className="inline-flex items-center gap-1 rounded border border-status-stopped/40 px-2 py-0.5 text-xs text-status-stopped hover:bg-status-stopped/10 disabled:opacity-40"
                                  >
                                    <Square className="size-3" />Stop
                                  </button>
                                )}
                                <button
                                  onClick={() => doAction(svc.name, 'restart')}
                                  disabled={action.isPending}
                                  title="Restart"
                                  className="inline-flex items-center gap-1 rounded border border-border-subtle px-2 py-0.5 text-xs text-text-secondary hover:border-accent/40 hover:text-accent disabled:opacity-40"
                                >
                                  <RotateCcw className="size-3" />Restart
                                </button>
                                <button
                                  onClick={() => doAction(svc.name, 'reload')}
                                  disabled={action.isPending}
                                  title="Reload"
                                  className="inline-flex items-center gap-1 rounded border border-border-subtle px-2 py-0.5 text-xs text-text-secondary hover:border-accent/40 hover:text-accent disabled:opacity-40"
                                >
                                  <RefreshCw className="size-3" />Reload
                                </button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
