import fp from 'fastify-plugin'
import websocketPlugin from '@fastify/websocket'
import WebSocket from 'ws'

/**
 * WebSocket proxy for Proxmox console sessions (VNC, SPICE, node shell).
 *
 * The noVNC / xterm.js clients connect to:
 *   ws://zyphercenter/api/ws?path=/nodes/{node}/qemu/{vmid}/vncwebsocket&port=5900&vncticket=TICKET
 *
 * We bridge this to:
 *   wss://PROXMOX_HOST/api2/json/nodes/{node}/qemu/{vmid}/vncwebsocket?port=5900&vncticket=TICKET
 *
 * The PVEAuthCookie from the server session is added as a Cookie header on the
 * upstream connection — it never touches the browser.
 */
export const wsProxyPlugin = fp(
  async (fastify) => {
    await fastify.register(websocketPlugin)

    fastify.get('/api/ws', { websocket: true }, (socket, request) => {
      if (!request.session.authenticated || !request.session.ticket) {
        socket.close(1008, 'Not authenticated')
        return
      }

      const rawQuery = request.url.includes('?') ? request.url.substring(request.url.indexOf('?') + 1) : ''
      const params = new URLSearchParams(rawQuery)
      const proxyPath = params.get('path')

      if (!proxyPath) {
        socket.close(1002, 'Missing required query param: path')
        return
      }

      // Remove `path` from forwarded params, keep everything else (port, vncticket, etc.)
      params.delete('path')
      const forwardedQuery = params.toString()

      const proxmoxHost = request.session.proxmoxHost ?? fastify.config.PROXMOX_HOST
      if (!proxmoxHost) {
        socket.close(1011, 'No Proxmox host configured for this session')
        return
      }

      const proxmoxWsBase = proxmoxHost.replace(/^https:\/\//i, 'wss://').replace(
        /^http:\/\//i,
        'ws://',
      )
      const upstreamUrl = `${proxmoxWsBase}/api2/json${proxyPath}${forwardedQuery ? '?' + forwardedQuery : ''}`

      fastify.log.debug({ upstreamUrl }, 'Opening upstream WS to Proxmox')

      const upstream = new WebSocket(upstreamUrl, {
        headers: {
          Cookie: `PVEAuthCookie=${request.session.ticket}`,
        },
        rejectUnauthorized: fastify.config.PROXMOX_TLS_VERIFY,
      })

      upstream.on('open', () => {
        fastify.log.debug('Upstream WS connected, bridging...')

        socket.on('message', (data, isBinary) => {
          if (upstream.readyState === WebSocket.OPEN) {
            upstream.send(data, { binary: isBinary })
          }
        })

        upstream.on('message', (data, isBinary) => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(data, { binary: isBinary })
          }
        })
      })

      upstream.on('close', (code, reason) => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.close(code, reason)
        }
      })

      socket.on('close', () => {
        if (upstream.readyState !== WebSocket.CLOSED) {
          upstream.close()
        }
      })

      upstream.on('error', (err) => {
        fastify.log.error({ err }, 'Upstream WS error')
        if (socket.readyState === WebSocket.OPEN) {
          socket.close(1011, 'Upstream connection error')
        }
      })

      socket.on('error', (err) => {
        fastify.log.error({ err }, 'Client WS error')
        if (upstream.readyState !== WebSocket.CLOSED) {
          upstream.close()
        }
      })
    })
  },
  { name: 'ws-proxy', dependencies: ['env'] },
)
