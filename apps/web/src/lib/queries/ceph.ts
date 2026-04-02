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

/**
 * PVE GET /nodes/{node}/ceph/osd returns a nested object tree, NOT a flat array.
 * The root-level response (after stripping the Proxmox `data` wrapper) is:
 *   { root: { leaf: 0, children: [<root bucket>, ...] }, flags?: string }
 * Each non-leaf node has `children: CephOSDTreeItem[]` (nested objects, not IDs).
 * OSD nodes already have `host` set by PVE, and storage in bytes via
 * `total_space` / `bytes_used` (PVE converts from kb×1024 before returning).
 */
export interface CephOSDTreeItem {
  id?: number
  type?: string          // 'osd' | 'host' | 'root' | 'rack' | ...
  type_id?: number       // 0 = osd, 1 = host, 10 = root (fallback for older Ceph)
  name?: string
  leaf?: 0 | 1           // 1 for OSD nodes, 0 for bucket nodes
  // OSD status set by PVE from `osd dump`
  status?: string        // 'up' | 'down'
  up?: 0 | 1             // raw Ceph field (older format fallback)
  in?: 0 | 1
  // host name — already resolved by PVE and set directly on the OSD node
  host?: string
  // storage — PVE returns bytes (kb * 1024), raw Ceph fallback uses kb fields
  total_space?: number   // bytes
  bytes_used?: number    // bytes
  percent_used?: number  // 0–100
  pgs?: number
  // CRUSH fields
  crush_weight?: number
  'crush-weight'?: number
  reweight?: number
  'primary-affinity'?: number
  // device class (field name varies by Ceph version)
  device_class?: string
  class?: string
  'type-class'?: string
  // raw Ceph kb fields (fallback if total_space/bytes_used not present)
  kb?: number
  kb_used?: number
  kb_avail?: number
  // In PVE's nested tree, children are already resolved objects (not IDs)
  children?: CephOSDTreeItem[]
}

/** Parsed OSD with all fields in consistent units */
export interface CephOSD {
  id: number
  name: string
  host: string
  up: boolean
  inCluster: boolean
  deviceClass: string
  crushWeight: number
  reweight: number
  totalBytes: number     // bytes
  usedBytes: number      // bytes
  usedPct: number        // 0–1 fraction
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
 * Recursively walk PVE's nested OSD tree and collect all OSD-type leaf nodes.
 *
 * PVE GET /nodes/{node}/ceph/osd returns:
 *   { root: { leaf:0, children:[<root buckets with nested children>] }, flags? }
 *
 * Each OSD node already has `host` set by PVE and storage in bytes
 * (`total_space` / `bytes_used`).  This walks the tree and converts each
 * OSD node into a flat CephOSD record.
 */
export function walkOSDTree(node: CephOSDTreeItem): CephOSD[] {
  const results: CephOSD[] = []

  const isOSD = node.type === 'osd' || node.type_id === 0 || node.leaf === 1
  if (isOSD && node.id != null && node.id >= 0) {
    const totalBytes = node.total_space ?? (node.kb ?? 0) * 1024
    const usedBytes  = node.bytes_used  ?? (node.kb_used ?? 0) * 1024
    const usedPct    = node.percent_used != null
      ? node.percent_used / 100
      : totalBytes > 0 ? usedBytes / totalBytes : 0

    results.push({
      id:          node.id,
      name:        node.name ?? `osd.${node.id}`,
      host:        node.host ?? '',
      up:          node.status === 'up' || node.up === 1,
      inCluster:   node.in === 1,
      deviceClass: node.device_class ?? node.class ?? node['type-class'] ?? 'hdd',
      crushWeight: node.crush_weight ?? node['crush-weight'] ?? 1,
      reweight:    node.reweight ?? 1,
      totalBytes,
      usedBytes,
      usedPct,
    })
  }

  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      results.push(...walkOSDTree(child))
    }
  }

  return results
}

/** @deprecated Use walkOSDTree with a PVE-response root node instead.
 *  Kept for any callers passing a flat array of CRUSH nodes. */
export function flattenOSDs(nodes: CephOSDTreeItem[]): CephOSD[] {
  const syntheticRoot: CephOSDTreeItem = { type: 'root', children: nodes }
  return walkOSDTree(syntheticRoot)
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

/** PVE /nodes/{node}/ceph/osd response shape (after data-wrapper strip) */
export interface CephOSDResponse {
  root: CephOSDTreeItem   // nested CRUSH tree root
  flags?: string
}

export function useCephOSDs(node: string) {
  return useQuery({
    queryKey: cephKeys.osds(node),
    queryFn: () => api.get<CephOSDResponse>(`nodes/${node}/ceph/osd`),
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
