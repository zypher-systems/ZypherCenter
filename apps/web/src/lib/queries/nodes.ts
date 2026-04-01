import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import type { NodeStatus, NetworkInterface, NodeDisk, AptPackage, NodeStorage } from '@zyphercenter/proxmox-types'

export const nodeKeys = {
  all: (node: string) => ['nodes', node] as const,
  status: (node: string) => [...nodeKeys.all(node), 'status'] as const,
  network: (node: string) => [...nodeKeys.all(node), 'network'] as const,
  disks: (node: string) => [...nodeKeys.all(node), 'disks'] as const,
  storage: (node: string) => [...nodeKeys.all(node), 'storage'] as const,
  updates: (node: string) => [...nodeKeys.all(node), 'updates'] as const,
  tasks: (node: string) => [...nodeKeys.all(node), 'tasks'] as const,
  dns: (node: string) => [...nodeKeys.all(node), 'dns'] as const,
  time: (node: string) => [...nodeKeys.all(node), 'time'] as const,
}

export function useNodeStatus(node: string) {
  return useQuery({
    queryKey: nodeKeys.status(node),
    queryFn: () => api.get<NodeStatus>(`nodes/${node}/status`),
    refetchInterval: 5_000,
    enabled: !!node,
  })
}

export function useNodeNetwork(node: string) {
  return useQuery({
    queryKey: nodeKeys.network(node),
    queryFn: () => api.get<NetworkInterface[]>(`nodes/${node}/network`),
    enabled: !!node,
  })
}

export function useNodeDisks(node: string) {
  return useQuery({
    queryKey: nodeKeys.disks(node),
    queryFn: () => api.get<NodeDisk[]>(`nodes/${node}/disks/list`),
    enabled: !!node,
  })
}

export function useNodeStorage(node: string) {
  return useQuery({
    queryKey: nodeKeys.storage(node),
    queryFn: () => api.get<NodeStorage[]>(`nodes/${node}/storage`),
    refetchInterval: 30_000,
    enabled: !!node,
  })
}

export function useNodeUpdates(node: string) {
  return useQuery({
    queryKey: nodeKeys.updates(node),
    queryFn: () => api.get<AptPackage[]>(`nodes/${node}/apt/update`),
    enabled: !!node,
  })
}

export function useNodeTasks(node: string) {
  return useQuery({
    queryKey: nodeKeys.tasks(node),
    queryFn: () => api.get<unknown[]>(`nodes/${node}/tasks`),
    refetchInterval: 10_000,
    enabled: !!node,
  })
}

export function useNodeApplyNetwork(node: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post(`nodes/${node}/network`),
    onSuccess: () => qc.invalidateQueries({ queryKey: nodeKeys.network(node) }),
  })
}

export function useCreateNodeNetworkInterface(node: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: Record<string, unknown>) => api.post(`nodes/${node}/network`, params),
    onSuccess: (_, vars) => {
      toast.success(`Interface "${vars.iface}" created — click Apply to activate`)
      qc.invalidateQueries({ queryKey: nodeKeys.network(node) })
    },
    onError: (err) => toast.error(`Failed to create interface — ${err.message}`),
  })
}

export function useDeleteNodeNetworkInterface(node: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (iface: string) => api.del(`nodes/${node}/network/${iface}`),
    onSuccess: (_, iface) => {
      toast.success(`Interface "${iface}" removed — click Apply to activate`)
      qc.invalidateQueries({ queryKey: nodeKeys.network(node) })
    },
    onError: (err) => toast.error(`Failed to delete interface — ${err.message}`),
  })
}

export function useUpdateNodeNetworkInterface(node: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ iface, params }: { iface: string; params: Record<string, unknown> }) =>
      api.put(`nodes/${node}/network/${iface}`, params),
    onSuccess: (_, { iface }) => {
      toast.success(`Interface "${iface}" updated — click Apply to activate`)
      qc.invalidateQueries({ queryKey: nodeKeys.network(node) })
    },
    onError: (err) => toast.error(`Failed to update interface — ${err.message}`),
  })
}

export interface RrdDataPoint {
  time: number
  cpu?: number
  memused?: number
  maxmem?: number
  netin?: number
  netout?: number
  maxcpu?: number
  [key: string]: number | undefined
}

