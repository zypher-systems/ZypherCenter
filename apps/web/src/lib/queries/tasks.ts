import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Task } from '@zyphercenter/proxmox-types'

export const taskKeys = {
  all: ['tasks'] as const,
  node: (node: string) => ['tasks', node] as const,
}

export function useClusterTasks() {
  return useQuery({
    queryKey: taskKeys.all,
    queryFn: () => api.get<Task[]>('cluster/tasks'),
    refetchInterval: 10_000,
  })
}

export function useNodeTasks(node: string) {
  return useQuery({
    queryKey: taskKeys.node(node),
    queryFn: () => api.get<Task[]>(`nodes/${node}/tasks`),
    refetchInterval: 10_000,
    enabled: !!node,
  })
}
