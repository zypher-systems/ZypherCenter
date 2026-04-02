import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'

// ── Types ────────────────────────────────────────────────────────────────────

export interface CephHealthCheck {
  severity: 'HEALTH_WARN' | 'HEALTH_ERR'
  summary: { message: string; count: number }
}

export interface CephStatus {
  health: {
    status: 'HEALTH_OK' | 'HEALTH_WARN' | 'HEALTH_ERR'
    checks?: Record<string, CephHealthCheck>
  }
  osdmap: {
    num_osds: number
    num_up_osds: number
    num_in_osds: number
  }
  pgmap: {
    num_pgs: number
    bytes_used: number
    bytes_total: number
    bytes_avail: number
    read_op_per_sec?: number
    write_op_per_sec?: number
    read_bytes_sec?: number
    write_bytes_sec?: number
    degraded_objects?: number
    degraded_total?: number
    misplaced_objects?: number
    recovering_objects_per_sec?: number
    num_objects?: number
  }
  monmap: {
    num_mons: number
  }
  mgrmap?: {
    active_name?: string
    available?: boolean
  }
  fsmap?: {
    num_filesystems?: number
    num_standby_mds?: number
  }
}

export interface CephOSDTreeItem {
  id?: number
  type?: string
  name?: string
  status?: string
  up?: 0 | 1
  in?: 0 | 1
  'type-class'?: string
  'crush-weight'?: number
  reweight?: number
  'primary-affinity'?: number
  kb?: number
  kb_used?: number
  kb_avail?: number
  children?: CephOSDTreeItem[]
}

/** Flattened OSD with host name resolved from tree parent */
export interface CephOSD {
  id: number
  name: string
  host: string
  up: boolean
  inCluster: boolean
  deviceClass: string
  crushWeight: number
  reweight: number
  kb: number
  kbUsed: number
  kbAvail: number
}

export interface CephPool {
  pool: number
  pool_name: string
  type: number   // 1 = replicated, 3 = erasure
  size?: number
  min_size?: number
  pg_num?: number
  bytes_used?: number
  percent_used?: number
  max_avail?: number
  application?: string
  pg_autoscale_mode?: string
}

export interface CephMon {
  name: string
  addr?: string
  rank?: number
  quorum?: boolean
}

export interface CephMDS {
  name: string
  addr?: string
  rank?: number
  state?: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function flattenOSDs(
  items: CephOSDTreeItem[],
  hostName = '',
): CephOSD[] {
  const osds: CephOSD[] = []
  for (const item of items) {
    if (item.type === 'osd' && item.id != null) {
      osds.push({
        id: item.id,
        name: item.name ?? `osd.${item.id}`,
        host: hostName,
        up: item.up === 1 || item.status === 'up',
        inCluster: item.in === 1,
        deviceClass: item['type-class'] ?? 'hdd',
        crushWeight: item['crush-weight'] ?? 1,
        reweight: item.reweight ?? 1,
        kb: item.kb ?? 0,
        kbUsed: item.kb_used ?? 0,
        kbAvail: item.kb_avail ?? 0,
      })
    } else if (item.children?.length) {
      const childHost = item.type === 'host' ? (item.name ?? hostName) : hostName
      osds.push(...flattenOSDs(item.children, childHost))
    }
  }
  return osds
}

// ── Query keys ────────────────────────────────────────────────────────────────

const cephKeys = {
  status: (node: string) => ['ceph', node, 'status'] as const,
  osds:   (node: string) => ['ceph', node, 'osd']    as const,
  pools:  (node: string) => ['ceph', node, 'pools']  as const,
  mons:   (node: string) => ['ceph', node, 'mon']    as const,
  mds:    (node: string) => ['ceph', node, 'mds']    as const,
}

// ── Queries ───────────────────────────────────────────────────────────────────

export function useCephStatus(node: string) {
  return useQuery({
    queryKey: cephKeys.status(node),
    queryFn: () => api.get<CephStatus>(`nodes/${node}/ceph/status`),
    enabled: !!node,
    refetchInterval: 10_000,
    retry: false,
  })
}

export function useCephOSDs(node: string) {
  return useQuery({
    queryKey: cephKeys.osds(node),
    queryFn: () => api.get<{ root_list?: CephOSDTreeItem[] }>(`nodes/${node}/ceph/osd`),
    enabled: !!node,
    refetchInterval: 15_000,
    retry: false,
  })
}

export function useCephPools(node: string) {
  return useQuery({
    queryKey: cephKeys.pools(node),
    queryFn: () => api.get<CephPool[]>(`nodes/${node}/ceph/pools`),
    enabled: !!node,
    refetchInterval: 15_000,
    retry: false,
  })
}

export function useCephMons(node: string) {
  return useQuery({
    queryKey: cephKeys.mons(node),
    queryFn: () => api.get<CephMon[]>(`nodes/${node}/ceph/mon`),
    enabled: !!node,
    retry: false,
  })
}

export function useCephMDS(node: string) {
  return useQuery({
    queryKey: cephKeys.mds(node),
    queryFn: () => api.get<CephMDS[]>(`nodes/${node}/ceph/mds`),
    enabled: !!node,
    retry: false,
  })
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateCephPool(node: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: {
      name: string
      size: number
      pg_num: number
      min_size?: number
      application?: string
    }) => api.post(`nodes/${node}/ceph/pool`, params),
    onSuccess: (_, vars) => {
      toast.success(`Pool "${vars.name}" created`)
      qc.invalidateQueries({ queryKey: cephKeys.pools(node) })
      qc.invalidateQueries({ queryKey: cephKeys.status(node) })
    },
    onError: (err) => toast.error(`Failed to create pool — ${err.message}`),
  })
}

