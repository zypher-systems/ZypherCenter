import { useState } from 'react'
import { useRealms, useCreateRealm, useDeleteRealm, useUpdateRealm, useRealmDetails } from '@/lib/queries/access'
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
import { Plus, Trash2, Globe, Pencil } from 'lucide-react'
import { toast } from 'sonner'

const REALM_TYPES = [
  { value: 'ldap', label: 'LDAP' },
  { value: 'ad', label: 'Active Directory' },
  { value: 'openid', label: 'OpenID Connect' },
]

function CreateRealmDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createRealm = useCreateRealm()
  const [realmId, setRealmId] = useState('')
  const [type, setType] = useState('ldap')
  const [comment, setComment] = useState('')
  // LDAP / AD fields
  const [server1, setServer1] = useState('')
  const [baseDn, setBaseDn] = useState('')
  const [userAttr, setUserAttr] = useState('uid')
  const [bindDn, setBindDn] = useState('')
  const [bindPassword, setBindPassword] = useState('')
  const [port, setPort] = useState('')
  // OpenID fields
  const [issuerUrl, setIssuerUrl] = useState('')
  const [clientId, setClientId] = useState('')
  const [clientKey, setClientKey] = useState('')

  function handleClose() {
    setRealmId(''); setType('ldap'); setComment('')
    setServer1(''); setBaseDn(''); setUserAttr('uid'); setBindDn(''); setBindPassword(''); setPort('')
    setIssuerUrl(''); setClientId(''); setClientKey('')
    onClose()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!realmId.trim()) return
    const params: Record<string, unknown> = { realm: realmId.trim(), type, comment: comment || undefined }

    if (type === 'ldap' || type === 'ad') {
      if (!server1 || !baseDn) return
      params.server1 = server1
      params.base_dn = baseDn
      if (type === 'ldap') params.user_attr = userAttr || 'uid'
      if (bindDn) params.bind_dn = bindDn
      if (bindPassword) params.password = bindPassword
      if (port) params.port = parseInt(port, 10)
    } else if (type === 'openid') {
      if (!issuerUrl || !clientId) return
      params['issuer-url'] = issuerUrl
      params['client-id'] = clientId
      if (clientKey) params['client-key'] = clientKey
    }

    createRealm.mutate(params, {
      onSuccess: () => { toast.success(`Realm ${realmId} created`); handleClose() },
      onError: (err: unknown) => toast.error((err as Error).message ?? 'Failed to create realm'),
    })
  }

  const inputCls = 'flex h-9 w-full rounded-md border border-border bg-bg-input px-3 py-1 text-sm text-text-primary shadow-sm focus:outline-none focus:ring-2 focus:ring-accent [color-scheme:dark]'

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Add Authentication Realm</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rm-id">Realm ID</Label>
              <Input id="rm-id" value={realmId} onChange={(e) => setRealmId(e.target.value)} placeholder="my-ldap" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rm-type">Type</Label>
              <select id="rm-type" value={type} onChange={(e) => setType(e.target.value)} className={inputCls}>
                {REALM_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          {(type === 'ldap' || type === 'ad') && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="rm-server1">Server</Label>
                  <Input id="rm-server1" value={server1} onChange={(e) => setServer1(e.target.value)} placeholder="ldap.example.com" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rm-port">Port (optional)</Label>
                  <Input id="rm-port" type="number" value={port} onChange={(e) => setPort(e.target.value)} placeholder={type === 'ad' ? '389' : '389'} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rm-base-dn">Base DN</Label>
                <Input id="rm-base-dn" value={baseDn} onChange={(e) => setBaseDn(e.target.value)} placeholder="dc=example,dc=com" required />
              </div>
              {type === 'ldap' && (
                <div className="space-y-1.5">
                  <Label htmlFor="rm-user-attr">User Attribute</Label>
                  <Input id="rm-user-attr" value={userAttr} onChange={(e) => setUserAttr(e.target.value)} placeholder="uid" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="rm-bind-dn">Bind DN (optional)</Label>
                  <Input id="rm-bind-dn" value={bindDn} onChange={(e) => setBindDn(e.target.value)} placeholder="cn=admin,dc=example,dc=com" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rm-bind-pw">Bind Password</Label>
                  <Input id="rm-bind-pw" type="password" value={bindPassword} onChange={(e) => setBindPassword(e.target.value)} />
                </div>
              </div>
            </>
          )}

          {type === 'openid' && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="rm-issuer">Issuer URL</Label>
                <Input id="rm-issuer" value={issuerUrl} onChange={(e) => setIssuerUrl(e.target.value)} placeholder="https://sso.example.com/auth/realms/master" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="rm-client-id">Client ID</Label>
                  <Input id="rm-client-id" value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="proxmox" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rm-client-key">Client Secret</Label>
                  <Input id="rm-client-key" type="password" value={clientKey} onChange={(e) => setClientKey(e.target.value)} />
                </div>
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="rm-comment">Comment</Label>
            <Input id="rm-comment" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Optional description" />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={createRealm.isPending}>
              {createRealm.isPending ? 'Creating…' : 'Add Realm'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditRealmDialog({ realmId, realmType, onClose }: { realmId: string; realmType: string; onClose: () => void }) {
  const { data: details, isLoading } = useRealmDetails(realmId)
  const updateRealm = useUpdateRealm()

  const d = (details ?? {}) as Record<string, unknown>

  const [comment,      setComment]      = useState('')
  const [server1,      setServer1]      = useState('')
  const [baseDn,       setBaseDn]       = useState('')
  const [userAttr,     setUserAttr]     = useState('uid')
  const [bindDn,       setBindDn]       = useState('')
  const [bindPassword, setBindPassword] = useState('')
  const [port,         setPort]         = useState('')
  const [issuerUrl,    setIssuerUrl]    = useState('')
  const [clientId,     setClientId]     = useState('')
  const [clientKey,    setClientKey]    = useState('')
  const [initialized,  setInitialized]  = useState(false)

  if (!isLoading && !initialized && details) {
    setComment((d['comment'] as string) ?? '')
    setServer1((d['server1'] as string) ?? '')
    setBaseDn((d['base_dn'] as string) ?? '')
    setUserAttr((d['user_attr'] as string) ?? 'uid')
    setBindDn((d['bind_dn'] as string) ?? '')
    setPort(d['port'] != null ? String(d['port']) : '')
    setIssuerUrl((d['issuer-url'] as string) ?? '')
    setClientId((d['client-id'] as string) ?? '')
    setInitialized(true)
  }

  const inputCls = 'flex h-9 w-full rounded-md border border-border bg-bg-input px-3 py-1 text-sm text-text-primary shadow-sm focus:outline-none focus:ring-2 focus:ring-accent [color-scheme:dark]'

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const params: Record<string, unknown> = { comment: comment || undefined }
    if (realmType === 'ldap' || realmType === 'ad') {
      params.server1 = server1
      params.base_dn = baseDn
      if (realmType === 'ldap') params.user_attr = userAttr || 'uid'
      if (bindDn) params.bind_dn = bindDn
      if (bindPassword) params.password = bindPassword
      if (port) params.port = parseInt(port, 10)
    } else if (realmType === 'openid') {
      params['issuer-url'] = issuerUrl
      params['client-id'] = clientId
      if (clientKey) params['client-key'] = clientKey
    }
    updateRealm.mutate({ realm: realmId, params }, {
      onSuccess: () => onClose(),
    })
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit Realm — {realmId}</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="py-8 text-center text-text-muted text-sm">Loading…</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {(realmType === 'ldap' || realmType === 'ad') && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="er-server1">Server</Label>
                    <Input id="er-server1" value={server1} onChange={(e) => setServer1(e.target.value)} placeholder="ldap.example.com" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="er-port">Port (optional)</Label>
                    <Input id="er-port" type="number" value={port} onChange={(e) => setPort(e.target.value)} placeholder="389" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="er-base-dn">Base DN</Label>
                  <Input id="er-base-dn" value={baseDn} onChange={(e) => setBaseDn(e.target.value)} placeholder="dc=example,dc=com" required />
                </div>
                {realmType === 'ldap' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="er-user-attr">User Attribute</Label>
                    <Input id="er-user-attr" value={userAttr} onChange={(e) => setUserAttr(e.target.value)} placeholder="uid" />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="er-bind-dn">Bind DN (optional)</Label>
                    <Input id="er-bind-dn" value={bindDn} onChange={(e) => setBindDn(e.target.value)} placeholder="cn=admin,dc=example,dc=com" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="er-bind-pw">Bind Password (leave blank to keep)</Label>
                    <Input id="er-bind-pw" type="password" value={bindPassword} onChange={(e) => setBindPassword(e.target.value)} placeholder="unchanged" />
                  </div>
                </div>
              </>
            )}
            {realmType === 'openid' && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="er-issuer">Issuer URL</Label>
                  <Input id="er-issuer" value={issuerUrl} onChange={(e) => setIssuerUrl(e.target.value)} placeholder="https://sso.example.com/auth/realms/master" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="er-client-id">Client ID</Label>
                    <Input id="er-client-id" value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="proxmox" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="er-client-key">Client Secret (leave blank to keep)</Label>
                    <Input id="er-client-key" type="password" value={clientKey} onChange={(e) => setClientKey(e.target.value)} placeholder="unchanged" />
                  </div>
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="er-comment">Comment</Label>
              <Input id="er-comment" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Optional description" />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={updateRealm.isPending}>
                {updateRealm.isPending ? 'Saving…' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function RealmsPage() {
  const { data: realms, isLoading } = useRealms()
  const deleteRealm = useDeleteRealm()
  const [showCreate, setShowCreate] = useState(false)
  const [editingRealm, setEditingRealm] = useState<{ id: string; type: string } | null>(null)

  return (
    <div className="space-y-4">
      <CreateRealmDialog open={showCreate} onClose={() => setShowCreate(false)} />
      {editingRealm && (
        <EditRealmDialog
          realmId={editingRealm.id}
          realmType={editingRealm.type}
          onClose={() => setEditingRealm(null)}
        />
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Authentication Realms</h1>
          <p className="text-sm text-text-muted mt-0.5">
            Identity providers and authentication backends
          </p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="size-4 mr-1.5" />
          Add Realm
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
                  <TableHead>Realm</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Comment</TableHead>
                  <TableHead>Default</TableHead>
                  <TableHead>2FA</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {realms?.map((realm) => {
                  const builtIn = realm.type === 'pam' || realm.type === 'pve'
                  return (
                    <TableRow key={realm.realm}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Globe className="size-3.5 text-text-muted shrink-0" />
                          <span className="font-medium text-text-primary">{realm.realm}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs uppercase tracking-wide text-text-muted bg-bg-elevated px-2 py-0.5 rounded">
                          {realm.type}
                        </span>
                      </TableCell>
                      <TableCell className="text-text-muted text-sm">
                        {realm.comment ?? '—'}
                      </TableCell>
                      <TableCell>
                        {realm.default ? (
                          <span className="text-xs text-accent">Default</span>
                        ) : (
                          <span className="text-xs text-text-muted">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-text-secondary text-sm">
                        {realm.tfa ?? '—'}
                      </TableCell>
                      <TableCell>
                        {!builtIn && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              title="Edit realm"
                              onClick={() => setEditingRealm({ id: realm.realm, type: realm.type })}
                            >
                              <Pencil className="size-3.5 text-text-muted hover:text-text-primary" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              title="Delete realm"
                              disabled={deleteRealm.isPending}
                              onClick={() => {
                                if (confirm(`Delete realm ${realm.realm}?`)) {
                                  deleteRealm.mutate(realm.realm, {
                                    onSuccess: () => toast.success(`Realm ${realm.realm} deleted`),
                                    onError: (err: unknown) => toast.error((err as Error).message ?? 'Failed to delete realm'),
                                  })
                                }
                              }}
                            >
                              <Trash2 className="size-3.5 text-text-muted hover:text-status-error" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
