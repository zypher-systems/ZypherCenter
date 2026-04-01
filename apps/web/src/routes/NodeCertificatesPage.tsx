import { useParams } from 'react-router'
import { ShieldCheck, RefreshCw, Trash2 } from 'lucide-react'
import {
  useNodeCertificates,
  useOrderNodeCertificate,
  useRevokeNodeCertificate,
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
