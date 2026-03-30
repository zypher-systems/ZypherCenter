import { useClusterBackupJobs } from '@/lib/queries/cluster'
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
import { Plus, HardDrive, Clock } from 'lucide-react'

export function ClusterBackupPage() {
  const { data: jobs, isLoading } = useClusterBackupJobs()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Backup</h1>
          <p className="text-sm text-text-muted mt-0.5">Scheduled backup jobs for the cluster</p>
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
                  <TableHead>Schedule</TableHead>
                  <TableHead>Storage</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Nodes</TableHead>
                  <TableHead>Enabled</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-text-muted py-12">
                      <HardDrive className="size-8 text-border mx-auto mb-2" />
                      <p>No backup jobs configured</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  jobs?.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-mono text-sm text-text-primary">{job.id}</TableCell>
                      <TableCell className="text-text-secondary">
                        <div className="flex items-center gap-1.5">
                          <Clock className="size-3.5 text-text-muted" />
                          {job.schedule ?? job.dow ?? '—'}
                        </div>
                      </TableCell>
                      <TableCell className="text-text-secondary">{job.storage}</TableCell>
                      <TableCell>
                        <span className="text-xs uppercase tracking-wide text-text-muted bg-bg-elevated px-2 py-0.5 rounded">
                          {job.mode ?? 'snapshot'}
                        </span>
                      </TableCell>
                      <TableCell className="text-text-secondary text-sm">
                        {job.node ?? 'All'}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs ${
                            !job.enabled || job.enabled === 1 ? 'text-status-running' : 'text-status-stopped'
                          }`}
                        >
                          <span
                            className={`inline-flex size-1.5 rounded-full ${
                              !job.enabled || job.enabled === 1 ? 'bg-status-running' : 'bg-status-stopped'
                            }`}
                          />
                          {!job.enabled || job.enabled === 1 ? 'Yes' : 'No'}
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
