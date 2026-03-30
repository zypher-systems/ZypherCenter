import { useState } from 'react'
import { useUsers, useDeleteUser, useCreateUser } from '@/lib/queries/access'
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
import { Plus, Trash2, User, Shield } from 'lucide-react'
import { formatTimestamp } from '@/lib/utils'

export function AccessUsersPage() {
  const { data: users, isLoading } = useUsers()
  const deleteUser = useDeleteUser()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Users</h1>
          <p className="text-sm text-text-muted mt-0.5">User accounts and authentication</p>
        </div>
        <Button size="sm" disabled>
          <Plus className="size-4 mr-1.5" />
          Add User
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
                  <TableHead>Username</TableHead>
                  <TableHead>Realm</TableHead>
                  <TableHead>Comment</TableHead>
                  <TableHead>Groups</TableHead>
                  <TableHead>Enabled</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-text-muted py-10">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  users?.map((user) => {
                    const [username, realm] = user.userid.split('@')
                    return (
                      <TableRow key={user.userid}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="size-3.5 text-text-muted shrink-0" />
                            <span className="font-medium text-text-primary">{username}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-text-secondary text-sm">{realm}</TableCell>
                        <TableCell className="text-text-muted text-sm">
                          {user.comment ?? '—'}
                        </TableCell>
                        <TableCell className="text-text-secondary text-sm">
                          {user.groups ?? '—'}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center gap-1.5 text-xs ${
                              user.enable !== 0 ? 'text-status-running' : 'text-status-stopped'
                            }`}
                          >
                            <span
                              className={`inline-flex size-1.5 rounded-full ${
                                user.enable !== 0 ? 'bg-status-running' : 'bg-status-stopped'
                              }`}
                            />
                            {user.enable !== 0 ? 'Yes' : 'No'}
                          </span>
                        </TableCell>
                        <TableCell className="text-text-muted text-sm tabular-nums">
                          {user.expire ? formatTimestamp(user.expire) : 'Never'}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title="Delete user"
                            disabled={deleteUser.isPending || user.userid === 'root@pam'}
                            onClick={() => {
                              if (confirm(`Delete user ${user.userid}?`)) {
                                deleteUser.mutate(user.userid)
                              }
                            }}
                          >
                            <Trash2 className="size-3.5 text-text-muted hover:text-status-error" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
