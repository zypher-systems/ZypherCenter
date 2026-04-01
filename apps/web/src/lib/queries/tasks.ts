import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Task } from '@zyphercenter/proxmox-types'

export const taskKeys = {
  all: ['tasks'] as const,
  node: (node: string) => ['tasks', node] as const,
  log: (node: string, upid: string) => ['tasks', node, upid, 'log'] as const,
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

export function useTaskLog(node: string, upid: string, enabled: boolean) {
  return useQuery({
    queryKey: taskKeys.log(node, upid),
    queryFn: () =>
      api.get<{ n: number; t: string }[]>(
        `nodes/${encodeURIComponent(node)}/tasks/${encodeURIComponent(upid)}/log?limit=1000`,
      ),
    enabled: enabled && !!node && !!upid,
    staleTime: 30_000,
  })
}
