import { useState } from 'react'
import { useParams } from 'react-router'
import { Network, Activity, Plus, Trash2, Pencil, Undo2 } from 'lucide-react'
import { useNodeNetwork, useNodeApplyNetwork, useCreateNodeNetworkInterface, useDeleteNodeNetworkInterface, useUpdateNodeNetworkInterface, useRevertNetworkConfig } from '@/lib/queries/nodes'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
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
import { formatBytes } from '@/lib/utils'

const IFACE_TYPES = ['bridge', 'bond', 'vlan', 'OVSBridge', 'OVSBond', 'OVSPort', 'OVSIntPort'] as const
const BOND_MODES = ['balance-rr', 'active-backup', 'balance-xor', 'broadcast', '802.3ad', 'balance-tlb', 'balance-alb']

function ifaceType(iface: { type?: string }): string {
  return iface.type ?? 'unknown'
}

function CreateInterfaceDialog({ node, existingIfaces, onClose }: { node: string; existingIfaces: string[]; onClose: () => void }) {
  const createIface = useCreateNodeNetworkInterface(node)
  const [type, setType] = useState<typeof IFACE_TYPES[number]>('bridge')
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [netmask, setNetmask] = useState('')
  const [gateway, setGateway] = useState('')
  const [bridgePorts, setBridgePorts] = useState('')
  const [bondSlaves, setBondSlaves] = useState('')
  const [bondMode, setBondMode] = useState('active-backup')
  const [vlanId, setVlanId] = useState('')
  const [vlanRaw, setVlanRaw] = useState('')
  const [comment, setComment] = useState('')
  const [autostart, setAutostart] = useState(true)

  const inp = 'w-full rounded border border-border-subtle bg-bg-input px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent [color-scheme:dark]'

  function submit() {
    if (!name.trim()) return
    const params: Record<string, unknown> = {
      iface: name.trim(),
      type,
      autostart: autostart ? 1 : 0,
    }
    if (address) params.address = address
    if (netmask) params.netmask = netmask
    if (gateway) params.gateway = gateway
    if (comment) params.comments = comment
    if (type === 'bridge' && bridgePorts) params.bridge_ports = bridgePorts
    if (type === 'bond') { params.slaves = bondSlaves; params.bond_mode = bondMode }
    if (type === 'vlan') { params.vlan_raw_device = vlanRaw; params.vlan_id = Number(vlanId) }
    createIface.mutate(params, { onSuccess: () => onClose() })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-bg-card border border-border-subtle rounded-xl shadow-2xl w-full max-w-md p-6 space-y-3 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-text-primary">Create Network Interface</h2>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-text-secondary mb-1">Type *</label>
            <select value={type} onChange={(e) => setType(e.target.value as typeof IFACE_TYPES[number])} className={inp}>
              {IFACE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={type === 'bridge' ? 'vmbr0' : type === 'bond' ? 'bond0' : 'ens3.100'} className={inp} />
          </div>
        </div>

        {type === 'bridge' && (
          <div>
            <label className="block text-xs text-text-secondary mb-1">Bridge Ports</label>
            <input value={bridgePorts} onChange={(e) => setBridgePorts(e.target.value)} placeholder="ens3 ens4" className={inp} />
          </div>
        )}

        {type === 'bond' && (
          <>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Slaves (interfaces)</label>
              <input value={bondSlaves} onChange={(e) => setBondSlaves(e.target.value)} placeholder="ens3 ens4" className={inp} />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Bond Mode</label>
              <select value={bondMode} onChange={(e) => setBondMode(e.target.value)} className={inp}>
                {BOND_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </>
        )}

        {type === 'vlan' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-secondary mb-1">Raw Device</label>
              <select value={vlanRaw} onChange={(e) => setVlanRaw(e.target.value)} className={inp}>
                <option value="">Select…</option>
                {existingIfaces.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">VLAN ID</label>
              <input type="number" min="1" max="4094" value={vlanId} onChange={(e) => setVlanId(e.target.value)} placeholder="100" className={inp} />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-text-secondary mb-1">IPv4 Address</label>
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="192.168.1.100" className={inp} />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">Netmask</label>
            <input value={netmask} onChange={(e) => setNetmask(e.target.value)} placeholder="255.255.255.0" className={inp} />
          </div>
        </div>

        <div>
          <label className="block text-xs text-text-secondary mb-1">Gateway</label>
          <input value={gateway} onChange={(e) => setGateway(e.target.value)} placeholder="192.168.1.1" className={inp} />
        </div>

        <div>
          <label className="block text-xs text-text-secondary mb-1">Comment</label>
          <input value={comment} onChange={(e) => setComment(e.target.value)} className={inp} />
        </div>

        <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer select-none">
          <input type="checkbox" checked={autostart} onChange={(e) => setAutostart(e.target.checked)} />
          Autostart
        </label>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={submit} disabled={createIface.isPending || !name}>
            <Plus className="size-3.5 mr-1" />{createIface.isPending ? 'Creating…' : 'Create'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export function NodeNetworkPage() {
  const { node } = useParams<{ node: string }>()
  const { data: ifaces, isLoading } = useNodeNetwork(node!)
  const applyNetwork = useNodeApplyNetwork(node!)
  const revertNetwork = useRevertNetworkConfig(node!)
  const deleteIface = useDeleteNodeNetworkInterface(node!)
  const updateIface = useUpdateNodeNetworkInterface(node!)
  const [showCreate, setShowCreate] = useState(false)
  const [editingIface, setEditingIface] = useState<string | null>(null)
  const [editAddress, setEditAddress] = useState('')
  const [editNetmask, setEditNetmask] = useState('')
  const [editGateway, setEditGateway] = useState('')
  const [editAddress6, setEditAddress6] = useState('')
  const [editNetmask6, setEditNetmask6] = useState('')
  const [editGateway6, setEditGateway6] = useState('')
  const [editBridgePorts, setEditBridgePorts] = useState('')
  const [editBondSlaves, setEditBondSlaves] = useState('')
  const [editBondMode, setEditBondMode] = useState('active-backup')
  const [editComment, setEditComment] = useState('')

  const existingIfaceNames = (ifaces ?? []).map((i) => i.iface).filter(Boolean)

  function startEdit(iface: typeof ifaces extends Array<infer T> | undefined ? T : never) {
    const r = iface as Record<string, unknown>
    setEditingIface(iface.iface)
    setEditAddress((r['address'] as string) ?? '')
    setEditNetmask((r['netmask'] as string) ?? '')
    setEditGateway((r['gateway'] as string) ?? '')
    setEditAddress6((r['address6'] as string) ?? '')
    setEditNetmask6((r['netmask6'] as string) ?? '')
    setEditGateway6((r['gateway6'] as string) ?? '')
    setEditBridgePorts((r['bridge_ports'] as string) ?? '')
    setEditBondSlaves((r['slaves'] as string) ?? '')
    setEditBondMode((r['bond_mode'] as string) ?? 'active-backup')
    setEditComment((r['comments'] as string) ?? '')
  }

  function saveEdit() {
    if (!editingIface) return
    const params: Record<string, unknown> = { type: ifaces?.find((i) => i.iface === editingIface)?.type ?? 'bridge' }
    if (editAddress) params['address'] = editAddress
    if (editNetmask) params['netmask'] = editNetmask
    if (editGateway) params['gateway'] = editGateway
    if (editAddress6) params['address6'] = editAddress6
    if (editNetmask6) params['netmask6'] = editNetmask6
    if (editGateway6) params['gateway6'] = editGateway6
    if (editBridgePorts) params['bridge_ports'] = editBridgePorts
    if (editBondSlaves) params['slaves'] = editBondSlaves
    if (editBondMode) params['bond_mode'] = editBondMode
    if (editComment) params['comments'] = editComment
    updateIface.mutate({ iface: editingIface, params }, { onSuccess: () => setEditingIface(null) })
  }

  return (
    <div className="space-y-4">
      {showCreate && (
        <CreateInterfaceDialog node={node!} existingIfaces={existingIfaceNames} onClose={() => setShowCreate(false)} />
      )}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Network</h1>
          <p className="text-sm text-text-muted mt-0.5">Network interfaces on {node}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="size-3.5 mr-1" />Create
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (confirm('Revert all pending network changes? Unapplied edits will be discarded.')) {
                revertNetwork.mutate()
              }
            }}
            disabled={revertNetwork.isPending}
          >
            <Undo2 className="size-3.5 mr-1" />
            {revertNetwork.isPending ? 'Reverting…' : 'Revert'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => applyNetwork.mutate()}
            disabled={applyNetwork.isPending}
          >
            {applyNetwork.isPending ? 'Applying…' : 'Apply Configuration'}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <SkeletonCard />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>IPv4</TableHead>
                  <TableHead>IPv6</TableHead>
                  <TableHead>MAC</TableHead>
                  <TableHead>Speed</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {ifaces?.map((iface) => {
                  const isPhysical = ['eth', 'ens', 'enp', 'em', 'eno', 'wlan'].some((p) => iface.iface.startsWith(p))
                  const r = iface as Record<string, unknown>
                  const isEditing = editingIface === iface.iface
                  return (
                    <>
                      <TableRow key={iface.iface}>
                        <TableCell className="font-medium font-mono text-text-primary">
                          <div className="flex items-center gap-2">
                            <Network className="size-3.5 text-text-muted shrink-0" />
                            {iface.iface}
                          </div>
                        </TableCell>
                        <TableCell className="text-text-secondary text-xs uppercase tracking-wide">
                          {ifaceType(iface)}
                        </TableCell>
                        <TableCell className="font-mono text-sm text-text-secondary">
                          {iface.address ? `${iface.address}${iface.netmask ? '/' + iface.netmask : ''}` : '—'}
                        </TableCell>
                        <TableCell className="font-mono text-sm text-text-secondary">
                          {iface.address6 ? `${iface.address6}${iface.netmask6 ? '/' + iface.netmask6 : ''}` : '—'}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-text-muted">
                          {r['hwaddr'] as string ?? '—'}
                        </TableCell>
                        <TableCell className="text-text-secondary">
                          {r['speed'] != null ? `${r['speed']} Mbit/s` : '—'}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex size-2 rounded-full ${iface.active ? 'bg-status-running' : 'bg-status-stopped'}`} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => isEditing ? setEditingIface(null) : startEdit(iface)}
                              className="inline-flex items-center gap-1 rounded border border-border-subtle px-2 py-0.5 text-xs text-text-muted hover:text-accent hover:border-accent/40 disabled:opacity-50"
                            >
                              <Pencil className="size-3" />
                            </button>
                            {!isPhysical && (
                              <button
                                onClick={() => { if (confirm(`Remove interface "${iface.iface}"? Changes take effect after Apply.`)) deleteIface.mutate(iface.iface) }}
                                disabled={deleteIface.isPending}
                                className="inline-flex items-center gap-1 rounded border border-status-error/40 px-2 py-0.5 text-xs text-status-error hover:bg-status-error/10 disabled:opacity-50"
                              >
                                <Trash2 className="size-3" />
                              </button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      {isEditing && (
                        <TableRow key={`${iface.iface}-edit`}>
                          <TableCell colSpan={8} className="bg-bg-hover/50 px-4 py-3">
                            <div className="flex flex-wrap items-end gap-3">
                              <div>
                                <label className="block text-xs text-text-muted mb-0.5">IPv4 Address</label>
                                <input value={editAddress} onChange={(e) => setEditAddress(e.target.value)}
                                  placeholder="192.168.1.1"
                                  className="w-36 rounded border border-border-subtle bg-bg-input px-2 py-1 text-xs text-text-primary outline-none focus:border-accent" />
                              </div>
                              <div>
                                <label className="block text-xs text-text-muted mb-0.5">Netmask</label>
                                <input value={editNetmask} onChange={(e) => setEditNetmask(e.target.value)}
                                  placeholder="255.255.255.0"
                                  className="w-36 rounded border border-border-subtle bg-bg-input px-2 py-1 text-xs text-text-primary outline-none focus:border-accent" />
                              </div>
                              <div>
                                <label className="block text-xs text-text-muted mb-0.5">Gateway</label>
                                <input value={editGateway} onChange={(e) => setEditGateway(e.target.value)}
                                  placeholder="192.168.1.1"
                                  className="w-36 rounded border border-border-subtle bg-bg-input px-2 py-1 text-xs text-text-primary outline-none focus:border-accent" />
                              </div>
                              {(iface.type === 'bridge' || r['bridge_ports'] != null) && (
                                <div>
                                  <label className="block text-xs text-text-muted mb-0.5">Bridge Ports</label>
                                  <input value={editBridgePorts} onChange={(e) => setEditBridgePorts(e.target.value)}
                                    placeholder="ens3"
                                    className="w-28 rounded border border-border-subtle bg-bg-input px-2 py-1 text-xs text-text-primary outline-none focus:border-accent" />
                                </div>
                              )}
                              {(iface.type === 'bond' || r['slaves'] != null) && (
                                <>
                                  <div>
                                    <label className="block text-xs text-text-muted mb-0.5">Slaves</label>
                                    <input value={editBondSlaves} onChange={(e) => setEditBondSlaves(e.target.value)}
                                      placeholder="ens3 ens4"
                                      className="w-28 rounded border border-border-subtle bg-bg-input px-2 py-1 text-xs text-text-primary outline-none focus:border-accent" />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-text-muted mb-0.5">Bond Mode</label>
                                    <select value={editBondMode} onChange={(e) => setEditBondMode(e.target.value)}
                                      className="rounded border border-border-subtle bg-bg-input px-2 py-1 text-xs text-text-primary outline-none focus:border-accent [color-scheme:dark]">
                                      {BOND_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                  </div>
                                </>
                              )}
                              <div>
                                <label className="block text-xs text-text-muted mb-0.5">IPv6 Address</label>
                                <input value={editAddress6} onChange={(e) => setEditAddress6(e.target.value)}
                                  placeholder="2001:db8::1"
                                  className="w-44 rounded border border-border-subtle bg-bg-input px-2 py-1 text-xs text-text-primary outline-none focus:border-accent" />
                              </div>
                              <div>
                                <label className="block text-xs text-text-muted mb-0.5">IPv6 Prefix Len</label>
                                <input value={editNetmask6} onChange={(e) => setEditNetmask6(e.target.value)}
                                  placeholder="64"
                                  className="w-20 rounded border border-border-subtle bg-bg-input px-2 py-1 text-xs text-text-primary outline-none focus:border-accent" />
                              </div>
                              <div>
                                <label className="block text-xs text-text-muted mb-0.5">IPv6 Gateway</label>
                                <input value={editGateway6} onChange={(e) => setEditGateway6(e.target.value)}
                                  placeholder="fe80::1"
                                  className="w-36 rounded border border-border-subtle bg-bg-input px-2 py-1 text-xs text-text-primary outline-none focus:border-accent" />
                              </div>
                              <div>
                                <label className="block text-xs text-text-muted mb-0.5">Comment</label>
                                <input value={editComment} onChange={(e) => setEditComment(e.target.value)}
                                  placeholder="Optional"
                                  className="w-40 rounded border border-border-subtle bg-bg-input px-2 py-1 text-xs text-text-primary outline-none focus:border-accent" />
                              </div>
                              <div className="flex items-center gap-2">
                                <Button size="sm" disabled={updateIface.isPending} onClick={saveEdit}>
                                  {updateIface.isPending ? '…' : 'Apply'}
                                </Button>
                                <button onClick={() => setEditingIface(null)} className="text-text-muted hover:text-text-primary text-xs">Cancel</button>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Traffic Stats */}
      {ifaces && ifaces.some((i) => i.iface === 'eth0' || i.iface === 'ens3') && (
        <Card>
          <CardHeader>
            <CardTitle>
              <Activity className="size-4 inline-block mr-2 text-text-muted" />
              Traffic
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {ifaces
                .filter((i) => (i as Record<string, unknown>)['receive'] != null || (i as Record<string, unknown>)['transmit'] != null)
                .slice(0, 4)
                .map((i) => (
                  <div key={i.iface} className="text-center">
                    <p className="text-xs text-text-muted">{i.iface}</p>
                    <p className="text-sm font-medium text-status-running">
                      ↓ {formatBytes(((i as Record<string, unknown>)['receive'] as number) ?? 0)}
                    </p>
                    <p className="text-sm font-medium text-accent">
                      ↑ {formatBytes(((i as Record<string, unknown>)['transmit'] as number) ?? 0)}
                    </p>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