export function useNodeRrdData(node: string, timeframe: 'hour' | 'day' = 'hour') {
  return useQuery({
    queryKey: [...nodeKeys.all(node), 'rrddata', timeframe],
    queryFn: () =>
      api.get<RrdDataPoint[]>(`nodes/${node}/rrddata?timeframe=${timeframe}&cf=AVERAGE`),
    refetchInterval: 30_000,
    enabled: !!node,
  })
}

export function useWipeDisk(node: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (disk: string) => api.put(`nodes/${node}/disks/wipedisk`, { disk }),
    onSuccess: (_, disk) => {
      toast.success(`Disk ${disk} wiped`)
      qc.invalidateQueries({ queryKey: nodeKeys.disks(node) })
    },
    onError: (err) => toast.error(`Wipe failed — ${err.message}`),
  })
}

export function useInitDisk(node: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { disk: string; uuid?: string }) =>
      api.post(`nodes/${node}/disks/initgpt`, params),
    onSuccess: (_, vars) => {
      toast.success(`Disk ${vars.disk} initialized`)
      qc.invalidateQueries({ queryKey: nodeKeys.disks(node) })
    },
    onError: (err) => toast.error(`Init failed — ${err.message}`),
  })
}

export function useNodeAptUpgrade(node: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.put(`nodes/${node}/apt/update`, {}),
    onSuccess: () => {
      toast.success('Package upgrade task started')
      qc.invalidateQueries({ queryKey: nodeKeys.updates(node) })
    },
    onError: (err) => toast.error(`Upgrade failed — ${err.message}`),
  })
}

export function useNodeAptCheck(node: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post(`nodes/${node}/apt/update`, {}),
    onSuccess: () => {
      toast.success('Package list refresh started')
      qc.invalidateQueries({ queryKey: nodeKeys.updates(node) })
    },
    onError: (err) => toast.error(`Refresh failed — ${err.message}`),
  })
}

export function useNodePower(node: string) {
  return useMutation({
    mutationFn: (command: 'reboot' | 'shutdown') =>
      api.post(`nodes/${node}/status`, { command }),
    onSuccess: (_, command) =>
      toast.success(`Node ${node} ${command} initiated`),
    onError: (err) => toast.error(`Failed — ${err.message}`),
  })
}

export function useNodeTasksFiltered(
  node: string,
  params?: { vmid?: number; typefilter?: string; limit?: number },
) {
  const qs = new URLSearchParams()
  if (params?.vmid) qs.set('vmid', String(params.vmid))
  if (params?.typefilter) qs.set('typefilter', params.typefilter)
  qs.set('limit', String(params?.limit ?? 50))
  return useQuery({
    queryKey: [...nodeKeys.tasks(node), params],
    queryFn: () => api.get<Record<string, unknown>[]>(`nodes/${node}/tasks?${qs}`),
    refetchInterval: 15_000,
    enabled: !!node,
  })
}

// ── DNS ───────────────────────────────────────────────────────────────────────

export interface NodeDNSConfig {
  search?: string
  dns1?: string
  dns2?: string
  dns3?: string
}

export function useNodeDNS(node: string) {
  return useQuery({
    queryKey: nodeKeys.dns(node),
    queryFn: () => api.get<NodeDNSConfig>(`nodes/${node}/dns`),
    enabled: !!node,
  })
}

export function useUpdateNodeDNS(node: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: NodeDNSConfig) => api.put(`nodes/${node}/dns`, params),
    onSuccess: () => {
      toast.success('DNS settings updated')
      qc.invalidateQueries({ queryKey: nodeKeys.dns(node) })
    },
    onError: (err) => toast.error(`Failed to update DNS — ${err.message}`),
  })
}

// ── Time / Timezone ───────────────────────────────────────────────────────────

export interface NodeTimeConfig {
  timezone?: string
  time?: number
  localtime?: number
}

export function useNodeTime(node: string) {
  return useQuery({
    queryKey: nodeKeys.time(node),
    queryFn: () => api.get<NodeTimeConfig>(`nodes/${node}/time`),
    enabled: !!node,
  })
}

export function useUpdateNodeTime(node: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (timezone: string) => api.put(`nodes/${node}/time`, { timezone }),
    onSuccess: () => {
      toast.success('Timezone updated')
      qc.invalidateQueries({ queryKey: nodeKeys.time(node) })
    },
    onError: (err) => toast.error(`Failed to update timezone — ${err.message}`),
  })
}

// ── Services ──────────────────────────────────────────────────────────────────

export interface NodeService {
  name: string
  desc?: string
  state?: string
  unit_state?: string
}

