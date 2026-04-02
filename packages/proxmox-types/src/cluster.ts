import { z } from 'zod'

// ─── Cluster Status ───────────────────────────────────────────────────────────

export const ClusterStatusNodeSchema = z.object({
  type: z.literal('node'),
  id: z.string(),
  name: z.string(),
  ip: z.string().optional(),
  online: z.number().int(),
  level: z.string().optional(),
  local: z.number().int().optional(),
  nodeid: z.number().int().optional(),
})

export const ClusterStatusInfoSchema = z.object({
  type: z.literal('cluster'),
  id: z.string(),
  name: z.string(),
  version: z.number().int().optional(),
  quorate: z.number().int().optional(),
  nodes: z.number().int().optional(),
})

export const ClusterStatusItemSchema = z.discriminatedUnion('type', [
  ClusterStatusNodeSchema,
  ClusterStatusInfoSchema,
])

export type ClusterStatusNode = z.infer<typeof ClusterStatusNodeSchema>
export type ClusterStatusInfo = z.infer<typeof ClusterStatusInfoSchema>
export type ClusterStatusItem = z.infer<typeof ClusterStatusItemSchema>

// ─── Cluster Resources ────────────────────────────────────────────────────────

export const ClusterResourceSchema = z.object({
  id: z.string(),
  type: z.enum(['node', 'qemu', 'lxc', 'storage', 'pool', 'sdn']),
  status: z.string().optional(),
  node: z.string().optional(),
  pool: z.string().optional(),
  name: z.string().optional(),
  storage: z.string().optional(),
  vmid: z.number().int().optional(),
  uptime: z.number().optional(),
  cpu: z.number().optional(),
  maxcpu: z.number().int().optional(),
  mem: z.number().optional(),
  maxmem: z.number().optional(),
  disk: z.number().optional(),
  maxdisk: z.number().optional(),
  netin: z.number().optional(),
  netout: z.number().optional(),
  diskread: z.number().optional(),
  diskwrite: z.number().optional(),
  template: z.number().int().optional(),
  hastate: z.string().optional(),
  lock: z.string().optional(),
  tags: z.string().optional(),
  level: z.string().optional(),
})

export type ClusterResource = z.infer<typeof ClusterResourceSchema>

// ─── Cluster Options ──────────────────────────────────────────────────────────

export const ClusterOptionsSchema = z.object({
  console: z.enum(['applet', 'vv', 'html5', 'xtermjs']).optional(),
  email_from: z.string().optional(),
  keyboard: z.string().optional(),
  language: z.string().optional(),
  max_workers: z.number().int().optional(),
  migration_unsecure: z.number().int().optional(),
  ha: z
    .object({
      shutdown_policy: z.string().optional(),
    })
    .optional(),
})

export type ClusterOptions = z.infer<typeof ClusterOptionsSchema>

// ─── Backup Jobs ──────────────────────────────────────────────────────────────

export const BackupJobSchema = z.object({
  id: z.string(),
  enabled: z.number().int().optional(),
  schedule: z.string().optional(),
  storage: z.string().optional(),
  mode: z.enum(['snapshot', 'suspend', 'stop']).optional(),
  vmid: z.string().optional(),
  node: z.string().optional(),
  comment: z.string().optional(),
  compress: z.string().optional(),
  mailnotification: z.string().optional(),
  mailto: z.string().optional(),
  maxfiles: z.number().int().optional(),
  prune_backups: z.string().optional(),
  starttime: z.string().optional(),
  dow: z.string().optional(),
})

export type BackupJob = z.infer<typeof BackupJobSchema>

// ─── Replication ──────────────────────────────────────────────────────────────

export const ReplicationJobSchema = z.object({
  id: z.string(),
  type: z.string(),
  target: z.string(),
  guest: z.number().int(),
  enabled: z.number().int().optional(),
  schedule: z.string().optional(),
  comment: z.string().optional(),
  rate: z.number().optional(),
  remove_job: z.string().optional(),
})

export type ReplicationJob = z.infer<typeof ReplicationJobSchema>

// ─── Pool ────────────────────────────────────────────────────────────────────

export const PoolMemberSchema = z.object({
  type: z.enum(['qemu', 'lxc', 'storage']),
  id: z.string(),
  vmid: z.number().int().optional(),
  storage: z.string().optional(),
  nodeid: z.string().optional(),
  node: z.string().optional(),
  name: z.string().optional(),
  status: z.string().optional(),
})

export const PoolSchema = z.object({
  poolid: z.string(),
  comment: z.string().optional(),
  members: z.array(PoolMemberSchema).optional(),
})

export type PoolMember = z.infer<typeof PoolMemberSchema>
export type Pool = z.infer<typeof PoolSchema>
