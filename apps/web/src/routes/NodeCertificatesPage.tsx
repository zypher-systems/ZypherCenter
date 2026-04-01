import { useState } from 'react'
import { useParams } from 'react-router'
import { ShieldCheck, RefreshCw, Trash2, Plus, Globe } from 'lucide-react'
import {
  useNodeCertificates,
  useOrderNodeCertificate,
  useRevokeNodeCertificate,
  useNodeACMEDomains,
  useUpdateNodeConfig,
  useNodeACMEAccounts,
} from '@/lib/queries/nodes'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { formatTimestamp } from '@/lib/utils'

function certStatus(cert: Record<string, unknown>) {
  const notAfter = cert['notafter'] as number | undefined
  if (!notAfter) return null
  const now = Math.floor(Date.now() / 1000)
  const daysLeft = Math.floor((notAfter - now) / 86400)
  if (daysLeft < 0) return { label: 'Expired', color: 'text-status-error' }
  if (daysLeft < 14) return { label: `Expires in ${daysLeft}d`, color: 'text-status-paused' }
  return { label: `Valid · ${daysLeft}d left`, color: 'text-status-running' }
}

function ACMEDomainsCard({ node }: { node: string }) {
  const { data: nodeConfig } = useNodeACMEDomains(node)
  const { data: accounts } = useNodeACMEAccounts()
  const updateConfig = useUpdateNodeConfig(node)
  const [showAdd, setShowAdd] = useState(false)
  const [newDomain, setNewDomain] = useState('')

  const cfg = nodeConfig as Record<string, unknown> | undefined
  if (!cfg) return null

  // Parse ACME account config — acme field like "account=default"
  const acmeField = cfg['acme'] as string | undefined
  const acmeAccount = acmeField?.split(',').find((s) => s.startsWith('account='))?.slice(8) ?? ''

  // Parse acmedomain0, acmedomain1, ... fields — each is just a domain string
  const domainKeys = Object.keys(cfg).filter((k) => /^acmedomain\d+$/.test(k)).sort()
  const domains = domainKeys.map((k) => ({ key: k, value: String(cfg[k]) }))

  function removeDomain(key: string) {
    if (!confirm(`Remove ACME domain "${cfg![key]}"?`)) return
    updateConfig.mutate({ delete: key })
  }

  function addDomain() {
    if (!newDomain.trim()) return
    const nextIdx = domainKeys.length
    const key = `acmedomain${nextIdx}`
    updateConfig.mutate({ [key]: newDomain.trim() }, { onSuccess: () => { setShowAdd(false); setNewDomain('') } })
  }

  function setAccount(account: string) {
    const existing = acmeField ?? ''
    const parts = existing.split(',').filter((p) => !p.startsWith('account=') && p)
    const newVal = [`account=${account}`, ...parts].join(',')
    updateConfig.mutate({ acme: newVal })
  }

  const inp = 'rounded border border-border-subtle bg-bg-input px-2 py-1.5 text-sm text-text-primary outline-none focus:border-accent [color-scheme:dark]'

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Globe className="size-4 text-text-muted" />
            ACME Configuration
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShowAdd(!showAdd)}>
            <Plus className="size-3.5 mr-1" />{showAdd ? 'Cancel' : 'Add Domain'}
          </Button>
        </div>
      </CardHeader>
      {showAdd && (
        <div className="border-t border-border-muted bg-bg-elevated px-4 py-3 space-y-2">
          <label className="block text-xs text-text-muted mb-1">Domain name</label>
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addDomain(); if (e.key === 'Escape') { setShowAdd(false); setNewDomain('') } }}
              placeholder="e.g. pve.example.com"
              className={`${inp} flex-1`}
            />
            <Button size="sm" onClick={addDomain} disabled={updateConfig.isPending || !newDomain.trim()}>Add</Button>
          </div>
        </div>
      )}
      <CardContent className="p-0">
        {accounts && accounts.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2.5 text-sm border-b border-border-muted">
            <span className="text-text-muted">Account</span>
            <select
              value={acmeAccount}
              onChange={(e) => setAccount(e.target.value)}
              className={`${inp} max-w-[200px]`}
            >
              <option value="">— none —</option>
              {accounts.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        )}
        {domains.length === 0 ? (
          <p className="px-4 py-3 text-sm text-text-muted">No ACME domains configured. Add a domain to enable automatic certificate issuance.</p>
        ) : (
          <div className="divide-y divide-border-muted">
            {domains.map(({ key, value }) => (
              <div key={key} className="flex items-center justify-between px-4 py-2.5 text-sm gap-4">
                <span className="text-text-muted text-xs shrink-0">{key}</span>
                <span className="text-text-primary font-mono text-sm flex-1">{value}</span>
                <button
                  onClick={() => removeDomain(key)}
                  disabled={updateConfig.isPending}
                  className="text-text-muted hover:text-status-error disabled:opacity-50 shrink-0"
                  title="Remove domain"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function NodeCertificatesPage() {
  const { node } = useParams<{ node: string }>()
  const { data: certs, isLoading, refetch, isFetching } = useNodeCertificates(node!)
  const orderCert = useOrderNodeCertificate(node!)
  const revokeCert = useRevokeNodeCertificate(node!)

  const certList = (certs ?? []) as Record<string, unknown>[]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Certificates</h1>
          <p className="text-sm text-text-muted mt-0.5">TLS certificates for {node}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`size-4 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            disabled={orderCert.isPending}
            onClick={() => {
              if (confirm(`Order/renew ACME certificate for ${node}?`)) {
                orderCert.mutate(false)
              }
            }}
          >
            <ShieldCheck className="size-4 mr-1.5" />
            {orderCert.isPending ? 'Ordering…' : 'Order/Renew'}
          </Button>
        </div>
      </div>

      <ACMEDomainsCard node={node!} />

      {isLoading ? (
        <SkeletonCard />
      ) : certList.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-border">
          <p className="text-text-muted text-sm">No certificates found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {certList.map((cert, i) => {
            const filename = cert['filename'] as string | undefined
            const subject = cert['subject'] as string | undefined
            const issuer = cert['issuer'] as string | undefined
            const notBefore = cert['notbefore'] as number | undefined
            const notAfter = cert['notafter'] as number | undefined
            const fingerprint = cert['fingerprint'] as string | undefined
            const san = cert['san'] as string[] | undefined
            const status = certStatus(cert)
            const isACME = filename?.includes('acme')

            return (
              <Card key={i}>
                <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <ShieldCheck className="size-4 text-text-muted" />
                      {filename ?? `Certificate ${i + 1}`}
                    </CardTitle>
                    {status && (
                      <p className={`text-xs mt-1 ${status.color}`}>{status.label}</p>
                    )}
                  </div>
                  {isACME && (
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={revokeCert.isPending}
                      onClick={() => {
                        if (confirm('Revoke this ACME certificate? This will delete it from the node.')) {
                          revokeCert.mutate()
                        }
                      }}
                    >
                      <Trash2 className="size-3.5 mr-1" />
                      Revoke
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="p-0">
                  <dl className="divide-y divide-border-muted">
                    {subject && (
                      <div className="flex items-start justify-between px-4 py-2.5 text-sm gap-4">
                        <dt className="text-text-muted shrink-0">Subject</dt>
                        <dd className="text-text-primary font-mono text-xs text-right break-all">{subject}</dd>
                      </div>
                    )}
                    {issuer && (
                      <div className="flex items-start justify-between px-4 py-2.5 text-sm gap-4">
                        <dt className="text-text-muted shrink-0">Issuer</dt>
                        <dd className="text-text-primary font-mono text-xs text-right break-all">{issuer}</dd>
                      </div>
                    )}
                    {san && san.length > 0 && (
                      <div className="flex items-start justify-between px-4 py-2.5 text-sm gap-4">
                        <dt className="text-text-muted shrink-0">SAN</dt>
                        <dd className="text-right">
                          {san.map((s) => (
                            <span key={s} className="inline-block text-xs font-mono text-text-secondary ml-1">{s}</span>
                          ))}
                        </dd>
                      </div>
                    )}
                    {notBefore && (
                      <div className="flex items-center justify-between px-4 py-2.5 text-sm">
                        <dt className="text-text-muted">Valid From</dt>
                        <dd className="text-text-secondary tabular-nums text-sm">{formatTimestamp(notBefore)}</dd>
                      </div>
                    )}
                    {notAfter && (
                      <div className="flex items-center justify-between px-4 py-2.5 text-sm">
                        <dt className="text-text-muted">Valid Until</dt>
                        <dd className="text-text-secondary tabular-nums text-sm">{formatTimestamp(notAfter)}</dd>
                      </div>
                    )}
                    {fingerprint && (
                      <div className="flex items-start justify-between px-4 py-2.5 text-sm gap-4">
                        <dt className="text-text-muted shrink-0">Fingerprint</dt>
                        <dd className="text-text-muted font-mono text-[10px] text-right break-all">{fingerprint}</dd>
                      </div>
                    )}
                  </dl>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
