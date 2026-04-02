import { useState } from 'react'
import { useUsers, useUserTokens, useCreateUserToken, useDeleteUserToken, useUpdateUserToken } from '@/lib/queries/access'
import type { APIToken } from '@/lib/queries/access'
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
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { KeyRound, Trash2, Plus, Copy, Check, Pencil } from 'lucide-react'
import { formatTimestamp } from '@/lib/utils'
import { toast } from 'sonner'

function TokenSecret({ secret, onDismiss }: { secret: string; onDismiss: () => void }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(secret).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-bg-card border border-border-subtle rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound className="size-4 text-accent" />
          <h2 className="text-base font-semibold text-text-primary">API Token Created</h2>
        </div>
        <p className="text-sm text-status-error font-medium">
          This token secret will only be shown once. Copy it now.
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded bg-bg-elevated border border-border-muted px-3 py-2 text-xs font-mono text-text-primary break-all">
            {secret}
          </code>
          <button
            onClick={copy}
            className="shrink-0 rounded border border-border-subtle p-2 text-text-muted hover:text-accent hover:border-accent/40"
            title="Copy"
          >
            {copied ? <Check className="size-4 text-status-running" /> : <Copy className="size-4" />}
          </button>
        </div>
        <div className="flex justify-end">
          <Button size="sm" onClick={onDismiss}>Done</Button>
        </div>
      </div>
    </div>
  )
}

