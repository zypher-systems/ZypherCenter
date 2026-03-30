import { z } from 'zod'

// ─── Task (UPID) ──────────────────────────────────────────────────────────────

export const TaskSchema = z.object({
  upid: z.string(),
  node: z.string(),
  pid: z.number().int().optional(),
  pstart: z.number().optional(),
  starttime: z.number(),
  endtime: z.number().optional(),
  type: z.string(),
  id: z.string().optional(),
  user: z.string(),
  status: z.string().optional(),
  exitstatus: z.string().optional(),
})

export type Task = z.infer<typeof TaskSchema>

// ─── Task Status (for polling) ────────────────────────────────────────────────

export const TaskStatusSchema = z.object({
  upid: z.string(),
  node: z.string(),
  pid: z.number().int().optional(),
  pstart: z.number().optional(),
  starttime: z.number(),
  endtime: z.number().optional(),
  type: z.string(),
  id: z.string().optional(),
  user: z.string(),
  status: z.enum(['running', 'stopped']),
  exitstatus: z.string().optional(),
})

export type TaskStatus = z.infer<typeof TaskStatusSchema>

// ─── Task Log Line ────────────────────────────────────────────────────────────

export const TaskLogLineSchema = z.object({
  n: z.number().int(),
  t: z.string(),
})

export type TaskLogLine = z.infer<typeof TaskLogLineSchema>
