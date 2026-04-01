import { useState } from 'react'
import { useACL, useAddACL, useDeleteACL, useRoles } from '@/lib/queries/access'
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
import { Plus, Trash2, Lock } from 'lucide-react'
import { toast } from 'sonner'

function AddACLDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: roles } = useRoles()
  const addACL = useAddACL()
  const [path, setPath] = useState('/')
  const [type, setType] = useState<'user' | 'group'>('user')
  const [ugid, setUgid] = useState('')
  const [roleid, setRoleid] = useState('')
  const [propagate, setPropagate] = useState(true)

  function handleClose() {
    setPath('/'); setType('user'); setUgid(''); setRoleid(''); setPropagate(true); onClose()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!path.trim() || !ugid.trim() || !roleid) return
    const params: Record<string, unknown> = {
      path: path.trim(),
      roles: roleid,
      propagate: propagate ? 1 : 0,
    }
    if (type === 'user') params.users = ugid.trim()
    else params.groups = ugid.trim()

    addACL.mutate(params, {
      onSuccess: () => { toast.success('ACL entry added'); handleClose() },
      onError: (err: unknown) => toast.error((err as Error).message ?? 'Failed to add ACL'),
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add ACL Entry</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="acl-path">Path</Label>
            <Input id="acl-path" value={path} onChange={(e) => setPath(e.target.value)} placeholder="/" required />
            <p className="text-xs text-text-muted">e.g. /, /vms/100, /nodes/pve</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="acl-type">Type</Label>
              <select
                id="acl-type"
                value={type}
                onChange={(e) => setType(e.target.value as 'user' | 'group')}
                className="flex h-9 w-full rounded-md border border-border bg-bg-input px-3 py-1 text-sm text-text-primary shadow-sm focus:outline-none focus:ring-2 focus:ring-accent [color-scheme:dark]"
              >
                <option value="user">User</option>
                <option value="group">Group</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acl-ugid">{type === 'user' ? 'User ID' : 'Group ID'}</Label>
              <Input
                id="acl-ugid"
                value={ugid}
                onChange={(e) => setUgid(e.target.value)}
                placeholder={type === 'user' ? 'user@pam' : 'admins'}
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="acl-role">Role</Label>
            <select
              id="acl-role"
              value={roleid}
              onChange={(e) => setRoleid(e.target.value)}
              className="flex h-9 w-full rounded-md border border-border bg-bg-input px-3 py-1 text-sm text-text-primary shadow-sm focus:outline-none focus:ring-2 focus:ring-accent [color-scheme:dark]"
              required
            >
              <option value="">Select role…</option>
              {roles?.map((r) => (
                <option key={r.roleid} value={r.roleid}>{r.roleid}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="acl-propagate"
              type="checkbox"
              checked={propagate}
              onChange={(e) => setPropagate(e.target.checked)}
              className="size-4 rounded border-border accent-accent"
            />
            <Label htmlFor="acl-propagate">Propagate to sub-paths</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={addACL.isPending}>
              {addACL.isPending ? 'Adding…' : 'Add Entry'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function ACLPage() {
  const { data: acl, isLoading } = useACL()
  const deleteACL = useDeleteACL()
  const [showAdd, setShowAdd] = useState(false)

  return (
    <div className="space-y-4">
      <AddACLDialog open={showAdd} onClose={() => setShowAdd(false)} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Permissions (ACL)</h1>
          <p className="text-sm text-text-muted mt-0.5">
            Access control list — path-based permission assignments
          </p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)}>
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
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {acl?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-text-muted py-10">
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
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Remove ACL entry"
                          disabled={deleteACL.isPending}
                          onClick={() => {
                            if (confirm(`Remove ${entry.roleid} from ${entry.path} for ${entry.ugid}?`)) {
                              const params: Record<string, unknown> = {
                                path: entry.path,
                                roles: entry.roleid,
                              }
                              if (entry.type === 'user') params.users = entry.ugid
                              else params.groups = entry.ugid
                              deleteACL.mutate(params, {
                                onSuccess: () => toast.success('ACL entry removed'),
                                onError: (err: unknown) => toast.error((err as Error).message ?? 'Failed to remove ACL'),
                              })
                            }
                          }}
                        >
                          <Trash2 className="size-3.5 text-text-muted hover:text-status-error" />
                        </Button>
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