function UserTokenRow({ userid }: { userid: string }) {
  const { data: tokens, isLoading } = useUserTokens(userid)
  const createToken = useCreateUserToken()
  const deleteToken = useDeleteUserToken()
  const updateToken = useUpdateUserToken()

  const [showCreate, setShowCreate] = useState(false)
  const [editingToken, setEditingToken] = useState<APIToken | null>(null)
  const [editComment, setEditComment] = useState('')
  const [editExpire, setEditExpire] = useState('')
  const [tokenId, setTokenId] = useState('')
  const [comment, setComment] = useState('')
  const [privsep, setPrivsep] = useState(true)
  const [secret, setSecret] = useState<string | null>(null)

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!tokenId.trim()) return
    createToken.mutate(
      {
        userid,
        tokenid: tokenId.trim(),
        params: { comment: comment || undefined, privsep: privsep ? 1 : 0 },
      },
      {
        onSuccess: (data) => {
          setSecret(data.value)
          setShowCreate(false)
          setTokenId('')
          setComment('')
        },
      },
    )
  }

  function openEdit(t: APIToken) {
    setEditingToken(t)
    setEditComment(t.comment ?? '')
    setEditExpire(t.expire && t.expire > 0 ? new Date(t.expire * 1000).toISOString().slice(0, 16) : '')
  }

  function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingToken) return
    updateToken.mutate({
      userid,
      tokenid: editingToken.tokenid,
      params: {
        comment: editComment.trim() || undefined,
        expire: editExpire ? Math.floor(new Date(editExpire).getTime() / 1000) : 0,
      },
    }, { onSuccess: () => setEditingToken(null) })
  }

  const [username] = userid.split('@')

  return (
    <div className="border-t border-border-muted first:border-t-0">
      {secret && <TokenSecret secret={secret} onDismiss={() => setSecret(null)} />}

      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <KeyRound className="size-3.5 text-text-muted" />
          <span className="text-sm font-medium text-text-primary">{username}</span>
          <span className="text-xs text-text-muted">@{userid.split('@')[1]}</span>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowCreate((v) => !v)}
        >
          <Plus className="size-3.5 mr-1" />
          Add Token
        </Button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="mx-4 mb-3 p-4 rounded-lg bg-bg-elevated border border-border-subtle space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor={`tid-${userid}`}>Token ID</Label>
              <Input
                id={`tid-${userid}`}
                value={tokenId}
                onChange={(e) => setTokenId(e.target.value)}
                placeholder="my-token"
                autoFocus
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor={`cmt-${userid}`}>Comment</Label>
              <Input
                id={`cmt-${userid}`}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Optional description"
                className="mt-1"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              role="switch"
              aria-checked={privsep}
              onClick={() => setPrivsep((v) => !v)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${privsep ? 'bg-accent' : 'bg-border-muted'}`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${privsep ? 'translate-x-4' : 'translate-x-1'}`}
              />
            </button>
            <span className="text-xs text-text-muted">Privilege separation (token cannot exceed user permissions)</span>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" size="sm" disabled={!tokenId.trim() || createToken.isPending}>
              {createToken.isPending ? 'Creating…' : 'Create Token'}
            </Button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="px-4 pb-3 text-xs text-text-muted animate-pulse">Loading tokens…</div>
      ) : tokens && tokens.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-10">Token ID</TableHead>
              <TableHead>Comment</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Priv Sep</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {tokens.map((t) => (
              <>
                <TableRow key={t.tokenid}>
                  <TableCell className="pl-10 font-mono text-xs text-text-primary">
                    {userid}!{t.tokenid}
                  </TableCell>
                  <TableCell className="text-xs text-text-muted">{t.comment ?? '—'}</TableCell>
                  <TableCell className="text-xs text-text-muted tabular-nums">
                    {t.expire ? formatTimestamp(t.expire) : 'Never'}
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs ${t.privsep !== 0 ? 'text-status-running' : 'text-text-muted'}`}>
                      {t.privsep !== 0 ? 'Yes' : 'No'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Edit token"
                        onClick={() => openEdit(t)}
                      >
                        <Pencil className="size-3.5 text-text-muted hover:text-text-primary" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Delete token"
                        disabled={deleteToken.isPending}
                        onClick={() => {
                          if (confirm(`Delete token ${userid}!${t.tokenid}?`)) {
                            deleteToken.mutate({ userid, tokenid: t.tokenid })
                          }
                        }}
                      >
                        <Trash2 className="size-3.5 text-text-muted hover:text-status-error" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                {editingToken?.tokenid === t.tokenid && (
                  <TableRow key={`${t.tokenid}-edit`}>
                    <TableCell colSpan={5} className="bg-bg-elevated p-3">
                      <form onSubmit={handleSaveEdit} className="flex items-end gap-3">
                        <div className="flex-1 space-y-1">
                          <label className="text-xs text-text-muted">Comment</label>
                          <Input value={editComment} onChange={(e) => setEditComment(e.target.value)} placeholder="Optional description" className="h-7 text-xs" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <label className="text-xs text-text-muted">Expire (leave blank = never)</label>
                          <Input type="datetime-local" value={editExpire} onChange={(e) => setEditExpire(e.target.value)} className="h-7 text-xs [color-scheme:dark]" />
                        </div>
                        <div className="flex gap-1.5">
                          <Button type="button" variant="ghost" size="sm" onClick={() => setEditingToken(null)}>Cancel</Button>
                          <Button type="submit" size="sm" disabled={updateToken.isPending}>
                            {updateToken.isPending ? '…' : 'Save'}
                          </Button>
                        </div>
                      </form>
                    </TableCell>
                  </TableRow>
                )}
              </>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="px-10 pb-3 text-xs text-text-muted italic">No tokens</p>
      )}
    </div>
  )
}

export function AccessTokensPage() {
  const { data: users, isLoading } = useUsers()

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">API Tokens</h1>
        <p className="text-sm text-text-muted mt-0.5">
          Manage API authentication tokens for user accounts
        </p>
      </div>

      {isLoading ? (
        <SkeletonCard />
      ) : (
        <Card>
          <CardContent className="p-0">
            {!users?.length ? (
              <p className="text-center text-text-muted text-sm py-10">No users found</p>
            ) : (
              <div>
                {users.map((user) => (
                  <UserTokenRow key={user.userid} userid={user.userid} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
