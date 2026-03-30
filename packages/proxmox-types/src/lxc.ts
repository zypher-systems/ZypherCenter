import { z } from 'zod'

// ─── LXC List Item ────────────────────────────────────────────────────────────

export const LXCListItemSchema = z.object({
  vmid: z.number().int(),
  name: z.string().optional(),
  status: z.enum(['running', 'stopped', 'paused']),
  uptime: z.number().optional(),
  cpu: z.number().optional(),
  cpus: z.number().int().optional(),
  mem: z.number().optional(),
  maxmem: z.number().optional(),
  disk: z.number().optional(),
  maxdisk: z.number().optional(),
  netin: z.number().optional(),
  netout: z.number().optional(),
  diskread: z.number().optional(),
  diskwrite: z.number().optional(),
  swap: z.number().optional(),
  maxswap: z.number().optional(),
  tags: z.string().optional(),
  template: z.number().int().optional(),
  lock: z.string().optional(),
  type: z.string().optional(),
})

export type LXCListItem = z.infer<typeof LXCListItemSchema>

// ─── LXC Config ───────────────────────────────────────────────────────────────

export const LXCConfigSchema = z
  .object({
    vmid: z.number().int().optional(),
    hostname: z.string().optional(),
    description: z.string().optional(),
    tags: z.string().optional(),
    ostype: z.string().optional(),
    arch: z.string().optional(),
    cores: z.number().int().optional(),
    cpulimit: z.number().optional(),
    cpuunits: z.number().int().optional(),
    memory: z.number().int().optional(),
    swap: z.number().int().optional(),
    rootfs: z.string().optional(),
    onboot: z.number().int().optional(),
    startup: z.string().optional(),
    protection: z.number().int().optional(),
    template: z.number().int().optional(),
    unprivileged: z.number().int().optional(),
    features: z.string().optional(),
    searchdomain: z.string().optional(),
    nameserver: z.string().optional(),
    password: z.string().optional(),
    ssh_public_keys: z.string().optional(),
    digest: z.string().optional(),
  })
  .catchall(z.unknown()) // net0, mp0, etc. are dynamic keys

export type LXCConfig = z.infer<typeof LXCConfigSchema>

// ─── LXC Snapshot ─────────────────────────────────────────────────────────────

export const LXCSnapshotSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  snaptime: z.number().optional(),
  parent: z.string().optional(),
})

export type LXCSnapshot = z.infer<typeof LXCSnapshotSchema>
