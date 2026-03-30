import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { NodeStatus, NetworkInterface, NodeDisk, AptPackage, NodeStorage } from '@zyphercenter/proxmox-types'

export const nodeKeys = {
  all: (node: string) => ['nodes', node] as const,
  status: (node: string) => [...nodeKeys.all(node), 'status'] as const,
  network: (node: string) => [...nodeKeys.all(node), 'network'] as const,
  disks: (node: string) => [...nodeKeys.all(node), 'disks'] as const,
  storage: (node: string) => [...nodeKeys.all(node), 'storage'] as const,
  updates: (node: string) => [...nodeKeys.all(node), 'updates'] as const,
  tasks: (node: string) => [...nodeKeys.all(node), 'tasks'] as const,
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
