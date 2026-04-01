import { useState } from 'react'
import { useUsers, useDeleteUser, useCreateUser, useUpdateUser, useRealms } from '@/lib/queries/access'
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
import { Plus, Trash2, User } from 'lucide-react'
import { formatTimestamp } from '@/lib/utils'
import { toast } from 'sonner'

function CreateUserDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: realms } = useRealms()
  const createUser = useCreateUser()
  const [username, setUsername] = useState('')
  const [realm, setRealm] = useState('pam')
  const [password, setPassword] = useState('')
  const [comment, setComment] = useState('')
  const [email, setEmail] = useState('')
  const [enabled, setEnabled] = useState(true)

  function handleClose() {
    setUsername(''); setRealm('pam'); setPassword(''); setComment(''); setEmail(''); setEnabled(true)
    onClose()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!username.trim() || !password) return
    const userid = `${username.trim()}@${realm}`
    createUser.mutate(
      { userid, password, comment: comment || undefined, email: email || undefined, enable: enabled ? 1 : 0 },
      {
        onSuccess: () => { toast.success(`User ${userid} created`); handleClose() },
        onError: (err: unknown) => toast.error((err as Error).message ?? 'Failed to create user'),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cu-username">Username</Label>
              <Input id="cu-username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="alice" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cu-realm">Realm</Label>
              <select
                id="cu-realm"
                value={realm}
                onChange={(e) => setRealm(e.target.value)}
                className="flex h-9 w-full rounded-md border border-border bg-bg-input px-3 py-1 text-sm text-text-primary shadow-sm focus:outline-none focus:ring-2 focus:ring-accent [color-scheme:dark]"
              >
                {realms ? realms.map((r) => (
                  <option key={r.realm} value={r.realm}>{r.realm} ({r.type})</option>
                )) : (
                  <option value="pam">pam</option>
                )}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cu-password">Password</Label>
            <Input id="cu-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cu-email">Email</Label>
            <Input id="cu-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="alice@example.com" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cu-comment">Comment</Label>
            <Input id="cu-comment" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Optional description" />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="cu-enabled"
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="size-4 rounded border-border accent-accent"
            />
            <Label htmlFor="cu-enabled">Enabled</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={createUser.isPending}>
              {createUser.isPending ? 'Creating…' : 'Create User'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function AccessUsersPage() {
  const { data: users, isLoading } = useUsers()
  const deleteUser = useDeleteUser()
  const updateUser = useUpdateUser()
  const [showCreate, setShowCreate] = useState(false)

  return (
    <div className="space-y-4">
      <CreateUserDialog open={showCreate} onClose={() => setShowCreate(false)} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Users</h1>
          <p className="text-sm text-text-muted mt-0.5">User accounts and authentication</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
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
                          <button
                            type="button"
                            role="switch"
                            aria-checked={user.enable !== 0}
                            disabled={updateUser.isPending || user.userid === 'root@pam'}
                            onClick={() =>
                              updateUser.mutate(
                                { userid: user.userid, params: { enable: user.enable !== 0 ? 0 : 1 } },
                                {
                                  onSuccess: () => toast.success(`User ${user.userid} ${user.enable !== 0 ? 'disabled' : 'enabled'}`),
                                  onError: (err: unknown) => toast.error((err as Error).message ?? 'Failed to update user'),
                                },
                              )
                            }
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${
                              user.enable !== 0 ? 'bg-accent' : 'bg-border-muted'
                            }`}
                          >
                            <span
                              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                user.enable !== 0 ? 'translate-x-4' : 'translate-x-1'
                              }`}
                            />
                          </button>
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
