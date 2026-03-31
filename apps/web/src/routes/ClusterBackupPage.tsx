import { useState } from 'react'
import { useClusterBackupJobs, useCreateBackupJob, useDeleteBackupJob, useUpdateBackupJob } from '@/lib/queries/cluster'
import { useStorage } from '@/lib/queries/storage'
import { useClusterStatus } from '@/lib/queries/cluster'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Plus, Trash2, HardDrive, Clock } from 'lucide-react'
import { toast } from 'sonner'

function CreateBackupJobDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: storages } = useStorage()
  const { data: clusterStatus } = useClusterStatus()
  const createJob = useCreateBackupJob()

  const nodes = (clusterStatus ?? []).filter((s) => s.type === 'node').map((s) => s.name)
  const volumeStorages = (storages ?? []).filter((s) =>
    s.content?.includes('backup') || !s.content,
  )

  const [schedule, setSchedule] = useState('0 0 * * *')
  const [storage, setStorage] = useState('')
  const [mode, setMode] = useState<'snapshot' | 'suspend' | 'stop'>('snapshot')
  const [vmid, setVmid] = useState('')
  const [compress, setCompress] = useState('zstd')
  const [node, setNode] = useState('')
  const [comment, setComment] = useState('')
  const [enabled, setEnabled] = useState(true)

  function handleClose() {
    setSchedule('0 0 * * *'); setStorage(''); setMode('snapshot')
    setVmid(''); setCompress('zstd'); setNode(''); setComment(''); setEnabled(true)
    onClose()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!storage) return
    const params: Record<string, unknown> = {
      storage,
      schedule,
      mode,
      compress,
      enabled: enabled ? 1 : 0,
    }
    if (vmid.trim()) params.vmid = vmid.trim()
    if (node) params.node = node
    if (comment.trim()) params.comment = comment.trim()

    createJob.mutate(params, {
      onSuccess: () => { toast.success('Backup job created'); handleClose() },
      onError: (err: unknown) => toast.error((err as Error).message ?? 'Failed to create backup job'),
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Backup Job</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="bj-storage">Storage</Label>
              <select
                id="bj-storage"
                value={storage}
                onChange={(e) => setStorage(e.target.value)}
                required
                className="flex h-9 w-full rounded-md border border-border bg-bg-input px-3 py-1 text-sm text-text-primary shadow-sm focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">Select storage…</option>
                {volumeStorages.map((s) => (
                  <option key={s.storage} value={s.storage}>{s.storage}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bj-mode">Mode</Label>
              <select
                id="bj-mode"
                value={mode}
                onChange={(e) => setMode(e.target.value as typeof mode)}
                className="flex h-9 w-full rounded-md border border-border bg-bg-input px-3 py-1 text-sm text-text-primary shadow-sm focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="snapshot">Snapshot</option>
                <option value="suspend">Suspend</option>
                <option value="stop">Stop</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bj-schedule">Schedule (cron)</Label>
            <Input id="bj-schedule" value={schedule} onChange={(e) => setSchedule(e.target.value)} placeholder="0 0 * * *" required />
            <p className="text-xs text-text-muted">Standard cron expression, e.g. <code className="font-mono">0 2 * * *</code> = daily at 02:00</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="bj-compress">Compression</Label>
              <select
                id="bj-compress"
                value={compress}
                onChange={(e) => setCompress(e.target.value)}
                className="flex h-9 w-full rounded-md border border-border bg-bg-input px-3 py-1 text-sm text-text-primary shadow-sm focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="zstd">zstd (fast)</option>
                <option value="gzip">gzip</option>
                <option value="lzo">lzo (fastest)</option>
                <option value="0">None</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bj-node">Node (optional)</Label>
              <select
                id="bj-node"
                value={node}
                onChange={(e) => setNode(e.target.value)}
                className="flex h-9 w-full rounded-md border border-border bg-bg-input px-3 py-1 text-sm text-text-primary shadow-sm focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">All nodes</option>
                {nodes.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bj-vmid">VM/CT IDs (optional)</Label>
            <Input id="bj-vmid" value={vmid} onChange={(e) => setVmid(e.target.value)} placeholder="100,101,200 (leave empty for all)" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bj-comment">Comment</Label>
            <Input id="bj-comment" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Optional description" />
          </div>
          <div className="flex items-center gap-2">
            <input id="bj-enabled" type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="size-4 rounded border-border accent-accent" />
            <Label htmlFor="bj-enabled">Enabled</Label>
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

export function ClusterBackupPage() {
  const { data: jobs, isLoading } = useClusterBackupJobs()
  const deleteJob = useDeleteBackupJob()
  const updateJob = useUpdateBackupJob()
  const [showCreate, setShowCreate] = useState(false)

  return (
    <div className="space-y-4">
      <CreateBackupJobDialog open={showCreate} onClose={() => setShowCreate(false)} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Backup</h1>
          <p className="text-sm text-text-muted mt-0.5">Scheduled backup jobs for the cluster</p>
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
                  <TableHead>Schedule</TableHead>
                  <TableHead>Storage</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Nodes</TableHead>
                  <TableHead>Enabled</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-text-muted py-12">
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
                        <button
                          onClick={() => updateJob.mutate({ id: job.id, params: { enabled: (!job.enabled || job.enabled === 1) ? 0 : 1 } })}
                          disabled={updateJob.isPending}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${
                            !job.enabled || job.enabled === 1 ? 'bg-accent' : 'bg-border-muted'
                          }`}
                        >
                          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                            !job.enabled || job.enabled === 1 ? 'translate-x-4' : 'translate-x-1'
                          }`} />
                        </button>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Delete job"
                          disabled={deleteJob.isPending}
                          onClick={() => {
                            if (confirm(`Delete backup job ${job.id}?`)) {
                              deleteJob.mutate(job.id, {
                                onSuccess: () => toast.success('Backup job deleted'),
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
