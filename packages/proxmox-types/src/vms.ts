import { z } from 'zod'

// ─── VM List Item ─────────────────────────────────────────────────────────────

export const VMListItemSchema = z.object({
  vmid: z.number().int(),
  name: z.string().optional(),
  status: z.enum(['running', 'stopped', 'paused', 'suspended']),
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
  tags: z.string().optional(),
  template: z.number().int().optional(),
  lock: z.string().optional(),
  pid: z.number().int().optional(),
  qmpstatus: z.string().optional(),
})

export type VMListItem = z.infer<typeof VMListItemSchema>

// ─── VM Current Status ────────────────────────────────────────────────────────

export const VMStatusCurrentSchema = VMListItemSchema.extend({
  ha: z
    .object({
      group: z.string().optional(),
      managed: z.number().int(),
      state: z.string().optional(),
    })
    .optional(),
  balloon: z.number().optional(),
  freemem: z.number().optional(),
  agent: z.number().int().optional(),
})

export type VMStatusCurrent = z.infer<typeof VMStatusCurrentSchema>

// ─── VM Config ────────────────────────────────────────────────────────────────

export const VMConfigSchema = z
  .object({
    vmid: z.number().int().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    tags: z.string().optional(),
    onboot: z.number().int().optional(),
    startup: z.string().optional(),
    protection: z.number().int().optional(),
    template: z.number().int().optional(),
    cores: z.number().int().optional(),
    sockets: z.number().int().optional(),
    cpu: z.string().optional(),
    cpulimit: z.number().optional(),
    cpuunits: z.number().int().optional(),
    numa: z.number().int().optional(),
    memory: z.number().int().optional(),
    balloon: z.number().int().optional(),
    shares: z.number().int().optional(),
    bios: z.enum(['seabios', 'ovmf']).optional(),
    machine: z.string().optional(),
    boot: z.string().optional(),
    ostype: z.string().optional(),
    scsihw: z.string().optional(),
    agent: z.string().optional(),
    acpi: z.number().int().optional(),
    kvm: z.number().int().optional(),
    freeze: z.number().int().optional(),
    vga: z.string().optional(),
    tablet: z.number().int().optional(),
    hotplug: z.string().optional(),
    localtime: z.number().int().optional(),
    lock: z.string().optional(),
    digest: z.string().optional(),
    // Cloud-init
    citype: z.string().optional(),
    ciuser: z.string().optional(),
    cipassword: z.string().optional(),
    searchdomain: z.string().optional(),
    nameserver: z.string().optional(),
    sshkeys: z.string().optional(),
  })
  .catchall(z.unknown()) // nets, disks, etc. are dynamic keys like net0, scsi0

export type VMConfig = z.infer<typeof VMConfigSchema>

// ─── VM Snapshot ──────────────────────────────────────────────────────────────

export const VMSnapshotSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  snaptime: z.number().optional(),
  vmstate: z.number().int().optional(),
  running: z.number().int().optional(),
  parent: z.string().optional(),
})

export type VMSnapshot = z.infer<typeof VMSnapshotSchema>

// ─── VNC / Console ────────────────────────────────────────────────────────────

export const VNCProxySchema = z.object({
  ticket: z.string(),
  port: z.number().int(),
  cert: z.string().optional(),
  upid: z.string().optional(),
})

export type VNCProxy = z.infer<typeof VNCProxySchema>

export const TermProxySchema = z.object({
  ticket: z.string(),
  port: z.number().int(),
  upid: z.string().optional(),
  user: z.string().optional(),
})

export type TermProxy = z.infer<typeof TermProxySchema>

// ─── VM Migration ─────────────────────────────────────────────────────────────

export const MigrateInfoSchema = z.object({
  allowed_nodes: z.array(z.string()).optional(),
  not_allowed_nodes: z.record(z.unknown()).optional(),
  running: z.boolean().optional(),
  local_disks: z.array(z.unknown()).optional(),
  local_resources: z.array(z.unknown()).optional(),
})

export type MigrateInfo = z.infer<typeof MigrateInfoSchema>
