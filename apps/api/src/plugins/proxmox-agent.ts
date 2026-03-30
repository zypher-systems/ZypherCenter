import fp from 'fastify-plugin'
import { Agent } from 'undici'

declare module 'fastify' {
  interface FastifyInstance {
    proxmoxAgent: Agent
  }
}

/**
 * Creates an undici Agent for Proxmox API requests.
 * Handles self-signed certificates when PROXMOX_TLS_VERIFY=false (the default
 * for home lab / self-hosted Proxmox installations).
 */
export const proxmoxAgentPlugin = fp(
  async (fastify) => {
    const agent = new Agent({
      connect: {
        rejectUnauthorized: fastify.config.PROXMOX_TLS_VERIFY,
      },
    })

    fastify.decorate('proxmoxAgent', agent)
    fastify.addHook('onClose', async () => agent.close())
  },
  { name: 'proxmox-agent', dependencies: ['env'] },
)
