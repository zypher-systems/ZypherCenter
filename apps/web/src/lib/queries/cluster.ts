import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import type {
  ClusterStatusItem, ClusterResource, ClusterOptions, BackupJob, ReplicationJob,
  FirewallRule, FirewallGroup, IPSet, IPSetEntry, FirewallAlias, FirewallOptions,
  Pool,
} from '@zyphercenter/proxmox-types'

export const clusterKeys = {
  all: ['cluster'] as const,
  status: () => [...clusterKeys.all, 'status'] as const,
  resources: () => [...clusterKeys.all, 'resources'] as const,
  options: () => [...clusterKeys.all, 'options'] as const,
  backup: () => [...clusterKeys.all, 'backup'] as const,
  replication: () => [...clusterKeys.all, 'replication'] as const,
  tasks: () => [...clusterKeys.all, 'tasks'] as const,
}

export function useClusterStatus() {
  return useQuery({
    queryKey: clusterKeys.status(),
    queryFn: () => api.get<ClusterStatusItem[]>('cluster/status'),
    refetchInterval: 15_000,
  })
}

export function useClusterResources(type?: 'node' | 'qemu' | 'lxc' | 'storage' | 'pool') {
  return useQuery({
    queryKey: [...clusterKeys.resources(), type],
    queryFn: () =>
      api.get<ClusterResource[]>(`cluster/resources${type ? `?type=${type}` : ''}`),
    refetchInterval: 10_000,
  })
}

export function useClusterOptions() {
  return useQuery({
    queryKey: clusterKeys.options(),
    queryFn: () => api.get<ClusterOptions>('cluster/options'),
  })
}

export function useClusterBackupJobs() {
  return useQuery({
    queryKey: clusterKeys.backup(),
    queryFn: () => api.get<BackupJob[]>('cluster/backup'),
  })
}

export function useCreateBackupJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: Record<string, unknown>) => api.post('cluster/backup', params),
    onSuccess: () => qc.invalidateQueries({ queryKey: clusterKeys.backup() }),
  })
}

export function useDeleteBackupJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.del(`cluster/backup/${encodeURIComponent(id)}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: clusterKeys.backup() }),
  })
}

export function useClusterReplication() {
  return useQuery({
    queryKey: clusterKeys.replication(),
    queryFn: () => api.get<ReplicationJob[]>('cluster/replication'),
    refetchInterval: 30_000,
  })
}

export function useCreateReplicationJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: Record<string, unknown>) => api.post('cluster/replication', params),
    onSuccess: () => qc.invalidateQueries({ queryKey: clusterKeys.replication() }),
  })
}

export function useDeleteReplicationJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.del(`cluster/replication/${encodeURIComponent(id)}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: clusterKeys.replication() }),
  })
}

export function useUpdateBackupJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, params }: { id: string; params: Record<string, unknown> }) =>
      api.put(`cluster/backup/${encodeURIComponent(id)}`, params),
    onSuccess: () => {
      toast.success('Backup job updated')
      qc.invalidateQueries({ queryKey: clusterKeys.backup() })
    },
    onError: (err) => toast.error(`Update failed — ${err.message}`),
  })
}

export function useUpdateReplicationJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, params }: { id: string; params: Record<string, unknown> }) =>
      api.put(`cluster/replication/${encodeURIComponent(id)}`, params),
    onSuccess: () => {
      toast.success('Replication job updated')
      qc.invalidateQueries({ queryKey: clusterKeys.replication() })
    },
    onError: (err) => toast.error(`Update failed — ${err.message}`),
  })
}

// ── Cluster Firewall ─────────────────────────────────────────────────────────────────

const fwk = {
  rules:   () => [...clusterKeys.all, 'firewall', 'rules']   as const,
  groups:  () => [...clusterKeys.all, 'firewall', 'groups']  as const,
  ipsets:  () => [...clusterKeys.all, 'firewall', 'ipsets']  as const,
  aliases: () => [...clusterKeys.all, 'firewall', 'aliases'] as const,
  options: () => [...clusterKeys.all, 'firewall', 'options'] as const,
}

export function useClusterFirewallRules() {
  return useQuery({
    queryKey: fwk.rules(),
    queryFn: () => api.get<FirewallRule[]>('cluster/firewall/rules'),
  })
}

export function useClusterFirewallGroups() {
  return useQuery({
    queryKey: fwk.groups(),
    queryFn: () => api.get<FirewallGroup[]>('cluster/firewall/groups'),
  })
}

