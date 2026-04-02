import { useState } from 'react'
import { Network, Layers, Plus, Trash2, CheckCircle, Pencil, Globe } from 'lucide-react'
import {
  useSDNVNets,
  useSDNZones,
  useCreateSDNVNet,
  useDeleteSDNVNet,
  useCreateSDNZone,
  useDeleteSDNZone,
  useApplySDN,
  useUpdateSDNVNet,
  useUpdateSDNZone,
  useSDNSubnets,
  useCreateSDNSubnet,
  useDeleteSDNSubnet,
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
              className="w-full rounded border border-border-subtle bg-bg-input px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent [color-scheme:dark]">
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
              className="w-full rounded border border-border-subtle bg-bg-input px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent [color-scheme:dark]">
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

function EditVNetDialog({ vnet, zones, onClose }: { vnet: Record<string, unknown>; zones: Record<string, unknown>[]; onClose: () => void }) {
  const update = useUpdateSDNVNet()
  const [zone, setZone] = useState(String(vnet['zone'] ?? ''))
  const [tag, setTag] = useState(vnet['tag'] != null ? String(vnet['tag']) : '')
  const [alias, setAlias] = useState(String(vnet['alias'] ?? ''))
  const [vlanaware, setVlanaware] = useState(Boolean(vnet['vlanaware']))

  function submit() {
    const params: Record<string, unknown> = { zone, vlanaware: vlanaware ? 1 : undefined }
    if (tag) params.tag = Number(tag)
    if (alias.trim()) params.alias = alias.trim()
    update.mutate({ vnet: vnet['vnet'] as string, params }, { onSuccess: () => onClose() })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-bg-card border border-border-subtle rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-text-primary">Edit VNet — {vnet['vnet'] as string}</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-text-secondary mb-1">Zone <span className="text-status-error">*</span></label>
            <select value={zone} onChange={(e) => setZone(e.target.value)}
              className="w-full rounded border border-border-subtle bg-bg-input px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent [color-scheme:dark]">
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
          <Button size="sm" onClick={submit} disabled={!zone || update.isPending}>
            {update.isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function EditZoneDialog({ zone, onClose }: { zone: Record<string, unknown>; onClose: () => void }) {
  const update = useUpdateSDNZone()
  const [bridge, setBridge] = useState(String(zone['bridge'] ?? ''))
  const [nodes, setNodes] = useState(String(zone['nodes'] ?? ''))
  const [dns, setDns] = useState(String(zone['dns'] ?? ''))

  function submit() {
    const params: Record<string, unknown> = {}
    if (bridge.trim()) params.bridge = bridge.trim()
    if (nodes.trim()) params.nodes = nodes.trim()
    if (dns.trim()) params.dns = dns.trim()
    update.mutate({ zone: zone['zone'] as string, params }, { onSuccess: () => onClose() })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-bg-card border border-border-subtle rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-text-primary">Edit Zone — {zone['zone'] as string}</h2>
        <p className="text-xs text-text-muted">Type: <span className="font-mono">{zone['type'] as string}</span></p>
        <div className="space-y-3">
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
          <Button size="sm" onClick={submit} disabled={update.isPending}>
            {update.isPending ? 'Saving…' : 'Save'}
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
  const [editingVNet, setEditingVNet] = useState<Record<string, unknown> | null>(null)

  if (isLoading) return <SkeletonCard />
  return (
    <>
      {showCreate && (
        <CreateVNetDialog zones={zones ?? []} onClose={() => setShowCreate(false)} />
      )}
      {editingVNet && (
        <EditVNetDialog key={editingVNet['vnet'] as string} vnet={editingVNet} zones={zones ?? []} onClose={() => setEditingVNet(null)} />
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
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditingVNet(v)}
                          className="inline-flex items-center gap-1 rounded border border-border px-2 py-0.5 text-xs text-text-muted hover:bg-bg-elevated"
                        >
                          <Pencil className="size-3" />Edit
                        </button>
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
                      </div>
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
  const [editingZone, setEditingZone] = useState<Record<string, unknown> | null>(null)

  if (isLoading) return <SkeletonCard />
  return (
    <>
      {showCreate && <CreateZoneDialog onClose={() => setShowCreate(false)} />}
      {editingZone && <EditZoneDialog key={editingZone['zone'] as string} zone={editingZone} onClose={() => setEditingZone(null)} />}
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
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditingZone(z)}
                          className="inline-flex items-center gap-1 rounded border border-border px-2 py-0.5 text-xs text-text-muted hover:bg-bg-elevated"
                        >
                          <Pencil className="size-3" />Edit
                        </button>
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
                      </div>
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

function SubnetsTab() {
  const { data: vnets = [] } = useSDNVNets()
  const [selectedVNet, setSelectedVNet] = useState('')
  const activeVNet = selectedVNet || ((vnets[0]?.['vnet'] as string) ?? '')
  const { data: subnets = [], isLoading } = useSDNSubnets(activeVNet)
  const createSubnet = useCreateSDNSubnet(activeVNet)
  const deleteSubnet = useDeleteSDNSubnet(activeVNet)
  const [showCreate, setShowCreate] = useState(false)
  const [newCidr, setNewCidr] = useState('')
  const [newGateway, setNewGateway] = useState('')
  const [newSnat, setNewSnat] = useState(false)

  const inp = 'rounded border border-border-subtle bg-bg-input px-2 py-1.5 text-sm text-text-primary outline-none focus:border-accent'

  function submit() {
    if (!newCidr.trim() || !activeVNet) return
    createSubnet.mutate(
      { subnet: newCidr.trim(), type: 'subnet', gateway: newGateway.trim() || undefined, snat: newSnat ? 1 : undefined },
      {
        onSuccess: () => {
          setShowCreate(false)
          setNewCidr('')
          setNewGateway('')
          setNewSnat(false)
        },
      },
    )
  }

  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <span className="text-sm text-text-muted">VNet:</span>
        <select
          value={activeVNet}
          onChange={(e) => setSelectedVNet(e.target.value)}
          className={`${inp} [color-scheme:dark]`}
        >
          {(vnets as Record<string, unknown>[]).map((v) => (
            <option key={v['vnet'] as string} value={v['vnet'] as string}>{v['vnet'] as string}</option>
          ))}
        </select>
        <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
          <Plus className="size-3.5 mr-1" />Add Subnet
        </Button>
      </div>

      {showCreate && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-medium text-text-primary">New Subnet in {activeVNet}</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-text-muted mb-1">CIDR <span className="text-status-error">*</span></label>
                <input value={newCidr} onChange={(e) => setNewCidr(e.target.value)} placeholder="e.g. 10.0.0.0/24" className={`w-full ${inp}`} />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">Gateway</label>
                <input value={newGateway} onChange={(e) => setNewGateway(e.target.value)} placeholder="e.g. 10.0.0.1" className={`w-full ${inp}`} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
              <input type="checkbox" checked={newSnat} onChange={(e) => setNewSnat(e.target.checked)} className="accent-accent" />
              SNAT (masquerade outbound traffic)
            </label>
            <div className="flex items-center gap-2 pt-1">
              <Button size="sm" onClick={submit} disabled={!newCidr.trim() || createSubnet.isPending}>
                {createSubnet.isPending ? 'Creating\u2026' : 'Create'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subnet (CIDR)</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Gateway</TableHead>
                <TableHead>SNAT</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center text-text-muted py-8 text-sm">Loading\u2026</TableCell></TableRow>
              ) : (subnets as Record<string, unknown>[]).length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-text-muted py-8 text-sm">No subnets. Select a VNet or add one.</TableCell></TableRow>
              ) : (
                (subnets as Record<string, unknown>[]).map((s) => (
                  <TableRow key={s['subnet'] as string}>
                    <TableCell className="font-mono text-sm text-text-primary">{s['subnet'] as string}</TableCell>
                    <TableCell className="text-text-secondary text-xs uppercase">{s['type'] as string ?? '\u2014'}</TableCell>
                    <TableCell className="font-mono text-sm text-text-secondary">{s['gateway'] as string ?? '\u2014'}</TableCell>
                    <TableCell className="text-text-secondary text-sm">{s['snat'] ? 'Yes' : 'No'}</TableCell>
                    <TableCell className="text-right">
                      <button
                        onClick={() => {
                          if (confirm(`Delete subnet ${s['subnet'] as string}?`)) {
                            deleteSubnet.mutate(s['subnet'] as string)
                          }
                        }}
                        disabled={deleteSubnet.isPending}
                        className="inline-flex items-center gap-1 rounded border border-status-error/40 px-2 py-0.5 text-xs text-status-error hover:bg-status-error/10 disabled:opacity-50"
                      >
                        <Trash2 className="size-3" /> Delete
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  )
}

export function SDNPage() {
  const [tab, setTab] = useState('vnets')
  const applySDN = useApplySDN()
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">SDN</h1>
          <p className="text-sm text-text-muted mt-0.5">Software-Defined Networking — VNets and Zones</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={applySDN.isPending}
          onClick={() => applySDN.mutate()}
        >
          <CheckCircle className="size-4 mr-1.5" />
          {applySDN.isPending ? 'Applying…' : 'Apply'}
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="vnets"><Network className="size-3.5 mr-1.5" />VNets</TabsTrigger>
          <TabsTrigger value="zones"><Layers className="size-3.5 mr-1.5" />Zones</TabsTrigger>
          <TabsTrigger value="subnets"><Globe className="size-3.5 mr-1.5" />Subnets</TabsTrigger>
        </TabsList>
        <TabsContent value="vnets"><VNetsTab /></TabsContent>
        <TabsContent value="zones"><ZonesTab /></TabsContent>
        <TabsContent value="subnets"><SubnetsTab /></TabsContent>
      </Tabs>
    </div>
  )
}
