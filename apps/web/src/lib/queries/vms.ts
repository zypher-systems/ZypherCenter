import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { VMListItem, VMStatusCurrent, VMConfig, VMSnapshot, VNCProxy, FirewallRule, FirewallOptions } from '@zyphercenter/proxmox-types'

const ACTION_LABELS: Record<string, string> = {
  start: 'Start',
  stop: 'Force stop',
  shutdown: 'Shutdown',
  reboot: 'Reboot',
  reset: 'Reset',
  suspend: 'Suspend',
  resume: 'Resume',
}

export const vmKeys = {
  all: (node: string) => ['vms', node] as const,
  list: (node: string) => [...vmKeys.all(node), 'list'] as const,
  detail: (node: string, vmid: number) => [...vmKeys.all(node), vmid] as const,
  status: (node: string, vmid: number) => [...vmKeys.detail(node, vmid), 'status'] as const,
  config: (node: string, vmid: number) => [...vmKeys.detail(node, vmid), 'config'] as const,
  snapshots: (node: string, vmid: number) => [...vmKeys.detail(node, vmid), 'snapshots'] as const,
}

export function useVMs(node: string) {
  return useQuery({
    queryKey: vmKeys.list(node),
    queryFn: () => api.get<VMListItem[]>(`nodes/${node}/qemu`),
    refetchInterval: 5_000,
    enabled: !!node,
  })
}

export function useVMStatus(node: string, vmid: number) {
  return useQuery({
    queryKey: vmKeys.status(node, vmid),
    queryFn: () => api.get<VMStatusCurrent>(`nodes/${node}/qemu/${vmid}/status/current`),
    refetchInterval: 3_000,
    enabled: !!node && !!vmid,
  })
}

export function useVMConfig(node: string, vmid: number) {
  return useQuery({
    queryKey: vmKeys.config(node, vmid),
    queryFn: () => api.get<VMConfig>(`nodes/${node}/qemu/${vmid}/config`),
    enabled: !!node && !!vmid,
  })
}

export function useVMSnapshots(node: string, vmid: number) {
  return useQuery({
    queryKey: vmKeys.snapshots(node, vmid),
    queryFn: () => api.get<VMSnapshot[]>(`nodes/${node}/qemu/${vmid}/snapshot`),
    enabled: !!node && !!vmid,
  })
}

// ── VM Actions ────────────────────────────────────────────────────────────────

function useVMAction(node: string, vmid: number, action: string) {
  const qc = useQueryClient()
  return useMutation<string, Error, void>({
    mutationFn: () =>
      api.post<string>(`nodes/${node}/qemu/${vmid}/status/${action}`),
    onSuccess: () => {
      toast.success(`VM ${vmid}: ${ACTION_LABELS[action] ?? action} initiated`)
      qc.invalidateQueries({ queryKey: vmKeys.status(node, vmid) })
      qc.invalidateQueries({ queryKey: vmKeys.list(node) })
      qc.invalidateQueries({ queryKey: ['cluster', 'resources'] })
    },
    onError: (err) => {
      toast.error(`VM ${vmid}: ${ACTION_LABELS[action] ?? action} failed — ${err.message}`)
    },
  })
}

export const useVMStart = (node: string, vmid: number) => useVMAction(node, vmid, 'start')
export const useVMStop = (node: string, vmid: number) => useVMAction(node, vmid, 'stop')
export const useVMShutdown = (node: string, vmid: number) => useVMAction(node, vmid, 'shutdown')
export const useVMReboot = (node: string, vmid: number) => useVMAction(node, vmid, 'reboot')
export const useVMReset = (node: string, vmid: number) => useVMAction(node, vmid, 'reset')
export const useVMSuspend = (node: string, vmid: number) => useVMAction(node, vmid, 'suspend')
export const useVMResume = (node: string, vmid: number) => useVMAction(node, vmid, 'resume')

export function useVMVNCProxy(node: string, vmid: number) {
  return useMutation({
    mutationFn: () =>
      api.post<VNCProxy>(`nodes/${node}/qemu/${vmid}/vncproxy`, { websocket: 1 }),
  })
}

export function useCreateVMSnapshot(node: string, vmid: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { snapname: string; description?: string; vmstate?: number }) =>
      api.post<string>(`nodes/${node}/qemu/${vmid}/snapshot`, params),
    onSuccess: () => qc.invalidateQueries({ queryKey: vmKeys.snapshots(node, vmid) }),
  })
}

export function useDeleteVMSnapshot(node: string, vmid: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (snapname: string) =>
      api.del<string>(`nodes/${node}/qemu/${vmid}/snapshot/${snapname}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: vmKeys.snapshots(node, vmid) }),
  })
}

export function useRollbackVMSnapshot(node: string, vmid: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (snapname: string) =>
      api.post<string>(`nodes/${node}/qemu/${vmid}/snapshot/${snapname}/rollback`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: vmKeys.status(node, vmid) })
      qc.invalidateQueries({ queryKey: vmKeys.snapshots(node, vmid) })
    },
  })
}

export interface CreateVMParams {
  vmid: number
  name: string
  memory: number
  cores: number
  sockets?: number
  ostype?: string
  scsi0?: string
  net0?: string
  cdrom?: string
  ide2?: string
  boot?: string
  onboot?: number
}

export function useCreateVM(node: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: CreateVMParams) =>
      api.post<string>(`nodes/${node}/qemu`, params),
    onSuccess: (_, vars) => {
      toast.success(`VM ${vars.vmid} (${vars.name}) creation task started`)
      qc.invalidateQueries({ queryKey: vmKeys.list(node) })
      qc.invalidateQueries({ queryKey: ['cluster', 'resources'] })
    },
    onError: (err) => {
      toast.error(`Failed to create VM — ${err.message}`)
    },
  })
}

export function useNextVMId() {
  return useQuery({
    queryKey: ['cluster', 'nextid'],
    queryFn: () => api.get<number>('cluster/nextid'),
  })
}

// ── VM Firewall ─────────────────────────────────────────────────────────────────────────

export function useVMFirewallRules(node: string, vmid: number) {
  return useQuery({
    queryKey: [...vmKeys.detail(node, vmid), 'firewall', 'rules'],
    queryFn: () => api.get<FirewallRule[]>(`nodes/${node}/qemu/${vmid}/firewall/rules`),
    enabled: !!node && !!vmid,
  })
}

export function useVMFirewallOptions(node: string, vmid: number) {
  return useQuery({
    queryKey: [...vmKeys.detail(node, vmid), 'firewall', 'options'],
    queryFn: () => api.get<FirewallOptions>(`nodes/${node}/qemu/${vmid}/firewall/options`),
    enabled: !!node && !!vmid,
  })
}
