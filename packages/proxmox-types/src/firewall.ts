import { z } from 'zod'

// ─── Firewall Rule ────────────────────────────────────────────────────────────

export const FirewallRuleSchema = z.object({
  pos: z.number().int(),
  type: z.enum(['in', 'out', 'forward', 'group']),
  action: z.string(),
  enable: z.number().int().optional(),
  comment: z.string().optional(),
  source: z.string().optional(),
  dest: z.string().optional(),
  proto: z.string().optional(),
  sport: z.string().optional(),
  dport: z.string().optional(),
  macro: z.string().optional(),
  iface: z.string().optional(),
  log: z.string().optional(),
})

export type FirewallRule = z.infer<typeof FirewallRuleSchema>

// ─── Firewall Group ───────────────────────────────────────────────────────────

export const FirewallGroupSchema = z.object({
  group: z.string(),
  comment: z.string().optional(),
  digest: z.string().optional(),
})

export type FirewallGroup = z.infer<typeof FirewallGroupSchema>

// ─── IP Set ───────────────────────────────────────────────────────────────────

export const IPSetSchema = z.object({
  name: z.string(),
  comment: z.string().optional(),
  digest: z.string().optional(),
})

export type IPSet = z.infer<typeof IPSetSchema>

export const IPSetEntrySchema = z.object({
  cidr: z.string(),
  comment: z.string().optional(),
  nomatch: z.number().int().optional(),
})

export type IPSetEntry = z.infer<typeof IPSetEntrySchema>

// ─── Alias ───────────────────────────────────────────────────────────────────

export const FirewallAliasSchema = z.object({
  name: z.string(),
  cidr: z.string(),
  comment: z.string().optional(),
  digest: z.string().optional(),
})

export type FirewallAlias = z.infer<typeof FirewallAliasSchema>

// ─── Firewall Options ─────────────────────────────────────────────────────────

export const FirewallOptionsSchema = z.object({
  enable: z.number().int().optional(),
  policy_in: z.enum(['ACCEPT', 'DROP', 'REJECT']).optional(),
  policy_out: z.enum(['ACCEPT', 'DROP', 'REJECT']).optional(),
  log_ratelimit: z.string().optional(),
  dhcp: z.number().int().optional(),
  ipfilter: z.number().int().optional(),
  macfilter: z.number().int().optional(),
  ndp: z.number().int().optional(),
  radv: z.number().int().optional(),
})

export type FirewallOptions = z.infer<typeof FirewallOptionsSchema>
