import { useState } from 'react'
import { Shield, List, Network, Tag, Plus, Trash2, ChevronRight, Pencil, ChevronDown } from 'lucide-react'
import {
  useClusterFirewallRules,
  useClusterFirewallOptions,
  useClusterFirewallGroups,
  useClusterFirewallIPSets,
  useClusterFirewallIPSetEntries,
  useClusterFirewallAliases,
  useCreateClusterFirewallRule,
  useDeleteClusterFirewallRule,
  useUpdateClusterFirewallRule,
  useCreateClusterFirewallGroup,
  useDeleteClusterFirewallGroup,
  useClusterFirewallGroupRules,
  useCreateClusterFirewallGroupRule,
  useDeleteClusterFirewallGroupRule,
  useUpdateClusterFirewallGroupRule,
  useCreateClusterFirewallIPSet,
  useDeleteClusterFirewallIPSet,
  useCreateClusterFirewallIPSetEntry,
  useDeleteClusterFirewallIPSetEntry,
  useCreateClusterFirewallAlias,
  useDeleteClusterFirewallAlias,
  useUpdateClusterFirewallOptions,
} from '@/lib/queries/cluster'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
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

const FW_MACROS = [
  '', 'SSH', 'HTTP', 'HTTPS', 'DNS', 'SMTP', 'SMTPS', 'IMAP', 'IMAPS',
  'POP3', 'POP3S', 'FTP', 'FTPS', 'NFS', 'Samba', 'Ping', 'MySQL',
  'PostgreSQL', 'Redis', 'MongoDB',
]
const FW_ACTIONS = ['ACCEPT', 'DROP', 'REJECT']
const FW_PROTOS = ['', 'tcp', 'udp', 'icmp', 'tcp/udp']

