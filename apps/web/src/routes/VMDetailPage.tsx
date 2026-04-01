import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router'
import {
  Play,
  Square,
  RotateCcw,
  Power,
  Terminal,
  Camera,
  HardDrive,
  Settings,
  Cloud,
  Shield,
  Archive,
  Activity,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
} from 'lucide-react'
import {
  useVMStatus,
  useVMConfig,
  useVMSnapshots,
  useVMStart,
  useVMStop,
  useVMShutdown,
  useVMReboot,
  useVMFirewallRules,
  useVMFirewallOptions,
  useCreateVMFirewallRule,
  useDeleteVMFirewallRule,
  useCreateVMSnapshot,
  useDeleteVMSnapshot,
  useRollbackVMSnapshot,
  useMigrateVM,
  useCloneVM,
  useUpdateVMConfig,
  useDeleteVM,
} from '@/lib/queries/vms'
import { useClusterBackupJobs, useClusterResources } from '@/lib/queries/cluster'
import { useNodeTasksFiltered } from '@/lib/queries/nodes'
import { useNextVMId } from '@/lib/queries/vms'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { ResourceGauge } from '@/components/ui/ResourceGauge'
import { SkeletonCard } from '@/components/ui/Skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table'
import { formatBytes, formatPercent, formatUptime, formatTimestamp } from '@/lib/utils'
import { ResourceCharts } from '@/components/features/ResourceCharts'

// ── Summary tab ───────────────────────────────────────────────────────────────

