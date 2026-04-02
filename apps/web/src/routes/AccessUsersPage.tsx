import { useState } from 'react'
import { useUsers, useDeleteUser, useCreateUser, useUpdateUser, useRealms, useChangeUserPassword, useGroups } from '@/lib/queries/access'
import type { User as ProxmoxUser } from '@zyphercenter/proxmox-types'
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
import { Plus, Trash2, User, KeyRound, Pencil } from 'lucide-react'
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

function EditUserDialog({ user, onClose }: { user: ProxmoxUser; onClose: () => void }) {
  const { data: groups } = useGroups()
  const updateUser = useUpdateUser()

  const [firstname, setFirstname] = useState(user.firstname ?? '')
  const [lastname, setLastname] = useState(user.lastname ?? '')
  const [email, setEmail] = useState(user.email ?? '')
  const [comment, setComment] = useState(user.comment ?? '')
  const [enabled, setEnabled] = useState(user.enable !== 0)
  const [selectedGroups, setSelectedGroups] = useState<string[]>(
    user.groups ? user.groups.split(',').map((g) => g.trim()).filter(Boolean) : [],
  )
  const [expire, setExpire] = useState(
    user.expire && user.expire > 0
      ? new Date(user.expire * 1000).toISOString().slice(0, 16)
      : '',
  )

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const params: Record<string, unknown> = {
      firstname: firstname || undefined,
      lastname: lastname || undefined,
      email: email || undefined,
      comment: comment || undefined,
      enable: enabled ? 1 : 0,
      groups: selectedGroups.join(','),
      expire: expire ? Math.floor(new Date(expire).getTime() / 1000) : 0,
    }
    updateUser.mutate({ userid: user.userid, params }, {
      onSuccess: () => { toast.success(`User ${user.userid} updated`); onClose() },
      onError: (err: unknown) => toast.error((err as Error).message ?? 'Failed to update user'),
    })
  }

  function toggleGroup(gid: string) {
    setSelectedGroups((prev) =>
      prev.includes(gid) ? prev.filter((g) => g !== gid) : [...prev, gid],
    )
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit User — {user.userid}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="eu-firstname">First Name</Label>
              <Input id="eu-firstname" value={firstname} onChange={(e) => setFirstname(e.target.value)} placeholder="Alice" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="eu-lastname">Last Name</Label>
              <Input id="eu-lastname" value={lastname} onChange={(e) => setLastname(e.target.value)} placeholder="Smith" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="eu-email">Email</Label>
            <Input id="eu-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="alice@example.com" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="eu-comment">Comment</Label>
            <Input id="eu-comment" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Optional description" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="eu-expire">Expire</Label>
            <Input id="eu-expire" type="datetime-local" value={expire} onChange={(e) => setExpire(e.target.value)} className="[color-scheme:dark]" />
            <p className="text-xs text-text-muted">Leave blank for no expiry</p>
          </div>
          {groups && groups.length > 0 && (
            <div className="space-y-1.5">
              <Label>Groups</Label>
              <div className="flex flex-wrap gap-2">
                {groups.map((g) => (
                  <button
                    key={g.groupid}
                    type="button"
                    onClick={() => toggleGroup(g.groupid)}
                    className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                      selectedGroups.includes(g.groupid)
                        ? 'bg-accent text-white border-accent'
                        : 'bg-transparent text-text-secondary border-border hover:border-accent'
                    }`}
                  >
                    {g.groupid}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <input id="eu-enabled" type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="size-4 rounded border-border accent-accent" />
            <Label htmlFor="eu-enabled">Enabled</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={updateUser.isPending}>
              {updateUser.isPending ? 'Saving…' : 'Save Changes'}
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
  const changePassword = useChangeUserPassword()
  const [showCreate, setShowCreate] = useState(false)
  const [editingUser, setEditingUser] = useState<ProxmoxUser | null>(null)
  const [changePwUser, setChangePwUser] = useState<string | null>(null)
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')

  function submitPw() {
    if (!changePwUser || !newPw || newPw !== confirmPw) return
    changePassword.mutate(
      { userid: changePwUser, password: newPw },
      { onSuccess: () => { setChangePwUser(null); setNewPw(''); setConfirmPw('') } },
    )
  }

  return (
    <div className="space-y-4">
      <CreateUserDialog open={showCreate} onClose={() => setShowCreate(false)} />
      {editingUser && <EditUserDialog user={editingUser} onClose={() => setEditingUser(null)} />}
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
                  <TableHead className="w-24" />
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
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              title="Edit user"
                              onClick={() => setEditingUser(user)}
                            >
                              <Pencil className="size-3.5 text-text-muted hover:text-text-primary" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              title="Change password"
                              disabled={realm !== 'pam'}
                              onClick={() => { setChangePwUser(user.userid); setNewPw(''); setConfirmPw('') }}
                            >
                              <KeyRound className="size-3.5 text-text-muted" />
                            </Button>
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
                          </div>
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

      {changePwUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-bg-card border border-border-subtle rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-base font-semibold text-text-primary">Change Password</h2>
            <p className="text-sm text-text-muted">{changePwUser}</p>
            <div className="space-y-2">
              <div>
                <Label htmlFor="new-pw">New Password</Label>
                <Input
                  id="new-pw"
                  type="password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  autoFocus
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="confirm-pw">Confirm Password</Label>
                <Input
                  id="confirm-pw"
                  type="password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') submitPw() }}
                  className="mt-1"
                />
              </div>
            </div>
            {confirmPw && newPw !== confirmPw && (
              <p className="text-xs text-status-error">Passwords do not match</p>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setChangePwUser(null); setNewPw(''); setConfirmPw('') }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!newPw || newPw !== confirmPw || changePassword.isPending}
                onClick={submitPw}
              >
                {changePassword.isPending ? 'Saving…' : 'Change Password'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