function FWActionBadge({ action }: { action: string }) {
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

function inp(extra?: string) {
  return `w-full rounded border border-border-subtle bg-bg-input px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent [color-scheme:dark] ${extra ?? ''}`
}

function CreateRuleDialog({ onClose }: { onClose: () => void }) {
  const [type, setType] = useState<'in' | 'out'>('in')
  const [action, setAction] = useState('ACCEPT')
  const [macro, setMacro] = useState('')
  const [proto, setProto] = useState('')
  const [source, setSource] = useState('')
  const [dest, setDest] = useState('')
  const [dport, setDport] = useState('')
  const [comment, setComment] = useState('')
  const [enable, setEnable] = useState(true)
  const create = useCreateClusterFirewallRule()

  function submit() {
    create.mutate(
      {
        type,
        action,
        enable: enable ? 1 : 0,
        macro: macro || undefined,
        proto: !macro && proto ? proto : undefined,
        source: source || undefined,
        dest: dest || undefined,
        dport: dport || undefined,
        comment: comment || undefined,
      },
      { onSuccess: () => onClose() },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-bg-card border border-border-subtle rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">Create Firewall Rule</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-text-secondary mb-1">Direction</label>
            <select value={type} onChange={(e) => setType(e.target.value as 'in' | 'out')} className={inp()}>
              <option value="in">in</option>
              <option value="out">out</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Action <span className="text-status-error">*</span></label>
            <select value={action} onChange={(e) => setAction(e.target.value)} className={inp()}>
              {FW_ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Macro</label>
            <select value={macro} onChange={(e) => setMacro(e.target.value)} className={inp()}>
              {FW_MACROS.map((m) => <option key={m} value={m}>{m || '— none —'}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Protocol</label>
            <select value={proto} onChange={(e) => setProto(e.target.value)} disabled={!!macro} className={inp(macro ? 'opacity-40' : '')}>
              {FW_PROTOS.map((p) => <option key={p} value={p}>{p || '— any —'}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Source</label>
            <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="IP / CIDR / alias" className={inp()} />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Destination</label>
            <input value={dest} onChange={(e) => setDest(e.target.value)} placeholder="IP / CIDR / alias" className={inp()} />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Dest Port</label>
            <input value={dport} onChange={(e) => setDport(e.target.value)} placeholder="e.g. 80 or 80:443" className={inp()} />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Comment</label>
            <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="optional" className={inp()} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
          <input type="checkbox" checked={enable} onChange={(e) => setEnable(e.target.checked)} className="accent-accent" />
          Enable rule
        </label>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={submit} disabled={create.isPending}>
            {create.isPending ? 'Creating…' : 'Create Rule'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function EditRuleDialog({ rule, onClose, groupOverride }: { rule: import('@zyphercenter/proxmox-types').FirewallRule; onClose: () => void; groupOverride?: string }) {
  const [type, setType] = useState<'in' | 'out'>(rule.type as 'in' | 'out')
  const [action, setAction] = useState(rule.action)
  const [macro, setMacro] = useState(rule.macro ?? '')
  const [proto, setProto] = useState(rule.proto ?? '')
  const [source, setSource] = useState(rule.source ?? '')
  const [dest, setDest] = useState(rule.dest ?? '')
  const [dport, setDport] = useState(rule.dport ?? rule.sport ?? '')
  const [comment, setComment] = useState(rule.comment ?? '')
  const updateRule = useUpdateClusterFirewallRule()
  const updateGroupRule = useUpdateClusterFirewallGroupRule(groupOverride ?? '')

  function submit() {
    const params = {
      type,
      action,
      macro: macro || undefined,
      proto: !macro && proto ? proto : undefined,
      source: source || undefined,
      dest: dest || undefined,
      dport: dport || undefined,
      comment: comment || undefined,
    }
    if (groupOverride) {
      updateGroupRule.mutate({ pos: rule.pos, params }, { onSuccess: () => onClose() })
    } else {
      updateRule.mutate({ pos: rule.pos, params }, { onSuccess: () => onClose() })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-bg-card border border-border-subtle rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-text-primary">Edit Firewall Rule #{rule.pos}</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-text-secondary mb-1">Direction</label>
            <select value={type} onChange={(e) => setType(e.target.value as 'in' | 'out')} className={inp()}>
              <option value="in">in</option>
              <option value="out">out</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Action</label>
            <select value={action} onChange={(e) => setAction(e.target.value)} className={inp()}>
              {FW_ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Macro</label>
            <select value={macro} onChange={(e) => setMacro(e.target.value)} className={inp()}>
              {FW_MACROS.map((m) => <option key={m} value={m}>{m || '— none —'}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Protocol</label>
            <select value={proto} onChange={(e) => setProto(e.target.value)} disabled={!!macro} className={inp(macro ? 'opacity-40' : '')}>
              {FW_PROTOS.map((p) => <option key={p} value={p}>{p || '— any —'}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Source</label>
            <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="IP / CIDR / alias" className={inp()} />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Destination</label>
            <input value={dest} onChange={(e) => setDest(e.target.value)} placeholder="IP / CIDR / alias" className={inp()} />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Dest Port</label>
            <input value={dport} onChange={(e) => setDport(e.target.value)} placeholder="e.g. 80 or 80:443" className={inp()} />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Comment</label>
            <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="optional" className={inp()} />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={submit} disabled={updateRule.isPending}>
            {updateRule.isPending ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function CreateGroupDialog({ onClose }: { onClose: () => void }) {
  const [group, setGroup] = useState('')
  const [comment, setComment] = useState('')
  const create = useCreateClusterFirewallGroup()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-bg-card border border-border-subtle rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">Create Security Group</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-text-secondary mb-1">Name <span className="text-status-error">*</span></label>
            <input value={group} onChange={(e) => setGroup(e.target.value)} placeholder="e.g. webservers" className={inp()} />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Comment</label>
            <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="optional" className={inp()} />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={() => create.mutate({ group: group.trim(), comment: comment || undefined }, { onSuccess: () => onClose() })} disabled={!group.trim() || create.isPending}>
            {create.isPending ? 'Creating…' : 'Create'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function CreateIPSetDialog({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const [comment, setComment] = useState('')
  const create = useCreateClusterFirewallIPSet()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-bg-card border border-border-subtle rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">Create IP Set</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-text-secondary mb-1">Name <span className="text-status-error">*</span></label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. trusted" className={inp()} />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Comment</label>
            <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="optional" className={inp()} />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={() => create.mutate({ name: name.trim(), comment: comment || undefined }, { onSuccess: () => onClose() })} disabled={!name.trim() || create.isPending}>
            {create.isPending ? 'Creating…' : 'Create'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function CreateAliasDialog({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const [cidr, setCidr] = useState('')
  const [comment, setComment] = useState('')
  const create = useCreateClusterFirewallAlias()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-bg-card border border-border-subtle rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">Create Alias</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-text-secondary mb-1">Name <span className="text-status-error">*</span></label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. my-server" className={inp()} />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">CIDR <span className="text-status-error">*</span></label>
            <input value={cidr} onChange={(e) => setCidr(e.target.value)} placeholder="e.g. 10.0.0.5/32" className={inp()} />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Comment</label>
            <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="optional" className={inp()} />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={() => create.mutate({ name: name.trim(), cidr: cidr.trim(), comment: comment || undefined }, { onSuccess: () => onClose() })} disabled={!name.trim() || !cidr.trim() || create.isPending}>
            {create.isPending ? 'Creating…' : 'Create'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function RulesTab() {
  const { data: rules, isLoading } = useClusterFirewallRules()
  const { data: options } = useClusterFirewallOptions()
  const deleteRule = useDeleteClusterFirewallRule()
  const updateRule = useUpdateClusterFirewallRule()
  const updateOptions = useUpdateClusterFirewallOptions()
  const enabled = options?.enable === 1
  const [showCreate, setShowCreate] = useState(false)
  const [editingRule, setEditingRule] = useState<import('@zyphercenter/proxmox-types').FirewallRule | null>(null)
  const [editingPolicy, setEditingPolicy] = useState<'policy_in' | 'policy_out' | null>(null)

  if (isLoading) return <SkeletonCard />

  return (
    <div className="space-y-4">
      {showCreate && <CreateRuleDialog onClose={() => setShowCreate(false)} />}
      {editingRule && <EditRuleDialog rule={editingRule} onClose={() => setEditingRule(null)} />}
      {options && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Global Firewall</CardTitle>
              <button
                onClick={() => updateOptions.mutate({ enable: enabled ? 0 : 1 })}
                disabled={updateOptions.isPending}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${enabled ? 'bg-accent' : 'bg-border-muted'}`}
                title={enabled ? 'Enabled — click to disable' : 'Disabled — click to enable'}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-4' : 'translate-x-1'}`} />
              </button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border-muted">
              {(['policy_in', 'policy_out'] as const).map((key) => {
                const val = options[key]
                const isEditing = editingPolicy === key
                return (
                  <div key={key} className="flex items-center justify-between px-4 py-2.5 text-sm gap-4">
                    <span className="text-text-muted">{key === 'policy_in' ? 'Input policy' : 'Output policy'}</span>
                    {isEditing ? (
                      <select
                        autoFocus
                        defaultValue={val ?? 'ACCEPT'}
                        onChange={(e) => {
                          updateOptions.mutate({ [key]: e.target.value }, { onSuccess: () => setEditingPolicy(null) })
                        }}
                        onBlur={() => setEditingPolicy(null)}
                        className="rounded border border-border-subtle bg-bg-input px-2 py-0.5 text-sm text-text-primary outline-none focus:border-accent [color-scheme:dark]"
                      >
                        {['ACCEPT', 'DROP', 'REJECT'].map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    ) : (
                      <button
                        onClick={() => setEditingPolicy(key)}
                        className="flex items-center gap-1.5 hover:opacity-80"
                        title="Click to change policy"
                      >
                        <FWActionBadge action={val ?? 'ACCEPT'} />
                      </button>
                    )}
                  </div>
                )
              })}
              {options.log_ratelimit && (
                <div className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="text-text-muted">Log rate limit</span>
                  <span className="font-mono text-xs text-text-secondary">{options.log_ratelimit}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">
              Cluster Rules
              <span className="ml-2 text-xs font-normal text-text-muted">{rules?.length ?? 0} rule{rules?.length !== 1 ? 's' : ''}</span>
            </CardTitle>
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="size-3.5 mr-1" />Add Rule
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {!rules?.length ? (
            <p className="text-center text-text-muted text-sm py-10">No cluster-level rules defined</p>
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
                    <TableCell><span className="text-xs uppercase font-medium text-text-secondary">{rule.type}</span></TableCell>
                    <TableCell><FWActionBadge action={rule.action} /></TableCell>
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
                          onClick={() => setEditingRule(rule)}
                          className="inline-flex items-center gap-1 rounded border border-border-subtle px-2 py-0.5 text-xs text-text-muted hover:text-text-primary hover:bg-bg-elevated"
                        >
                          <Pencil className="size-3" />
                        </button>
                        <button
                          onClick={() => { if (confirm(`Delete rule #${rule.pos}?`)) deleteRule.mutate(rule.pos) }}
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

function GroupRulesPanel({ group }: { group: string }) {
  const { data: rules, isLoading } = useClusterFirewallGroupRules(group)
  const createRule = useCreateClusterFirewallGroupRule(group)
  const deleteRule = useDeleteClusterFirewallGroupRule(group)
  const updateRule = useUpdateClusterFirewallGroupRule(group)
  const [showAdd, setShowAdd] = useState(false)
  const [editingRule, setEditingRule] = useState<import('@zyphercenter/proxmox-types').FirewallRule | null>(null)
  const [type, setType] = useState<'in' | 'out'>('in')
  const [action, setAction] = useState('ACCEPT')
  const [macro, setMacro] = useState('')
  const [proto, setProto] = useState('')
  const [source, setSource] = useState('')
  const [dest, setDest] = useState('')
  const [dport, setDport] = useState('')
  const [comment, setComment] = useState('')

  function submitAdd() {
    createRule.mutate(
      { type, action, macro: macro || undefined, proto: !macro && proto ? proto : undefined, source: source || undefined, dest: dest || undefined, dport: dport || undefined, comment: comment || undefined, enable: 1 },
      { onSuccess: () => { setShowAdd(false); setMacro(''); setSource(''); setDest(''); setDport(''); setComment('') } }
    )
  }

  if (isLoading) return <p className="px-6 py-3 text-xs text-text-muted animate-pulse">Loading rules…</p>

  return (
    <div className="border-t border-border-muted bg-bg-elevated">
      {editingRule && <EditRuleDialog rule={editingRule} onClose={() => setEditingRule(null)} groupOverride={group} />}
      {(rules && rules.length > 0) && (
        <div className="divide-y divide-border-muted/50">
          {rules.map((rule) => (
            <div key={rule.pos} className={`flex items-center gap-3 px-6 py-2 text-xs ${rule.enable === 0 ? 'opacity-40' : ''}`}>
              <span className="w-6 text-text-muted font-mono">{rule.pos}</span>
              <span className="uppercase text-xs font-medium text-text-secondary w-8">{rule.type}</span>
              <FWActionBadge action={rule.action} />
              <span className="text-text-secondary">{rule.macro ?? rule.proto ?? '—'}</span>
              <span className="font-mono text-text-muted">{rule.source ?? '—'}</span>
              <span className="font-mono text-text-muted">→ {rule.dest ?? 'any'}</span>
              {rule.dport && <span className="font-mono text-text-muted">:{rule.dport}</span>}
              {rule.comment && <span className="text-text-disabled italic truncate max-w-[200px]">{rule.comment}</span>}
              <div className="ml-auto flex items-center gap-1">
                <button
                  onClick={() => updateRule.mutate({ pos: rule.pos, params: { enable: rule.enable === 0 ? 1 : 0 } })}
                  disabled={updateRule.isPending}
                  className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors disabled:opacity-50 ${rule.enable !== 0 ? 'bg-accent' : 'bg-border-muted'}`}
                >
                  <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${rule.enable !== 0 ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                </button>
                <button onClick={() => setEditingRule(rule)} className="rounded border border-border-subtle px-1.5 py-0.5 text-text-muted hover:text-text-primary hover:bg-bg-card">
                  <Pencil className="size-3" />
                </button>
                <button
                  onClick={() => { if (confirm(`Delete rule #${rule.pos}?`)) deleteRule.mutate(rule.pos) }}
                  disabled={deleteRule.isPending}
                  className="rounded border border-status-error/40 px-1.5 py-0.5 text-status-error hover:bg-status-error/10 disabled:opacity-50"
                >
                  <Trash2 className="size-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {showAdd ? (
        <div className="px-6 py-3 space-y-2 border-t border-border-muted/50">
          <div className="grid grid-cols-3 gap-2">
            <select value={type} onChange={(e) => setType(e.target.value as 'in' | 'out')} className={inp('text-xs py-1')}>
              <option value="in">in</option><option value="out">out</option>
            </select>
            <select value={action} onChange={(e) => setAction(e.target.value)} className={inp('text-xs py-1')}>
              {FW_ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <select value={macro} onChange={(e) => setMacro(e.target.value)} className={inp('text-xs py-1')}>
              {FW_MACROS.map((m) => <option key={m} value={m}>{m || '— no macro —'}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="source" className={inp('text-xs py-1')} />
            <input value={dest} onChange={(e) => setDest(e.target.value)} placeholder="dest" className={inp('text-xs py-1')} />
            <input value={dport} onChange={(e) => setDport(e.target.value)} placeholder="port" className={inp('text-xs py-1')} />
          </div>
          <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="comment (optional)" className={inp('text-xs py-1 w-full')} />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button size="sm" onClick={submitAdd} disabled={createRule.isPending}>
              <Plus className="size-3.5 mr-1" />{createRule.isPending ? 'Adding…' : 'Add Rule'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="px-6 py-2">
          <button onClick={() => setShowAdd(true)} className="text-xs text-accent hover:underline flex items-center gap-1">
            <Plus className="size-3" /> Add rule to group
          </button>
        </div>
      )}
    </div>
  )
}

function GroupsTab() {
  const { data: groups, isLoading } = useClusterFirewallGroups()
  const deleteGroup = useDeleteClusterFirewallGroup()
  const [showCreate, setShowCreate] = useState(false)
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)
  if (isLoading) return <SkeletonCard />
  return (
    <>
      {showCreate && <CreateGroupDialog onClose={() => setShowCreate(false)} />}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-text-secondary">{groups?.length ?? 0} group(s)</span>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="size-3.5 mr-1" />Create Group
        </Button>
      </div>
      <Card>
        <CardContent className="p-0">
          {!groups?.length ? (
            <p className="text-center text-text-muted text-sm py-10">No security groups defined</p>
          ) : (
            <div className="divide-y divide-border-muted">
              {groups.map((g) => (
                <div key={g.group}>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <button
                      onClick={() => setExpandedGroup(expandedGroup === g.group ? null : g.group)}
                      className="flex items-center gap-2 flex-1 text-left"
                    >
                      {expandedGroup === g.group
                        ? <ChevronDown className="size-4 text-text-muted" />
                        : <ChevronRight className="size-4 text-text-muted" />}
                      <span className="font-mono font-medium text-text-primary">{g.group}</span>
                      {g.comment && <span className="text-sm text-text-muted">{g.comment}</span>}
                    </button>
                    <button
                      onClick={() => { if (confirm(`Delete security group "${g.group}"?`)) deleteGroup.mutate(g.group) }}
                      disabled={deleteGroup.isPending}
                      className="inline-flex items-center gap-1 rounded border border-status-error/40 px-2 py-0.5 text-xs text-status-error hover:bg-status-error/10 disabled:opacity-50"
                    >
                      <Trash2 className="size-3" />Delete
                    </button>
                  </div>
                  {expandedGroup === g.group && <GroupRulesPanel group={g.group} />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}

function IPSetEntriesPanel({ name }: { name: string }) {
  const { data: entries, isLoading } = useClusterFirewallIPSetEntries(name)
  const addEntry = useCreateClusterFirewallIPSetEntry(name)
  const removeEntry = useDeleteClusterFirewallIPSetEntry(name)
  const [newCidr, setNewCidr] = useState('')
  const [newComment, setNewComment] = useState('')
  const [newNomatch, setNewNomatch] = useState(false)
  const [adding, setAdding] = useState(false)

  function handleAdd() {
    const cidr = newCidr.trim()
    if (!cidr) return
    addEntry.mutate(
      { cidr, comment: newComment.trim() || undefined, nomatch: newNomatch ? 1 : undefined },
      { onSuccess: () => { setNewCidr(''); setNewComment(''); setNewNomatch(false); setAdding(false) } }
    )
  }

  if (isLoading) return <p className="px-4 py-2 text-xs text-text-muted animate-pulse">Loading entries…</p>

  return (
    <div className="border-t border-border-muted bg-bg-elevated">
      {entries && entries.length > 0 && (
        <div className="divide-y divide-border-muted/50">
          {entries.map((entry) => (
            <div key={entry.cidr} className="flex items-center justify-between px-6 py-2 gap-4">
              <div className="flex items-center gap-3 text-sm">
                {entry.nomatch ? (
                  <span className="text-xs bg-status-error/10 text-status-error border border-status-error/20 rounded px-1.5 py-0.5">!</span>
                ) : null}
                <span className="font-mono text-text-primary">{entry.cidr}</span>
                {entry.comment && <span className="text-text-muted text-xs">{entry.comment}</span>}
              </div>
              <button
                onClick={() => { if (confirm(`Remove ${entry.cidr} from ${name}?`)) removeEntry.mutate(entry.cidr) }}
                disabled={removeEntry.isPending}
                className="text-text-muted hover:text-status-error disabled:opacity-40"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      {adding ? (
        <div className="flex flex-wrap items-end gap-2 px-6 py-3 border-t border-border-muted/50">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-muted">CIDR</label>
            <input
              autoFocus
              value={newCidr}
              onChange={(e) => setNewCidr(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAdding(false) }}
              placeholder="10.0.0.0/24"
              className="w-40 rounded border border-border-subtle bg-bg-input px-2 py-1 text-xs font-mono text-text-primary outline-none focus:border-accent"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-muted">Comment</label>
            <input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Optional"
              className="w-32 rounded border border-border-subtle bg-bg-input px-2 py-1 text-xs text-text-primary outline-none focus:border-accent"
            />
          </div>
          <label className="flex items-center gap-1.5 text-xs text-text-muted cursor-pointer mb-0.5">
            <input type="checkbox" checked={newNomatch} onChange={(e) => setNewNomatch(e.target.checked)} />
            Nomatch
          </label>
          <Button size="sm" disabled={addEntry.isPending || !newCidr.trim()} onClick={handleAdd}>
            {addEntry.isPending ? '…' : 'Add'}
          </Button>
          <button onClick={() => setAdding(false)} className="text-xs text-text-muted hover:text-text-primary">Cancel</button>
        </div>
      ) : (
        <div className="px-6 py-2">
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1 text-xs text-text-muted hover:text-accent"
          >
            <Plus className="size-3" /> Add entry
          </button>
        </div>
      )}
    </div>
  )
}

function IPSetsTab() {
  const { data: ipsets, isLoading } = useClusterFirewallIPSets()
  const deleteIPSet = useDeleteClusterFirewallIPSet()
  const [showCreate, setShowCreate] = useState(false)
  const [expandedSet, setExpandedSet] = useState<string | null>(null)
  if (isLoading) return <SkeletonCard />
  return (
    <>
      {showCreate && <CreateIPSetDialog onClose={() => setShowCreate(false)} />}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-text-secondary">{ipsets?.length ?? 0} IP set(s)</span>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="size-3.5 mr-1" />Create IP Set
        </Button>
      </div>
      <Card>
        <CardContent className="p-0">
          {!ipsets?.length ? (
            <p className="text-center text-text-muted text-sm py-10">No IP sets defined</p>
          ) : (
            <div className="divide-y divide-border-muted">
              {ipsets.map((s) => (
                <div key={s.name}>
                  <div
                    className="flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-bg-elevated select-none"
                    onClick={() => setExpandedSet((prev) => (prev === s.name ? null : s.name))}
                  >
                    <div className="flex items-center gap-2">
                      <ChevronRight className={`size-3.5 text-text-muted transition-transform ${expandedSet === s.name ? 'rotate-90' : ''}`} />
                      <span className="font-mono font-medium text-text-primary text-sm">{s.name}</span>
                      {s.comment && <span className="text-text-muted text-xs">— {s.comment}</span>}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); if (confirm(`Delete IP set "${s.name}"?`)) deleteIPSet.mutate(s.name) }}
                      disabled={deleteIPSet.isPending}
                      className="inline-flex items-center gap-1 rounded border border-status-error/40 px-2 py-0.5 text-xs text-status-error hover:bg-status-error/10 disabled:opacity-50"
                    >
                      <Trash2 className="size-3" />Delete
                    </button>
                  </div>
                  {expandedSet === s.name && <IPSetEntriesPanel name={s.name} />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}

function AliasesTab() {
  const { data: aliases, isLoading } = useClusterFirewallAliases()
  const deleteAlias = useDeleteClusterFirewallAlias()
  const [showCreate, setShowCreate] = useState(false)
  if (isLoading) return <SkeletonCard />
  return (
    <>
      {showCreate && <CreateAliasDialog onClose={() => setShowCreate(false)} />}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-text-secondary">{aliases?.length ?? 0} alias(es)</span>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="size-3.5 mr-1" />Create Alias
        </Button>
      </div>
      <Card>
        <CardContent className="p-0">
          {!aliases?.length ? (
            <p className="text-center text-text-muted text-sm py-10">No aliases defined</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>CIDR</TableHead>
                  <TableHead>Comment</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {aliases.map((a) => (
                  <TableRow key={a.name}>
                    <TableCell className="font-mono font-medium text-text-primary">{a.name}</TableCell>
                    <TableCell className="font-mono text-sm text-text-secondary">{a.cidr}</TableCell>
                    <TableCell className="text-text-muted text-sm">{a.comment ?? '—'}</TableCell>
                    <TableCell className="text-right">
                      <button
                        onClick={() => { if (confirm(`Delete alias "${a.name}"?`)) deleteAlias.mutate(a.name) }}
                        disabled={deleteAlias.isPending}
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

export function ClusterFirewallPage() {
  const [tab, setTab] = useState('rules')
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Cluster Firewall</h1>
        <p className="text-sm text-text-muted mt-0.5">Datacenter-wide firewall rules, security groups, and IP sets</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="rules"><Shield className="size-3.5 mr-1.5" />Rules</TabsTrigger>
          <TabsTrigger value="groups"><List className="size-3.5 mr-1.5" />Security Groups</TabsTrigger>
          <TabsTrigger value="ipsets"><Network className="size-3.5 mr-1.5" />IP Sets</TabsTrigger>
          <TabsTrigger value="aliases"><Tag className="size-3.5 mr-1.5" />Aliases</TabsTrigger>
        </TabsList>
        <TabsContent value="rules"><RulesTab /></TabsContent>
        <TabsContent value="groups"><GroupsTab /></TabsContent>
        <TabsContent value="ipsets"><IPSetsTab /></TabsContent>
        <TabsContent value="aliases"><AliasesTab /></TabsContent>
      </Tabs>
    </div>
  )
}
