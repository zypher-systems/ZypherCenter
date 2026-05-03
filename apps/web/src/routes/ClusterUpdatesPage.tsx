import { useQueries, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router'
import { RefreshCw, Package, ArrowRight, ShieldCheck, AlertTriangle, Search } from 'lucide-react'
import { useClusterResources } from '@/lib/queries/cluster'
import { nodeKeys } from '@/lib/queries/nodes'
import { api } from '@/lib/api'
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
import { cn } from '@/lib/utils'
import type { AptPackage } from '@zyphercenter/proxmox-types'

export function ClusterUpdatesPage() {
  const qc = useQueryClient()
  const { data: resources, isLoading: resLoading } = useClusterResources()
  const nodes = resources?.filter((r) => r.type === 'node') ?? []

  const updateQueries = useQueries({
    queries: nodes.map((node) => ({
      queryKey: nodeKeys.updates(node.node!),
      queryFn: () => api.get<AptPackage[]>(`nodes/${node.node}/apt/update`),
      enabled: !!node.node,
      staleTime: 300_000,
    })),
  })

  const isLoading = resLoading || updateQueries.some((q) => q.isLoading)
  const isRefreshing = updateQueries.some((q) => q.isFetching)

  const nodesWithUpdates = nodes.map((node, i) => {
    const q = updateQueries[i]
    return {
      name: node.node!,
      status: node.status,
      updates: q?.data ?? [],
      count: q?.data?.length ?? 0,
      isLoading: q?.isLoading,
      error: q?.error,
    }
  }).sort((a, b) => b.count - a.count)

  const totalUpdates = nodesWithUpdates.reduce((acc, n) => acc + n.count, 0)
  const nodesNeedingUpdates = nodesWithUpdates.filter((n) => n.count > 0).length

  const refreshAll = () => {
    nodes.forEach((node) => {
      qc.invalidateQueries({ queryKey: nodeKeys.updates(node.node!) })
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary tracking-tight">Cluster Patching</h1>
            <p className="text-sm text-text-muted mt-0.5">
              Manage system updates across all {nodes.length} nodes
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshAll}
            disabled={isRefreshing}
            className="h-9"
          >
            <RefreshCw className={cn("size-4 mr-2", isRefreshing && "animate-spin")} />
            Refresh All
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="bg-bg-card/50">
          <CardContent className="pt-5">
            <p className="text-xs font-medium text-text-muted uppercase tracking-wider">Total Updates</p>
            <p className="text-3xl font-bold text-text-primary mt-1">{totalUpdates}</p>
            <p className="text-xs text-text-disabled mt-1">Across all nodes</p>
          </CardContent>
        </Card>
        <Card className={cn("bg-bg-card/50", nodesNeedingUpdates > 0 && "border-status-warning/30 bg-status-warning/5")}>
          <CardContent className="pt-5">
            <p className="text-xs font-medium text-text-muted uppercase tracking-wider">Nodes Needing Patches</p>
            <p className={cn("text-3xl font-bold mt-1", nodesNeedingUpdates > 0 ? "text-status-warning" : "text-text-primary")}>
              {nodesNeedingUpdates}
            </p>
            <p className="text-xs text-text-disabled mt-1">Out of {nodes.length} nodes</p>
          </CardContent>
        </Card>
        <Card className="bg-bg-card/50">
          <CardContent className="pt-5">
            <p className="text-xs font-medium text-text-muted uppercase tracking-wider">Security Status</p>
            <div className="flex items-center gap-2 mt-1">
              {nodesNeedingUpdates === 0 ? (
                <>
                  <ShieldCheck className="size-5 text-status-running" />
                  <span className="text-lg font-semibold text-status-running">Secure</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="size-5 text-status-warning" />
                  <span className="text-lg font-semibold text-status-warning">Updates Pending</span>
                </>
              )}
            </div>
            <p className="text-xs text-text-disabled mt-1">Last checked just now</p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <Card className="overflow-hidden border-border/50 shadow-xl shadow-black/5">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-bg-elevated/50">
                <TableRow>
                  <TableHead className="py-4 pl-6">Node</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pending Updates</TableHead>
                  <TableHead>Security Level</TableHead>
                  <TableHead className="pr-6 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nodesWithUpdates.map((node) => (
                  <TableRow key={node.name} className="group hover:bg-bg-hover/50">
                    <TableCell className="py-4 pl-6">
                      <div className="flex items-center gap-2">
                        <Package className="size-4 text-text-muted" />
                        <span className="font-semibold text-text-primary">{node.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className={cn(
                          "size-1.5 rounded-full",
                          node.status === 'online' ? "bg-status-running" : "bg-status-stopped"
                        )} />
                        <span className="text-xs text-text-secondary capitalize">{node.status}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        "text-sm font-mono font-bold",
                        node.count > 0 ? "text-status-warning" : "text-text-disabled"
                      )}>
                        {node.count}
                      </span>
                    </TableCell>
                    <TableCell>
                      {node.count > 0 ? (
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-status-warning/10 text-status-warning text-[10px] font-bold uppercase tracking-wider">
                          <AlertTriangle className="size-3" />
                          Action Required
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-status-running/10 text-status-running text-[10px] font-bold uppercase tracking-wider">
                          <ShieldCheck className="size-3" />
                          Up to date
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <Button asChild variant="ghost" size="sm" className="h-8 gap-1.5 text-xs hover:bg-accent/10 hover:text-accent">
                        <Link to={`/nodes/${node.name}/updates`}>
                          Manage
                          <ArrowRight className="size-3" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
