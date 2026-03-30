import fp from 'fastify-plugin'
import { z } from 'zod'

// Extend @fastify/session types with our session data shape
declare module '@fastify/session' {
  interface FastifySessionObject {
    ticket?: string
    csrf?: string
    username?: string
    authenticated?: boolean
    /** The Proxmox host URL this session is connected to (set at login time). */
    proxmoxHost?: string
  }
}

const LoginBodySchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  realm: z.string().optional().default('pam'),
  /** Proxmox host URL (e.g. https://192.168.1.100:8006). Required unless PROXMOX_HOST is set server-side. */
  proxmoxHost: z
    .string()
    .url('Proxmox host must be a valid URL, e.g. https://192.168.1.100:8006')
    .optional(),
})

export const authPlugin = fp(
  async (fastify) => {
    // ── POST /api/auth/login ──────────────────────────────────────────────────
    fastify.post('/api/auth/login', async (request, reply) => {
      const result = LoginBodySchema.safeParse(request.body)
      if (!result.success) {
        return reply.status(400).send({ error: 'Invalid request', details: result.error.flatten() })
      }

      const { username, password, realm } = result.data
      const proxmoxUsername = username.includes('@') ? username : `${username}@${realm}`

      // Resolve Proxmox host: prefer the value submitted in the login form,
      // fall back to the server-side PROXMOX_HOST env variable.
      const proxmoxHost = result.data.proxmoxHost ?? fastify.config.PROXMOX_HOST
      if (!proxmoxHost) {
        return reply
          .status(400)
          .send({ error: 'Proxmox host is required — enter it on the login form or set PROXMOX_HOST on the server.' })
      }

      let response: Response
      try {
        response = await fetch(`${proxmoxHost}/api2/json/access/ticket`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ username: proxmoxUsername, password }),
          dispatcher: fastify.proxmoxAgent,
        })
      } catch (err) {
        fastify.log.error({ err }, 'Failed to reach Proxmox API')
        return reply.status(502).send({ error: 'Cannot reach Proxmox API. Check PROXMOX_HOST.' })
      }

      if (!response.ok) {
        return reply.status(401).send({ error: 'Invalid credentials' })
      }

      const body = (await response.json()) as {
        data: {
          ticket: string
          CSRFPreventionToken: string
          username: string
          cap: Record<string, unknown>
        }
      }

      request.session.ticket = body.data.ticket
      request.session.csrf = body.data.CSRFPreventionToken
      request.session.username = body.data.username
      request.session.authenticated = true
      request.session.proxmoxHost = proxmoxHost

      return reply.send({ username: body.data.username, cap: body.data.cap })
    })

    // ── POST /api/auth/logout ─────────────────────────────────────────────────
    fastify.post('/api/auth/logout', async (request, reply) => {
      await request.session.destroy()
      return reply.send({ ok: true })
    })

    // ── GET /api/auth/me ──────────────────────────────────────────────────────
    fastify.get('/api/auth/me', async (request, reply) => {
      if (!request.session.authenticated) {
        return reply.status(401).send({ error: 'Not authenticated' })
      }
      return reply.send({ username: request.session.username })
    })
  },
  { name: 'auth', dependencies: ['env', 'proxmox-agent'] },
)
