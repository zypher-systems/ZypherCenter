import { useRealms } from '@/lib/queries/access'
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
import { Plus, Globe } from 'lucide-react'

export function RealmsPage() {
  const { data: realms, isLoading } = useRealms()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Authentication Realms</h1>
          <p className="text-sm text-text-muted mt-0.5">
            Identity providers and authentication backends
          </p>
        </div>
        <Button size="sm" disabled>
          <Plus className="size-4 mr-1.5" />
          Add Realm
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
                  <TableHead>Realm</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Comment</TableHead>
                  <TableHead>Default</TableHead>
                  <TableHead>2FA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {realms?.map((realm) => (
                  <TableRow key={realm.realm}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Globe className="size-3.5 text-text-muted shrink-0" />
                        <span className="font-medium text-text-primary">{realm.realm}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs uppercase tracking-wide text-text-muted bg-bg-elevated px-2 py-0.5 rounded">
                        {realm.type}
                      </span>
                    </TableCell>
                    <TableCell className="text-text-muted text-sm">
                      {realm.comment ?? '—'}
                    </TableCell>
                    <TableCell>
                      {realm.default ? (
                        <span className="text-xs text-accent">Default</span>
                      ) : (
                        <span className="text-xs text-text-muted">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-text-secondary text-sm">
                      {realm.tfa ?? '—'}
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
