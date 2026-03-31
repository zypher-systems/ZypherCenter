import { useState } from 'react'
import { Network, Layers, Plus, Trash2 } from 'lucide-react'
import {
  useSDNVNets,
  useSDNZones,
  useCreateSDNVNet,
  useDeleteSDNVNet,
  useCreateSDNZone,
  useDeleteSDNZone,
} from '@/lib/queries/cluster'
import { Card, CardContent } from '@/components/ui/Card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'

const ZONE_TYPES = ['simple', 'vlan', 'vxlan', 'evpn', 'qinq']

function CreateVNetDialog({
  zones,
  onClose,
}: {
  zones: Record<string, unknown>[]
  onClose: () => void
}) {
  const [vnet, setVnet] = useState('')
  const [zone, setZone] = useState((zones[0]?.['zone'] as string) ?? '')
  const [tag, setTag] = useState('')
  const [alias, setAlias] = useState('')
  const [vlanaware, setVlanaware] = useState(false)
  const create = useCreateSDNVNet()

  function submit() {
    if (!vnet.trim() || !zone) return
    create.mutate(
      { vnet: vnet.trim(), zone, tag: tag ? Number(tag) : undefined, alias: alias || undefined, vlanaware: vlanaware ? 1 : undefined },
      { onSuccess: () => onClose() },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-bg-card border border-border-subtle rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">Create VNet</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-text-secondary mb-1">VNet Name <span className="text-status-error">*</span></label>
            <input value={vnet} onChange={(e) => setVnet(e.target.value)} placeholder="e.g. myvnet"
              className="w-full rounded border border-border-subtle bg-bg-input px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent" />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Zone <span className="text-status-error">*</span></label>
            <select value={zone} onChange={(e) => setZone(e.target.value)}
              className="w-full rounded border border-border-subtle bg-bg-input px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent">
              {zones.map((z) => (
                <option key={z['zone'] as string} value={z['zone'] as string}>{z['zone'] as string}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Tag (VLAN)</label>
            <input type="number" value={tag} onChange={(e) => setTag(e.target.value)} placeholder="optional"
              className="w-full rounded border border-border-subtle bg-bg-input px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent" />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Alias</label>
            <input value={alias} onChange={(e) => setAlias(e.target.value)} placeholder="optional"
              className="w-full rounded border border-border-subtle bg-bg-input px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent" />
          </div>
          <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
            <input type="checkbox" checked={vlanaware} onChange={(e) => setVlanaware(e.target.checked)} className="accent-accent" />
            VLAN Aware
          </label>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={submit} disabled={!vnet.trim() || !zone || create.isPending}>
            {create.isPending ? 'Creating…' : 'Create'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function CreateZoneDialog({ onClose }: { onClose: () => void }) {
  const [zone, setZone] = useState('')
  const [type, setType] = useState('simple')
  const [bridge, setBridge] = useState('')
  const [nodes, setNodes] = useState('')
  const [dns, setDns] = useState('')
  const create = useCreateSDNZone()

  function submit() {
    if (!zone.trim()) return
    create.mutate(
      { zone: zone.trim(), type, bridge: bridge || undefined, nodes: nodes || undefined, dns: dns || undefined },
      { onSuccess: () => onClose() },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-bg-card border border-border-subtle rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">Create Zone</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-text-secondary mb-1">Zone ID <span className="text-status-error">*</span></label>
            <input value={zone} onChange={(e) => setZone(e.target.value)} placeholder="e.g. myzone"
              className="w-full rounded border border-border-subtle bg-bg-input px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent" />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Type <span className="text-status-error">*</span></label>
            <select value={type} onChange={(e) => setType(e.target.value)}
              className="w-full rounded border border-border-subtle bg-bg-input px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent">
              {ZONE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Bridge</label>
            <input value={bridge} onChange={(e) => setBridge(e.target.value)} placeholder="e.g. vmbr0"
              className="w-full rounded border border-border-subtle bg-bg-input px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent" />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Nodes (comma-separated)</label>
            <input value={nodes} onChange={(e) => setNodes(e.target.value)} placeholder="e.g. pve1,pve2"
              className="w-full rounded border border-border-subtle bg-bg-input px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent" />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">DNS Server</label>
            <input value={dns} onChange={(e) => setDns(e.target.value)} placeholder="optional"
              className="w-full rounded border border-border-subtle bg-bg-input px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent" />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={submit} disabled={!zone.trim() || create.isPending}>
            {create.isPending ? 'Creating…' : 'Create'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function VNetsTab() {
  const { data: zones } = useSDNZones()
  const { data: vnets, isLoading } = useSDNVNets()
  const deleteVNet = useDeleteSDNVNet()
  const [showCreate, setShowCreate] = useState(false)

  if (isLoading) return <SkeletonCard />
  return (
    <>
      {showCreate && (
        <CreateVNetDialog zones={zones ?? []} onClose={() => setShowCreate(false)} />
      )}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-text-secondary">{vnets?.length ?? 0} VNet(s)</span>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="size-3.5 mr-1" />Create VNet
        </Button>
      </div>
      <Card>
        <CardContent className="p-0">
          {!vnets?.length ? (
            <p className="text-center text-text-muted text-sm py-10">No VNets configured</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>VNet</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Tag</TableHead>
                  <TableHead>Alias</TableHead>
                  <TableHead>VLAN aware</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {vnets.map((v) => (
                  <TableRow key={v['vnet'] as string}>
                    <TableCell className="font-mono font-medium text-text-primary">{v['vnet'] as string}</TableCell>
                    <TableCell className="text-text-secondary">{(v['zone'] as string) ?? '—'}</TableCell>
                    <TableCell className="font-mono text-text-muted">{v['tag'] != null ? String(v['tag']) : '—'}</TableCell>
                    <TableCell className="text-text-muted">{(v['alias'] as string) ?? '—'}</TableCell>
                    <TableCell>
                      <span className={`text-xs ${v['vlanaware'] ? 'text-status-running' : 'text-text-disabled'}`}>
                        {v['vlanaware'] ? 'Yes' : 'No'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <button
                        onClick={() => {
                          if (confirm(`Delete VNet "${v['vnet'] as string}"?`)) {
                            deleteVNet.mutate(v['vnet'] as string)
                          }
                        }}
                        disabled={deleteVNet.isPending}
                        className="inline-flex items-center gap-1 rounded border border-status-error/40 px-2 py-0.5 text-xs text-status-error hover:bg-status-error/10 disabled:opacity-50"
                      >
                        <Trash2 className="size-3" />Delete
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  )
}

function ZonesTab() {
  const { data: zones, isLoading } = useSDNZones()
  const deleteZone = useDeleteSDNZone()
  const [showCreate, setShowCreate] = useState(false)

  if (isLoading) return <SkeletonCard />
  return (
    <>
      {showCreate && <CreateZoneDialog onClose={() => setShowCreate(false)} />}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-text-secondary">{zones?.length ?? 0} Zone(s)</span>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="size-3.5 mr-1" />Create Zone
        </Button>
      </div>
      <Card>
        <CardContent className="p-0">
          {!zones?.length ? (
            <p className="text-center text-text-muted text-sm py-10">No SDN zones configured</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Zone</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Bridge</TableHead>
                  <TableHead>Nodes</TableHead>
                  <TableHead>DNS</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {zones.map((z) => (
                  <TableRow key={z['zone'] as string}>
                    <TableCell className="font-mono font-medium text-text-primary">{z['zone'] as string}</TableCell>
                    <TableCell>
                      <span className="text-xs uppercase tracking-wide text-text-muted bg-bg-elevated px-2 py-0.5 rounded">
                        {(z['type'] as string) ?? '—'}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-text-secondary">{(z['bridge'] as string) ?? '—'}</TableCell>
                    <TableCell className="text-text-muted text-sm">{(z['nodes'] as string) ?? 'All'}</TableCell>
                    <TableCell className="font-mono text-xs text-text-muted">{(z['dns'] as string) ?? '—'}</TableCell>
                    <TableCell className="text-right">
                      <button
                        onClick={() => {
                          if (confirm(`Delete Zone "${z['zone'] as string}"?`)) {
                            deleteZone.mutate(z['zone'] as string)
                          }
                        }}
                        disabled={deleteZone.isPending}
                        className="inline-flex items-center gap-1 rounded border border-status-error/40 px-2 py-0.5 text-xs text-status-error hover:bg-status-error/10 disabled:opacity-50"
                      >
                        <Trash2 className="size-3" />Delete
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  )
}

export function SDNPage() {
  const [tab, setTab] = useState('vnets')
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">SDN</h1>
        <p className="text-sm text-text-muted mt-0.5">Software-Defined Networking — VNets and Zones</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="vnets"><Network className="size-3.5 mr-1.5" />VNets</TabsTrigger>
          <TabsTrigger value="zones"><Layers className="size-3.5 mr-1.5" />Zones</TabsTrigger>
        </TabsList>
        <TabsContent value="vnets"><VNetsTab /></TabsContent>
        <TabsContent value="zones"><ZonesTab /></TabsContent>
      </Tabs>
    </div>
  )
}
