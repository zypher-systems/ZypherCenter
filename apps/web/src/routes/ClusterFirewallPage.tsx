import { useState } from 'react'
import { Shield, List, Network, Tag } from 'lucide-react'
import {
  useClusterFirewallRules,
  useClusterFirewallOptions,
  useClusterFirewallGroups,
  useClusterFirewallIPSets,
  useClusterFirewallAliases,
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

function RulesTab() {
  const { data: rules, isLoading } = useClusterFirewallRules()
  const { data: options } = useClusterFirewallOptions()
  const enabled = options?.enable === 1

  if (isLoading) return <SkeletonCard />

  return (
    <div className="space-y-4">
      {options && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Global Firewall</CardTitle>
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
                    <span className="text-text-muted">{key === 'policy_in' ? 'Input policy' : 'Output policy'}</span>
                    <FWActionBadge action={val} />
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
          <CardTitle className="text-sm font-medium">
            Cluster Rules
            <span className="ml-2 text-xs font-normal text-text-muted">{rules?.length ?? 0} rule{rules?.length !== 1 ? 's' : ''}</span>
          </CardTitle>
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
                      <span className={`inline-block size-2 rounded-full ${rule.enable !== 0 ? 'bg-status-running' : 'bg-border'}`} />
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

function GroupsTab() {
  const { data: groups, isLoading } = useClusterFirewallGroups()
  if (isLoading) return <SkeletonCard />
  return (
    <Card>
      <CardContent className="p-0">
        {!groups?.length ? (
          <p className="text-center text-text-muted text-sm py-10">No security groups defined</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Group Name</TableHead>
                <TableHead>Comment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((g) => (
                <TableRow key={g.group}>
                  <TableCell className="font-mono font-medium text-text-primary">{g.group}</TableCell>
                  <TableCell className="text-text-muted text-sm">{g.comment ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function IPSetsTab() {
  const { data: ipsets, isLoading } = useClusterFirewallIPSets()
  if (isLoading) return <SkeletonCard />
  return (
    <Card>
      <CardContent className="p-0">
        {!ipsets?.length ? (
          <p className="text-center text-text-muted text-sm py-10">No IP sets defined</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Comment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ipsets.map((s) => (
                <TableRow key={s.name}>
                  <TableCell className="font-mono font-medium text-text-primary">{s.name}</TableCell>
                  <TableCell className="text-text-muted text-sm">{s.comment ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function AliasesTab() {
  const { data: aliases, isLoading } = useClusterFirewallAliases()
  if (isLoading) return <SkeletonCard />
  return (
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {aliases.map((a) => (
                <TableRow key={a.name}>
                  <TableCell className="font-mono font-medium text-text-primary">{a.name}</TableCell>
                  <TableCell className="font-mono text-sm text-text-secondary">{a.cidr}</TableCell>
                  <TableCell className="text-text-muted text-sm">{a.comment ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
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
