import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { HAResource, HAGroup, HAStatus } from '@zyphercenter/proxmox-types'

export const haKeys = {
  resources: ['ha', 'resources'] as const,
  groups: ['ha', 'groups'] as const,
  status: ['ha', 'status'] as const,
}

export function useHAResources() {
  return useQuery({
    queryKey: haKeys.resources,
    queryFn: () => api.get<HAResource[]>('cluster/ha/resources'),
    refetchInterval: 15_000,
  })
}

export function useHAGroups() {
  return useQuery({
    queryKey: haKeys.groups,
    queryFn: () => api.get<HAGroup[]>('cluster/ha/groups'),
  })
}

export function useHAStatus() {
  return useQuery({
    queryKey: haKeys.status,
    queryFn: () => api.get<HAStatus>('cluster/ha/status/current'),
    refetchInterval: 15_000,
  })
}

export function useCreateHAResource() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { sid: string; group?: string; state?: string }) =>
      api.post('cluster/ha/resources', params),
    onSuccess: () => qc.invalidateQueries({ queryKey: haKeys.resources }),
  })
}

export function useDeleteHAResource() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (sid: string) => api.del(`cluster/ha/resources/${encodeURIComponent(sid)}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: haKeys.resources }),
  })
}
