import { useParams } from 'react-router'
import { HardDrive } from 'lucide-react'
import { useNodeDisks, useWipeDisk, useInitDisk } from '@/lib/queries/nodes'
import { Card, CardContent } from '@/components/ui/Card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { formatBytes } from '@/lib/utils'

function DiskHealth({ health }: { health?: string }) {
  if (!health) return <span className="text-text-muted">—</span>
  const isHealthy = health === 'PASSED' || health.toLowerCase().includes('ok')
  return (
    <span className={isHealthy ? 'text-status-running' : 'text-status-error'}>
      {health}
    </span>
  )
}

export function NodeDisksPage() {
  const { node } = useParams<{ node: string }>()
  const { data: disks, isLoading } = useNodeDisks(node!)
  const wipe = useWipeDisk(node!)
  const init = useInitDisk(node!)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Disks</h1>
        <p className="text-sm text-text-muted mt-0.5">Physical storage devices on {node}</p>
      </div>

      {isLoading ? (
        <SkeletonCard />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>S.M.A.R.T.</TableHead>
                  <TableHead>Wearout</TableHead>
                  <TableHead>Serial</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {disks?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-text-muted py-10">
                      No disks found
                    </TableCell>
                  </TableRow>
                ) : (
                  disks?.map((disk) => (
                    <TableRow key={disk.devpath}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <HardDrive className="size-3.5 text-text-muted shrink-0" />
                          <span className="font-mono text-sm text-text-primary">
                            {disk.devpath}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-text-secondary text-sm">
                        {disk.model ?? '—'}
                      </TableCell>
                      <TableCell className="tabular-nums text-text-secondary">
                        {disk.size ? formatBytes(disk.size) : '—'}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs uppercase tracking-wide text-text-muted bg-bg-elevated px-2 py-0.5 rounded">
                          {disk.type ?? 'unknown'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DiskHealth health={disk.health} />
                      </TableCell>
                      <TableCell className="text-text-secondary">
                        {disk.wearout != null ? `${disk.wearout}%` : '—'}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-text-muted">
                        {disk.serial ?? '—'}
                      </TableCell>                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              if (confirm(`Initialize (GPT) ${disk.devpath}? This will wipe all data!`)) {
                                init.mutate({ disk: disk.devpath })
                              }
                            }}
                            disabled={init.isPending}
                            className="inline-flex items-center gap-1 rounded border border-border-subtle px-2 py-0.5 text-xs text-text-secondary hover:bg-bg-elevated disabled:opacity-50"
                          >
                            Init GPT
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Wipe disk ${disk.devpath}? ALL DATA WILL BE LOST!`)) {
                                wipe.mutate(disk.devpath)
                              }
                            }}
                            disabled={wipe.isPending}
                            className="inline-flex items-center gap-1 rounded border border-status-error/40 px-2 py-0.5 text-xs text-status-error hover:bg-status-error/10 disabled:opacity-50"
                          >
                            Wipe
                          </button>
                        </div>
                      </TableCell>                    </TableRow>
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
