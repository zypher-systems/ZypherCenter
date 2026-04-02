import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
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
    mutationFn: (params: { sid: string; group?: string; state?: string; max_restart?: number; max_relocate?: number; comment?: string }) =>
      api.post('cluster/ha/resources', params),
    onSuccess: (_, vars) => {
      toast.success(`HA resource "${vars.sid}" added`)
      qc.invalidateQueries({ queryKey: haKeys.resources })
    },
    onError: (err) => toast.error(`Failed to add HA resource — ${err.message}`),
  })
}

export function useDeleteHAResource() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (sid: string) => api.del(`cluster/ha/resources/${encodeURIComponent(sid)}`),
    onSuccess: (_, sid) => {
      toast.success(`HA resource "${sid}" removed`)
      qc.invalidateQueries({ queryKey: haKeys.resources })
    },
    onError: (err) => toast.error(`Failed to remove HA resource — ${err.message}`),
  })
}

export function useCreateHAGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { group: string; nodes: string; comment?: string; restricted?: number; nofailback?: number }) =>
      api.post('cluster/ha/groups', params),
    onSuccess: (_, vars) => {
      toast.success(`HA group "${vars.group}" created`)
      qc.invalidateQueries({ queryKey: haKeys.groups })
    },
    onError: (err) => toast.error(`Failed to create HA group — ${err.message}`),
  })
}

export function useDeleteHAGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (group: string) => api.del(`cluster/ha/groups/${encodeURIComponent(group)}`),
    onSuccess: (_, group) => {
      toast.success(`HA group "${group}" deleted`)
      qc.invalidateQueries({ queryKey: haKeys.groups })
    },
    onError: (err) => toast.error(`Failed to delete HA group — ${err.message}`),
  })
}

export function useUpdateHAGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ group, params }: { group: string; params: { nodes?: string; comment?: string; restricted?: number; nofailback?: number } }) =>
      api.put(`cluster/ha/groups/${encodeURIComponent(group)}`, params),
    onSuccess: (_, { group }) => {
      toast.success(`HA group "${group}" updated`)
      qc.invalidateQueries({ queryKey: haKeys.groups })
    },
    onError: (err) => toast.error(`Failed to update HA group — ${err.message}`),
  })
}

export function useUpdateHAResource() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ sid, params }: { sid: string; params: Record<string, unknown> }) =>
      api.put(`cluster/ha/resources/${encodeURIComponent(sid)}`, params),
    onSuccess: (_, { sid }) => {
      toast.success(`HA resource "${sid}" updated`)
      qc.invalidateQueries({ queryKey: haKeys.resources })
    },
    onError: (err) => toast.error(`Update failed — ${err.message}`),
  })
}
