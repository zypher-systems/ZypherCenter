import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { User, Group, Role, ACLEntry, Realm } from '@zyphercenter/proxmox-types'

export const accessKeys = {
  users: ['access', 'users'] as const,
  groups: ['access', 'groups'] as const,
  roles: ['access', 'roles'] as const,
  acl: ['access', 'acl'] as const,
  realms: ['access', 'realms'] as const,
}

export function useUsers() {
  return useQuery({ queryKey: accessKeys.users, queryFn: () => api.get<User[]>('access/users') })
}

export function useGroups() {
  return useQuery({ queryKey: accessKeys.groups, queryFn: () => api.get<Group[]>('access/groups') })
}

export function useRoles() {
  return useQuery({ queryKey: accessKeys.roles, queryFn: () => api.get<Role[]>('access/roles') })
}

export function useACL() {
  return useQuery({ queryKey: accessKeys.acl, queryFn: () => api.get<ACLEntry[]>('access/acl') })
}

export function useRealms() {
  return useQuery({
    queryKey: accessKeys.realms,
    queryFn: () => api.get<Realm[]>('access/domains'),
  })
}

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: Record<string, unknown>) => api.post('access/users', params),
    onSuccess: () => qc.invalidateQueries({ queryKey: accessKeys.users }),
  })
}

export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userid: string) => api.del(`access/users/${encodeURIComponent(userid)}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: accessKeys.users }),
  })
}
