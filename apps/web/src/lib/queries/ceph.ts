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
  type_id?: number
  name?: string
  status?: string
  up?: 0 | 1
  in?: 0 | 1
  // field name varies by Ceph version: hyphenated (older) vs underscored (Reef+)
  'type-class'?: string
  device_class?: string
  class?: string
  'crush-weight'?: number
  crush_weight?: number
  reweight?: number
  'primary-affinity'?: number
  kb?: number
  kb_used?: number
  kb_avail?: number
  // children can be integer IDs (referencing another node's id) or nested objects
  children?: (number | CephOSDTreeItem)[]
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
  type: string   // 'replicated' | 'erasure' | 'unknown'
  size?: number
  min_size?: number
  pg_num?: number
  bytes_used?: number
  percent_used?: number
  max_avail?: number   // may be present from ceph df stats even though not in formal schema
  crush_rule?: number
  crush_rule_name?: string
  application_metadata?: Record<string, unknown>
  pg_autoscale_mode?: string
  autoscale_status?: Record<string, unknown>
  // derive application string from metadata
  application?: string
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

/**
 * Extract OSDs from the flat `nodes` array returned by GET /nodes/{node}/ceph/osd.
 *
 * The Proxmox API returns:
 *   { nodes: CephOSDTreeItem[], root_list: [...] }
 * where each item in `nodes` has `type`/`type_id` and `children` is an array
 * of integer IDs referencing other `nodes` entries by their `id` field.
 *
 * We:
 *  1. Build an id→node map for O(1) lookup
 *  2. Build an id→hostName map by walking host nodes' children
 *  3. Collect all OSD-type nodes and attach their host name
 */
export function flattenOSDs(nodes: CephOSDTreeItem[]): CephOSD[] {
  // Build id → node map
  const byId = new Map<number, CephOSDTreeItem>()
  for (const n of nodes) {
    if (n.id != null) byId.set(n.id, n)
  }

  // Build osdId → hostName from host nodes
  const osdHost = new Map<number, string>()
  for (const n of nodes) {
    const isHost = n.type === 'host' || n.type_id === 1
    if (isHost && n.children?.length) {
      for (const child of n.children) {
        const childId = typeof child === 'number' ? child : child.id
        if (childId != null) {
          osdHost.set(childId, n.name ?? '')
        }
      }
    }
  }

  // Collect OSD nodes
  const osds: CephOSD[] = []
  for (const n of nodes) {
    const isOSD = n.type === 'osd' || n.type_id === 0
    if (isOSD && n.id != null && n.id >= 0) {
      osds.push({
        id: n.id,
        name: n.name ?? `osd.${n.id}`,
        host: osdHost.get(n.id) ?? '',
        up: n.up === 1 || n.status === 'up',
        inCluster: n.in === 1,
        deviceClass: n.device_class ?? n.class ?? n['type-class'] ?? 'hdd',
        crushWeight: n.crush_weight ?? n['crush-weight'] ?? 1,
        reweight: n.reweight ?? 1,
        kb: n.kb ?? 0,
        kbUsed: n.kb_used ?? 0,
        kbAvail: n.kb_avail ?? 0,
      })
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
    queryFn: () => api.get<{ root_list?: CephOSDTreeItem[] } | CephOSDTreeItem[]>(`nodes/${node}/ceph/osd`),
    enabled: !!node,
    refetchInterval: 15_000,
    retry: 1,
  })
}

export function useCephPools(node: string) {
  return useQuery({
    queryKey: cephKeys.pools(node),
    // Correct Proxmox endpoint is /ceph/pool (singular) — bytes_used/percent_used are always included
    queryFn: () => api.get<CephPool[]>(`nodes/${node}/ceph/pool`),
    enabled: !!node,
    refetchInterval: 15_000,
    retry: 1,
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

export function useUpdateCephPool(node: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ name, params }: { name: string; params: { size?: number; min_size?: number; pg_num?: number; pg_autoscale_mode?: string; application?: string } }) =>
      api.put(`nodes/${node}/ceph/pool/${encodeURIComponent(name)}`, params),
    onSuccess: (_, { name }) => {
      toast.success(`Pool "${name}" updated`)
      qc.invalidateQueries({ queryKey: cephKeys.pools(node) })
    },
    onError: (err) => toast.error(`Failed to update pool — ${err.message}`),
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

export function useOSDInOut(node: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ osdid, action }: { osdid: number; action: 'in' | 'out' }) =>
      api.post(`nodes/${node}/ceph/osd/${osdid}/${action}`, {}),
    onSuccess: (_, { osdid, action }) => {
      toast.success(`OSD ${osdid} marked ${action}`)
      qc.invalidateQueries({ queryKey: cephKeys.osds(node) })
      qc.invalidateQueries({ queryKey: cephKeys.status(node) })
    },
    onError: (err) => toast.error(`OSD action failed — ${err.message}`),
  })
}
