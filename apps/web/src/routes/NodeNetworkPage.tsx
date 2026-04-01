import { useState } from 'react'
import { useParams } from 'react-router'
import { Network, Activity, Plus, Trash2 } from 'lucide-react'
import { useNodeNetwork, useNodeApplyNetwork, useCreateNodeNetworkInterface, useDeleteNodeNetworkInterface } from '@/lib/queries/nodes'
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
  const deleteIface = useDeleteNodeNetworkInterface(node!)
  const [showCreate, setShowCreate] = useState(false)

  const existingIfaceNames = (ifaces ?? []).map((i) => i.iface).filter(Boolean)

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
                  return (
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
                        {(iface as Record<string, unknown>)['hwaddr'] as string ?? '—'}
                      </TableCell>
                      <TableCell className="text-text-secondary">
                        {(iface as Record<string, unknown>)['speed'] != null
                          ? `${(iface as Record<string, unknown>)['speed']} Mbit/s`
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex size-2 rounded-full ${iface.active ? 'bg-status-running' : 'bg-status-stopped'}`} />
                      </TableCell>
                      <TableCell className="text-right">
                        {!isPhysical && (
                          <button
                            onClick={() => { if (confirm(`Remove interface "${iface.iface}"? Changes take effect after Apply.`)) deleteIface.mutate(iface.iface) }}
                            disabled={deleteIface.isPending}
                            className="inline-flex items-center gap-1 rounded border border-status-error/40 px-2 py-0.5 text-xs text-status-error hover:bg-status-error/10 disabled:opacity-50"
                          >
                            <Trash2 className="size-3" />
                          </button>
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