export function useDeleteCephPool(node: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ name, removeStorages }: { name: string; removeStorages?: boolean }) =>
      api.del(
        `nodes/${node}/ceph/pool/${encodeURIComponent(name)}${removeStorages ? '?remove_storages=1' : ''}`,
      ),
    onSuccess: (_, { name }) => {
      toast.success(`Pool "${name}" deleted`)
      qc.invalidateQueries({ queryKey: cephKeys.pools(node) })
      qc.invalidateQueries({ queryKey: cephKeys.status(node) })
    },
    onError: (err) => toast.error(`Failed to delete pool — ${err.message}`),
  })
}

export function useDestroyOSD(node: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ osdid, cleanup }: { osdid: number; cleanup?: boolean }) =>
      api.del(`nodes/${node}/ceph/osd/${osdid}${cleanup ? '?cleanup=1' : ''}`),
    onSuccess: (_, { osdid }) => {
      toast.success(`OSD ${osdid} destroyed`)
      qc.invalidateQueries({ queryKey: cephKeys.osds(node) })
      qc.invalidateQueries({ queryKey: cephKeys.status(node) })
    },
    onError: (err) => toast.error(`Failed to destroy OSD — ${err.message}`),
  })
}

export function useCreateCephOSD(node: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { dev: string; db_dev?: string; wal_dev?: string; encrypted?: number }) =>
      api.post(`nodes/${node}/ceph/osd`, params),
    onSuccess: () => {
      toast.success('OSD creation started')
      qc.invalidateQueries({ queryKey: cephKeys.osds(node) })
      qc.invalidateQueries({ queryKey: cephKeys.status(node) })
    },
    onError: (err) => toast.error(`Failed to create OSD — ${err.message}`),
  })
}

export function useCreateCephMon(node: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params?: { monaddress?: string }) =>
      api.post(`nodes/${node}/ceph/mon`, params ?? {}),
    onSuccess: () => {
      toast.success('Monitor creation started')
      qc.invalidateQueries({ queryKey: cephKeys.mons(node) })
      qc.invalidateQueries({ queryKey: cephKeys.status(node) })
    },
    onError: (err) => toast.error(`Failed to create monitor — ${err.message}`),
  })
}

export function useDestroyCephMon(node: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (monid: string) => api.del(`nodes/${node}/ceph/mon/${encodeURIComponent(monid)}`),
    onSuccess: () => {
      toast.success('Monitor removed')
      qc.invalidateQueries({ queryKey: cephKeys.mons(node) })
      qc.invalidateQueries({ queryKey: cephKeys.status(node) })
    },
    onError: (err) => toast.error(`Failed to remove monitor — ${err.message}`),
  })
}

export function useCreateCephMDS(node: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => api.post(`nodes/${node}/ceph/mds/${encodeURIComponent(name)}`, {}),
    onSuccess: () => {
      toast.success('MDS creation started')
      qc.invalidateQueries({ queryKey: cephKeys.mds(node) })
      qc.invalidateQueries({ queryKey: cephKeys.status(node) })
    },
    onError: (err) => toast.error(`Failed to create MDS — ${err.message}`),
  })
}

export function useDestroyCephMDS(node: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => api.del(`nodes/${node}/ceph/mds/${encodeURIComponent(name)}`),
    onSuccess: () => {
      toast.success('MDS removed')
      qc.invalidateQueries({ queryKey: cephKeys.mds(node) })
      qc.invalidateQueries({ queryKey: cephKeys.status(node) })
    },
    onError: (err) => toast.error(`Failed to remove MDS — ${err.message}`),
  })
}