export function useClusterFirewallIPSets() {
  return useQuery({
    queryKey: fwk.ipsets(),
    queryFn: () => api.get<IPSet[]>('cluster/firewall/ipset'),
  })
}

export function useClusterFirewallIPSetEntries(name: string) {
  return useQuery({
    queryKey: [...clusterKeys.all, 'firewall', 'ipset', name],
    queryFn: () => api.get<IPSetEntry[]>(`cluster/firewall/ipset/${name}`),
    enabled: !!name,
  })
}

export function useClusterFirewallAliases() {
  return useQuery({
    queryKey: fwk.aliases(),
    queryFn: () => api.get<FirewallAlias[]>('cluster/firewall/aliases'),
  })
}

export function useClusterFirewallOptions() {
  return useQuery({
    queryKey: fwk.options(),
    queryFn: () => api.get<FirewallOptions>('cluster/firewall/options'),
  })
}

export function useUpdateClusterFirewallOptions() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: Partial<FirewallOptions>) => api.put('cluster/firewall/options', params),
    onSuccess: () => {
      toast.success('Firewall options updated')
      qc.invalidateQueries({ queryKey: fwk.options() })
    },
    onError: (err) => toast.error(`Failed to update firewall options — ${err.message}`),
  })
}

export function useCreateClusterFirewallRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { action: string; type: string; enable?: number; comment?: string; source?: string; dest?: string; proto?: string; dport?: string; sport?: string; macro?: string; iface?: string }) =>
      api.post('cluster/firewall/rules', params),
    onSuccess: () => {
      toast.success('Firewall rule created')
      qc.invalidateQueries({ queryKey: fwk.rules() })
    },
    onError: (err) => toast.error(`Failed to create rule — ${err.message}`),
  })
}

export function useDeleteClusterFirewallRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (pos: number) => api.del(`cluster/firewall/rules/${pos}`),
    onSuccess: () => {
      toast.success('Firewall rule deleted')
      qc.invalidateQueries({ queryKey: fwk.rules() })
    },
    onError: (err) => toast.error(`Failed to delete rule — ${err.message}`),
  })
}

export function useUpdateClusterFirewallRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ pos, params }: { pos: number; params: Record<string, unknown> }) =>
      api.put(`cluster/firewall/rules/${pos}`, params),
    onSuccess: () => qc.invalidateQueries({ queryKey: fwk.rules() }),
    onError: (err) => toast.error(`Failed to update rule — ${err.message}`),
  })
}

export function useCreateClusterFirewallGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { group: string; comment?: string }) =>
      api.post('cluster/firewall/groups', params),
    onSuccess: (_, vars) => {
      toast.success(`Security group "${vars.group}" created`)
      qc.invalidateQueries({ queryKey: fwk.groups() })
    },
    onError: (err) => toast.error(`Failed to create group — ${err.message}`),
  })
}

export function useDeleteClusterFirewallGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (group: string) => api.del(`cluster/firewall/groups/${encodeURIComponent(group)}`),
    onSuccess: (_, group) => {
      toast.success(`Security group "${group}" deleted`)
      qc.invalidateQueries({ queryKey: fwk.groups() })
    },
    onError: (err) => toast.error(`Failed to delete group — ${err.message}`),
  })
}

export function useClusterFirewallGroupRules(group: string) {
  return useQuery({
    queryKey: [...fwk.groups(), group, 'rules'],
    queryFn: () => api.get<FirewallRule[]>(`cluster/firewall/groups/${encodeURIComponent(group)}`),
    enabled: !!group,
  })
}

export function useCreateClusterFirewallGroupRule(group: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: Record<string, unknown>) =>
      api.post(`cluster/firewall/groups/${encodeURIComponent(group)}`, params),
    onSuccess: () => {
      toast.success('Rule added to group')
      qc.invalidateQueries({ queryKey: [...fwk.groups(), group, 'rules'] })
    },
    onError: (err) => toast.error(`Failed to add rule — ${err.message}`),
  })
}

export function useDeleteClusterFirewallGroupRule(group: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (pos: number) =>
      api.del(`cluster/firewall/groups/${encodeURIComponent(group)}/${pos}`),
    onSuccess: () => {
      toast.success('Rule removed from group')
      qc.invalidateQueries({ queryKey: [...fwk.groups(), group, 'rules'] })
    },
    onError: (err) => toast.error(`Failed to delete rule — ${err.message}`),
  })
}

