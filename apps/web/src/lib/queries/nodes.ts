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