export function useNodeServices(node: string) {
  return useQuery({
    queryKey: [...nodeKeys.all(node), 'services'],
    queryFn: () => api.get<NodeService[]>(`nodes/${node}/services`),
    refetchInterval: 15_000,
    enabled: !!node,
  })
}

export function useNodeServiceAction(node: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ service, action }: { service: string; action: 'start' | 'stop' | 'restart' | 'reload' }) =>
      api.post(`nodes/${node}/services/${service}/${action}`, {}),
    onSuccess: (_, { service, action }) => {
      toast.success(`Service ${service} ${action}ed`)
      qc.invalidateQueries({ queryKey: [...nodeKeys.all(node), 'services'] })
    },
    onError: (err) => toast.error(`Service action failed — ${err.message}`),
  })
}

// ── Node Firewall ─────────────────────────────────────────────────────────────

export function useNodeFirewallRules(node: string) {
  return useQuery({
    queryKey: [...nodeKeys.all(node), 'firewall', 'rules'],
    queryFn: () => api.get<import('@zyphercenter/proxmox-types').FirewallRule[]>(`nodes/${node}/firewall/rules`),
    enabled: !!node,
  })
}

export function useNodeFirewallOptions(node: string) {
  return useQuery({
    queryKey: [...nodeKeys.all(node), 'firewall', 'options'],
    queryFn: () => api.get<import('@zyphercenter/proxmox-types').FirewallOptions>(`nodes/${node}/firewall/options`),
    enabled: !!node,
  })
}

export function useUpdateNodeFirewallOptions(node: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: Partial<import('@zyphercenter/proxmox-types').FirewallOptions>) =>
      api.put(`nodes/${node}/firewall/options`, params),
    onSuccess: () => {
      toast.success('Firewall options updated')
      qc.invalidateQueries({ queryKey: [...nodeKeys.all(node), 'firewall', 'options'] })
    },
    onError: (err) => toast.error(`Failed to update firewall — ${err.message}`),
  })
}

export function useCreateNodeFirewallRule(node: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { action: string; type: string; enable?: number; comment?: string; source?: string; dest?: string; proto?: string; dport?: string; sport?: string; macro?: string }) =>
      api.post(`nodes/${node}/firewall/rules`, params),
    onSuccess: () => {
      toast.success('Firewall rule created')
      qc.invalidateQueries({ queryKey: [...nodeKeys.all(node), 'firewall', 'rules'] })
    },
    onError: (err) => toast.error(`Failed to create rule — ${err.message}`),
  })
}

export function useDeleteNodeFirewallRule(node: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (pos: number) =>
      api.del(`nodes/${node}/firewall/rules/${pos}`),
    onSuccess: () => {
      toast.success('Firewall rule deleted')
      qc.invalidateQueries({ queryKey: [...nodeKeys.all(node), 'firewall', 'rules'] })
    },
    onError: (err) => toast.error(`Failed to delete rule — ${err.message}`),
  })
}

export function useUpdateNodeFirewallRule(node: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ pos, params }: { pos: number; params: Record<string, unknown> }) =>
      api.put(`nodes/${node}/firewall/rules/${pos}`, params),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...nodeKeys.all(node), 'firewall', 'rules'] }),
    onError: (err) => toast.error(`Failed to update rule — ${err.message}`),
  })
}

export function useVzdump(node: string) {
  return useMutation({
    mutationFn: (params: { vmid: number; storage: string; mode?: string; compress?: string }) =>
      api.post<string>(`nodes/${node}/vzdump`, params),
    onSuccess: () => {
      toast.success('Backup task started — check Tasks for progress')
    },
    onError: (err) => toast.error(`Backup failed — ${err.message}`),
  })
}

// ── ACME / Certificates ───────────────────────────────────────────────────────

export function useNodeCertificates(node: string) {
  return useQuery({
    queryKey: [...nodeKeys.all(node), 'certificates'],
    queryFn: () => api.get<Record<string, unknown>[]>(`nodes/${node}/certificates/info`),
    enabled: !!node,
  })
}

export function useNodeACMEAccounts() {
  return useQuery({
    queryKey: ['acme', 'accounts'],
    queryFn: () => api.get<string[]>('cluster/acme/account'),
  })
}

export function useOrderNodeCertificate(node: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (force: boolean) =>
      api.post<string>(`nodes/${node}/certificates/acme/certificate`, { force: force ? 1 : 0 }),
    onSuccess: () => {
      toast.success('Certificate order/renewal task started')
      qc.invalidateQueries({ queryKey: [...nodeKeys.all(node), 'certificates'] })
    },
    onError: (err) => toast.error(`Certificate order failed — ${err.message}`),
  })
}

