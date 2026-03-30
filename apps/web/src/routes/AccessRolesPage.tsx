import { useRoles } from '@/lib/queries/access'
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
import { Plus, Shield } from 'lucide-react'

export function AccessRolesPage() {
  const { data: roles, isLoading } = useRoles()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Roles</h1>
          <p className="text-sm text-text-muted mt-0.5">Permission sets that can be assigned via ACLs</p>
        </div>
        <Button size="sm" disabled>
          <Plus className="size-4 mr-1.5" />
          Add Role
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
                  <TableHead>Role</TableHead>
                  <TableHead>Special</TableHead>
                  <TableHead>Privileges</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles?.map((role) => (
                  <TableRow key={role.roleid}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Shield className="size-3.5 text-text-muted shrink-0" />
                        <span className="font-medium text-text-primary">{role.roleid}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {role.special ? (
                        <span className="text-xs text-accent bg-accent/10 px-2 py-0.5 rounded">
                          Built-in
                        </span>
                      ) : (
                        <span className="text-xs text-text-muted">Custom</span>
                      )}
                    </TableCell>
                    <TableCell className="text-text-muted text-xs max-w-xs">
                      <p className="line-clamp-2">
                        {role.privs ? role.privs.split(',').join(', ') : '—'}
                      </p>
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
