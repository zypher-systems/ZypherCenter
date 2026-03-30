import { z } from 'zod'

// ─── HA Resource ──────────────────────────────────────────────────────────────

export const HAResourceSchema = z.object({
  sid: z.string(),
  type: z.enum(['vm', 'ct']),
  state: z.enum(['started', 'stopped', 'enabled', 'disabled', 'ignored']).optional(),
  group: z.string().optional(),
  comment: z.string().optional(),
  max_restart: z.number().int().optional(),
  max_relocate: z.number().int().optional(),
  digest: z.string().optional(),
})

export type HAResource = z.infer<typeof HAResourceSchema>

// ─── HA Group ─────────────────────────────────────────────────────────────────

export const HAGroupSchema = z.object({
  group: z.string(),
  nodes: z.string(),
  comment: z.string().optional(),
  nofailback: z.number().int().optional(),
  restricted: z.number().int().optional(),
  digest: z.string().optional(),
})

export type HAGroup = z.infer<typeof HAGroupSchema>

// ─── HA Status ────────────────────────────────────────────────────────────────

export const HAStatusSchema = z.object({
  status: z.string(),
  quorum_ok: z.boolean().optional(),
  manager_status: z
    .object({
      timestamp: z.number().optional(),
      quorum_ok: z.boolean().optional(),
      master_node: z.string().optional(),
    })
    .optional(),
})

export type HAStatus = z.infer<typeof HAStatusSchema>