export function useRevokeNodeCertificate(node: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.del(`nodes/${node}/certificates/acme/certificate`),
    onSuccess: () => {
      toast.success('Certificate revoked')
      qc.invalidateQueries({ queryKey: [...nodeKeys.all(node), 'certificates'] })
    },
    onError: (err) => toast.error(`Revoke failed — ${err.message}`),
  })
}

export function useNodeACMEDomains(node: string) {
  return useQuery({
    queryKey: [...nodeKeys.all(node), 'acme', 'domains'],
    queryFn: () => api.get<Record<string, unknown>>(`nodes/${node}/config`),
    enabled: !!node,
  })
}

export function useUpdateNodeConfig(node: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: Record<string, unknown>) => api.put(`nodes/${node}/config`, params),
    onSuccess: () => {
      toast.success('Node configuration updated')
      qc.invalidateQueries({ queryKey: nodeKeys.all(node) })
    },
    onError: (err) => toast.error(`Update failed — ${err.message}`),
  })
}

export interface NodeSubscription {
  status: 'Active' | 'Expired' | 'Invalid' | 'None' | string
  level?: string
  productname?: string
  key?: string
  nextduedate?: string
  validdirectory?: string
  message?: string
  serverid?: string
  [key: string]: unknown
}

export function useNodeSubscription(node: string) {
  return useQuery({
    queryKey: [...nodeKeys.all(node), 'subscription'],
    queryFn: () => api.get<NodeSubscription>(`nodes/${node}/subscription`),
    enabled: !!node,
    staleTime: 5 * 60_000,
  })
}

export interface PCIDevice {
  id: string
  class: string
  vendor: string
  vendor_name?: string
  device: string
  device_name?: string
  subsystem_vendor?: string
  subsystem_device?: string
  iommugroup?: number
  mdev?: boolean
  [key: string]: unknown
}

export function useNodeHardwarePCI(node: string) {
  return useQuery({
    queryKey: [...nodeKeys.all(node), 'hardware', 'pci'],
    queryFn: () => api.get<PCIDevice[]>(`nodes/${node}/hardware/pci`),
    enabled: !!node,
    staleTime: 5 * 60_000,
  })
}

export interface USBDevice {
  busnum: number
  devnum: number
  vendid: string
  prodid: string
  manufacturer?: string
  product?: string
  speed?: string
  level?: number
  usbpath?: string
  port?: number
  class?: number
  [key: string]: unknown
}

export function useNodeHardwareUSB(node: string) {
  return useQuery({
    queryKey: [...nodeKeys.all(node), 'hardware', 'usb'],
    queryFn: () => api.get<USBDevice[]>(`nodes/${node}/hardware/usb`),
    enabled: !!node,
    staleTime: 5 * 60_000,
  })
}

export interface ZFSPool {
  name: string
  state: string
  status?: string
  size?: number
  alloc?: number
  free?: number
  health?: string
  scan?: string
  errors?: string
  [key: string]: unknown
}

export function useNodeZFSPools(node: string) {
  return useQuery({
    queryKey: [...nodeKeys.all(node), 'disks', 'zfs'],
    queryFn: () => api.get<ZFSPool[]>(`nodes/${node}/disks/zfs`),
    enabled: !!node,
    staleTime: 60_000,
  })
}

export function useCreateZFSPool(node: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { name: string; raidlevel: string; devices: string; add_storage?: number }) =>
      api.post(`nodes/${node}/disks/zfs`, params),
    onSuccess: () => {
      toast.success('ZFS pool created')
      qc.invalidateQueries({ queryKey: [...nodeKeys.all(node), 'disks', 'zfs'] })
      qc.invalidateQueries({ queryKey: [...nodeKeys.all(node), 'disks'] })
    },
    onError: (err) => toast.error(`Failed to create ZFS pool — ${err.message}`),
  })
}

export function useNodeZFSScrub(node: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => api.post(`nodes/${node}/disks/zfs/${encodeURIComponent(name)}`, {}),
    onSuccess: () => {
      toast.success('ZFS scrub started')
      qc.invalidateQueries({ queryKey: [...nodeKeys.all(node), 'disks', 'zfs'] })
    },
    onError: (err) => toast.error(`Scrub failed — ${err.message}`),
  })
}
