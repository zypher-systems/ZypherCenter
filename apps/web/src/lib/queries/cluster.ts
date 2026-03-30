import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { ClusterStatusItem, ClusterResource, ClusterOptions, BackupJob, ReplicationJob } from '@zyphercenter/proxmox-types'

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

export function useClusterReplication() {
  return useQuery({
    queryKey: clusterKeys.replication(),
    queryFn: () => api.get<ReplicationJob[]>('cluster/replication'),
    refetchInterval: 30_000,
  })
}
