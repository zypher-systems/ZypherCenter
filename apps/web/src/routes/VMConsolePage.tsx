import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router'
import { ArrowLeft, Maximize2, Minimize2, RefreshCw } from 'lucide-react'
import { useVMVNCProxy } from '@/lib/queries/vms'
import { Button } from '@/components/ui/Button'

/**
 * Full-viewport noVNC console for a VM.
 *
 * Flow:
 * 1. POST /api/proxmox/nodes/{node}/qemu/{vmid}/vncproxy → get ticket + port
 * 2. Connect noVNC to ws://[our server]/api/ws?path=...&port=...&vncticket=...
 * 3. Our WS proxy bridges to Proxmox's authenticated VNC websocket
 *
 * noVNC is loaded dynamically to avoid SSR issues and keep the main bundle lean.
 */
export function VMConsolePage() {
  const { node, vmid: vmidParam } = useParams<{ node: string; vmid: string }>()
  const vmid = Number(vmidParam)
  const containerRef = useRef<HTMLDivElement>(null)
  const rfbRef = useRef<unknown>(null)
  const vncProxy = useVMVNCProxy(node!, vmid)
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting')
  const [statusText, setStatusText] = useState('Requesting VNC session…')
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    let mounted = true

    async function connect() {
      try {
        setStatus('connecting')
        setStatusText('Requesting VNC session…')

        const proxy = await vncProxy.mutateAsync()
        if (!mounted) return

        setStatusText('Loading noVNC…')

        // Dynamically import noVNC RFB class
        const { default: RFB } = await import('@novnc/novnc/lib/rfb.js')
        if (!mounted) return

        const wsPath = `/nodes/${node}/qemu/${vmid}/vncwebsocket`
        const wsUrl = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/api/ws?path=${encodeURIComponent(wsPath)}&port=${proxy.port}&vncticket=${encodeURIComponent(proxy.ticket)}`

        setStatusText('Connecting to console…')

        const rfb = new RFB(containerRef.current!, wsUrl)
        rfbRef.current = rfb

        rfb.scaleViewport = true
        rfb.resizeSession = true

        rfb.addEventListener('connect', () => {
          if (mounted) { setStatus('connected'); setStatusText('') }
        })
        rfb.addEventListener('disconnect', (e: CustomEvent) => {
          if (mounted) {
            setStatus('disconnected')
            setStatusText(e.detail?.reason ?? 'Disconnected')
          }
        })
        rfb.addEventListener('credentialsrequired', () => {
          rfb.sendCredentials({ password: proxy.ticket })
        })
      } catch (err) {
        if (mounted) {
          setStatus('error')
          setStatusText(err instanceof Error ? err.message : 'Failed to connect')
        }
      }
    }

    connect()

    return () => {
      mounted = false
      if (rfbRef.current) {
        ;(rfbRef.current as { disconnect: () => void }).disconnect?.()
      }
    }
  }, [node, vmid]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black flex flex-col z-50">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 h-10 bg-bg-sidebar border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" asChild>
            <Link to={`/nodes/${node}/vms/${vmid}`}>
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <span className="text-sm text-text-secondary">
            Console · <span className="text-text-primary font-medium">VM {vmid}</span> on {node}
          </span>
          {statusText && (
            <span className="text-xs text-text-muted">{statusText}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            title="Reconnect"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="size-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" title="Fullscreen" onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </Button>
        </div>
      </div>

      {/* VNC canvas container */}
      <div ref={containerRef} className="flex-1 overflow-hidden" />

      {/* Overlay for non-connected states */}
      {status !== 'connected' && (
        <div className="absolute inset-0 top-10 flex items-center justify-center bg-black/80">
          <div className="text-center space-y-2">
            {status === 'connecting' && (
              <div className="size-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
            )}
            <p className="text-text-secondary text-sm">{statusText}</p>
            {status === 'error' && (
              <Button size="sm" onClick={() => window.location.reload()}>
                Retry
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
