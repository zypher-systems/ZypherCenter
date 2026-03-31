import { useState } from 'react'
import {
  useClusterReplication,
  useCreateReplicationJob,
  useDeleteReplicationJob,
  useClusterStatus,
} from '@/lib/queries/cluster'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Plus, Trash2 } from 'lucide-react'
import { formatTimestamp } from '@/lib/utils'
import { toast } from 'sonner'

function CreateReplicationJobDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: clusterStatus } = useClusterStatus()
  const createJob = useCreateReplicationJob()

  const nodes = (clusterStatus ?? []).filter((s) => s.type === 'node').map((s) => s.name)

  const [guest, setGuest] = useState('')
  const [target, setTarget] = useState('')
  const [schedule, setSchedule] = useState('*/15 * * * *')
  const [rate, setRate] = useState('')
  const [comment, setComment] = useState('')
  const [enabled, setEnabled] = useState(true)

  function handleClose() {
    setGuest(''); setTarget(''); setSchedule('*/15 * * * *')
    setRate(''); setComment(''); setEnabled(true); onClose()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const guestId = parseInt(guest, 10)
    if (!guest || isNaN(guestId) || !target) return

    const params: Record<string, unknown> = {
      guest: guestId,
      target,
      type: 'local',
      schedule,
      enabled: enabled ? 1 : 0,
    }
    if (rate) params.rate = parseFloat(rate)
    if (comment.trim()) params.comment = comment.trim()

    createJob.mutate(params, {
      onSuccess: () => { toast.success('Replication job created'); handleClose() },
      onError: (err: unknown) => toast.error((err as Error).message ?? 'Failed to create replication job'),
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Replication Job</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rj-guest">VM/CT ID</Label>
              <Input
                id="rj-guest"
                type="number"
                min={100}
                value={guest}
                onChange={(e) => setGuest(e.target.value)}
                placeholder="100"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rj-target">Target Node</Label>
              <select
                id="rj-target"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                required
                className="flex h-9 w-full rounded-md border border-border bg-bg-input px-3 py-1 text-sm text-text-primary shadow-sm focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">Select target…</option>
                {nodes.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rj-schedule">Schedule (cron)</Label>
            <Input id="rj-schedule" value={schedule} onChange={(e) => setSchedule(e.target.value)} placeholder="*/15 * * * *" required />
            <p className="text-xs text-text-muted">e.g. <code className="font-mono">*/15 * * * *</code> = every 15 minutes</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rj-rate">Rate Limit (MB/s, optional)</Label>
            <Input
              id="rj-rate"
              type="number"
              min={0}
              step={0.1}
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="Unlimited"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rj-comment">Comment</Label>
            <Input id="rj-comment" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Optional description" />
          </div>
          <div className="flex items-center gap-2">
            <input id="rj-enabled" type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="size-4 rounded border-border accent-accent" />
            <Label htmlFor="rj-enabled">Enabled</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={createJob.isPending}>
              {createJob.isPending ? 'Creating…' : 'Create Job'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function ClusterReplicationPage() {
  const { data: jobs, isLoading } = useClusterReplication()
  const deleteJob = useDeleteReplicationJob()
  const [showCreate, setShowCreate] = useState(false)

  return (
    <div className="space-y-4">
      <CreateReplicationJobDialog open={showCreate} onClose={() => setShowCreate(false)} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Replication</h1>
          <p className="text-sm text-text-muted mt-0.5">Disk replication jobs between cluster nodes</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
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
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-text-muted py-12">
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
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Delete job"
                          disabled={deleteJob.isPending}
                          onClick={() => {
                            if (confirm(`Delete replication job ${job.id}?`)) {
                              deleteJob.mutate(job.id, {
                                onSuccess: () => toast.success('Replication job deleted'),
                                onError: (err: unknown) => toast.error((err as Error).message ?? 'Failed to delete job'),
                              })
                            }
                          }}
                        >
                          <Trash2 className="size-3.5 text-text-muted hover:text-status-error" />
                        </Button>
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
