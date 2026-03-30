import { z } from 'zod'

// Proxmox API wraps all responses in { data: T }
export const pveResponse = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({ data: dataSchema })

export type PVEResponse<T> = { data: T }

export const VMStatusSchema = z.enum(['running', 'stopped', 'paused', 'suspended'])
export type VMStatus = z.infer<typeof VMStatusSchema>

export const NodeOnlineStatusSchema = z.enum(['online', 'offline', 'unknown'])
export type NodeOnlineStatus = z.infer<typeof NodeOnlineStatusSchema>

/** Safely parse a number from a string or number (Proxmox sometimes returns strings) */
export const coerceNumber = z.union([z.number(), z.string().transform(Number)])
