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
    onSuccess: (_, vars) => {
      toast.success(`Snapshot "${vars.snapname}" task started`)
      qc.invalidateQueries({ queryKey: vmKeys.snapshots(node, vmid) })
    },
    onError: (err) => toast.error(`Snapshot failed — ${err.message}`),
  })
}

export function useDeleteVMSnapshot(node: string, vmid: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (snapname: string) =>
      api.del<string>(`nodes/${node}/qemu/${vmid}/snapshot/${snapname}`),
    onSuccess: (_, snapname) => {
      toast.success(`Snapshot "${snapname}" delete task started`)
      qc.invalidateQueries({ queryKey: vmKeys.snapshots(node, vmid) })
    },
    onError: (err) => toast.error(`Delete failed — ${err.message}`),
  })
}

export function useRollbackVMSnapshot(node: string, vmid: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (snapname: string) =>
      api.post<string>(`nodes/${node}/qemu/${vmid}/snapshot/${snapname}/rollback`),
    onSuccess: (_, snapname) => {
      toast.success(`Rollback to "${snapname}" task started`)
      qc.invalidateQueries({ queryKey: vmKeys.status(node, vmid) })
      qc.invalidateQueries({ queryKey: vmKeys.snapshots(node, vmid) })
    },
    onError: (err) => toast.error(`Rollback failed — ${err.message}`),
  })
}

export function useMigrateVM(node: string, vmid: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { target: string; online?: number; with_local_disks?: number }) =>
      api.post<string>(`nodes/${node}/qemu/${vmid}/migrate`, params),
    onSuccess: (_, vars) => {
      toast.success(`VM ${vmid}: migration to ${vars.target} task started`)
      qc.invalidateQueries({ queryKey: vmKeys.status(node, vmid) })
      qc.invalidateQueries({ queryKey: ['cluster', 'resources'] })
    },
    onError: (err) => toast.error(`Migration failed — ${err.message}`),
  })
}

export function useCloneVM(node: string, vmid: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { newid: number; name?: string; full?: number; description?: string }) =>
      api.post<string>(`nodes/${node}/qemu/${vmid}/clone`, params),
    onSuccess: (_, vars) => {
      toast.success(`Clone to VM ${vars.newid} task started`)
      qc.invalidateQueries({ queryKey: vmKeys.list(node) })
      qc.invalidateQueries({ queryKey: ['cluster', 'resources'] })
    },
    onError: (err) => toast.error(`Clone failed — ${err.message}`),
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

export function useDeleteVM(node: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ vmid, purge }: { vmid: number; purge?: boolean }) =>
      api.del(`nodes/${node}/qemu/${vmid}${purge ? '?purge=1&destroy-unreferenced-disks=1' : ''}`),
    onSuccess: (_, { vmid }) => {
      toast.success(`VM ${vmid} deletion task started`)
      qc.invalidateQueries({ queryKey: vmKeys.list(node) })
      qc.invalidateQueries({ queryKey: ['cluster', 'resources'] })
    },
    onError: (err) => toast.error(`Failed to delete VM — ${err.message}`),
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

export function useCreateVMFirewallRule(node: string, vmid: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { action: string; type: string; enable?: number; comment?: string; source?: string; dest?: string; proto?: string; dport?: string; sport?: string; macro?: string }) =>
      api.post(`nodes/${node}/qemu/${vmid}/firewall/rules`, params),
    onSuccess: () => {
      toast.success('Firewall rule created')
      qc.invalidateQueries({ queryKey: [...vmKeys.detail(node, vmid), 'firewall', 'rules'] })
    },
    onError: (err) => toast.error(`Failed to create rule — ${err.message}`),
  })
}

export function useUpdateVMConfig(node: string, vmid: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: Record<string, unknown>) =>
      api.put(`nodes/${node}/qemu/${vmid}/config`, params),
    onSuccess: () => {
      toast.success('VM configuration updated')
      qc.invalidateQueries({ queryKey: vmKeys.config(node, vmid) })
    },
    onError: (err) => toast.error(`Update failed — ${err.message}`),
  })
}

export function useDeleteVMFirewallRule(node: string, vmid: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (pos: number) =>
      api.del(`nodes/${node}/qemu/${vmid}/firewall/rules/${pos}`),
    onSuccess: () => {
      toast.success('Firewall rule deleted')
      qc.invalidateQueries({ queryKey: [...vmKeys.detail(node, vmid), 'firewall', 'rules'] })
    },
    onError: (err) => toast.error(`Failed to delete rule — ${err.message}`),
  })
}

export function useRestoreVM(node: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { archive: string; vmid: number; storage: string; unique?: number; start?: number }) =>
      api.post<string>(`nodes/${node}/qemu`, { ...params, restore: 1 }),
    onSuccess: () => {
      toast.success('VM restore task started — check Tasks for progress')
      qc.invalidateQueries({ queryKey: ['vms'] })
    },
    onError: (err) => toast.error(`Restore failed — ${err.message}`),
  })
}

export function useResizeVMDisk(node: string, vmid: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ disk, size }: { disk: string; size: string }) =>
      api.put(`nodes/${node}/qemu/${vmid}/resize`, { disk, size }),
    onSuccess: () => {
      toast.success('Disk resize submitted')
      qc.invalidateQueries({ queryKey: vmKeys.config(node, vmid) })
    },
    onError: (err) => toast.error(`Resize failed — ${err.message}`),
  })
}

export function useTemplateVM(node: string, vmid: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post(`nodes/${node}/qemu/${vmid}/template`, {}),
    onSuccess: () => {
      toast.success('VM converted to template')
      qc.invalidateQueries({ queryKey: vmKeys.status(node, vmid) })
    },
    onError: (err) => toast.error(`Failed — ${err.message}`),
  })
}

export const agentKeys = {
  osinfo:     (node: string, vmid: number) => ['agent', node, vmid, 'osinfo']     as const,
  interfaces: (node: string, vmid: number) => ['agent', node, vmid, 'interfaces'] as const,
}

export function useVMAgentOsInfo(node: string, vmid: number, enabled = true) {
  return useQuery({
    queryKey: agentKeys.osinfo(node, vmid),
    queryFn: () => api.get(`nodes/${node}/qemu/${vmid}/agent/get-osinfo`),
    enabled: !!node && !!vmid && enabled,
    retry: false,
  })
}

export function useVMAgentNetworkInterfaces(node: string, vmid: number, enabled = true) {
  return useQuery({
    queryKey: agentKeys.interfaces(node, vmid),
    queryFn: () => api.get(`nodes/${node}/qemu/${vmid}/agent/network-get-interfaces`),
    enabled: !!node && !!vmid && enabled,
    retry: false,
  })
}
