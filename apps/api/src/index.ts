import Fastify from 'fastify'
import cors from '@fastify/cors'
import cookie from '@fastify/cookie'
import session from '@fastify/session'
import { envPlugin } from './plugins/env.js'
import { proxmoxAgentPlugin } from './plugins/proxmox-agent.js'
import { authPlugin } from './plugins/auth.js'
import { proxyPlugin } from './plugins/proxy.js'
import { wsProxyPlugin } from './plugins/ws-proxy.js'

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? 'info',
    transport:
      process.env.NODE_ENV !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } }
        : undefined,
  },
})

// ── Plugins in dependency order ───────────────────────────────────────────────

await fastify.register(envPlugin)

await fastify.register(cors, {
  origin: fastify.config.CORS_ORIGIN,
  credentials: true,
})

await fastify.register(cookie)

await fastify.register(session, {
  secret: fastify.config.SESSION_SECRET,
  cookie: {
    httpOnly: true,
    secure: fastify.config.COOKIE_SECURE,
    sameSite: 'lax',
    maxAge: 7200 * 1000, // 2 hours — matches Proxmox ticket lifetime
  },
  saveUninitialized: false,
})

await fastify.register(proxmoxAgentPlugin)
await fastify.register(authPlugin)
await fastify.register(proxyPlugin)
await fastify.register(wsProxyPlugin)

// ── Health check ──────────────────────────────────────────────────────────────

fastify.get('/api/health', async () => ({ status: 'ok', time: new Date().toISOString() }))

// ── Public config — lets the UI pre-fill the Proxmox host if it was set server-side ──

fastify.get('/api/config', async () => ({
  proxmoxHost: fastify.config.PROXMOX_HOST ?? null,
}))

// ── Start ─────────────────────────────────────────────────────────────────────

try {
  await fastify.listen({ port: fastify.config.API_PORT, host: '0.0.0.0' })
  fastify.log.info(`ZypherCenter API listening on :${fastify.config.API_PORT}`)
  if (fastify.config.PROXMOX_HOST) {
    fastify.log.info(`Proxying to Proxmox at ${fastify.config.PROXMOX_HOST}`)
  } else {
    fastify.log.info('No PROXMOX_HOST set — users will enter their host URL on the login page')
  }
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
}
