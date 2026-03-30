import { useClusterReplication } from '@/lib/queries/cluster'
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
import { Plus } from 'lucide-react'
import { formatTimestamp } from '@/lib/utils'

export function ClusterReplicationPage() {
  const { data: jobs, isLoading } = useClusterReplication()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Replication</h1>
          <p className="text-sm text-text-muted mt-0.5">Disk replication jobs between cluster nodes</p>
        </div>
        <Button size="sm" disabled>
          <Plus className="size-4 mr-1.5" />
          Add Job
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
                  <TableHead>Job ID</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Last Sync</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-text-muted py-12">
                      No replication jobs configured
                    </TableCell>
                  </TableRow>
                ) : (
                  jobs?.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-mono text-sm text-text-primary">{job.id}</TableCell>
                      <TableCell className="text-text-secondary text-sm">
                        {(job as unknown as Record<string, unknown>)['source'] as string ?? '—'}
                      </TableCell>
                      <TableCell className="text-text-secondary text-sm">{job.target}</TableCell>
                      <TableCell className="text-text-secondary">{job.schedule ?? '—'}</TableCell>
                      <TableCell className="text-text-muted text-sm">
                        {(job as unknown as Record<string, unknown>)['last_sync']
                          ? formatTimestamp((job as unknown as Record<string, unknown>)['last_sync'] as number)
                          : 'Never'}
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs ${
                          (job as unknown as Record<string, unknown>)['error']
                            ? 'text-status-error'
                            : 'text-status-running'
                        }`}>
                          {((job as unknown as Record<string, unknown>)['error'] as string) ?? 'OK'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
