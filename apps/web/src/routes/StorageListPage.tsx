import { Link } from 'react-router'
import { Database, HardDrive } from 'lucide-react'
import { useStorage } from '@/lib/queries/storage'
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

export function StorageListPage() {
  const { data: storages, isLoading } = useStorage()

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Storage</h1>
        <p className="text-sm text-text-muted mt-0.5">All configured storage pools in the cluster</p>
      </div>

      {isLoading ? (
        <SkeletonCard />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Content Types</TableHead>
                  <TableHead>Nodes</TableHead>
                  <TableHead>Enabled</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {storages?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-text-muted py-10">
                      No storage configured
                    </TableCell>
                  </TableRow>
                ) : (
                  storages?.map((s) => (
                    <TableRow key={s.storage}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Database className="size-3.5 text-text-muted shrink-0" />
                          <Link
                            to={`/storage/${s.storage}`}
                            className="font-medium text-text-primary hover:text-accent transition-colors"
                          >
                            {s.storage}
                          </Link>
                        </div>
                      </TableCell>
                      <TableCell className="text-text-secondary text-sm">{s.type}</TableCell>
                      <TableCell className="text-text-muted text-xs">
                        {s.content?.replace(/,/g, ', ') ?? '—'}
                      </TableCell>
                      <TableCell className="text-text-secondary text-sm">
                        {s.nodes ?? <span className="text-text-muted">All</span>}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs ${
                            s.disable ? 'text-status-stopped' : 'text-status-running'
                          }`}
                        >
                          <span
                            className={`inline-flex size-1.5 rounded-full ${
                              s.disable ? 'bg-status-stopped' : 'bg-status-running'
                            }`}
                          />
                          {s.disable ? 'Disabled' : 'Enabled'}
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
