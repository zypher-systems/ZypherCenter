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

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userid, params }: { userid: string; params: Record<string, unknown> }) =>
      api.put(`access/users/${encodeURIComponent(userid)}`, params),
    onSuccess: () => qc.invalidateQueries({ queryKey: accessKeys.users }),
  })
}

export function useCreateGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: Record<string, unknown>) => api.post('access/groups', params),
    onSuccess: () => qc.invalidateQueries({ queryKey: accessKeys.groups }),
  })
}

export function useDeleteGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (groupid: string) => api.del(`access/groups/${encodeURIComponent(groupid)}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: accessKeys.groups }),
  })
}

export function useUpdateGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ groupid, params }: { groupid: string; params: Record<string, unknown> }) =>
      api.put(`access/groups/${encodeURIComponent(groupid)}`, params),
    onSuccess: () => qc.invalidateQueries({ queryKey: accessKeys.groups }),
  })
}

export function useCreateRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: Record<string, unknown>) => api.post('access/roles', params),
    onSuccess: () => qc.invalidateQueries({ queryKey: accessKeys.roles }),
  })
}

export function useDeleteRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (roleid: string) => api.del(`access/roles/${encodeURIComponent(roleid)}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: accessKeys.roles }),
  })
}

export function useUpdateRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ roleid, params }: { roleid: string; params: Record<string, unknown> }) =>
      api.put(`access/roles/${encodeURIComponent(roleid)}`, params),
    onSuccess: () => qc.invalidateQueries({ queryKey: accessKeys.roles }),
  })
}

export function useAddACL() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: Record<string, unknown>) => api.put('access/acl', params),
    onSuccess: () => qc.invalidateQueries({ queryKey: accessKeys.acl }),
  })
}

export function useDeleteACL() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: Record<string, unknown>) => api.put('access/acl', { ...params, delete: 1 }),
    onSuccess: () => qc.invalidateQueries({ queryKey: accessKeys.acl }),
  })
}

export function useCreateRealm() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: Record<string, unknown>) =>
      api.post(`access/domains`, params),
    onSuccess: () => qc.invalidateQueries({ queryKey: accessKeys.realms }),
  })
}

export function useDeleteRealm() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (realm: string) => api.del(`access/domains/${encodeURIComponent(realm)}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: accessKeys.realms }),
  })
}
