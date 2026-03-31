import { useParams, Link } from 'react-router'
import { Database } from 'lucide-react'
import { useNodeStorage } from '@/lib/queries/nodes'
import { Card, CardContent } from '@/components/ui/Card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table'
import { ResourceGauge } from '@/components/ui/ResourceGauge'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { formatBytes } from '@/lib/utils'

export function NodeStoragePage() {
  const { node } = useParams<{ node: string }>()
  const { data: storages, isLoading } = useNodeStorage(node!)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Storage</h1>
        <p className="text-sm text-text-muted mt-0.5">Storage volumes visible to {node}</p>
      </div>

      {isLoading ? (
        <SkeletonCard />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Storage</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Content</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Used</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {storages?.map((s) => (
                  <TableRow key={s.storage} className="cursor-pointer hover:bg-bg-hover">
                    <TableCell>
                      <Link to={`/storage/${s.storage}`} className="flex items-center gap-2 hover:underline">
                        <Database className="size-3.5 text-text-muted shrink-0" />
                        <span className="font-medium text-text-primary">{s.storage}</span>
                      </Link>
                    </TableCell>
                    <TableCell className="text-text-secondary text-sm">{s.type}</TableCell>
                    <TableCell className="text-text-muted text-xs">
                      {s.content?.replace(/,/g, ', ') ?? '—'}
                    </TableCell>
                    <TableCell className="w-32">
                      {s.total && s.used != null ? (
                        <ResourceGauge
                          label=""
                          used={s.used}
                          total={s.total}
                        />
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="tabular-nums text-text-secondary">
                      {s.total ? formatBytes(s.total) : '—'}
                    </TableCell>
                    <TableCell className="tabular-nums text-text-secondary">
                      {s.used != null ? formatBytes(s.used) : '—'}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs ${
                          s.active ? 'text-status-running' : 'text-status-stopped'
                        }`}
                      >
                        <span
                          className={`inline-flex size-1.5 rounded-full ${
                            s.active ? 'bg-status-running' : 'bg-status-stopped'
                          }`}
                        />
                        {s.active ? 'Active' : 'Inactive'}
                      </span>
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
