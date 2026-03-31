import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { LXCListItem, LXCConfig, LXCSnapshot, VNCProxy, FirewallRule, FirewallOptions } from '@zyphercenter/proxmox-types'

const ACTION_LABELS: Record<string, string> = {
  start: 'Start',
  stop: 'Force stop',
  shutdown: 'Shutdown',
  reboot: 'Reboot',
  suspend: 'Suspend',
  resume: 'Resume',
}

export const lxcKeys = {
  all: (node: string) => ['lxc', node] as const,
  list: (node: string) => [...lxcKeys.all(node), 'list'] as const,
  detail: (node: string, vmid: number) => [...lxcKeys.all(node), vmid] as const,
  status: (node: string, vmid: number) => [...lxcKeys.detail(node, vmid), 'status'] as const,
  config: (node: string, vmid: number) => [...lxcKeys.detail(node, vmid), 'config'] as const,
  snapshots: (node: string, vmid: number) => [...lxcKeys.detail(node, vmid), 'snapshots'] as const,
}

export function useLXCs(node: string) {
  return useQuery({
    queryKey: lxcKeys.list(node),
    queryFn: () => api.get<LXCListItem[]>(`nodes/${node}/lxc`),
    refetchInterval: 5_000,
    enabled: !!node,
  })
}

export function useLXCStatus(node: string, vmid: number) {
  return useQuery({
    queryKey: lxcKeys.status(node, vmid),
    queryFn: () => api.get<LXCListItem>(`nodes/${node}/lxc/${vmid}/status/current`),
    refetchInterval: 3_000,
    enabled: !!node && !!vmid,
  })
}

export function useLXCConfig(node: string, vmid: number) {
  return useQuery({
    queryKey: lxcKeys.config(node, vmid),
    queryFn: () => api.get<LXCConfig>(`nodes/${node}/lxc/${vmid}/config`),
    enabled: !!node && !!vmid,
  })
}

export function useLXCSnapshots(node: string, vmid: number) {
  return useQuery({
    queryKey: lxcKeys.snapshots(node, vmid),
    queryFn: () => api.get<LXCSnapshot[]>(`nodes/${node}/lxc/${vmid}/snapshot`),
    enabled: !!node && !!vmid,
  })
}

function useLXCAction(node: string, vmid: number, action: string) {
  const qc = useQueryClient()
  return useMutation<string, Error, void>({
    mutationFn: () =>
      api.post<string>(`nodes/${node}/lxc/${vmid}/status/${action}`),
    onSuccess: () => {
      toast.success(`CT ${vmid}: ${ACTION_LABELS[action] ?? action} initiated`)
      qc.invalidateQueries({ queryKey: lxcKeys.status(node, vmid) })
      qc.invalidateQueries({ queryKey: lxcKeys.list(node) })
      qc.invalidateQueries({ queryKey: ['cluster', 'resources'] })
    },
    onError: (err) => {
      toast.error(`CT ${vmid}: ${ACTION_LABELS[action] ?? action} failed — ${err.message}`)
    },
  })
}

export const useLXCStart = (node: string, vmid: number) => useLXCAction(node, vmid, 'start')
export const useLXCStop = (node: string, vmid: number) => useLXCAction(node, vmid, 'stop')
export const useLXCShutdown = (node: string, vmid: number) => useLXCAction(node, vmid, 'shutdown')
export const useLXCReboot = (node: string, vmid: number) => useLXCAction(node, vmid, 'reboot')
export const useLXCSuspend = (node: string, vmid: number) => useLXCAction(node, vmid, 'suspend')
export const useLXCResume = (node: string, vmid: number) => useLXCAction(node, vmid, 'resume')

export function useLXCVNCProxy(node: string, vmid: number) {
  return useMutation({
    mutationFn: () =>
      api.post<VNCProxy>(`nodes/${node}/lxc/${vmid}/vncproxy`, { websocket: 1 }),
  })
}

export function useCreateLXCSnapshot(node: string, vmid: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { snapname: string; description?: string }) =>
      api.post<string>(`nodes/${node}/lxc/${vmid}/snapshot`, params),
    onSuccess: () => qc.invalidateQueries({ queryKey: lxcKeys.snapshots(node, vmid) }),
  })
}

export function useDeleteLXCSnapshot(node: string, vmid: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (snapname: string) =>
      api.del<string>(`nodes/${node}/lxc/${vmid}/snapshot/${snapname}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: lxcKeys.snapshots(node, vmid) }),
  })
}

export interface CreateLXCParams {
  vmid: number
  hostname: string
  password: string
  memory: number
  swap: number
  cores: number
  rootfs: string
  ostemplate: string
  net0?: string
  onboot?: number
  unprivileged?: number
  start?: number
}

export function useCreateLXC(node: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: CreateLXCParams) =>
      api.post<string>(`nodes/${node}/lxc`, params),
    onSuccess: (_, vars) => {
      toast.success(`CT ${vars.vmid} (${vars.hostname}) creation task started`)
      qc.invalidateQueries({ queryKey: lxcKeys.list(node) })
      qc.invalidateQueries({ queryKey: ['cluster', 'resources'] })
    },
    onError: (err) => {
      toast.error(`Failed to create container — ${err.message}`)
    },
  })
}

// ── LXC Firewall ─────────────────────────────────────────────────────────────────────────

export function useLXCFirewallRules(node: string, vmid: number) {
  return useQuery({
    queryKey: [...lxcKeys.detail(node, vmid), 'firewall', 'rules'],
    queryFn: () => api.get<FirewallRule[]>(`nodes/${node}/lxc/${vmid}/firewall/rules`),
    enabled: !!node && !!vmid,
  })
}

export function useLXCFirewallOptions(node: string, vmid: number) {
  return useQuery({
    queryKey: [...lxcKeys.detail(node, vmid), 'firewall', 'options'],
    queryFn: () => api.get<FirewallOptions>(`nodes/${node}/lxc/${vmid}/firewall/options`),
    enabled: !!node && !!vmid,
  })
}
