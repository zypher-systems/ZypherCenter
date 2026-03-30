import { z } from 'zod'

// ─── Storage Config ───────────────────────────────────────────────────────────

export const StorageConfigSchema = z.object({
  storage: z.string(),
  type: z.string(),
  content: z.string().optional(),
  path: z.string().optional(),
  server: z.string().optional(),
  export: z.string().optional(),
  pool: z.string().optional(),
  monhost: z.string().optional(),
  username: z.string().optional(),
  nodes: z.string().optional(),
  shared: z.number().int().optional(),
  maxfiles: z.number().int().optional(),
  prune_backups: z.string().optional(),
  enabled: z.number().int().optional(),
  disable: z.number().int().optional(),
  digest: z.string().optional(),
})

export type StorageConfig = z.infer<typeof StorageConfigSchema>

// ─── Node Storage Status ──────────────────────────────────────────────────────

export const NodeStorageSchema = z.object({
  storage: z.string(),
  type: z.string(),
  content: z.string().optional(),
  active: z.number().int().optional(),
  enabled: z.number().int().optional(),
  shared: z.number().int().optional(),
  avail: z.number().optional(),
  used: z.number().optional(),
  total: z.number().optional(),
  used_fraction: z.number().optional(),
})

export type NodeStorage = z.infer<typeof NodeStorageSchema>

// ─── Storage Content Item ─────────────────────────────────────────────────────

export const StorageContentItemSchema = z.object({
  volid: z.string(),
  content: z.string(),
  format: z.string().optional(),
  size: z.number().optional(),
  used: z.number().optional(),
  vmid: z.number().int().optional(),
  parent: z.string().optional(),
  ctime: z.number().optional(),
  notes: z.string().optional(),
  protected: z.number().int().optional(),
  verification: z
    .object({
      state: z.string(),
      upid: z.string().optional(),
    })
    .optional(),
  encryption: z
    .object({
      'key-fingerprint': z.string().optional(),
    })
    .optional(),
})

export type StorageContentItem = z.infer<typeof StorageContentItemSchema>
