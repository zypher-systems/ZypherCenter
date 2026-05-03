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
 *
 * IMPORTANT: Client messages are buffered until the upstream connection opens.
 * Without this, the xterm.js auth packet (sent immediately on WS open) would be
 * silently dropped because the upstream hasn't connected yet.
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

      // SEC-04: Validate that the path matches a known Proxmox console endpoint pattern.
      // This prevents path traversal to unintended Proxmox API endpoints.
      const ALLOWED_PATH_PATTERNS = [
        /^\/nodes\/[^/]+\/qemu\/\d+\/vncwebsocket$/,
        /^\/nodes\/[^/]+\/lxc\/\d+\/vncwebsocket$/,
        /^\/nodes\/[^/]+\/vncwebsocket$/,
        /^\/nodes\/[^/]+\/qemu\/\d+\/spiceproxy$/,
        /^\/nodes\/[^/]+\/lxc\/\d+\/spiceproxy$/,
        /^\/nodes\/[^/]+\/termproxy$/,
      ]
      const isAllowedPath = ALLOWED_PATH_PATTERNS.some((pattern) => pattern.test(proxyPath))
      if (!isAllowedPath) {
        fastify.log.warn({ proxyPath }, 'SEC-04: Rejected disallowed WS proxy path')
        socket.close(1002, 'Invalid path — only Proxmox console paths are permitted')
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

      // Buffer client messages until upstream is ready. This is critical for
      // xterm.js terminal sessions where the client sends the authentication
      // packet ("user:ticket\n") immediately on WebSocket open — before the
      // proxy's upstream connection to Proxmox has finished connecting.
      // Without buffering, the auth message is silently dropped and the
      // Proxmox session times out waiting for credentials.
      const pendingMessages: { data: WebSocket.RawData; isBinary: boolean }[] = []
      let upstreamReady = false

      socket.on('message', (data, isBinary) => {
        if (upstreamReady && upstream.readyState === WebSocket.OPEN) {
          upstream.send(data, { binary: isBinary })
        } else {
          pendingMessages.push({ data, isBinary })
        }
      })

      // Connect upstream with 'binary' subprotocol — Proxmox's vncwebsocket
      // endpoint requires this for both noVNC (RFB) and xterm.js sessions.
      const upstream = new WebSocket(upstreamUrl, 'binary', {
        headers: {
          Cookie: `PVEAuthCookie=${request.session.ticket}`,
        },
        rejectUnauthorized: fastify.config.PROXMOX_TLS_VERIFY,
      })

      upstream.on('open', () => {
        fastify.log.debug('Upstream WS connected, bridging...')
        upstreamReady = true

        // Flush any messages that arrived while upstream was connecting
        for (const { data, isBinary } of pendingMessages) {
          upstream.send(data, { binary: isBinary })
        }
        pendingMessages.length = 0

        upstream.on('message', (data, isBinary) => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(data, { binary: isBinary })
          }
        })
      })

      upstream.on('close', (code, reason) => {
        if (socket.readyState === WebSocket.OPEN) {
          // Prevent crash: ws library throws if code is 1005, 1006, or 1015
          const validCode = (code === 1000 || (code >= 3000 && code < 5000)) ? code : 1011
          socket.close(validCode, reason)
        }
      })

      socket.on('close', (code, reason) => {
        if (upstream.readyState !== WebSocket.CLOSED) {
          const validCode = (code === 1000 || (code >= 3000 && code < 5000)) ? code : 1011
          upstream.close(validCode, reason)
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

