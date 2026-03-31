import { useState } from 'react'
import { useGroups, useCreateGroup, useDeleteGroup, useUpdateGroup } from '@/lib/queries/access'
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
import { Plus, Trash2, Users, Pencil, Check, X } from 'lucide-react'
import { toast } from 'sonner'

function CreateGroupDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createGroup = useCreateGroup()
  const [groupid, setGroupid] = useState('')
  const [comment, setComment] = useState('')

  function handleClose() {
    setGroupid(''); setComment(''); onClose()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!groupid.trim()) return
    createGroup.mutate(
      { groupid: groupid.trim(), comment: comment || undefined },
      {
        onSuccess: () => { toast.success(`Group ${groupid} created`); handleClose() },
        onError: (err: unknown) => toast.error((err as Error).message ?? 'Failed to create group'),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Group</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cg-groupid">Group ID</Label>
            <Input id="cg-groupid" value={groupid} onChange={(e) => setGroupid(e.target.value)} placeholder="admins" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cg-comment">Comment</Label>
            <Input id="cg-comment" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Optional description" />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={createGroup.isPending}>
              {createGroup.isPending ? 'Creating…' : 'Create Group'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function AccessGroupsPage() {
  const { data: groups, isLoading } = useGroups()
  const deleteGroup = useDeleteGroup()
  const updateGroup = useUpdateGroup()
  const [showCreate, setShowCreate] = useState(false)
  const [editingComment, setEditingComment] = useState<string | null>(null)
  const [commentDraft, setCommentDraft] = useState('')

  return (
    <div className="space-y-4">
      <CreateGroupDialog open={showCreate} onClose={() => setShowCreate(false)} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Groups</h1>
          <p className="text-sm text-text-muted mt-0.5">User groups for access control</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
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
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-text-muted py-10">
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
                        {editingComment === group.groupid ? (
                          <div className="flex items-center gap-1">
                            <input
                              autoFocus
                              value={commentDraft}
                              onChange={(e) => setCommentDraft(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  updateGroup.mutate(
                                    { groupid: group.groupid, params: { comment: commentDraft } },
                                    {
                                      onSuccess: () => { toast.success('Comment updated'); setEditingComment(null) },
                                      onError: (err: unknown) => toast.error((err as Error).message ?? 'Failed to update'),
                                    },
                                  )
                                } else if (e.key === 'Escape') {
                                  setEditingComment(null)
                                }
                              }}
                              className="w-full rounded border border-border-subtle bg-bg-input px-2 py-0.5 text-sm text-text-primary outline-none focus:border-accent"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                updateGroup.mutate(
                                  { groupid: group.groupid, params: { comment: commentDraft } },
                                  {
                                    onSuccess: () => { toast.success('Comment updated'); setEditingComment(null) },
                                    onError: (err: unknown) => toast.error((err as Error).message ?? 'Failed to update'),
                                  },
                                )
                              }
                              className="shrink-0 text-status-running hover:opacity-80"
                            >
                              <Check className="size-3.5" />
                            </button>
                            <button type="button" onClick={() => setEditingComment(null)} className="shrink-0 text-text-muted hover:text-text-primary">
                              <X className="size-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="group/comment flex items-center gap-1">
                            <span>{group.comment ?? '—'}</span>
                            <button
                              type="button"
                              onClick={() => { setEditingComment(group.groupid); setCommentDraft(group.comment ?? '') }}
                              className="opacity-0 group-hover/comment:opacity-100 transition-opacity"
                            >
                              <Pencil className="size-3 text-text-muted hover:text-text-primary" />
                            </button>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Delete group"
                          disabled={deleteGroup.isPending}
                          onClick={() => {
                            if (confirm(`Delete group ${group.groupid}?`)) {
                              deleteGroup.mutate(group.groupid, {
                                onSuccess: () => toast.success(`Group ${group.groupid} deleted`),
                                onError: (err: unknown) => toast.error((err as Error).message ?? 'Failed to delete group'),
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
