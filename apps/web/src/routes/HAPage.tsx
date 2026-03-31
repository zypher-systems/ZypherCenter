import { useState } from 'react'
import {
  useHAResources,
  useHAGroups,
  useHAStatus,
  useCreateHAResource,
  useDeleteHAResource,
  useCreateHAGroup,
  useDeleteHAGroup,
  useUpdateHAResource,
} from '@/lib/queries/ha'
import { Card, CardContent } from '@/components/ui/Card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { Button } from '@/components/ui/Button'
import { Shield, Layers, Plus, Trash2 } from 'lucide-react'

const HA_STATES = ['started', 'stopped', 'enabled', 'disabled', 'ignored']

function AddResourceDialog({
  groups,
  onClose,
}: {
  groups: { group: string }[]
  onClose: () => void
}) {
  const [sid, setSid] = useState('')
  const [group, setGroup] = useState(groups[0]?.group ?? '')
  const [state, setState] = useState('started')
  const [maxRestart, setMaxRestart] = useState('1')
  const [maxRelocate, setMaxRelocate] = useState('1')
  const [comment, setComment] = useState('')
  const create = useCreateHAResource()

  function submit() {
    if (!sid.trim()) return
    create.mutate(
      {
        sid: sid.trim(),
        group: group || undefined,
        state,
        max_restart: Number(maxRestart),
        max_relocate: Number(maxRelocate),
        comment: comment.trim() || undefined,
      },
      { onSuccess: () => onClose() },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-bg-card border border-border-subtle rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">Add HA Resource</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-text-secondary mb-1">
              Resource ID <span className="text-status-error">*</span>
              <span className="ml-1 text-xs text-text-muted">(e.g. vm:100)</span>
            </label>
            <input
              value={sid}
              onChange={(e) => setSid(e.target.value)}
              placeholder="vm:100"
              className="w-full rounded border border-border-subtle bg-bg-input px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Group</label>
            <select
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              className="w-full rounded border border-border-subtle bg-bg-input px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent"
            >
              <option value="">— None —</option>
              {groups.map((g) => (
                <option key={g.group} value={g.group}>{g.group}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">State</label>
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="w-full rounded border border-border-subtle bg-bg-input px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent"
            >
              {HA_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-text-secondary mb-1">Max Restart</label>
              <input
                type="number"
                min="0"
                value={maxRestart}
                onChange={(e) => setMaxRestart(e.target.value)}
                className="w-full rounded border border-border-subtle bg-bg-input px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">Max Relocate</label>
              <input
                type="number"
                min="0"
                value={maxRelocate}
                onChange={(e) => setMaxRelocate(e.target.value)}
                className="w-full rounded border border-border-subtle bg-bg-input px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Comment</label>
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Optional"
              className="w-full rounded border border-border-subtle bg-bg-input px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={submit} disabled={!sid.trim() || create.isPending}>
            {create.isPending ? 'Adding…' : 'Add Resource'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function AddGroupDialog({ onClose }: { onClose: () => void }) {
  const [group, setGroup] = useState('')
  const [nodes, setNodes] = useState('')
  const [comment, setComment] = useState('')
  const [restricted, setRestricted] = useState(false)
  const [nofailback, setNofailback] = useState(false)
  const create = useCreateHAGroup()

  function submit() {
    if (!group.trim() || !nodes.trim()) return
    create.mutate(
      {
        group: group.trim(),
        nodes: nodes.trim(),
        comment: comment.trim() || undefined,
        restricted: restricted ? 1 : undefined,
        nofailback: nofailback ? 1 : undefined,
      },
      { onSuccess: () => onClose() },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-bg-card border border-border-subtle rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">Create HA Group</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-text-secondary mb-1">
              Group Name <span className="text-status-error">*</span>
            </label>
            <input
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              placeholder="e.g. mygroup"
              className="w-full rounded border border-border-subtle bg-bg-input px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">
              Nodes <span className="text-status-error">*</span>
              <span className="ml-1 text-xs text-text-muted">(e.g. pve1:2,pve2:1)</span>
            </label>
            <input
              value={nodes}
              onChange={(e) => setNodes(e.target.value)}
              placeholder="pve1:2,pve2:1"
              className="w-full rounded border border-border-subtle bg-bg-input px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Comment</label>
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Optional"
              className="w-full rounded border border-border-subtle bg-bg-input px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
              <input type="checkbox" checked={restricted} onChange={(e) => setRestricted(e.target.checked)} className="accent-accent" />
              Restricted (only run on listed nodes)
            </label>
            <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
              <input type="checkbox" checked={nofailback} onChange={(e) => setNofailback(e.target.checked)} className="accent-accent" />
              No Failback
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={submit} disabled={!group.trim() || !nodes.trim() || create.isPending}>
            {create.isPending ? 'Creating…' : 'Create Group'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export function HAPage() {
  const { data: resources, isLoading: resLoading } = useHAResources()
  const { data: groups, isLoading: grpLoading } = useHAGroups()
  const { data: status } = useHAStatus()
  const deleteResource = useDeleteHAResource()
  const deleteGroup = useDeleteHAGroup()
  const updateResource = useUpdateHAResource()
  const [showAddResource, setShowAddResource] = useState(false)
  const [showAddGroup, setShowAddGroup] = useState(false)

  return (
    <div className="space-y-4">
      {showAddResource && (
        <AddResourceDialog groups={groups ?? []} onClose={() => setShowAddResource(false)} />
      )}
      {showAddGroup && (
        <AddGroupDialog onClose={() => setShowAddGroup(false)} />
      )}

      <div>
        <h1 className="text-xl font-semibold text-text-primary">High Availability</h1>
        <p className="text-sm text-text-muted mt-0.5">HA manager status and resource configuration</p>
      </div>

      {/* HA Manager Status */}
      {status && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(status as Record<string, unknown>).map(([key, val]) => (
            <div key={key} className="rounded-lg border border-border-subtle bg-bg-card p-4">
              <p className="text-xs text-text-muted capitalize">{key.replace(/_/g, ' ')}</p>
              <p className="text-lg font-semibold text-text-primary mt-1">{String(val)}</p>
            </div>
          ))}
        </div>
      )}

      <Tabs defaultValue="resources">
        <TabsList>
          <TabsTrigger value="resources">
            <Shield className="size-3.5 mr-1.5" />Resources
          </TabsTrigger>
          <TabsTrigger value="groups">
            <Layers className="size-3.5 mr-1.5" />Groups
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resources">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-text-secondary">{resources?.length ?? 0} resource(s)</span>
            <Button size="sm" onClick={() => setShowAddResource(true)}>
              <Plus className="size-3.5 mr-1" />Add Resource
            </Button>
          </div>
          {resLoading ? (
            <SkeletonCard />
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Resource ID</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Group</TableHead>
                      <TableHead>Max Restart</TableHead>
                      <TableHead>Max Relocate</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resources?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-text-muted py-12">
                          No HA resources configured
                        </TableCell>
                      </TableRow>
                    ) : (
                      resources?.map((r) => (
                        <TableRow key={r.sid}>
                          <TableCell className="font-medium text-text-primary">{r.sid}</TableCell>
                          <TableCell className="text-text-secondary text-sm">{r.type}</TableCell>
                          <TableCell>
                            <StatusBadge status={r.state ?? 'unknown'} />
                          </TableCell>
                          <TableCell className="text-text-secondary">{r.group ?? '—'}</TableCell>
                          <TableCell className="text-text-secondary tabular-nums">{r.max_restart ?? 1}</TableCell>
                          <TableCell className="text-text-secondary tabular-nums">{r.max_relocate ?? 1}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <select
                                value={r.state ?? 'started'}
                                onChange={(e) => updateResource.mutate({ sid: r.sid, params: { state: e.target.value } })}
                                disabled={updateResource.isPending}
                                className="rounded border border-border-subtle bg-bg-input px-1.5 py-0.5 text-xs text-text-primary outline-none focus:border-accent disabled:opacity-50"
                              >
                                {HA_STATES.map((s) => (
                                  <option key={s} value={s}>{s}</option>
                                ))}
                              </select>
                              <button
                                onClick={() => {
                                  if (confirm(`Remove HA resource "${r.sid}"?`)) {
                                    deleteResource.mutate(r.sid)
                                  }
                                }}
                                disabled={deleteResource.isPending}
                                className="inline-flex items-center gap-1 rounded border border-status-error/40 px-2 py-0.5 text-xs text-status-error hover:bg-status-error/10 disabled:opacity-50"
                              >
                                <Trash2 className="size-3" />Remove
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="groups">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-text-secondary">{groups?.length ?? 0} group(s)</span>
            <Button size="sm" onClick={() => setShowAddGroup(true)}>
              <Plus className="size-3.5 mr-1" />Create Group
            </Button>
          </div>
          {grpLoading ? (
            <SkeletonCard />
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Group</TableHead>
                      <TableHead>Nodes</TableHead>
                      <TableHead>Restricted</TableHead>
                      <TableHead>No Failback</TableHead>
                      <TableHead>Comment</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groups?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-text-muted py-12">
                          No HA groups configured
                        </TableCell>
                      </TableRow>
                    ) : (
                      groups?.map((g) => (
                        <TableRow key={g.group}>
                          <TableCell className="font-medium text-text-primary">{g.group}</TableCell>
                          <TableCell className="text-text-secondary text-sm">{g.nodes}</TableCell>
                          <TableCell>
                            {g.restricted ? (
                              <span className="text-status-paused text-xs">Yes</span>
                            ) : (
                              <span className="text-text-muted text-xs">No</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {g.nofailback ? (
                              <span className="text-status-paused text-xs">Yes</span>
                            ) : (
                              <span className="text-text-muted text-xs">No</span>
                            )}
                          </TableCell>
                          <TableCell className="text-text-muted text-sm">{g.comment ?? '—'}</TableCell>
                          <TableCell className="text-right">
                            <button
                              onClick={() => {
                                if (confirm(`Delete HA group "${g.group}"?`)) {
                                  deleteGroup.mutate(g.group)
                                }
                              }}
                              disabled={deleteGroup.isPending}
                              className="inline-flex items-center gap-1 rounded border border-status-error/40 px-2 py-0.5 text-xs text-status-error hover:bg-status-error/10 disabled:opacity-50"
                            >
                              <Trash2 className="size-3" />Delete
                            </button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
