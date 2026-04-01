import { useState } from 'react'
import { Link } from 'react-router'
import { Plus, Trash2, ChevronDown, ChevronRight, Monitor, Box, Database } from 'lucide-react'
import {
  usePools,
  usePool,
  useCreatePool,
  useUpdatePool,
  useDeletePool,
} from '@/lib/queries/cluster'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table'
import { Skeleton } from '@/components/ui/Skeleton'
import type { Pool, PoolMember } from '@zyphercenter/proxmox-types'

// ── Create Pool Dialog ────────────────────────────────────────────────────────

function CreatePoolDialog({ onClose }: { onClose: () => void }) {
  const create = useCreatePool()
  const [poolid, setPoolid] = useState('')
  const [comment, setComment] = useState('')

  function submit() {
    if (!poolid.trim()) return
    create.mutate(
      { poolid: poolid.trim(), comment: comment.trim() || undefined },
      { onSuccess: () => onClose() },
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-bg-card border border-border-subtle rounded-lg shadow-xl p-5 w-96 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-text-primary">Create Pool</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-text-secondary mb-1">Pool ID <span className="text-status-error">*</span></label>
            <Input
              value={poolid}
              onChange={(e) => setPoolid(e.target.value)}
              placeholder="e.g. production"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && submit()}
            />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Comment</label>
            <Input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Optional description"
            />
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            className="flex-1 rounded-md border border-border-subtle px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-hover"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={create.isPending || !poolid.trim()}
            className="flex-1 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
          >
            {create.isPending ? 'Creating…' : 'Create Pool'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Edit Comment Dialog ───────────────────────────────────────────────────────

function EditCommentDialog({
  pool,
  onClose,
}: {
  pool: Pool
  onClose: () => void
}) {
  const update = useUpdatePool()
  const [comment, setComment] = useState(pool.comment ?? '')

  function submit() {
    update.mutate(
      { poolid: pool.poolid, comment: comment.trim() || undefined },
      { onSuccess: () => onClose() },
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-bg-card border border-border-subtle rounded-lg shadow-xl p-5 w-96 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-text-primary">Edit Pool — {pool.poolid}</h2>
        <div>
          <label className="block text-sm text-text-secondary mb-1">Comment</label>
          <Input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Optional description"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </div>
        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            className="flex-1 rounded-md border border-border-subtle px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-hover"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={update.isPending}
            className="flex-1 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
          >
            {update.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Pool Member Icon/Link ─────────────────────────────────────────────────────

function MemberIcon({ type }: { type: PoolMember['type'] }) {
  if (type === 'qemu') return <Monitor className="size-3.5 text-text-muted" />
  if (type === 'lxc') return <Box className="size-3.5 text-text-muted" />
  return <Database className="size-3.5 text-text-muted" />
}

function MemberLink({ m }: { m: PoolMember }) {
  if (m.type === 'qemu' && m.node && m.vmid) {
    return (
      <Link
        to={`/nodes/${m.node}/vms/${m.vmid}`}
        className="hover:text-accent text-text-primary transition-colors"
      >
        {m.name ?? `VM ${m.vmid}`}
      </Link>
    )
  }
  if (m.type === 'lxc' && m.node && m.vmid) {
    return (
      <Link
        to={`/nodes/${m.node}/lxc/${m.vmid}`}
        className="hover:text-accent text-text-primary transition-colors"
      >
        {m.name ?? `CT ${m.vmid}`}
      </Link>
    )
  }
  if (m.type === 'storage') {
    return (
      <Link
        to={`/storage/${m.storage}`}
        className="hover:text-accent text-text-primary transition-colors"
      >
        {m.storage}
      </Link>
    )
  }
  return <span className="text-text-primary">{m.id}</span>
}

// ── Pool Row (expandable) ─────────────────────────────────────────────────────

function PoolRow({ pool: summary }: { pool: Pool }) {
  const [expanded, setExpanded] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const deletePool = useDeletePool()
  const { data: detail, isLoading: loadingDetail } = usePool(expanded ? summary.poolid : '')

  const members = detail?.members ?? []

  function handleDelete() {
    if (confirm(`Delete pool "${summary.poolid}"? Members will not be deleted, just unassigned.`)) {
      deletePool.mutate(summary.poolid)
    }
  }

  return (
    <>
      {editOpen && <EditCommentDialog pool={summary} onClose={() => setEditOpen(false)} />}
      <TableRow className="cursor-pointer" onClick={() => setExpanded((e) => !e)}>
        <TableCell className="w-8">
          {expanded
            ? <ChevronDown className="size-4 text-text-muted" />
            : <ChevronRight className="size-4 text-text-muted" />}
        </TableCell>
        <TableCell className="font-medium text-text-primary">{summary.poolid}</TableCell>
        <TableCell className="text-text-secondary text-sm">{summary.comment ?? <span className="text-text-disabled italic">—</span>}</TableCell>
        <TableCell
          className="text-right"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={() => setEditOpen(true)}
              className="rounded px-2 py-1 text-xs text-text-muted hover:text-accent hover:bg-bg-hover"
            >
              Edit
            </button>
            <Button
              variant="ghost"
              size="icon-sm"
              title="Delete pool"
              disabled={deletePool.isPending}
              onClick={handleDelete}
            >
              <Trash2 className="size-3.5 text-text-muted hover:text-status-error" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
          <TableCell colSpan={4} className="bg-bg-hover/30 pl-8 pb-4 pt-2">
            {loadingDetail ? (
              <p className="text-sm text-text-muted">Loading members…</p>
            ) : members.length === 0 ? (
              <p className="text-sm text-text-disabled italic">No members in this pool</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-text-muted">
                    <th className="text-left font-normal pb-1 w-8"></th>
                    <th className="text-left font-normal pb-1 pr-4">Name / ID</th>
                    <th className="text-left font-normal pb-1 pr-4">Node</th>
                    <th className="text-left font-normal pb-1">Status</th>
                  </tr>
                </thead>
                <tbody>
                {members.map((m: PoolMember) => (
                    <tr key={m.id} className="border-t border-border-subtle/50">
                      <td className="py-1 pr-2"><MemberIcon type={m.type} /></td>
                      <td className="py-1 pr-4"><MemberLink m={m} /></td>
                      <td className="py-1 pr-4 text-text-secondary">{m.node ?? '—'}</td>
                      <td className="py-1 text-text-secondary">{m.status ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function PoolsPage() {
  const { data: pools, isLoading } = usePools()
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <div className="space-y-4">
      {createOpen && <CreatePoolDialog onClose={() => setCreateOpen(false)} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Pools</h1>
          <p className="text-sm text-text-muted">
            {pools ? `${pools.length} pool${pools.length !== 1 ? 's' : ''}` : 'Resource groupings for access control'}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          Create Pool
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10" />)}
            </div>
          ) : !pools || pools.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-text-muted text-sm">No pools defined</p>
              <p className="text-text-disabled text-xs mt-1">Create a pool to group VMs and storage for permission management</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Pool ID</TableHead>
                  <TableHead>Comment</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pools.map((pool) => (
                  <PoolRow key={pool.poolid} pool={pool} />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
