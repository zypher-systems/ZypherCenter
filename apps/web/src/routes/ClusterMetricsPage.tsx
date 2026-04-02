import { useState } from 'react'
import { BarChart3, Plus, Pencil, Trash2, Activity, Database } from 'lucide-react'
import {
  useMetricServers,
  useCreateMetricServer,
  useUpdateMetricServer,
  useDeleteMetricServer,
  type MetricServer,
} from '@/lib/queries/cluster'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
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

// ── Create / Edit Dialog ────────────────────────────────────────────────────

function MetricServerDialog({
  existing,
  onClose,
}: {
  existing?: MetricServer
  onClose: () => void
}) {
  const createServer = useCreateMetricServer()
  const updateServer = useUpdateMetricServer()
  const isEdit = !!existing

  const [id, setId] = useState(existing?.id ?? '')
  const [type, setType] = useState<'influxdb' | 'graphite'>(existing?.type ?? 'influxdb')
  const [server, setServer] = useState(existing?.server ?? '')
  const [port, setPort] = useState(String(existing?.port ?? (type === 'influxdb' ? 8086 : 2003)))
  const [disable, setDisable] = useState(existing?.disable === 1)
  // InfluxDB fields
  const [bucket, setBucket] = useState(existing?.bucket ?? 'proxmox')
  const [token, setToken] = useState(existing?.token ?? '')
  const [organization, setOrganization] = useState(existing?.organization ?? '')
  const [influxProto, setInfluxProto] = useState<'https' | 'http' | 'udp'>(existing?.influxdbproto ?? 'https')
  const [apiPathPrefix, setApiPathPrefix] = useState(existing?.['api-path-prefix'] ?? '')
  // Graphite fields
  const [path, setPath] = useState(existing?.path ?? '')
  const [proto, setProto] = useState<'tcp' | 'udp'>(existing?.proto ?? 'tcp')

  function handleTypeChange(t: 'influxdb' | 'graphite') {
    setType(t)
    setPort(t === 'influxdb' ? '8086' : '2003')
  }

  function submit() {
    if (!id.trim() || !server.trim()) return
    const base: MetricServer = {
      id: id.trim(),
      type,
      server: server.trim(),
      port: Number(port),
      disable: disable ? 1 : 0,
    }
    if (type === 'influxdb') {
      if (bucket) base.bucket = bucket
      if (token) base.token = token
      if (organization) base.organization = organization
      base.influxdbproto = influxProto
      if (apiPathPrefix) base['api-path-prefix'] = apiPathPrefix
    } else {
      if (path) base.path = path
      base.proto = proto
    }
    if (isEdit) {
      updateServer.mutate(base, { onSuccess: () => onClose() })
    } else {
      createServer.mutate(base, { onSuccess: () => onClose() })
    }
  }

  const isPending = createServer.isPending || updateServer.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-bg-card border border-border-subtle rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-text-primary">
          {isEdit ? 'Edit Metric Server' : 'Add Metric Server'}
        </h2>

        <div className="space-y-3">
          {/* ID */}
          <div>
            <label className="block text-sm text-text-secondary mb-1">
              ID <span className="text-status-error">*</span>
            </label>
            <input
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="my-influx"
              disabled={isEdit}
              className={`${inp} disabled:opacity-60 disabled:cursor-not-allowed`}
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm text-text-secondary mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => handleTypeChange(e.target.value as 'influxdb' | 'graphite')}
              disabled={isEdit}
              className={`${inp} disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              <option value="influxdb">InfluxDB</option>
              <option value="graphite">Graphite</option>
            </select>
          </div>

          {/* Server + Port */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-sm text-text-secondary mb-1">
                Server <span className="text-status-error">*</span>
              </label>
              <input
                value={server}
                onChange={(e) => setServer(e.target.value)}
                placeholder="influx.example.com"
                className={inp}
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">Port</label>
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                className={inp}
              />
            </div>
          </div>

          {/* InfluxDB-specific */}
          {type === 'influxdb' && (
            <>
              <div>
                <label className="block text-sm text-text-secondary mb-1">Protocol</label>
                <select
                  value={influxProto}
                  onChange={(e) => setInfluxProto(e.target.value as 'https' | 'http' | 'udp')}
                  className={inp}
                >
                  <option value="https">HTTPS (InfluxDB v2)</option>
                  <option value="http">HTTP (InfluxDB v2)</option>
                  <option value="udp">UDP (InfluxDB v1)</option>
                </select>
              </div>
              {influxProto !== 'udp' && (
                <>
                  <div>
                    <label className="block text-sm text-text-secondary mb-1">Organization</label>
                    <input
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                      placeholder="my-org"
                      className={inp}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-text-secondary mb-1">Bucket</label>
                    <input
                      value={bucket}
                      onChange={(e) => setBucket(e.target.value)}
                      placeholder="proxmox"
                      className={inp}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-text-secondary mb-1">
                      API Token <span className="text-text-disabled">(optional)</span>
                    </label>
                    <input
                      type="password"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      placeholder="InfluxDB API token"
                      className={inp}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-text-secondary mb-1">
                      API Path Prefix <span className="text-text-disabled">(optional)</span>
                    </label>
                    <input
                      value={apiPathPrefix}
                      onChange={(e) => setApiPathPrefix(e.target.value)}
                      placeholder="/proxmox"
                      className={inp}
                    />
                  </div>
                </>
              )}
            </>
          )}

          {/* Graphite-specific */}
          {type === 'graphite' && (
            <>
              <div>
                <label className="block text-sm text-text-secondary mb-1">Protocol</label>
                <select
                  value={proto}
                  onChange={(e) => setProto(e.target.value as 'tcp' | 'udp')}
                  className={inp}
                >
                  <option value="tcp">TCP</option>
                  <option value="udp">UDP</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">
                  Path Prefix <span className="text-text-disabled">(optional)</span>
                </label>
                <input
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  placeholder="proxmox"
                  className={inp}
                />
              </div>
            </>
          )}

          {/* Disabled toggle */}
          <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={disable}
              onChange={(e) => setDisable(e.target.checked)}
              className="accent-accent"
            />
            Disabled
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={submit}
            disabled={!id.trim() || !server.trim() || isPending}
          >
            {isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Server'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

export function ClusterMetricsPage() {
  const { data: servers, isLoading, isError, error } = useMetricServers()
  const deleteServer = useDeleteMetricServer()
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<MetricServer | null>(null)

  return (
    <div className="space-y-5">
      {showCreate && <MetricServerDialog onClose={() => setShowCreate(false)} />}
      {editing && <MetricServerDialog existing={editing} onClose={() => setEditing(null)} />}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="size-5 text-accent" />
            <h1 className="text-xl font-semibold text-text-primary">Metrics Servers</h1>
          </div>
          <p className="text-sm text-text-muted mt-0.5">
            Push cluster metrics to external time-series databases (InfluxDB, Graphite)
          </p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="size-3.5 mr-1.5" />
          Add Server
        </Button>
      </div>

      {isLoading ? (
        <SkeletonCard />
      ) : isError ? (
        <div className="flex flex-col items-center justify-center h-48 text-center gap-2">
          <BarChart3 className="size-10 text-text-disabled" />
          <p className="text-sm text-text-muted">Metrics server configuration is not available.</p>
          {error instanceof Error && (
            <p className="text-xs text-text-disabled font-mono">{error.message}</p>
          )}
          <p className="text-xs text-text-disabled">Requires Proxmox VE 6.4 or later.</p>
        </div>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Configured Servers
              {servers && servers.length > 0 && (
                <span className="ml-2 text-text-muted font-normal">({servers.length})</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {!servers?.length ? (
              <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
                <Database className="size-8 text-text-disabled" />
                <p className="text-sm text-text-muted">No metric servers configured.</p>
                <p className="text-xs text-text-disabled">
                  Add an InfluxDB or Graphite server to receive cluster metrics.
                </p>
                <Button size="sm" className="mt-2" onClick={() => setShowCreate(true)}>
                  <Plus className="size-3.5 mr-1.5" />
                  Add First Server
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Server</TableHead>
                    <TableHead>Port</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {servers.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono font-medium text-text-primary text-sm">
                        {s.id}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs uppercase tracking-wide bg-bg-elevated text-text-muted px-1.5 py-0.5 rounded font-medium">
                          {s.type}
                        </span>
                      </TableCell>
                      <TableCell className="text-text-secondary text-sm font-mono">
                        {s.server}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-text-muted">
                        {s.port}
                      </TableCell>
                      <TableCell className="text-xs text-text-muted max-w-48 truncate">
                        {s.type === 'influxdb' ? (
                          <>
                            {s.influxdbproto ?? 'https'}{s.organization ? ` · ${s.organization}` : ''}
                            {s.bucket ? ` / ${s.bucket}` : ''}
                          </>
                        ) : (
                          <>
                            {s.proto ?? 'tcp'}{s.path ? ` · ${s.path}` : ''}
                          </>
                        )}
                      </TableCell>
                      <TableCell>
                        {s.disable ? (
                          <span className="text-xs text-text-disabled">disabled</span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-status-running">
                            <span className="size-1.5 rounded-full bg-status-running" />
                            active
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setEditing(s)}
                            className="inline-flex items-center gap-1 rounded border border-border-subtle px-2 py-0.5 text-xs text-text-muted hover:text-text-primary hover:bg-bg-elevated"
                          >
                            <Pencil className="size-3" />
                          </button>
                          <button
                            disabled={deleteServer.isPending}
                            onClick={() => {
                              if (confirm(`Delete metric server "${s.id}"?`)) {
                                deleteServer.mutate(s.id)
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

      {/* Info card */}
      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-text-muted leading-relaxed">
            <strong className="text-text-secondary">InfluxDB:</strong> Supports both v1 (UDP) and v2 (HTTP/HTTPS with tokens). For v2, configure Organization, Bucket, and API Token. Use the HTTPS protocol with the API token for production environments.
          </p>
          <p className="text-xs text-text-muted leading-relaxed mt-2">
            <strong className="text-text-secondary">Graphite:</strong> Sends metrics via TCP or UDP to a Graphite-compatible server (Graphite, InfluxDB with graphite plugin, VictoriaMetrics, etc.). Metrics are sent every 60 seconds by default.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
