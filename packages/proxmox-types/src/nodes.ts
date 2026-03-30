import { z } from 'zod'

// ─── Node Status ──────────────────────────────────────────────────────────────

export const NodeStatusSchema = z.object({
  status: z.string(),
  node: z.string().optional(),
  uptime: z.number(),
  cpu: z.number(),
  wait: z.number().optional(),
  memory: z.object({
    total: z.number(),
    used: z.number(),
    free: z.number(),
  }),
  rootfs: z.object({
    total: z.number(),
    used: z.number(),
    free: z.number(),
    avail: z.number(),
  }),
  swap: z.object({
    total: z.number(),
    used: z.number(),
    free: z.number(),
  }),
  loadavg: z.tuple([z.string(), z.string(), z.string()]),
  cpuinfo: z.object({
    cpus: z.number().int(),
    cores: z.number().int(),
    sockets: z.number().int(),
    model: z.string().optional(),
    mhz: z.string().optional(),
    hvm: z.string().optional(),
    flags: z.string().optional(),
    user_hz: z.number().int().optional(),
  }),
  pveversion: z.string().optional(),
  kversion: z.string().optional(),
  current_kernel: z
    .object({
      sysname: z.string(),
      release: z.string(),
      version: z.string(),
      machine: z.string(),
    })
    .optional(),
  ksm: z.object({ shared: z.number() }).optional(),
})

export type NodeStatus = z.infer<typeof NodeStatusSchema>

// ─── Node Network ─────────────────────────────────────────────────────────────

export const NetworkInterfaceSchema = z.object({
  iface: z.string(),
  type: z.string(),
  active: z.number().int().optional(),
  autostart: z.number().int().optional(),
  bridge_fd: z.string().optional(),
  bridge_ports: z.string().optional(),
  bridge_stp: z.string().optional(),
  address: z.string().optional(),
  netmask: z.string().optional(),
  gateway: z.string().optional(),
  address6: z.string().optional(),
  netmask6: z.number().int().optional(),
  gateway6: z.string().optional(),
  cidr: z.string().optional(),
  cidr6: z.string().optional(),
  comments: z.string().optional(),
  method: z.string().optional(),
  method6: z.string().optional(),
  priority: z.number().int().optional(),
  slaves: z.string().optional(),
  ovs_bridge: z.string().optional(),
  ovs_bonds: z.string().optional(),
  ovs_ports: z.string().optional(),
  ovs_tag: z.number().int().optional(),
  families: z.array(z.string()).optional(),
})

export type NetworkInterface = z.infer<typeof NetworkInterfaceSchema>

// ─── Node Disk ────────────────────────────────────────────────────────────────

export const NodeDiskSchema = z.object({
  devpath: z.string(),
  size: z.number(),
  used: z.string().optional(),
  model: z.string().optional(),
  serial: z.string().optional(),
  vendor: z.string().optional(),
  rpm: z.number().int().optional(),
  type: z.string().optional(),
  health: z.string().optional(),
  wearout: z.number().optional(),
  wwn: z.string().optional(),
  mounted: z.number().int().optional(),
  osdid: z.number().int().optional(),
  blkid: z.string().optional(),
})

export type NodeDisk = z.infer<typeof NodeDiskSchema>

// ─── APT Updates ─────────────────────────────────────────────────────────────

export const AptPackageSchema = z.object({
  Package: z.string(),
  Version: z.string(),
  OldVersion: z.string().optional(),
  Priority: z.string().optional(),
  Section: z.string().optional(),
  Title: z.string().optional(),
  Description: z.string().optional(),
  Origin: z.string().optional(),
  ChangeLogUrl: z.string().optional(),
})

export type AptPackage = z.infer<typeof AptPackageSchema>

// ─── Node Subscription ────────────────────────────────────────────────────────

export const NodeSubscriptionSchema = z.object({
  status: z.string(),
  level: z.string().optional(),
  checktime: z.number().optional(),
  nextduedate: z.string().optional(),
  message: z.string().optional(),
  serverid: z.string().optional(),
})

export type NodeSubscription = z.infer<typeof NodeSubscriptionSchema>