export function useUpdateClusterFirewallGroupRule(group: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ pos, params }: { pos: number; params: Record<string, unknown> }) =>
      api.put(`cluster/firewall/groups/${encodeURIComponent(group)}/${pos}`, params),
    onSuccess: () => {
      toast.success('Rule updated')
      qc.invalidateQueries({ queryKey: [...fwk.groups(), group, 'rules'] })
    },
    onError: (err) => toast.error(`Failed to update rule — ${err.message}`),
  })
}

export function useCreateClusterFirewallAlias() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { name: string; cidr: string; comment?: string }) =>
      api.post('cluster/firewall/aliases', params),
    onSuccess: (_, vars) => {
      toast.success(`Alias "${vars.name}" created`)
      qc.invalidateQueries({ queryKey: fwk.aliases() })
    },
    onError: (err) => toast.error(`Failed to create alias — ${err.message}`),
  })
}

export function useDeleteClusterFirewallAlias() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => api.del(`cluster/firewall/aliases/${encodeURIComponent(name)}`),
    onSuccess: (_, name) => {
      toast.success(`Alias "${name}" deleted`)
      qc.invalidateQueries({ queryKey: fwk.aliases() })
    },
    onError: (err) => toast.error(`Failed to delete alias — ${err.message}`),
  })
}

export function useCreateClusterFirewallIPSet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { name: string; comment?: string }) =>
      api.post('cluster/firewall/ipset', params),
    onSuccess: (_, vars) => {
      toast.success(`IP set "${vars.name}" created`)
      qc.invalidateQueries({ queryKey: fwk.ipsets() })
    },
    onError: (err) => toast.error(`Failed to create IP set — ${err.message}`),
  })
}

export function useDeleteClusterFirewallIPSet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => api.del(`cluster/firewall/ipset/${encodeURIComponent(name)}`),
    onSuccess: (_, name) => {
      toast.success(`IP set "${name}" deleted`)
      qc.invalidateQueries({ queryKey: fwk.ipsets() })
    },
    onError: (err) => toast.error(`Failed to delete IP set — ${err.message}`),
  })
}

export function useCreateClusterFirewallIPSetEntry(name: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { cidr: string; comment?: string; nomatch?: number }) =>
      api.post(`cluster/firewall/ipset/${encodeURIComponent(name)}`, params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...clusterKeys.all, 'firewall', 'ipset', name] })
    },
    onError: (err) => toast.error(`Failed to add entry — ${err.message}`),
  })
}

