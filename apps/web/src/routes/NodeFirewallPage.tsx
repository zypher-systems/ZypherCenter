import { useState } from 'react'
import { useParams } from 'react-router'
import { Shield, Plus, Trash2, ToggleLeft, ToggleRight, Pencil } from 'lucide-react'
import {
  useNodeFirewallRules,
  useNodeFirewallOptions,
  useUpdateNodeFirewallOptions,
  useCreateNodeFirewallRule,
  useDeleteNodeFirewallRule,
  useUpdateNodeFirewallRule,
} from '@/lib/queries/nodes'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table'

// ── Helpers ───────────────────────────────────────────────────────────────────

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

const fieldCls = 'w-full rounded border border-border-subtle bg-bg-input px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent [color-scheme:dark]'

// ── Page ──────────────────────────────────────────────────────────────────────

export function NodeFirewallPage() {
  const { node } = useParams<{ node: string }>()
  const { data: rules }   = useNodeFirewallRules(node!)
  const { data: options } = useNodeFirewallOptions(node!)
  const updateOptions = useUpdateNodeFirewallOptions(node!)
  const createRule    = useCreateNodeFirewallRule(node!)
  const deleteRule    = useDeleteNodeFirewallRule(node!)
  const updateRule    = useUpdateNodeFirewallRule(node!)

  const [showAdd, setShowAdd] = useState(false)
  const [dir,     setDir]     = useState('in')
  const [action,  setAction]  = useState('ACCEPT')
  const [macro,   setMacro]   = useState('')
  const [proto,   setProto]   = useState('')
  const [src,     setSrc]     = useState('')
  const [dest,    setDest]    = useState('')
  const [dport,   setDport]   = useState('')
  const [ruleComment, setRuleComment] = useState('')

  // Edit rule state
  const [editingPos,    setEditingPos]    = useState<number | null>(null)
  const [editDir,       setEditDir]       = useState('in')
  const [editAction,    setEditAction]    = useState('ACCEPT')
  const [editMacro,     setEditMacro]     = useState('')
  const [editProto,     setEditProto]     = useState('')
  const [editSrc,       setEditSrc]       = useState('')
  const [editDest,      setEditDest]      = useState('')
  const [editDport,     setEditDport]     = useState('')
  const [editComment,   setEditComment]   = useState('')

  function startEdit(rule: import('@zyphercenter/proxmox-types').FirewallRule) {
    setEditingPos(rule.pos)
    setEditDir(rule.type)
    setEditAction(rule.action)
    setEditMacro(rule.macro ?? '')
    setEditProto(rule.proto ?? '')
    setEditSrc(rule.source ?? '')
    setEditDest(rule.dest ?? '')
    setEditDport(rule.dport ?? rule.sport ?? '')
    setEditComment(rule.comment ?? '')
  }

  function submitEdit() {
    if (editingPos === null) return
    updateRule.mutate(
      {
        pos: editingPos,
        params: {
          type: editDir,
          action: editAction,
          macro: editMacro || undefined,
          proto: editProto || undefined,
          source: editSrc || undefined,
          dest: editDest || undefined,
          dport: editDport || undefined,
          comment: editComment || undefined,
        },
      },
      { onSuccess: () => setEditingPos(null) },
    )
  }

  const enabled = options?.enable === 1

  function submitRule() {
    createRule.mutate(
      {
        type: dir,
        action,
        macro:  macro  || undefined,
        proto:  proto  || undefined,
        source: src    || undefined,
        dest:   dest   || undefined,
        dport:  dport  || undefined,
        comment: ruleComment || undefined,
        enable: 1,
      },
      {
        onSuccess: () => {
          setShowAdd(false)
          setMacro(''); setSrc(''); setDest(''); setDport(''); setRuleComment('')
        },
      },
    )
  }

  function toggleFirewall() {
    updateOptions.mutate({ enable: enabled ? 0 : 1 })
  }

  return (
    <div className="space-y-4">
      {/* Add Rule Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowAdd(false)}>
          <div
            className="bg-bg-card border border-border-subtle rounded-xl shadow-2xl w-full max-w-md p-6 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-semibold text-text-primary">Add Firewall Rule</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-text-secondary mb-1">Direction</label>
                <select value={dir} onChange={(e) => setDir(e.target.value)} className={fieldCls}>
                  <option value="in">IN</option>
                  <option value="out">OUT</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">Action</label>
                <select value={action} onChange={(e) => setAction(e.target.value)} className={fieldCls}>
                  <option>ACCEPT</option>
                  <option>DROP</option>
                  <option>REJECT</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Macro (optional)</label>
              <input value={macro} onChange={(e) => setMacro(e.target.value)} placeholder="SSH, HTTP, HTTPS…" className={fieldCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-text-secondary mb-1">Source</label>
                <input value={src} onChange={(e) => setSrc(e.target.value)} placeholder="any" className={fieldCls} />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">Dest</label>
                <input value={dest} onChange={(e) => setDest(e.target.value)} placeholder="any" className={fieldCls} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-text-secondary mb-1">Protocol</label>
                <select value={proto} onChange={(e) => setProto(e.target.value)} className={fieldCls}>
                  <option value="">any</option>
                  <option value="tcp">tcp</option>
                  <option value="udp">udp</option>
                  <option value="icmp">icmp</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">Dest Port</label>
                <input value={dport} onChange={(e) => setDport(e.target.value)} placeholder="80, 443" className={fieldCls} />
              </div>
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Comment</label>
              <input value={ruleComment} onChange={(e) => setRuleComment(e.target.value)} className={fieldCls} />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button size="sm" onClick={submitRule} disabled={createRule.isPending}>
                <Plus className="size-3.5 mr-1" />
                {createRule.isPending ? 'Adding…' : 'Add Rule'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Rule Modal */}
      {editingPos !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setEditingPos(null)}>
          <div
            className="bg-bg-card border border-border-subtle rounded-xl shadow-2xl w-full max-w-md p-6 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-semibold text-text-primary">Edit Firewall Rule #{editingPos}</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-text-secondary mb-1">Direction</label>
                <select value={editDir} onChange={(e) => setEditDir(e.target.value)} className={fieldCls}>
                  <option value="in">IN</option>
                  <option value="out">OUT</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">Action</label>
                <select value={editAction} onChange={(e) => setEditAction(e.target.value)} className={fieldCls}>
                  <option>ACCEPT</option>
                  <option>DROP</option>
                  <option>REJECT</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Macro (optional)</label>
              <input value={editMacro} onChange={(e) => setEditMacro(e.target.value)} placeholder="SSH, HTTP, HTTPS…" className={fieldCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-text-secondary mb-1">Source</label>
                <input value={editSrc} onChange={(e) => setEditSrc(e.target.value)} placeholder="any" className={fieldCls} />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">Dest</label>
                <input value={editDest} onChange={(e) => setEditDest(e.target.value)} placeholder="any" className={fieldCls} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-text-secondary mb-1">Protocol</label>
                <select value={editProto} onChange={(e) => setEditProto(e.target.value)} className={fieldCls}>
                  <option value="">any</option>
                  <option value="tcp">tcp</option>
                  <option value="udp">udp</option>
                  <option value="icmp">icmp</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">Dest Port</label>
                <input value={editDport} onChange={(e) => setEditDport(e.target.value)} placeholder="80, 443" className={fieldCls} />
              </div>
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Comment</label>
              <input value={editComment} onChange={(e) => setEditComment(e.target.value)} className={fieldCls} />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" size="sm" onClick={() => setEditingPos(null)}>Cancel</Button>
              <Button size="sm" onClick={submitEdit} disabled={updateRule.isPending}>
                {updateRule.isPending ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">
            <Shield className="inline size-5 mr-2 text-accent" />
            Node Firewall
          </h1>
          <p className="text-sm text-text-muted mt-0.5">Per-node iptables rules for {node}</p>
        </div>
        <Button
          variant={enabled ? 'ghost' : 'default'}
          onClick={toggleFirewall}
          disabled={updateOptions.isPending}
          className={enabled ? 'text-status-running border-status-running/30' : ''}
        >
          {enabled ? (
            <><ToggleRight className="size-4 mr-1" />Enabled</>
          ) : (
            <><ToggleLeft className="size-4 mr-1" />Disabled</>
          )}
        </Button>
      </div>

      {/* Options card */}
      {options && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Firewall Options</CardTitle>
              <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                enabled
                  ? 'bg-status-running/10 text-status-running'
                  : 'bg-bg-elevated text-text-muted'
              }`}>
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
                    <span className="text-text-muted">
                      {key === 'policy_in' ? 'Default policy (in)' : 'Default policy (out)'}
                    </span>
                    <FirewallActionBadge action={val} />
                  </div>
                )
              })}
              {(['dhcp', 'ndp'] as const).map((key) => {
                const val = options[key]
                if (val == null) return null
                return (
                  <div key={key} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <span className="text-text-muted uppercase text-xs">{key}</span>
                    <span className={`text-xs ${val ? 'text-status-running' : 'text-text-disabled'}`}>
                      {val ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rules card */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">
              Rules
              <span className="ml-2 text-xs font-normal text-text-muted">
                {rules?.length ?? 0} rule{rules?.length !== 1 ? 's' : ''}
              </span>
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
                      <button
                        onClick={() => updateRule.mutate({ pos: rule.pos, params: { enable: rule.enable === 0 ? 1 : 0 } })}
                        disabled={updateRule.isPending}
                        className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors disabled:opacity-50 ${rule.enable !== 0 ? 'bg-accent' : 'bg-border-muted'}`}
                        title={rule.enable !== 0 ? 'Enabled — click to disable' : 'Disabled — click to enable'}
                      >
                        <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${rule.enable !== 0 ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => startEdit(rule)}
                          className="inline-flex items-center gap-1 rounded border border-border-subtle px-2 py-0.5 text-xs text-text-muted hover:text-text-primary hover:bg-bg-elevated"
                        >
                          <Pencil className="size-3" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete rule #${rule.pos}?`)) deleteRule.mutate(rule.pos)
                          }}
                          disabled={deleteRule.isPending}
                          className="inline-flex items-center gap-1 rounded border border-status-error/40 px-2 py-0.5 text-xs text-status-error hover:bg-status-error/10 disabled:opacity-50"
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
    </div>
  )
}
