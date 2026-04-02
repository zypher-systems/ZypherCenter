import { useState } from 'react'
import { Bell, Plus, Pencil, Trash2, Mail, MessageSquare, AlertTriangle, CheckCircle2 } from 'lucide-react'
import {
  useNotificationEndpoints,
  useNotificationMatchers,
  useCreateNotificationEndpointSmtp,
  useUpdateNotificationEndpointSmtp,
  useDeleteNotificationEndpoint,
  useCreateNotificationEndpointGotify,
  useCreateNotificationMatcher,
  useUpdateNotificationMatcher,
  useDeleteNotificationMatcher,
  type NotificationEndpointSmtp,
  type NotificationEndpointGotify,
  type NotificationMatcher,
} from '@/lib/queries/cluster'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { SkeletonCard } from '@/components/ui/Skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table'

const inp = 'w-full rounded border border-border-subtle bg-bg-input px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent [color-scheme:dark]'

// ── SMTP Endpoint Dialog ─────────────────────────────────────────────────────

function SmtpDialog({
  existing,
  onClose,
}: {
  existing?: NotificationEndpointSmtp
  onClose: () => void
}) {
  const create = useCreateNotificationEndpointSmtp()
  const update = useUpdateNotificationEndpointSmtp()
  const isEdit = !!existing

  const [name, setName] = useState(existing?.name ?? '')
  const [smtpServer, setSmtpServer] = useState(existing?.server ?? '')
  const [smtpPort, setSmtpPort] = useState(String(existing?.port ?? 587))
  const [mode, setMode] = useState<'tls' | 'starttls' | 'insecure'>(existing?.mode ?? 'starttls')
  const [username, setUsername] = useState(existing?.username ?? '')
  const [password, setPassword] = useState('')
  const [from, setFrom] = useState(existing?.['from-address'] ?? '')
  const [toAddr, setToAddr] = useState((existing?.['to-address'] ?? []).join(', '))
  const [comment, setComment] = useState(existing?.comment ?? '')
  const [disable, setDisable] = useState(existing?.disable === 1)

  function submit() {
    if (!name.trim() || !smtpServer.trim() || !from.trim()) return
    const toList = toAddr.split(',').map((s) => s.trim()).filter(Boolean)
    const params: NotificationEndpointSmtp = {
      name: name.trim(),
      server: smtpServer.trim(),
      port: Number(smtpPort),
      mode,
      'from-address': from.trim(),
      'to-address': toList,
      comment: comment || undefined,
      disable: disable ? 1 : 0,
    }
    if (username) params.username = username
    if (password) params.password = password

    if (isEdit) {
      update.mutate(params, { onSuccess: () => onClose() })
    } else {
      create.mutate(params, { onSuccess: () => onClose() })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-bg-card border border-border-subtle rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-text-primary">{isEdit ? 'Edit SMTP Endpoint' : 'Add SMTP Endpoint'}</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-text-secondary mb-1">Name <span className="text-status-error">*</span></label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="my-smtp" disabled={isEdit} className={`${inp} disabled:opacity-60`} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-sm text-text-secondary mb-1">SMTP Server <span className="text-status-error">*</span></label>
              <input value={smtpServer} onChange={(e) => setSmtpServer(e.target.value)} placeholder="smtp.gmail.com" className={inp} />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">Port</label>
              <input type="number" value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} className={inp} />
            </div>
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Mode</label>
            <select value={mode} onChange={(e) => setMode(e.target.value as typeof mode)} className={inp}>
              <option value="starttls">STARTTLS (587)</option>
              <option value="tls">TLS/SSL (465)</option>
              <option value="insecure">Insecure (25)</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-text-secondary mb-1">Username</label>
              <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="user@example.com" className={inp} />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">{isEdit ? 'New Password' : 'Password'}</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={isEdit ? '(unchanged)' : ''} className={inp} />
            </div>
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">From Address <span className="text-status-error">*</span></label>
            <input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="proxmox@example.com" className={inp} />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">To Address(es) <span className="text-text-disabled">(comma-separated)</span></label>
            <input value={toAddr} onChange={(e) => setToAddr(e.target.value)} placeholder="admin@example.com, ops@example.com" className={inp} />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Comment</label>
            <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Optional comment" className={inp} />
          </div>
          <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
            <input type="checkbox" checked={disable} onChange={(e) => setDisable(e.target.checked)} className="accent-accent" />
            Disabled
          </label>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={submit} disabled={!name.trim() || !smtpServer.trim() || !from.trim() || create.isPending || update.isPending}>
            {create.isPending || update.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Endpoint'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Gotify Endpoint Dialog ────────────────────────────────────────────────────

function GotifyDialog({ onClose }: { onClose: () => void }) {
  const create = useCreateNotificationEndpointGotify()
  const [name, setName] = useState('')
  const [server, setServer] = useState('')
  const [token, setToken] = useState('')
  const [comment, setComment] = useState('')

  function submit() {
    if (!name.trim() || !server.trim() || !token.trim()) return
    const params: NotificationEndpointGotify = {
      name: name.trim(),
      server: server.trim(),
      token: token.trim(),
      comment: comment || undefined,
    }
    create.mutate(params, { onSuccess: () => onClose() })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-bg-card border border-border-subtle rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-text-primary">Add Gotify Endpoint</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-text-secondary mb-1">Name <span className="text-status-error">*</span></label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="my-gotify" className={inp} />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Server URL <span className="text-status-error">*</span></label>
            <input value={server} onChange={(e) => setServer(e.target.value)} placeholder="https://gotify.example.com" className={inp} />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Application Token <span className="text-status-error">*</span></label>
            <input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Gotify app token" className={inp} />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Comment</label>
            <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Optional comment" className={inp} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={submit} disabled={!name.trim() || !server.trim() || !token.trim() || create.isPending}>
            {create.isPending ? 'Adding…' : 'Add Endpoint'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Matcher Dialog ───────────────────────────────────────────────────────────

function MatcherDialog({
  existing,
  availableTargets,
  onClose,
}: {
  existing?: NotificationMatcher
  availableTargets: string[]
  onClose: () => void
}) {
  const create = useCreateNotificationMatcher()
  const update = useUpdateNotificationMatcher()
  const isEdit = !!existing

  const [name, setName] = useState(existing?.name ?? '')
  const [mode, setMode] = useState<'all' | 'any'>(existing?.mode ?? 'all')
  const [severities, setSeverities] = useState(
    (existing?.['match-severity'] ?? []).join(', '),
  )
  const [targets, setTargets] = useState<string[]>(existing?.target ?? [])
  const [comment, setComment] = useState(existing?.comment ?? '')
  const [disable, setDisable] = useState(existing?.disable === 1)

  const SEVERITY_OPTIONS = ['info', 'notice', 'warning', 'error', 'unknown']

  function toggleTarget(t: string) {
    setTargets((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t])
  }

  function submit() {
    if (!name.trim()) return
    const sevList = severities.split(',').map((s) => s.trim()).filter(Boolean)
    const params: NotificationMatcher = {
      name: name.trim(),
      mode,
      'match-severity': sevList.length > 0 ? sevList : undefined,
      target: targets.length > 0 ? targets : undefined,
      comment: comment || undefined,
      disable: disable ? 1 : 0,
    }
    if (isEdit) {
      update.mutate(params, { onSuccess: () => onClose() })
    } else {
      create.mutate(params, { onSuccess: () => onClose() })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-bg-card border border-border-subtle rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-text-primary">{isEdit ? 'Edit Matcher' : 'Create Matcher'}</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-text-secondary mb-1">Name <span className="text-status-error">*</span></label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="default-matcher" disabled={isEdit} className={`${inp} disabled:opacity-60`} />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Match Mode</label>
            <select value={mode} onChange={(e) => setMode(e.target.value as 'all' | 'any')} className={inp}>
              <option value="all">All conditions match</option>
              <option value="any">Any condition matches</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">
              Match Severities <span className="text-text-disabled">(comma-separated, empty = all)</span>
            </label>
            <input
              value={severities}
              onChange={(e) => setSeverities(e.target.value)}
              placeholder="warning, error"
              className={inp}
            />
            <p className="text-xs text-text-disabled mt-1">
              Options: {SEVERITY_OPTIONS.join(', ')}
            </p>
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Route to Endpoints</label>
            {availableTargets.length === 0 ? (
              <p className="text-xs text-text-disabled italic">No endpoints configured yet</p>
            ) : (
              <div className="space-y-1 mt-1">
                {availableTargets.map((t) => (
                  <label key={t} className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                    <input
                      type="checkbox"
                      checked={targets.includes(t)}
                      onChange={() => toggleTarget(t)}
                      className="accent-accent"
                    />
                    {t}
                  </label>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Comment</label>
            <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Optional comment" className={inp} />
          </div>
          <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
            <input type="checkbox" checked={disable} onChange={(e) => setDisable(e.target.checked)} className="accent-accent" />
            Disabled
          </label>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={submit} disabled={!name.trim() || create.isPending || update.isPending}>
            {create.isPending || update.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Matcher'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Endpoints Tab ────────────────────────────────────────────────────────────

function EndpointsTab() {
  const { data: endpoints, isLoading, isError } = useNotificationEndpoints()
  const deleteEndpoint = useDeleteNotificationEndpoint()
  const [showSmtp, setShowSmtp] = useState(false)
  const [showGotify, setShowGotify] = useState(false)
  const [editingSmtp, setEditingSmtp] = useState<NotificationEndpointSmtp | null>(null)
  const [addMenuOpen, setAddMenuOpen] = useState(false)

  if (isLoading) return <SkeletonCard />

  return (
    <div className="space-y-4">
      {showSmtp && <SmtpDialog onClose={() => setShowSmtp(false)} />}
      {showGotify && <GotifyDialog onClose={() => setShowGotify(false)} />}
      {editingSmtp && <SmtpDialog existing={editingSmtp} onClose={() => setEditingSmtp(null)} />}

      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">{endpoints?.length ?? 0} endpoint(s)</p>
        <div className="relative">
          <Button size="sm" onClick={() => setAddMenuOpen((v) => !v)}>
            <Plus className="size-3.5 mr-1.5" />
            Add Endpoint
          </Button>
          {addMenuOpen && (
            <div
              className="absolute right-0 top-full mt-1 z-10 min-w-[160px] rounded-lg border border-border-subtle bg-bg-card shadow-lg p-1"
              onMouseLeave={() => setAddMenuOpen(false)}
            >
              <button
                className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
                onClick={() => { setShowSmtp(true); setAddMenuOpen(false) }}
              >
                <Mail className="size-3.5" />SMTP
              </button>
              <button
                className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
                onClick={() => { setShowGotify(true); setAddMenuOpen(false) }}
              >
                <MessageSquare className="size-3.5" />Gotify
              </button>
            </div>
          )}
        </div>
      </div>

      {isError ? (
        <div className="flex flex-col items-center justify-center h-32 text-center gap-2">
          <AlertTriangle className="size-8 text-status-paused" />
          <p className="text-sm text-text-muted">Notification endpoints require Proxmox VE 8.0 or later.</p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            {!endpoints?.length ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
                <Bell className="size-8 text-text-disabled" />
                <p className="text-sm text-text-muted">No notification endpoints configured.</p>
                <p className="text-xs text-text-disabled">Add SMTP or Gotify to receive alerts.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-16" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(endpoints as (NotificationEndpointSmtp | NotificationEndpointGotify | Record<string, unknown>)[]).map((ep) => {
                    const epName = (ep as { name?: string }).name ?? '?'
                    const epType = (ep as { type?: string }).type ?? 'smtp'
                    const isSmtp = epType === 'smtp'
                    const serverDisplay = isSmtp
                      ? `${(ep as NotificationEndpointSmtp).server}:${(ep as NotificationEndpointSmtp).port ?? 587}`
                      : (ep as NotificationEndpointGotify).server ?? '—'
                    const isDisabled = (ep as { disable?: number }).disable === 1

                    return (
                      <TableRow key={epName}>
                        <TableCell className="font-mono font-medium text-text-primary text-sm">
                          {epName}
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1.5 text-xs text-text-muted">
                            {isSmtp ? <Mail className="size-3" /> : <MessageSquare className="size-3" />}
                            {epType.toUpperCase()}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-text-secondary font-mono text-xs">
                          {serverDisplay}
                        </TableCell>
                        <TableCell>
                          {isDisabled ? (
                            <span className="text-xs text-text-disabled">disabled</span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-status-running">
                              <CheckCircle2 className="size-3" />active
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1.5">
                            {isSmtp && (
                              <button
                                onClick={() => setEditingSmtp(ep as NotificationEndpointSmtp)}
                                className="inline-flex items-center gap-1 rounded border border-border-subtle px-2 py-0.5 text-xs text-text-muted hover:text-text-primary hover:bg-bg-elevated"
                              >
                                <Pencil className="size-3" />
                              </button>
                            )}
                            <button
                              disabled={deleteEndpoint.isPending}
                              onClick={() => {
                                if (confirm(`Delete endpoint "${epName}"?`)) {
                                  deleteEndpoint.mutate({ type: epType as 'smtp' | 'gotify' | 'sendmail', name: epName })
                                }
                              }}
                              className="inline-flex items-center rounded border border-status-error/40 px-2 py-0.5 text-xs text-status-error hover:bg-status-error/10 disabled:opacity-50"
                            >
                              <Trash2 className="size-3" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ── Matchers Tab ─────────────────────────────────────────────────────────────

function MatchersTab() {
  const { data: matchers, isLoading, isError } = useNotificationMatchers()
  const { data: endpoints } = useNotificationEndpoints()
  const deleteMatcher = useDeleteNotificationMatcher()
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<NotificationMatcher | null>(null)

  const availableTargets = (endpoints ?? []).map(
    (ep) => (ep as { name?: string }).name ?? '',
  ).filter(Boolean)

  if (isLoading) return <SkeletonCard />

  return (
    <div className="space-y-4">
      {showCreate && (
        <MatcherDialog availableTargets={availableTargets} onClose={() => setShowCreate(false)} />
      )}
      {editing && (
        <MatcherDialog
          existing={editing}
          availableTargets={availableTargets}
          onClose={() => setEditing(null)}
        />
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">{matchers?.length ?? 0} matcher(s)</p>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="size-3.5 mr-1.5" />
          Create Matcher
        </Button>
      </div>

      {isError ? (
        <div className="flex flex-col items-center justify-center h-32 text-center gap-2">
          <AlertTriangle className="size-8 text-status-paused" />
          <p className="text-sm text-text-muted">Notification matchers require Proxmox VE 8.0 or later.</p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            {!matchers?.length ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
                <Bell className="size-8 text-text-disabled" />
                <p className="text-sm text-text-muted">No matchers configured.</p>
                <p className="text-xs text-text-disabled">
                  Matchers route notifications to endpoints based on severity and field filters.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Severities</TableHead>
                    <TableHead>Targets</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-16" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matchers.map((m) => (
                    <TableRow key={m.name}>
                      <TableCell className="font-mono font-medium text-text-primary text-sm">{m.name}</TableCell>
                      <TableCell className="text-sm text-text-muted">{m.mode ?? 'all'}</TableCell>
                      <TableCell className="text-sm text-text-secondary">
                        {m['match-severity']?.join(', ') || <span className="text-text-disabled">all</span>}
                      </TableCell>
                      <TableCell className="text-sm text-text-secondary">
                        {m.target?.join(', ') || <span className="text-text-disabled">none</span>}
                      </TableCell>
                      <TableCell>
                        {m.disable ? (
                          <span className="text-xs text-text-disabled">disabled</span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-status-running">
                            <CheckCircle2 className="size-3" />active
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setEditing(m)}
                            className="inline-flex items-center gap-1 rounded border border-border-subtle px-2 py-0.5 text-xs text-text-muted hover:text-text-primary hover:bg-bg-elevated"
                          >
                            <Pencil className="size-3" />
                          </button>
                          <button
                            disabled={deleteMatcher.isPending}
                            onClick={() => {
                              if (confirm(`Delete matcher "${m.name}"?`)) {
                                deleteMatcher.mutate(m.name)
                              }
                            }}
                            className="inline-flex items-center rounded border border-status-error/40 px-2 py-0.5 text-xs text-status-error hover:bg-status-error/10 disabled:opacity-50"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

export function ClusterNotificationsPage() {
  const [tab, setTab] = useState('endpoints')

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <Bell className="size-5 text-accent" />
          <h1 className="text-xl font-semibold text-text-primary">Notifications</h1>
        </div>
        <p className="text-sm text-text-muted mt-0.5">
          Configure notification targets and routing rules (Proxmox VE 8.0+)
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="endpoints">
            <Mail className="size-3.5 mr-1.5" />Endpoints
          </TabsTrigger>
          <TabsTrigger value="matchers">
            <Bell className="size-3.5 mr-1.5" />Matchers
          </TabsTrigger>
        </TabsList>
        <TabsContent value="endpoints">
          <EndpointsTab />
        </TabsContent>
        <TabsContent value="matchers">
          <MatchersTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
