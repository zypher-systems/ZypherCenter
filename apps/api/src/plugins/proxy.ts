import fp from 'fastify-plugin'
import type { FastifyRequest, FastifyReply } from 'fastify'

/**
 * Proxies all /api/proxmox/* requests to the Proxmox API.
 *
 * - Strips the /api/proxmox prefix and prepends /api2/json
 * - Injects PVEAuthCookie from the server-side session (never exposed to browser)
 * - Injects CSRFPreventionToken for state-changing requests (POST/PUT/DELETE)
 * - Forwards query params and request body as-is
 */
export const proxyPlugin = fp(
  async (fastify) => {
    const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'DELETE'])

    async function proxyRequest(request: FastifyRequest, reply: FastifyReply) {
      if (!request.session.authenticated || !request.session.ticket) {
        return reply.status(401).send({ error: 'Not authenticated' })
      }

      const proxmoxHost = request.session.proxmoxHost ?? fastify.config.PROXMOX_HOST
      if (!proxmoxHost) {
        return reply.status(500).send({ error: 'No Proxmox host configured for this session' })
      }

      // Build upstream URL
      const params = request.params as { '*': string }
      const proxmoxPath = params['*']
      const queryString = request.url.includes('?') ? request.url.substring(request.url.indexOf('?')) : ''
      const upstreamUrl = `${proxmoxHost}/api2/json/${proxmoxPath}${queryString}`

      const method = request.method.toUpperCase()
      const headers: Record<string, string> = {
        Cookie: `PVEAuthCookie=${request.session.ticket}`,
        Accept: 'application/json',
      }

      if (STATE_CHANGING_METHODS.has(method) && request.session.csrf) {
        headers['CSRFPreventionToken'] = request.session.csrf
      }

      let body: string | undefined
      if (STATE_CHANGING_METHODS.has(method) && request.body) {
        body = JSON.stringify(request.body)
        headers['Content-Type'] = 'application/json'
      }

      let upstream: Response
      try {
        upstream = await fetch(upstreamUrl, {
          method,
          headers,
          body,
          dispatcher: fastify.proxmoxAgent,
        })
      } catch (err) {
        fastify.log.error({ err, upstreamUrl }, 'Upstream Proxmox request failed')
        return reply.status(502).send({ error: 'Failed to reach Proxmox API' })
      }

      reply.status(upstream.status)
      const ct = upstream.headers.get('content-type')
      if (ct) reply.header('content-type', ct)

      const buf = await upstream.arrayBuffer()
      return reply.send(Buffer.from(buf))
    }

    // Register catch-all proxy routes for all HTTP methods
    fastify.get('/api/proxmox/*', proxyRequest)
    fastify.post('/api/proxmox/*', proxyRequest)
    fastify.put('/api/proxmox/*', proxyRequest)
    fastify.delete('/api/proxmox/*', proxyRequest)
  },
  { name: 'proxy', dependencies: ['env', 'proxmox-agent', 'auth'] },
)
