import { useACL } from '@/lib/queries/access'
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
import { Plus, Lock } from 'lucide-react'

export function ACLPage() {
  const { data: acl, isLoading } = useACL()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Permissions (ACL)</h1>
          <p className="text-sm text-text-muted mt-0.5">
            Access control list — path-based permission assignments
          </p>
        </div>
        <Button size="sm" disabled>
          <Plus className="size-4 mr-1.5" />
          Add ACL
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
                  <TableHead>Path</TableHead>
                  <TableHead>User/Group</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Propagate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {acl?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-text-muted py-10">
                      No ACL entries
                    </TableCell>
                  </TableRow>
                ) : (
                  acl?.map((entry, i) => (
                    <TableRow key={`${entry.path}-${entry.ugid}-${i}`}>
                      <TableCell className="font-mono text-sm text-text-primary">
                        <div className="flex items-center gap-2">
                          <Lock className="size-3.5 text-text-muted shrink-0" />
                          {entry.path}
                        </div>
                      </TableCell>
                      <TableCell className="text-text-secondary text-sm">
                        <span className={entry.type === 'group' ? 'text-accent' : ''}>
                          {entry.type === 'group' ? '@' : ''}{entry.ugid}
                        </span>
                      </TableCell>
                      <TableCell className="text-text-secondary">{entry.roleid}</TableCell>
                      <TableCell>
                        {entry.propagate ? (
                          <span className="text-xs text-status-running">Yes</span>
                        ) : (
                          <span className="text-xs text-text-muted">No</span>
                        )}
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