function NotesCard({ node, vmid }: { node: string; vmid: number }) {
  const { data: config } = useVMConfig(node, vmid)
  const updateConfig = useUpdateVMConfig(node, vmid)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const notes = (config?.description as string | undefined) ?? ''

  function startEdit() { setDraft(notes); setEditing(true) }
  function cancel() { setEditing(false) }
  function save() {
    updateConfig.mutate({ description: draft }, { onSuccess: () => setEditing(false) })
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Notes</CardTitle>
          {!editing ? (
            <button
              onClick={startEdit}
              className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-accent"
            >
              <Pencil className="size-3" />Edit
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={cancel} className="text-xs text-text-muted hover:text-text-secondary"><X className="size-3.5" /></button>
              <button onClick={save} disabled={updateConfig.isPending} className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent-hover disabled:opacity-50">
                <Check className="size-3" />{updateConfig.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {editing ? (
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={5}
            className="w-full rounded border border-border-subtle bg-bg-input px-3 py-2 text-sm text-text-primary outline-none focus:border-accent resize-y font-mono"
            placeholder="Add notes…"
            autoFocus
          />
        ) : notes ? (
          <pre className="text-sm text-text-secondary whitespace-pre-wrap font-sans leading-relaxed">{notes}</pre>
        ) : (
          <p className="text-sm text-text-disabled italic">No notes — click Edit to add</p>
        )}
      </CardContent>
    </Card>
  )
}

function SummaryTab({ node, vmid }: { node: string; vmid: number }) {
  const { data: status } = useVMStatus(node, vmid)
  const { data: config } = useVMConfig(node, vmid)
  if (!status) return null

  const tags = (config?.tags as string | undefined)?.split(/[;,]/).map((t) => t.trim()).filter(Boolean) ?? []

  return (
    <div className="space-y-4">
      {tags.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {tags.map((tag) => (
            <span key={tag} className="inline-flex items-center rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent border border-accent/20">
              {tag}
            </span>
          ))}
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Resources</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {status.cpu != null && (
              <ResourceGauge label="CPU" used={status.cpu} total={1} format="percent" />
            )}
            {status.mem != null && status.maxmem != null && (
              <ResourceGauge label="Memory" used={status.mem} total={status.maxmem} />
            )}
            {status.disk != null && status.maxdisk != null && (
              <ResourceGauge label="Disk" used={status.disk} total={status.maxdisk} />
            )}
            <div className="pt-2 border-t border-border-muted text-xs space-y-1">
              <div className="flex justify-between text-text-muted">
                <span>Uptime</span>
                <span className="text-text-secondary">{status.uptime ? formatUptime(status.uptime) : '—'}</span>
              </div>
              <div className="flex justify-between text-text-muted">
                <span>Net In / Out</span>
                <span className="text-text-secondary font-mono">
                  {formatBytes(status.netin ?? 0)} / {formatBytes(status.netout ?? 0)}
                </span>
              </div>
              <div className="flex justify-between text-text-muted">
                <span>Disk Read / Write</span>
                <span className="text-text-secondary font-mono">
                  {formatBytes(status.diskread ?? 0)} / {formatBytes(status.diskwrite ?? 0)}
                </span>
              </div>
              {status.pid && (
                <div className="flex justify-between text-text-muted">
                  <span>PID</span>
                  <span className="text-text-secondary font-mono">{status.pid}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        <NotesCard node={node} vmid={vmid} />
      </div>
    </div>
  )
}

// ── Hardware tab ─────────────────────────────────────────────────────────────

function HardwareTab({ node, vmid }: { node: string; vmid: number }) {
  const { data: config } = useVMConfig(node, vmid)

  if (!config) return null

  const rows: { key: string; label: string }[] = [
    { key: 'cores', label: 'CPU Cores' },
    { key: 'sockets', label: 'Sockets' },
    { key: 'cpu', label: 'CPU Type' },
    { key: 'memory', label: 'Memory (MiB)' },
    { key: 'balloon', label: 'Balloon Min (MiB)' },
    { key: 'bios', label: 'BIOS' },
    { key: 'machine', label: 'Machine' },
    { key: 'scsihw', label: 'SCSI Controller' },
    { key: 'ostype', label: 'OS Type' },
    { key: 'boot', label: 'Boot Order' },
    { key: 'vga', label: 'VGA' },
    { key: 'agent', label: 'QEMU Agent' },
  ]

  // Dynamic disk/network keys
  const dynamicKeys = Object.keys(config).filter(
    (k) => /^(scsi|ide|sata|virtio|net)\d+$/.test(k),
  )

  return (
    <Card>
      <CardContent className="p-0">
        <div className="divide-y divide-border-muted">
          {rows.map(({ key, label }) => {
            const val = config[key as keyof typeof config]
            if (val == null) return null
            return (
              <div key={key} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="text-text-muted">{label}</span>
                <span className="text-text-primary font-mono">{String(val)}</span>
              </div>
            )
          })}
          {dynamicKeys.map((key) => (
            <div key={key} className="flex items-start justify-between px-4 py-2.5 text-sm gap-4">
              <span className="text-text-muted shrink-0">{key}</span>
              <span className="text-text-primary font-mono text-right break-all text-xs">
                {String(config[key as keyof typeof config])}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Snapshots tab ────────────────────────────────────────────────────────────

function SnapshotsTab({ node, vmid }: { node: string; vmid: number }) {
  const { data: snapshots } = useVMSnapshots(node, vmid)
  const createSnap = useCreateVMSnapshot(node, vmid)
  const deleteSnap = useDeleteVMSnapshot(node, vmid)
  const rollbackSnap = useRollbackVMSnapshot(node, vmid)

  const [showForm, setShowForm] = useState(false)
  const [snapname, setSnapname] = useState('')
  const [description, setDescription] = useState('')
  const [vmstate, setVmstate] = useState(false)

  function handleCreate() {
    if (!snapname.trim()) return
    createSnap.mutate(
      { snapname: snapname.trim(), description: description.trim() || undefined, vmstate: vmstate ? 1 : 0 },
      {
        onSuccess: () => {
          setSnapname('')
          setDescription('')
          setVmstate(false)
          setShowForm(false)
        },
      }
    )
  }

  const listed = snapshots?.filter((s) => s.name !== 'current') ?? []

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent/90"
        >
          <Camera className="size-3.5" />
          Take Snapshot
        </button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>New Snapshot</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="block text-xs text-text-muted mb-1">Name *</label>
              <input
                className="w-full rounded-md border border-border-muted bg-bg-input px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
                placeholder="snapshot-name"
                value={snapname}
                onChange={(e) => setSnapname(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Description</label>
              <input
                className="w-full rounded-md border border-border-muted bg-bg-input px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
                placeholder="Optional description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="vmstate-cb"
                type="checkbox"
                checked={vmstate}
                onChange={(e) => setVmstate(e.target.checked)}
                className="accent-accent"
              />
              <label htmlFor="vmstate-cb" className="text-sm text-text-secondary cursor-pointer">
                Include RAM (vmstate)
              </label>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={createSnap.isPending || !snapname.trim()}
                className="inline-flex items-center rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
              >
                {createSnap.isPending ? 'Creating…' : 'Create'}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="inline-flex items-center rounded-md border border-border-muted px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-hover"
              >
                Cancel
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border-muted">
            {listed.length === 0 ? (
              <p className="text-center text-text-muted text-sm py-10">No snapshots</p>
            ) : (
              listed.map((snap) => (
                <div key={snap.name} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium text-text-primary">{snap.name}</p>
                    {snap.description && (
                      <p className="text-xs text-text-muted">{snap.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {snap.snaptime && (
                      <span className="text-xs text-text-muted mr-2">
                        {new Date(snap.snaptime * 1000).toLocaleDateString()}
                      </span>
                    )}
                    <button
                      onClick={() => rollbackSnap.mutate(snap.name)}
                      disabled={rollbackSnap.isPending}
                      className="inline-flex items-center gap-1 rounded border border-border-muted px-2 py-0.5 text-xs text-text-secondary hover:bg-bg-hover disabled:opacity-50"
                    >
                      <RotateCcw className="size-3" />
                      Rollback
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete snapshot "${snap.name}"?`)) deleteSnap.mutate(snap.name)
                      }}
                      disabled={deleteSnap.isPending}
                      className="inline-flex items-center gap-1 rounded border border-status-error/40 px-2 py-0.5 text-xs text-status-error hover:bg-status-error/10 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Options tab ──────────────────────────────────────────────────────────────

function VMOptionsTab({ node, vmid }: { node: string; vmid: number }) {
  const { data: config } = useVMConfig(node, vmid)
  const updateConfig = useUpdateVMConfig(node, vmid)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  if (!config) return null

  // Boolean toggle options
  const boolOpts: { key: string; label: string }[] = [
    { key: 'onboot',     label: 'Start at boot' },
    { key: 'protection', label: 'Protection' },
    { key: 'acpi',       label: 'ACPI' },
    { key: 'tablet',     label: 'USB Tablet' },
    { key: 'numa',       label: 'NUMA' },
    { key: 'localtime',  label: 'Local time' },
  ]

  // Text-editable options
  const textOpts: { key: string; label: string }[] = [
    { key: 'description', label: 'Description' },
    { key: 'tags',        label: 'Tags' },
    { key: 'hookscript',  label: 'Hook script' },
  ]

  // Read-only display options
  const readOpts: { key: string; label: string; fmt?: (v: unknown) => string }[] = [
    { key: 'kvm',      label: 'KVM',          fmt: (v) => v != null ? (v ? 'Enabled' : 'Disabled') : 'Default' },
    { key: 'agent',    label: 'QEMU Agent',   fmt: (v) => String(v ?? '—') },
    { key: 'hotplug',  label: 'Hotplug',      fmt: (v) => String(v ?? '—') },
    { key: 'balloon',  label: 'Balloon',      fmt: (v) => String(v ?? '0') },
    { key: 'startdate', label: 'Start date',  fmt: (v) => String(v ?? '—') },
  ]

  function startEdit(key: string) {
    setEditingKey(key)
    const val = config![key as keyof typeof config]
    setEditValue(val != null ? String(val) : '')
  }

  function cancelEdit() { setEditingKey(null); setEditValue('') }

  function saveEdit(key: string) {
    updateConfig.mutate({ [key]: editValue }, { onSuccess: cancelEdit })
  }

  function toggleBool(key: string) {
    const cur = config![key as keyof typeof config]
    updateConfig.mutate({ [key]: cur ? 0 : 1 })
  }

  return (
    <Card>
      <CardHeader><CardTitle>VM Options</CardTitle></CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border-muted">
          {/* Boolean toggles */}
          {boolOpts.map(({ key, label }) => {
            const val = config[key as keyof typeof config]
            const isOn = !!val
            return (
              <div key={key} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="text-text-muted">{label}</span>
                <button
                  onClick={() => toggleBool(key)}
                  disabled={updateConfig.isPending}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${
                    isOn ? 'bg-accent' : 'bg-border-muted'
                  }`}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    isOn ? 'translate-x-4' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            )
          })}

          {/* Text-editable options */}
          {textOpts.map(({ key, label }) => {
            const val = config[key as keyof typeof config]
            const isEditing = editingKey === key
            return (
              <div key={key} className="flex items-center justify-between px-4 py-2.5 text-sm gap-4">
                <span className="text-text-muted shrink-0">{label}</span>
                {isEditing ? (
                  <div className="flex items-center gap-1.5 flex-1 justify-end">
                    <input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(key); if (e.key === 'Escape') cancelEdit() }}
                      className="w-full max-w-xs rounded border border-border-subtle bg-bg-input px-2 py-0.5 text-sm text-text-primary outline-none focus:border-accent"
                    />
                    <button
                      onClick={() => saveEdit(key)}
                      disabled={updateConfig.isPending}
                      className="text-status-running hover:opacity-80 disabled:opacity-50"
                    >
                      <Check className="size-3.5" />
                    </button>
                    <button onClick={cancelEdit} className="text-text-muted hover:opacity-80">
                      <X className="size-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-text-primary text-right">{val != null ? String(val) : '—'}</span>
                    <button
                      onClick={() => startEdit(key)}
                      className="text-text-muted hover:text-text-primary"
                    >
                      <Pencil className="size-3" />
                    </button>
                  </div>
                )}
              </div>
            )
          })}

          {/* Read-only options */}
          {readOpts.map(({ key, label, fmt }) => {
            const val = config[key as keyof typeof config]
            if (val == null) return null
            return (
              <div key={key} className="flex items-start justify-between px-4 py-2.5 text-sm gap-4">
                <span className="text-text-muted shrink-0">{label}</span>
                <span className="text-text-primary text-right">{fmt ? fmt(val) : String(val)}</span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Cloud-Init tab ────────────────────────────────────────────────────────────

function CloudInitTab({ node, vmid }: { node: string; vmid: number }) {
  const { data: config } = useVMConfig(node, vmid)
  const updateConfig = useUpdateVMConfig(node, vmid)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  if (!config) return null

  const hasCiDrive = Object.keys(config).some(
    (k) => /^(ide|scsi|sata|virtio)\d+$/.test(k) &&
      String(config[k as keyof typeof config]).includes('cloudinit'),
  )

  if (!hasCiDrive) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-border">
        <p className="text-text-muted text-sm">No Cloud-Init drive detected on this VM</p>
      </div>
    )
  }

  const ipconfigs = Object.keys(config)
    .filter((k) => /^ipconfig\d+$/.test(k))
    .sort()

  const sshkeys = config['sshkeys' as keyof typeof config] as string | undefined

  const editableFields: { key: string; label: string; type?: 'password' }[] = [
    { key: 'ciuser',       label: 'Username' },
    { key: 'cipassword',   label: 'Password', type: 'password' },
    { key: 'nameserver',   label: 'DNS Server' },
    { key: 'searchdomain', label: 'Search Domain' },
  ]

  function startEdit(key: string) {
    setEditingKey(key)
    const val = config![key as keyof typeof config]
    setEditValue(key === 'cipassword' ? '' : (val != null ? String(val) : ''))
  }

  function cancelEdit() { setEditingKey(null); setEditValue('') }

  function saveEdit(key: string) {
    updateConfig.mutate({ [key]: editValue }, { onSuccess: cancelEdit })
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>User &amp; Credentials</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border-muted">
            {editableFields.map(({ key, label, type }) => {
              const val = config[key as keyof typeof config]
              const isEditing = editingKey === key
              const displayVal = key === 'cipassword'
                ? (val != null ? '••••••••' : '—')
                : (val != null ? String(val) : '—')
              return (
                <div key={key} className="flex items-center justify-between px-4 py-2.5 text-sm gap-4">
                  <span className="text-text-muted shrink-0">{label}</span>
                  {isEditing ? (
                    <div className="flex items-center gap-1.5 flex-1 justify-end">
                      <input
                        autoFocus
                        type={type ?? 'text'}
                        value={editValue}
                        placeholder={type === 'password' ? 'New password' : undefined}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(key); if (e.key === 'Escape') cancelEdit() }}
                        className="w-full max-w-xs rounded border border-border-subtle bg-bg-input px-2 py-0.5 text-sm text-text-primary outline-none focus:border-accent"
                      />
                      <button
                        onClick={() => saveEdit(key)}
                        disabled={updateConfig.isPending}
                        className="text-status-running hover:opacity-80 disabled:opacity-50"
                      >
                        <Check className="size-3.5" />
                      </button>
                      <button onClick={cancelEdit} className="text-text-muted hover:opacity-80">
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className={`font-mono ${key === 'cipassword' ? 'text-text-muted tracking-widest' : 'text-text-primary'}`}>
                        {displayVal}
                      </span>
                      <button
                        onClick={() => startEdit(key)}
                        className="text-text-muted hover:text-text-primary"
                      >
                        <Pencil className="size-3" />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {ipconfigs.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Network (IP Config)</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border-muted">
              {ipconfigs.map((key) => {
                const isEditing = editingKey === key
                const val = config[key as keyof typeof config]
                return (
                  <div key={key} className="flex items-center justify-between px-4 py-2.5 text-sm gap-4">
                    <span className="text-text-muted shrink-0">{key}</span>
                    {isEditing ? (
                      <div className="flex items-center gap-1.5 flex-1 justify-end">
                        <input
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(key); if (e.key === 'Escape') cancelEdit() }}
                          className="w-full max-w-xs rounded border border-border-subtle bg-bg-input px-2 py-0.5 text-xs font-mono text-text-primary outline-none focus:border-accent"
                        />
                        <button
                          onClick={() => saveEdit(key)}
                          disabled={updateConfig.isPending}
                          className="text-status-running hover:opacity-80 disabled:opacity-50"
                        >
                          <Check className="size-3.5" />
                        </button>
                        <button onClick={cancelEdit} className="text-text-muted hover:opacity-80">
                          <X className="size-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-text-primary font-mono text-right break-all text-xs">
                          {val != null ? String(val) : '—'}
                        </span>
                        <button
                          onClick={() => startEdit(key)}
                          className="text-text-muted hover:text-text-primary shrink-0"
                        >
                          <Pencil className="size-3" />
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {sshkeys && (
        <Card>
          <CardHeader><CardTitle>SSH Keys</CardTitle></CardHeader>
          <CardContent>
            <pre className="text-xs font-mono text-text-secondary whitespace-pre-wrap break-all">
              {decodeURIComponent(String(sshkeys))}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ── Firewall tab ──────────────────────────────────────────────────────────────

function FirewallActionBadge({ action }: { action: string }) {
  const color =
    action === 'ACCEPT' ? 'text-status-running bg-status-running/10' :
    action === 'DROP'   ? 'text-status-error bg-status-error/10' :
    action === 'REJECT' ? 'text-status-stopped bg-status-stopped/10' :
                          'text-text-muted bg-bg-elevated'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      {action}
    </span>
  )
}

function VMFirewallTab({ node, vmid }: { node: string; vmid: number }) {
  const { data: rules  } = useVMFirewallRules(node, vmid)
  const { data: options } = useVMFirewallOptions(node, vmid)
  const createRule = useCreateVMFirewallRule(node, vmid)
  const deleteRule = useDeleteVMFirewallRule(node, vmid)
  const [showAdd, setShowAdd] = useState(false)
  const [dir, setDir] = useState('in')
  const [action, setAction] = useState('ACCEPT')
  const [macro, setMacro] = useState('')
  const [proto, setProto] = useState('')
  const [src, setSrc] = useState('')
  const [dest, setDest] = useState('')
  const [dport, setDport] = useState('')
  const [comment, setComment] = useState('')

  const enabled = options?.enable === 1
  const inp = 'w-full rounded border border-border-subtle bg-bg-input px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent [color-scheme:dark]'

  function submitRule() {
    createRule.mutate(
      { type: dir, action, macro: macro || undefined, proto: proto || undefined, source: src || undefined, dest: dest || undefined, dport: dport || undefined, enable: 1 },
      { onSuccess: () => { setShowAdd(false); setMacro(''); setSrc(''); setDest(''); setDport(''); setComment('') } }
    )
  }

  return (
    <div className="space-y-4">
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-bg-card border border-border-subtle rounded-xl shadow-2xl w-full max-w-md p-6 space-y-3">
            <h2 className="text-base font-semibold text-text-primary">Add Firewall Rule</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-text-secondary mb-1">Direction</label>
                <select value={dir} onChange={(e) => setDir(e.target.value)} className={inp}>
                  <option value="in">IN</option>
                  <option value="out">OUT</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">Action</label>
                <select value={action} onChange={(e) => setAction(e.target.value)} className={inp}>
                  <option>ACCEPT</option><option>DROP</option><option>REJECT</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Macro (optional)</label>
              <input value={macro} onChange={(e) => setMacro(e.target.value)} placeholder="SSH, HTTP, HTTPS…" className={inp} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-text-secondary mb-1">Source</label>
                <input value={src} onChange={(e) => setSrc(e.target.value)} placeholder="any" className={inp} />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">Dest</label>
                <input value={dest} onChange={(e) => setDest(e.target.value)} placeholder="any" className={inp} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-text-secondary mb-1">Protocol</label>
                <select value={proto} onChange={(e) => setProto(e.target.value)} className={inp}>
                  <option value="">any</option><option value="tcp">tcp</option><option value="udp">udp</option><option value="icmp">icmp</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">Dest Port</label>
                <input value={dport} onChange={(e) => setDport(e.target.value)} placeholder="80,443" className={inp} />
              </div>
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Comment</label>
              <input value={comment} onChange={(e) => setComment(e.target.value)} className={inp} />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button size="sm" onClick={submitRule} disabled={createRule.isPending}>
                <Plus className="size-3.5 mr-1" />{createRule.isPending ? 'Adding…' : 'Add Rule'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {options && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Firewall Status</CardTitle>
              <span className={`text-xs font-medium px-2 py-0.5 rounded ${enabled ? 'bg-status-running/10 text-status-running' : 'bg-bg-elevated text-text-muted'}`}>
                {enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border-muted">
              {(['policy_in', 'policy_out'] as const).map((key) => {
                const val = options[key]
                if (!val) return null
                return (
                  <div key={key} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <span className="text-text-muted">{key === 'policy_in' ? 'Default policy (in)' : 'Default policy (out)'}</span>
                    <FirewallActionBadge action={val} />
                  </div>
                )
              })}
              {(['dhcp', 'ipfilter', 'macfilter', 'ndp', 'radv'] as const).map((key) => {
                const val = options[key]
                if (val == null) return null
                return (
                  <div key={key} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <span className="text-text-muted capitalize">{key.replace(/_/g, ' ')}</span>
                    <span className={`text-xs ${val ? 'text-status-running' : 'text-text-disabled'}`}>{val ? 'Enabled' : 'Disabled'}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">
              Rules
              <span className="ml-2 text-xs font-normal text-text-muted">{rules?.length ?? 0} rule{rules?.length !== 1 ? 's' : ''}</span>
            </CardTitle>
            <Button size="sm" onClick={() => setShowAdd(true)}>
              <Plus className="size-3.5 mr-1" />Add Rule
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {!rules?.length ? (
            <p className="text-center text-text-muted text-sm py-10">No firewall rules defined</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Dir</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Macro / Proto</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Dest</TableHead>
                  <TableHead>Port</TableHead>
                  <TableHead>Comment</TableHead>
                  <TableHead className="w-10">On</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.pos} className={rule.enable === 0 ? 'opacity-40' : ''}>
                    <TableCell className="font-mono text-xs text-text-muted">{rule.pos}</TableCell>
                    <TableCell>
                      <span className="text-xs uppercase font-medium text-text-secondary">{rule.type}</span>
                    </TableCell>
                    <TableCell><FirewallActionBadge action={rule.action} /></TableCell>
                    <TableCell className="text-text-secondary text-sm">{rule.macro ?? rule.proto ?? '—'}</TableCell>
                    <TableCell className="font-mono text-xs text-text-secondary">{rule.source ?? '—'}</TableCell>
                    <TableCell className="font-mono text-xs text-text-secondary">{rule.dest ?? '—'}</TableCell>
                    <TableCell className="font-mono text-xs text-text-secondary">{rule.dport ?? rule.sport ?? '—'}</TableCell>
                    <TableCell className="text-text-muted text-xs max-w-[180px] truncate">{rule.comment ?? ''}</TableCell>
                    <TableCell>
                      <span className={`inline-block size-2 rounded-full ${rule.enable !== 0 ? 'bg-status-running' : 'bg-border'}`} />
                    </TableCell>
                    <TableCell className="text-right">
                      <button
                        onClick={() => { if (confirm(`Delete rule #${rule.pos}?`)) deleteRule.mutate(rule.pos) }}
                        disabled={deleteRule.isPending}
                        className="inline-flex items-center gap-1 rounded border border-status-error/40 px-2 py-0.5 text-xs text-status-error hover:bg-status-error/10 disabled:opacity-50"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ── Backups tab ───────────────────────────────────────────────────────────────

function VMBackupsTab({ node, vmid }: { node: string; vmid: number }) {
  const { data: jobs } = useClusterBackupJobs()
  const { data: tasks } = useNodeTasksFiltered(node, { vmid, typefilter: 'vzdump', limit: 20 })

  // Filter backup jobs that include this vmid
  const relatedJobs = (jobs ?? []).filter((j) => {
    if (!j.vmid) return true // empty = all VMs
    return String(j.vmid).split(',').map(Number).includes(vmid)
  })

  return (
    <div className="space-y-4">
      {/* Scheduled Jobs */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Scheduled Backup Jobs</CardTitle></CardHeader>
        <CardContent className="p-0">
          {!relatedJobs.length ? (
            <p className="text-center text-text-muted text-sm py-8">No scheduled backup jobs include this VM</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job ID</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Storage</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Enabled</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {relatedJobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-mono text-sm">{job.id}</TableCell>
                    <TableCell className="text-text-secondary">{job.schedule ?? job.dow ?? '—'}</TableCell>
                    <TableCell className="text-text-secondary">{job.storage}</TableCell>
                    <TableCell>
                      <span className="text-xs uppercase tracking-wide text-text-muted bg-bg-elevated px-2 py-0.5 rounded">
                        {job.mode ?? 'snapshot'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs ${!job.enabled || job.enabled === 1 ? 'text-status-running' : 'text-text-disabled'}`}>
                        {!job.enabled || job.enabled === 1 ? 'Yes' : 'No'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recent Backup Tasks */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Recent Backup Tasks</CardTitle></CardHeader>
        <CardContent className="p-0">
          {!tasks?.length ? (
            <p className="text-center text-text-muted text-sm py-8">No recent backup tasks</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Start Time</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => {
                  const upid = task['upid'] as string
                  const st = task['starttime'] as number
                  const et = task['endtime'] as number | undefined
                  const es = task['exitstatus'] as string | undefined
                  const ok = es === 'OK'
                  return (
                    <TableRow key={upid}>
                      <TableCell className="text-sm text-text-secondary tabular-nums">{formatTimestamp(st)}</TableCell>
                      <TableCell className="text-sm text-text-muted">{et ? formatUptime(et - st) : '—'}</TableCell>
                      <TableCell className="text-sm text-text-muted">{task['user'] as string ?? '—'}</TableCell>
                      <TableCell>
                        {!es ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-status-migrating">
                            <span className="size-1.5 rounded-full bg-status-migrating animate-pulse" />Running
                          </span>
                        ) : (
                          <span className={`inline-flex items-center gap-1.5 text-xs ${ok ? 'text-status-running' : 'text-status-error'}`}>
                            <span className={`size-1.5 rounded-full ${ok ? 'bg-status-running' : 'bg-status-error'}`} />
                            {es}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ── Migrate / Clone dialogs ───────────────────────────────────────────────────

function MigrateDialog({ node, vmid, isRunning, onClose }: { node: string; vmid: number; isRunning: boolean; onClose: () => void }) {
  const { data: nodes } = useClusterResources('node')
  const migrate = useMigrateVM(node, vmid)
  const [target, setTarget] = useState('')
  const [withDisks, setWithDisks] = useState(false)

  const otherNodes = (nodes ?? []).map((n) => n.node).filter((n) => n && n !== node)

  function submit() {
    if (!target) return
    migrate.mutate(
      { target, online: isRunning ? 1 : 0, with_local_disks: withDisks ? 1 : 0 },
      { onSuccess: onClose },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-bg-card border border-border-muted rounded-xl p-6 w-full max-w-sm shadow-xl space-y-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-base font-semibold text-text-primary">Migrate VM {vmid}</h2>
        <div>
          <label className="block text-xs text-text-muted mb-1">Target Node *</label>
          <select
            className="w-full rounded-md border border-border-muted bg-bg-input px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent [color-scheme:dark]"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          >
            <option value="">Select node…</option>
            {otherNodes.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <input id="wd-cb" type="checkbox" checked={withDisks} onChange={(e) => setWithDisks(e.target.checked)} className="accent-accent" />
          <label htmlFor="wd-cb" className="text-sm text-text-secondary cursor-pointer">With local disks</label>
        </div>
        {isRunning && <p className="text-xs text-status-migrating">VM is running — online migration will be attempted.</p>}
        <div className="flex gap-2 pt-1">
          <button onClick={submit} disabled={migrate.isPending || !target} className="flex-1 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50">
            {migrate.isPending ? 'Migrating…' : 'Migrate'}
          </button>
          <button onClick={onClose} className="flex-1 rounded-md border border-border-muted px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-hover">Cancel</button>
        </div>
      </div>
    </div>
  )
}

function CloneVMDialog({ node, vmid, onClose }: { node: string; vmid: number; onClose: () => void }) {
  const { data: nextId } = useNextVMId()
  const clone = useCloneVM(node, vmid)
  const [newid, setNewid] = useState('')
  const [name, setName] = useState('')
  const [full, setFull] = useState(true)

  // pre-fill with next available ID
  useState(() => { if (nextId && !newid) setNewid(String(nextId)) })

  function submit() {
    const id = Number(newid)
    if (!id) return
    clone.mutate(
      { newid: id, name: name.trim() || undefined, full: full ? 1 : 0 },
      { onSuccess: onClose },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-bg-card border border-border-muted rounded-xl p-6 w-full max-w-sm shadow-xl space-y-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-base font-semibold text-text-primary">Clone VM {vmid}</h2>
        <div>
          <label className="block text-xs text-text-muted mb-1">New VM ID *</label>
          <input className="w-full rounded-md border border-border-muted bg-bg-input px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent" type="number" placeholder={String(nextId ?? '')} value={newid} onChange={(e) => setNewid(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Name</label>
          <input className="w-full rounded-md border border-border-muted bg-bg-input px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent" placeholder="Optional name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <input id="full-cb" type="checkbox" checked={full} onChange={(e) => setFull(e.target.checked)} className="accent-accent" />
          <label htmlFor="full-cb" className="text-sm text-text-secondary cursor-pointer">Full clone (independent copy)</label>
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={submit} disabled={clone.isPending || !newid} className="flex-1 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50">
            {clone.isPending ? 'Cloning…' : 'Clone'}
          </button>
          <button onClick={onClose} className="flex-1 rounded-md border border-border-muted px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-hover">Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── Placeholder tab ───────────────────────────────────────────────────────────

// ── VM Detail Page ────────────────────────────────────────────────────────────

export function VMDetailPage() {
  const { node, vmid: vmidParam } = useParams<{ node: string; vmid: string }>()
  const vmid = Number(vmidParam)
  const [tab, setTab] = useState('summary')
  const [showMigrate, setShowMigrate] = useState(false)
  const [showClone, setShowClone] = useState(false)

  const { data: status, isLoading } = useVMStatus(node!, vmid)
  const start = useVMStart(node!, vmid)
  const stop = useVMStop(node!, vmid)
  const shutdown = useVMShutdown(node!, vmid)
  const reboot = useVMReboot(node!, vmid)
  const deleteVM = useDeleteVM(node!)
  const navigate = useNavigate()

  if (isLoading) return <SkeletonCard />

  const isRunning = status?.status === 'running'
  const isStopped = status?.status === 'stopped'

  return (
    <div className="space-y-5">
      {showMigrate && <MigrateDialog node={node!} vmid={vmid} isRunning={isRunning} onClose={() => setShowMigrate(false)} />}
      {showClone && <CloneVMDialog node={node!} vmid={vmid} onClose={() => setShowClone(false)} />}
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">
            {status?.name ?? `VM ${vmid}`}
          </h1>
          <p className="text-sm text-text-muted">
            VMID {vmid} · {node}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {status && <StatusBadge status={status.status} />}
          {isStopped && (
            <Button size="sm" onClick={() => start.mutate()} disabled={start.isPending}>
              <Play className="size-4" /> Start
            </Button>
          )}
          {isRunning && (
            <>
              <Button size="sm" variant="outline" onClick={() => shutdown.mutate()} disabled={shutdown.isPending}>
                <Power className="size-4" /> Shutdown
              </Button>
              <Button size="sm" variant="outline" onClick={() => reboot.mutate()} disabled={reboot.isPending}>
                <RotateCcw className="size-4" /> Reboot
              </Button>
              <Button size="sm" variant="destructive" onClick={() => stop.mutate()} disabled={stop.isPending}>
                <Square className="size-4" /> Stop
              </Button>
            </>
          )}
          <Button size="sm" variant="outline" onClick={() => setShowMigrate(true)}>
            Migrate
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowClone(true)}>
            Clone
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link to={`/nodes/${node}/vms/${vmid}/console`}>
              <Terminal className="size-4" /> Console
            </Link>
          </Button>
          {isStopped && (
            <Button
              size="sm"
              variant="destructive"
              disabled={deleteVM.isPending}
              onClick={() => {
                if (confirm(`Delete VM ${vmid} (${status?.name ?? ''})? This cannot be undone.`)) {
                  deleteVM.mutate({ vmid, purge: true }, { onSuccess: () => navigate(`/nodes/${node}/vms`) })
                }
              }}
            >
              <Trash2 className="size-4" /> Delete
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="perf"><Activity className="size-3.5" /> Performance</TabsTrigger>
          <TabsTrigger value="hardware"><HardDrive className="size-3.5" /> Hardware</TabsTrigger>
          <TabsTrigger value="options"><Settings className="size-3.5" /> Options</TabsTrigger>
          <TabsTrigger value="cloudinit"><Cloud className="size-3.5" /> Cloud-Init</TabsTrigger>
          <TabsTrigger value="snapshots"><Camera className="size-3.5" /> Snapshots</TabsTrigger>
          <TabsTrigger value="backups"><Archive className="size-3.5" /> Backups</TabsTrigger>
          <TabsTrigger value="firewall"><Shield className="size-3.5" /> Firewall</TabsTrigger>
        </TabsList>
        <TabsContent value="summary"><SummaryTab node={node!} vmid={vmid} /></TabsContent>
        <TabsContent value="perf"><ResourceCharts node={node!} vmid={vmid} type="qemu" /></TabsContent>
        <TabsContent value="hardware"><HardwareTab node={node!} vmid={vmid} /></TabsContent>
        <TabsContent value="options"><VMOptionsTab node={node!} vmid={vmid} /></TabsContent>
        <TabsContent value="cloudinit"><CloudInitTab node={node!} vmid={vmid} /></TabsContent>
        <TabsContent value="snapshots"><SnapshotsTab node={node!} vmid={vmid} /></TabsContent>
        <TabsContent value="backups"><VMBackupsTab node={node!} vmid={vmid} /></TabsContent>
        <TabsContent value="firewall"><VMFirewallTab node={node!} vmid={vmid} /></TabsContent>
      </Tabs>
    </div>
  )
}
