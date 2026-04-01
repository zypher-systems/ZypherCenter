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
    onSuccess: (_, vars) => {
      toast.success(`Snapshot "${vars.snapname}" task started`)
      qc.invalidateQueries({ queryKey: lxcKeys.snapshots(node, vmid) })
    },
    onError: (err) => toast.error(`Snapshot failed — ${err.message}`),
  })
}

export function useDeleteLXCSnapshot(node: string, vmid: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (snapname: string) =>
      api.del<string>(`nodes/${node}/lxc/${vmid}/snapshot/${snapname}`),
    onSuccess: (_, snapname) => {
      toast.success(`Snapshot "${snapname}" delete task started`)
      qc.invalidateQueries({ queryKey: lxcKeys.snapshots(node, vmid) })
    },
    onError: (err) => toast.error(`Delete failed — ${err.message}`),
  })
}

export function useRollbackLXCSnapshot(node: string, vmid: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (snapname: string) =>
      api.post<string>(`nodes/${node}/lxc/${vmid}/snapshot/${encodeURIComponent(snapname)}/rollback`, {}),
    onSuccess: (_, snapname) => {
      toast.success(`Rollback to "${snapname}" task started`)
      qc.invalidateQueries({ queryKey: lxcKeys.snapshots(node, vmid) })
      qc.invalidateQueries({ queryKey: lxcKeys.status(node, vmid) })
    },
    onError: (err) => toast.error(`Rollback failed — ${err.message}`),
  })
}

export function useMigrateLXC(node: string, vmid: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { target: string; online?: number }) =>
      api.post<string>(`nodes/${node}/lxc/${vmid}/migrate`, params),
    onSuccess: (_, vars) => {
      toast.success(`CT ${vmid}: migration to ${vars.target} task started`)
      qc.invalidateQueries({ queryKey: lxcKeys.status(node, vmid) })
      qc.invalidateQueries({ queryKey: ['cluster', 'resources'] })
    },
    onError: (err) => toast.error(`Migration failed — ${err.message}`),
  })
}

export function useCloneLXC(node: string, vmid: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { newid: number; hostname?: string; full?: number; description?: string }) =>
      api.post<string>(`nodes/${node}/lxc/${vmid}/clone`, params),
    onSuccess: (_, vars) => {
      toast.success(`Clone to CT ${vars.newid} task started`)
      qc.invalidateQueries({ queryKey: lxcKeys.list(node) })
      qc.invalidateQueries({ queryKey: ['cluster', 'resources'] })
    },
    onError: (err) => toast.error(`Clone failed — ${err.message}`),
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
export function useDeleteLXC(node: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ vmid, purge }: { vmid: number; purge?: boolean }) =>
      api.del(`nodes/${node}/lxc/${vmid}${purge ? '?purge=1&destroy-unreferenced-disks=1' : ''}`),
    onSuccess: (_, { vmid }) => {
      toast.success(`Container ${vmid} deletion task started`)
      qc.invalidateQueries({ queryKey: lxcKeys.list(node) })
      qc.invalidateQueries({ queryKey: ['cluster', 'resources'] })
    },
    onError: (err) => toast.error(`Failed to delete container — ${err.message}`),
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

export function useCreateLXCFirewallRule(node: string, vmid: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { action: string; type: string; enable?: number; comment?: string; source?: string; dest?: string; proto?: string; dport?: string; sport?: string; macro?: string }) =>
      api.post(`nodes/${node}/lxc/${vmid}/firewall/rules`, params),
    onSuccess: () => {
      toast.success('Firewall rule created')
      qc.invalidateQueries({ queryKey: [...lxcKeys.detail(node, vmid), 'firewall', 'rules'] })
    },
    onError: (err) => toast.error(`Failed to create rule — ${err.message}`),
  })
}

export function useDeleteLXCFirewallRule(node: string, vmid: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (pos: number) =>
      api.del(`nodes/${node}/lxc/${vmid}/firewall/rules/${pos}`),
    onSuccess: () => {
      toast.success('Firewall rule deleted')
      qc.invalidateQueries({ queryKey: [...lxcKeys.detail(node, vmid), 'firewall', 'rules'] })
    },
    onError: (err) => toast.error(`Failed to delete rule — ${err.message}`),
  })
}

export function useUpdateLXCConfig(node: string, vmid: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: Record<string, unknown>) =>
      api.put(`nodes/${node}/lxc/${vmid}/config`, params),
    onSuccess: () => {
      toast.success('Container configuration updated')
      qc.invalidateQueries({ queryKey: lxcKeys.config(node, vmid) })
    },
    onError: (err) => toast.error(`Update failed — ${err.message}`),
  })
}

export function useRestoreLXC(node: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { archive: string; vmid: number; storage: string; unique?: number; start?: number }) =>
      api.post<string>(`nodes/${node}/lxc`, { ...params, restore: 1 }),
    onSuccess: () => {
      toast.success('Container restore task started — check Tasks for progress')
      qc.invalidateQueries({ queryKey: ['lxc'] })
    },
    onError: (err) => toast.error(`Restore failed — ${err.message}`),
  })
}

export function useResizeLXCDisk(node: string, vmid: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ disk, size }: { disk: string; size: string }) =>
      api.put(`nodes/${node}/lxc/${vmid}/resize`, { disk, size }),
    onSuccess: () => {
      toast.success('Disk resize submitted')
      qc.invalidateQueries({ queryKey: lxcKeys.config(node, vmid) })
    },
    onError: (err) => toast.error(`Resize failed — ${err.message}`),
  })
}

export function useTemplateLXC(node: string, vmid: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post(`nodes/${node}/lxc/${vmid}/template`, {}),
    onSuccess: () => {
      toast.success('Container converted to template')
      qc.invalidateQueries({ queryKey: lxcKeys.status(node, vmid) })
    },
    onError: (err) => toast.error(`Failed — ${err.message}`),
  })
}

export function useLXCInterfaces(node: string, vmid: number, enabled = false) {
  return useQuery({
    queryKey: [...lxcKeys.detail(node, vmid), 'interfaces'] as const,
    queryFn: () => api.get<{ name: string; 'inet': string; 'inet6'?: string }[]>(`nodes/${node}/lxc/${vmid}/interfaces`),
    enabled: !!node && !!vmid && enabled,
    refetchInterval: enabled ? 30_000 : false,
  })
}

export interface LXCRrdPoint {
  time: number
  cpu?: number
  mem?: number
  maxmem?: number
  netin?: number
  netout?: number
  diskread?: number
  diskwrite?: number
  [key: string]: number | undefined
}

export function useLXCRrdData(node: string, vmid: number, timeframe: 'hour' | 'day' = 'hour') {
  return useQuery({
    queryKey: [...lxcKeys.detail(node, vmid), 'rrddata', timeframe],
    queryFn: () =>
      api.get<LXCRrdPoint[]>(`nodes/${node}/lxc/${vmid}/rrddata?timeframe=${timeframe}&cf=AVERAGE`),
    refetchInterval: 30_000,
    enabled: !!node && !!vmid,
  })
}
