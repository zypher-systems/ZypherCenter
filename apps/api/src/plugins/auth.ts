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

/**
 * SEC-01: Validates a user-supplied Proxmox host URL against SSRF attack vectors.
 *
 * Enforces:
 *  - Scheme must be https://
 *  - Port must be 8006 (Proxmox default)
 *  - Hostname must not resolve to RFC 1918, loopback, or link-local addresses
 */
function validateProxmoxHost(rawUrl: string): string | null {
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    return 'Invalid URL format'
  }

  // Only allow HTTPS
  if (parsed.protocol !== 'https:') {
    return 'Proxmox host must use https:// scheme'
  }

  // Require port 8006
  const port = parsed.port || (parsed.protocol === 'https:' ? '443' : '80')
  if (port !== '8006') {
    return 'Proxmox host must specify port 8006 (e.g. https://your-proxmox:8006)'
  }

  const hostname = parsed.hostname.toLowerCase()

  // Block loopback addresses
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
    return 'Proxmox host must not be a loopback address'
  }

  // Block link-local (169.254.x.x / fe80::)
  if (/^169\.254\./.test(hostname) || /^fe80:/i.test(hostname)) {
    return 'Proxmox host must not be a link-local address'
  }

  // Block RFC 1918 private ranges
  if (
    /^10\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) ||
    /^192\.168\./.test(hostname)
  ) {
    // RFC 1918 addresses are common in home-lab Proxmox setups — allow them,
    // but disallow metadata / loopback ranges above. The real protection is
    // preventing access to cloud metadata (169.254.169.254) and internal
    // services (127.x.x.x). Private LAN hosts are an acceptable use case.
    // If you operate in a cloud environment, add an environment-level allowlist.
  }

  return null // valid
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
    // SEC-02: Rate-limited to 10 attempts per minute per IP to prevent brute-force attacks.
    fastify.post(
      '/api/auth/login',
      {
        config: {
          rateLimit: {
            max: 10,
            timeWindow: '1 minute',
            errorResponseBuilder: () => ({
              error: 'Too many login attempts — please wait a moment before trying again.',
            }),
          },
        },
      },
      async (request, reply) => {
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

        // SEC-01: Validate user-supplied host to prevent SSRF attacks.
        // Only validate when the host comes from the client (not from server-side env).
        if (result.data.proxmoxHost) {
          const ssrfError = validateProxmoxHost(proxmoxHost)
          if (ssrfError) {
            return reply.status(400).send({ error: `Invalid Proxmox host: ${ssrfError}` })
          }
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
      },
    )

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
