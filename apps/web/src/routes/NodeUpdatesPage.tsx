import { useState } from 'react'
import { useParams } from 'react-router'
import { RefreshCw, Download, Search, Package, ArrowUpCircle } from 'lucide-react'
import { useNodeUpdates, useNodeAptUpgrade, useNodeAptCheck } from '@/lib/queries/nodes'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
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
import { TaskLogViewer } from '@/components/features/TaskLogViewer'
import { cn } from '@/lib/utils'

export function NodeUpdatesPage() {
  const { node } = useParams<{ node: string }>()
  const { data: packages, isLoading, refetch, isFetching } = useNodeUpdates(node!)
  const [activeUpid, setActiveUpid] = useState<string | null>(null)
  
  const upgrade = useNodeAptUpgrade(node!)
  const aptCheck = useNodeAptCheck(node!)

  const handleUpgrade = () => {
    upgrade.mutate(undefined, {
      onSuccess: (data) => {
        if (typeof data === 'string') {
          setActiveUpid(data)
        }
      }
    })
  }

  const hasUpdates = (packages?.length ?? 0) > 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <Package className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary tracking-tight">System Patching</h1>
            <p className="text-sm text-text-muted mt-0.5">
              {isLoading
                ? 'Scanning for available updates…'
                : hasUpdates
                  ? `${packages!.length} package${packages!.length !== 1 ? 's' : ''} can be upgraded`
                  : 'All system packages are up to date'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => aptCheck.mutate()}
            disabled={aptCheck.isPending || isFetching}
            className="h-9"
          >
            <Search className={cn("size-4 mr-2", aptCheck.isPending && "animate-pulse")} />
            {aptCheck.isPending ? 'Checking…' : 'Check Updates'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-9"
          >
            <RefreshCw className={cn("size-4 mr-2", isFetching && "animate-spin")} />
            Refresh
          </Button>
          {hasUpdates && (
            <Button
              size="sm"
              disabled={upgrade.isPending}
              onClick={handleUpgrade}
              className="h-9 bg-accent hover:bg-accent-hover text-white shadow-lg shadow-accent/20 transition-all active:scale-95"
            >
              <ArrowUpCircle className="size-4 mr-2" />
              Upgrade All Packages
            </Button>
          )}
        </div>
      </div>

      {activeUpid && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
          <Card className="border-accent/30 bg-accent/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <RefreshCw className="size-4 text-accent animate-spin" />
                Upgrade in Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TaskLogViewer node={node!} upid={activeUpid} maxHeight="300px" />
              <div className="mt-4 flex justify-end">
                <Button variant="ghost" size="sm" onClick={() => setActiveUpid(null)} className="text-xs">
                  Hide Log
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4">
          <SkeletonCard />
        </div>
      ) : !hasUpdates ? (
        <Card className="border-dashed">
          <CardContent className="flex h-64 flex-col items-center justify-center text-center">
            <div className="size-12 rounded-full bg-status-running/10 text-status-running flex items-center justify-center mb-4">
              <Package className="size-6" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary">System Up to Date</h3>
            <p className="text-sm text-text-muted max-w-xs mt-1">
              No new updates were found for this node. Check back later or run a manual refresh.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden border-border/50 shadow-xl shadow-black/5">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-bg-elevated/50">
                <TableRow>
                  <TableHead className="py-4 pl-6">Package Name</TableHead>
                  <TableHead>Current Version</TableHead>
                  <TableHead>Target Version</TableHead>
                  <TableHead className="pr-6">Priority</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packages?.map((pkg) => {
                  const p = pkg as Record<string, unknown>
                  return (
                    <TableRow key={p['Package'] as string} className="group hover:bg-bg-hover/50">
                      <TableCell className="font-medium text-text-primary py-4 pl-6">
                        <div className="flex flex-col">
                          <span>{p['Package'] as string}</span>
                          <span className="text-[10px] text-text-disabled font-mono mt-0.5 truncate max-w-[200px]">
                            {(p['Section'] as string) ?? ''}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-text-muted">
                        {(p['OldVersion'] as string) ?? '—'}
                      </TableCell>
                      <TableCell>
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-status-running/10 text-status-running font-mono text-xs">
                          <ArrowUpCircle className="size-3" />
                          {(p['Version'] as string) ?? '—'}
                        </div>
                      </TableCell>
                      <TableCell className="pr-6">
                        <span className={cn(
                          "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider",
                          (p['Priority'] as string) === 'important' || (p['Priority'] as string) === 'required'
                            ? "bg-status-error/10 text-status-error"
                            : "bg-bg-elevated text-text-muted"
                        )}>
                          {(p['Priority'] as string) ?? '—'}
                        </span>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

