import { useState } from 'react'
import { useParams } from 'react-router'
import { RefreshCw, Download } from 'lucide-react'
import { useNodeUpdates } from '@/lib/queries/nodes'
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

export function NodeUpdatesPage() {
  const { node } = useParams<{ node: string }>()
  const { data: packages, isLoading, refetch, isFetching } = useNodeUpdates(node!)
  const [upgrading, setUpgrading] = useState(false)

  const hasUpdates = (packages?.length ?? 0) > 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Updates</h1>
          <p className="text-sm text-text-muted mt-0.5">
            {isLoading
              ? 'Checking for updates…'
              : hasUpdates
                ? `${packages!.length} package${packages!.length !== 1 ? 's' : ''} available`
                : 'System is up to date'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`size-4 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {hasUpdates && (
            <Button
              size="sm"
              disabled={upgrading}
              onClick={() => {
                setUpgrading(true)
                // Proxmox upgrade is done via POST /nodes/{node}/apt/update (which runs apt-get upgrade)
                fetch(`/api/proxmox/nodes/${node}/apt/update`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({}),
                  credentials: 'include',
                }).finally(() => setUpgrading(false))
              }}
            >
              <Download className="size-4 mr-1.5" />
              Upgrade All
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <SkeletonCard />
      ) : !hasUpdates ? (
        <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-border">
          <p className="text-text-muted text-sm">No updates available</p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Package</TableHead>
                  <TableHead>Current Version</TableHead>
                  <TableHead>New Version</TableHead>
                  <TableHead>Priority</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packages?.map((pkg) => {
                  const p = pkg as Record<string, unknown>
                  return (
                    <TableRow key={p['Package'] as string}>
                      <TableCell className="font-medium text-text-primary">
                        {p['Package'] as string}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-text-muted">
                        {(p['OldVersion'] as string) ?? '—'}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-status-running">
                        {(p['Version'] as string) ?? '—'}
                      </TableCell>
                      <TableCell className="text-text-secondary text-sm capitalize">
                        {(p['Priority'] as string) ?? '—'}
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
