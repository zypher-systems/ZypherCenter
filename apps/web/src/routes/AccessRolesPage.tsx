import { useState } from 'react'
import { useRoles, useCreateRole, useDeleteRole, useUpdateRole } from '@/lib/queries/access'
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
import { Plus, Trash2, Shield, Pencil, Check, X } from 'lucide-react'
import { toast } from 'sonner'

function CreateRoleDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createRole = useCreateRole()
  const [roleid, setRoleid] = useState('')
  const [privs, setPrivs] = useState('')

  function handleClose() {
    setRoleid(''); setPrivs(''); onClose()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!roleid.trim()) return
    createRole.mutate(
      { roleid: roleid.trim(), privs: privs || undefined },
      {
        onSuccess: () => { toast.success(`Role ${roleid} created`); handleClose() },
        onError: (err: unknown) => toast.error((err as Error).message ?? 'Failed to create role'),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Role</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cr-roleid">Role ID</Label>
            <Input id="cr-roleid" value={roleid} onChange={(e) => setRoleid(e.target.value)} placeholder="MyRole" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cr-privs">Privileges</Label>
            <Input id="cr-privs" value={privs} onChange={(e) => setPrivs(e.target.value)} placeholder="VM.Audit,VM.Console (comma-separated)" />
            <p className="text-xs text-text-muted">Comma-separated list of Proxmox privilege names</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={createRole.isPending}>
              {createRole.isPending ? 'Creating…' : 'Create Role'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function AccessRolesPage() {
  const { data: roles, isLoading } = useRoles()
  const deleteRole = useDeleteRole()
  const updateRole = useUpdateRole()
  const [showCreate, setShowCreate] = useState(false)
  const [editingPrivs, setEditingPrivs] = useState<string | null>(null)
  const [privsDraft, setPrivsDraft] = useState('')

  return (
    <div className="space-y-4">
      <CreateRoleDialog open={showCreate} onClose={() => setShowCreate(false)} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Roles</h1>
          <p className="text-sm text-text-muted mt-0.5">Permission sets that can be assigned via ACLs</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
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
                  <TableHead className="w-16" />
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
                      {!role.special && editingPrivs === role.roleid ? (
                        <div className="flex items-center gap-1">
                          <input
                            autoFocus
                            value={privsDraft}
                            onChange={(e) => setPrivsDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                updateRole.mutate(
                                  { roleid: role.roleid, params: { privs: privsDraft } },
                                  {
                                    onSuccess: () => { toast.success('Privileges updated'); setEditingPrivs(null) },
                                    onError: (err: unknown) => toast.error((err as Error).message ?? 'Failed to update'),
                                  },
                                )
                              } else if (e.key === 'Escape') {
                                setEditingPrivs(null)
                              }
                            }}
                            placeholder="VM.Audit,VM.Console"
                            className="w-full rounded border border-border-subtle bg-bg-input px-2 py-0.5 text-xs text-text-primary outline-none focus:border-accent"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              updateRole.mutate(
                                { roleid: role.roleid, params: { privs: privsDraft } },
                                {
                                  onSuccess: () => { toast.success('Privileges updated'); setEditingPrivs(null) },
                                  onError: (err: unknown) => toast.error((err as Error).message ?? 'Failed to update'),
                                },
                              )
                            }
                            className="shrink-0 text-status-running hover:opacity-80"
                          >
                            <Check className="size-3.5" />
                          </button>
                          <button type="button" onClick={() => setEditingPrivs(null)} className="shrink-0 text-text-muted hover:text-text-primary">
                            <X className="size-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="group/privs flex items-center gap-1">
                          <p className="line-clamp-2">
                            {role.privs ? role.privs.split(',').join(', ') : '—'}
                          </p>
                          {!role.special && (
                            <button
                              type="button"
                              onClick={() => { setEditingPrivs(role.roleid); setPrivsDraft(role.privs ?? '') }}
                              className="opacity-0 group-hover/privs:opacity-100 transition-opacity shrink-0"
                            >
                              <Pencil className="size-3 text-text-muted hover:text-text-primary" />
                            </button>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {!role.special && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Delete role"
                          disabled={deleteRole.isPending}
                          onClick={() => {
                            if (confirm(`Delete role ${role.roleid}?`)) {
                              deleteRole.mutate(role.roleid, {
                                onSuccess: () => toast.success(`Role ${role.roleid} deleted`),
                                onError: (err: unknown) => toast.error((err as Error).message ?? 'Failed to delete role'),
                              })
                            }
                          }}
                        >
                          <Trash2 className="size-3.5 text-text-muted hover:text-status-error" />
                        </Button>
                      )}
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
