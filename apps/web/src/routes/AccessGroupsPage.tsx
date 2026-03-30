import { useGroups } from '@/lib/queries/access'
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
import { Plus, Users } from 'lucide-react'

export function AccessGroupsPage() {
  const { data: groups, isLoading } = useGroups()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Groups</h1>
          <p className="text-sm text-text-muted mt-0.5">User groups for access control</p>
        </div>
        <Button size="sm" disabled>
          <Plus className="size-4 mr-1.5" />
          Add Group
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
                  <TableHead>Group</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Comment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-text-muted py-10">
                      No groups found
                    </TableCell>
                  </TableRow>
                ) : (
                  groups?.map((group) => (
                    <TableRow key={group.groupid}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="size-3.5 text-text-muted shrink-0" />
                          <span className="font-medium text-text-primary">{group.groupid}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-text-secondary text-sm">
                        {group.users ?? '—'}
                      </TableCell>
                      <TableCell className="text-text-muted text-sm">
                        {group.comment ?? '—'}
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
