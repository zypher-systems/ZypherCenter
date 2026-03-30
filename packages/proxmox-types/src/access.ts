import { z } from 'zod'

// ─── Users ────────────────────────────────────────────────────────────────────

export const UserSchema = z.object({
  userid: z.string(),
  comment: z.string().optional(),
  email: z.string().optional(),
  enable: z.number().int().optional(),
  expire: z.number().int().optional(),
  firstname: z.string().optional(),
  lastname: z.string().optional(),
  groups: z.string().optional(),
  keys: z.string().optional(),
  tokens: z.record(z.unknown()).optional(),
})

export type User = z.infer<typeof UserSchema>

// ─── Groups ───────────────────────────────────────────────────────────────────

export const GroupSchema = z.object({
  groupid: z.string(),
  comment: z.string().optional(),
  users: z.string().optional(),
})

export type Group = z.infer<typeof GroupSchema>

// ─── Roles ────────────────────────────────────────────────────────────────────

export const RoleSchema = z.object({
  roleid: z.string(),
  privs: z.string().optional(),
  special: z.number().int().optional(),
})

export type Role = z.infer<typeof RoleSchema>

// ─── ACL Entries ─────────────────────────────────────────────────────────────

export const ACLEntrySchema = z.object({
  path: z.string(),
  type: z.enum(['user', 'group', 'token']),
  ugid: z.string(),
  roleid: z.string(),
  propagate: z.number().int().optional(),
})

export type ACLEntry = z.infer<typeof ACLEntrySchema>

// ─── Auth Realms ──────────────────────────────────────────────────────────────

export const RealmSchema = z.object({
  realm: z.string(),
  type: z.string(),
  comment: z.string().optional(),
  default: z.number().int().optional(),
  tfa: z.string().optional(),
})

export type Realm = z.infer<typeof RealmSchema>

// ─── API Token ────────────────────────────────────────────────────────────────

export const APITokenSchema = z.object({
  tokenid: z.string(),
  comment: z.string().optional(),
  expire: z.number().int().optional(),
  privsep: z.number().int().optional(),
})

export type APIToken = z.infer<typeof APITokenSchema>