export function useDeleteClusterFirewallIPSetEntry(name: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (cidr: string) =>
      api.del(`cluster/firewall/ipset/${encodeURIComponent(name)}/${encodeURIComponent(cidr)}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...clusterKeys.all, 'firewall', 'ipset', name] })
    },
    onError: (err) => toast.error(`Failed to remove entry — ${err.message}`),
  })
}

export function useUpdateClusterOptions() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: Record<string, unknown>) => api.put('cluster/options', params),
    onSuccess: () => {
      toast.success('Cluster options updated')
      qc.invalidateQueries({ queryKey: clusterKeys.options() })
    },
    onError: (err) => toast.error(`Failed to update options — ${err.message}`),
  })
}

// ── SDN ─────────────────────────────────────────────────────────────────────────────────

export function useSDNVNets() {
  return useQuery({
    queryKey: ['sdn', 'vnets'],
    queryFn: () => api.get<Record<string, unknown>[]>('cluster/sdn/vnets'),
  })
}

export function useSDNZones() {
  return useQuery({
    queryKey: ['sdn', 'zones'],
    queryFn: () => api.get<Record<string, unknown>[]>('cluster/sdn/zones'),
  })
}

export function useCreateSDNVNet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { vnet: string; zone: string; tag?: number; alias?: string; vlanaware?: number }) =>
      api.post('cluster/sdn/vnets', params),
    onSuccess: (_, vars) => {
      toast.success(`VNet "${vars.vnet}" created`)
      qc.invalidateQueries({ queryKey: ['sdn', 'vnets'] })
    },
    onError: (err) => toast.error(`Failed to create VNet — ${err.message}`),
  })
}

export function useDeleteSDNVNet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vnet: string) => api.del(`cluster/sdn/vnets/${encodeURIComponent(vnet)}`),
    onSuccess: (_, vnet) => {
      toast.success(`VNet "${vnet}" deleted`)
      qc.invalidateQueries({ queryKey: ['sdn', 'vnets'] })
    },
    onError: (err) => toast.error(`Failed to delete VNet — ${err.message}`),
  })
}

export function useCreateSDNZone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { zone: string; type: string; bridge?: string; nodes?: string; dns?: string; reversedns?: string; dnszone?: string }) =>
      api.post('cluster/sdn/zones', params),
    onSuccess: (_, vars) => {
      toast.success(`Zone "${vars.zone}" created`)
      qc.invalidateQueries({ queryKey: ['sdn', 'zones'] })
    },
    onError: (err) => toast.error(`Failed to create zone — ${err.message}`),
  })
}

export function useDeleteSDNZone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (zone: string) => api.del(`cluster/sdn/zones/${encodeURIComponent(zone)}`),
    onSuccess: (_, zone) => {
      toast.success(`Zone "${zone}" deleted`)
      qc.invalidateQueries({ queryKey: ['sdn', 'zones'] })
    },
    onError: (err) => toast.error(`Failed to delete zone — ${err.message}`),
  })
}

export function useApplySDN() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.put('cluster/sdn', {}),
    onSuccess: () => {
      toast.success('SDN changes applied')
      qc.invalidateQueries({ queryKey: ['sdn'] })
    },
    onError: (err) => toast.error(`Failed to apply SDN — ${err.message}`),
  })
}

// ── Pools ─────────────────────────────────────────────────────────────────────

export const poolKeys = {
  all:    ['pools'] as const,
  list:   () => [...poolKeys.all, 'list'] as const,
  detail: (id: string) => [...poolKeys.all, id] as const,
}

export function usePools() {
  return useQuery({
    queryKey: poolKeys.list(),
    queryFn: () => api.get<Pool[]>('pools'),
  })
}

export function usePool(poolid: string) {
  return useQuery({
    queryKey: poolKeys.detail(poolid),
    queryFn: () => api.get<Pool>(`pools/${encodeURIComponent(poolid)}`),
    enabled: !!poolid,
  })
}

export function useCreatePool() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { poolid: string; comment?: string }) =>
      api.post('pools', params),
    onSuccess: (_, vars) => {
      toast.success(`Pool "${vars.poolid}" created`)
      qc.invalidateQueries({ queryKey: poolKeys.list() })
    },
    onError: (err) => toast.error(`Failed to create pool — ${err.message}`),
  })
}

export function useUpdatePool() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ poolid, ...params }: { poolid: string; comment?: string }) =>
      api.put(`pools/${encodeURIComponent(poolid)}`, params),
    onSuccess: (_, vars) => {
      toast.success(`Pool "${vars.poolid}" updated`)
      qc.invalidateQueries({ queryKey: poolKeys.list() })
      qc.invalidateQueries({ queryKey: poolKeys.detail(vars.poolid) })
    },
    onError: (err) => toast.error(`Failed to update pool — ${err.message}`),
  })
}

export function useDeletePool() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (poolid: string) =>
      api.del(`pools/${encodeURIComponent(poolid)}`),
    onSuccess: (_, poolid) => {
      toast.success(`Pool "${poolid}" deleted`)
      qc.invalidateQueries({ queryKey: poolKeys.list() })
    },
    onError: (err) => toast.error(`Failed to delete pool — ${err.message}`),
  })
}

export function useAddPoolMembers() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ poolid, vms, storage }: { poolid: string; vms?: string; storage?: string }) =>
      api.put(`pools/${encodeURIComponent(poolid)}`, { vms, storage }),
    onSuccess: (_, vars) => {
      toast.success('Pool member(s) added')
      qc.invalidateQueries({ queryKey: poolKeys.detail(vars.poolid) })
    },
    onError: (err) => toast.error(`Failed to add member — ${err.message}`),
  })
}

export function useRemovePoolMembers() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ poolid, vms, storage }: { poolid: string; vms?: string; storage?: string }) =>
      api.put(`pools/${encodeURIComponent(poolid)}`, { vms, storage, delete: 1 }),
    onSuccess: (_, vars) => {
      toast.success('Pool member(s) removed')
      qc.invalidateQueries({ queryKey: poolKeys.detail(vars.poolid) })
    },
    onError: (err) => toast.error(`Failed to remove member — ${err.message}`),
  })
}
