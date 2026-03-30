import { useState } from 'react'
import { useParams, Link } from 'react-router'
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
} from 'lucide-react'
import {
  useVMStatus,
  useVMConfig,
  useVMSnapshots,
  useVMStart,
  useVMStop,
  useVMShutdown,
  useVMReboot,
} from '@/lib/queries/vms'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { ResourceGauge } from '@/components/ui/ResourceGauge'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { formatBytes, formatPercent, formatUptime } from '@/lib/utils'
import { ResourceCharts } from '@/components/features/ResourceCharts'

// ── Summary tab ───────────────────────────────────────────────────────────────

function SummaryTab({ node, vmid }: { node: string; vmid: number }) {
  const { data: status } = useVMStatus(node, vmid)
  if (!status) return null

  return (
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

  return (
    <Card>
      <CardContent className="p-0">
        <div className="divide-y divide-border-muted">
          {!snapshots?.length ? (
            <p className="text-center text-text-muted text-sm py-10">No snapshots</p>
          ) : (
            snapshots.map((snap) => (
              <div key={snap.name} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-text-primary">{snap.name}</p>
                  {snap.description && (
                    <p className="text-xs text-text-muted">{snap.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {snap.snaptime && (
                    <span className="text-xs text-text-muted">
                      {new Date(snap.snaptime * 1000).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Options tab ──────────────────────────────────────────────────────────────

function VMOptionsTab({ node, vmid }: { node: string; vmid: number }) {
  const { data: config } = useVMConfig(node, vmid)
  if (!config) return null

  const rows: { key: string; label: string; fmt?: (v: unknown) => string }[] = [
    { key: 'onboot',      label: 'Start at boot',    fmt: (v) => v ? 'Yes' : 'No' },
    { key: 'protection',  label: 'Protection',        fmt: (v) => v ? 'Enabled' : 'Disabled' },
    { key: 'acpi',        label: 'ACPI',              fmt: (v) => v ? 'Enabled' : 'Disabled' },
    { key: 'kvm',         label: 'KVM',               fmt: (v) => v != null ? (v ? 'Enabled' : 'Disabled') : 'Default' },
    { key: 'tablet',      label: 'USB Tablet',        fmt: (v) => v ? 'Enabled' : 'Disabled' },
    { key: 'agent',       label: 'QEMU Agent',        fmt: (v) => String(v ?? '—') },
    { key: 'hotplug',     label: 'Hotplug',           fmt: (v) => String(v ?? '—') },
    { key: 'numa',        label: 'NUMA',              fmt: (v) => v ? 'Enabled' : 'Disabled' },
    { key: 'balloon',     label: 'Balloon',           fmt: (v) => String(v ?? '0') },
    { key: 'localtime',   label: 'Local time',        fmt: (v) => v ? 'Enabled' : 'Disabled' },
    { key: 'hookscript',  label: 'Hook script',       fmt: (v) => String(v ?? '—') },
    { key: 'startdate',   label: 'Start date',        fmt: (v) => String(v ?? '—') },
    { key: 'tags',        label: 'Tags',              fmt: (v) => String(v ?? '—') },
    { key: 'description', label: 'Description',       fmt: (v) => String(v ?? '—') },
  ]

  return (
    <Card>
      <CardHeader><CardTitle>VM Options</CardTitle></CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border-muted">
          {rows.map(({ key, label, fmt }) => {
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

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>User &amp; Credentials</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border-muted">
            {(['ciuser', 'nameserver', 'searchdomain'] as const).map((key) => {
              const val = config[key as keyof typeof config]
              if (val == null) return null
              const labelMap: Record<string, string> = {
                ciuser: 'Username', nameserver: 'DNS Server', searchdomain: 'Search Domain',
              }
              return (
                <div key={key} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="text-text-muted">{labelMap[key]}</span>
                  <span className="text-text-primary font-mono">{String(val)}</span>
                </div>
              )
            })}
            {config['cipassword' as keyof typeof config] != null && (
              <div className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="text-text-muted">Password</span>
                <span className="text-text-muted font-mono tracking-widest">••••••••</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {ipconfigs.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Network (IP Config)</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border-muted">
              {ipconfigs.map((key) => (
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

// ── Placeholder tab ───────────────────────────────────────────────────────────

function PlaceholderTab({ label }: { label: string }) {
  return (
    <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-border">
      <p className="text-text-muted text-sm">{label} coming soon</p>
    </div>
  )
}

// ── VM Detail Page ────────────────────────────────────────────────────────────

export function VMDetailPage() {
  const { node, vmid: vmidParam } = useParams<{ node: string; vmid: string }>()
  const vmid = Number(vmidParam)
  const [tab, setTab] = useState('summary')

  const { data: status, isLoading } = useVMStatus(node!, vmid)
  const start = useVMStart(node!, vmid)
  const stop = useVMStop(node!, vmid)
  const shutdown = useVMShutdown(node!, vmid)
  const reboot = useVMReboot(node!, vmid)

  if (isLoading) return <SkeletonCard />

  const isRunning = status?.status === 'running'
  const isStopped = status?.status === 'stopped'

  return (
    <div className="space-y-5">
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
          <Button size="sm" variant="outline" asChild>
            <Link to={`/nodes/${node}/vms/${vmid}/console`}>
              <Terminal className="size-4" /> Console
            </Link>
          </Button>
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
        <TabsContent value="backups"><PlaceholderTab label="Backup Jobs" /></TabsContent>
        <TabsContent value="firewall"><PlaceholderTab label="VM Firewall" /></TabsContent>
      </Tabs>
    </div>
  )
}
