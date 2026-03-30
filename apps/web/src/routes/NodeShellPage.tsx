import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router'
import { ArrowLeft, Maximize2, Minimize2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import '@xterm/xterm/css/xterm.css'

/**
 * Node shell terminal via Proxmox's xterm.js websocket endpoint.
 * Uses @xterm/xterm and the vncshell websocket bridge.
 */
export function NodeShellPage() {
  const { node } = useParams<{ node: string }>()
  const containerRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error'>('connecting')
  const [statusText, setStatusText] = useState('Requesting shell session…')
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    let mounted = true
    let ws: WebSocket | null = null
    let term: import('@xterm/xterm').Terminal | null = null

    async function connect() {
      if (!containerRef.current) return
      try {
        setStatus('connecting')
        setStatusText('Requesting shell session…')

        // Request shell VNC proxy ticket
        const res = await fetch(`/api/proxmox/nodes/${node}/vncshell`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ websocket: 1 }),
          credentials: 'include',
        })
        if (!res.ok) throw new Error(`Failed to get shell ticket (${res.status})`)
        const { data } = (await res.json()) as { data: { ticket: string; port: number; user: string; upid: string } }
        if (!mounted) return

        setStatusText('Loading terminal…')
        const [{ Terminal }, { FitAddon }, { WebLinksAddon }] = await Promise.all([
          import('@xterm/xterm'),
          import('@xterm/addon-fit'),
          import('@xterm/addon-web-links'),
        ])
        if (!mounted) return

        term = new Terminal({
          theme: {
            background: '#0a0a0a',
            foreground: '#e4e4eb',
            cursor: '#6366f1',
            selectionBackground: '#6366f133',
          },
          fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
          fontSize: 14,
          lineHeight: 1.4,
          cursorBlink: true,
        })

        const fitAddon = new FitAddon()
        const webLinksAddon = new WebLinksAddon()
        term.loadAddon(fitAddon)
        term.loadAddon(webLinksAddon)
        term.open(containerRef.current!)

        setTimeout(() => fitAddon.fit(), 50)

        const ro = new ResizeObserver(() => fitAddon.fit())
        ro.observe(containerRef.current!)

        // Connect WebSocket
        const wsPath = `/nodes/${node}/vncwebsocket`
        const wsUrl = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/api/ws?path=${encodeURIComponent(wsPath)}&port=${data.port}&vncticket=${encodeURIComponent(data.ticket)}`

        ws = new WebSocket(wsUrl)
        ws.binaryType = 'arraybuffer'

        ws.onopen = () => {
          if (!mounted) return
          setStatus('connected')
          setStatusText('')
          // xterm <-> websocket bridge
          term!.onData((d) => ws?.send(new TextEncoder().encode(d)))
          ws!.onmessage = (e) => {
            if (e.data instanceof ArrayBuffer) {
              term!.write(new Uint8Array(e.data))
            } else {
              term!.write(e.data as string)
            }
          }
        }

        ws.onerror = () => {
          if (mounted) { setStatus('error'); setStatusText('WebSocket error') }
        }
        ws.onclose = () => {
          if (mounted && status !== 'error') { setStatus('error'); setStatusText('Connection closed') }
        }
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
      ws?.close()
      term?.dispose()
    }
  }, [node]) // eslint-disable-line react-hooks/exhaustive-deps

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
      <div className="flex items-center justify-between px-4 h-10 bg-bg-sidebar border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" asChild>
            <Link to={`/nodes/${node}`}>
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <span className="text-sm text-text-secondary">
            Shell · <span className="text-text-primary font-medium">{node}</span>
          </span>
          {statusText && <span className="text-xs text-text-muted">{statusText}</span>}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" title="Reconnect" onClick={() => window.location.reload()}>
            <RefreshCw className="size-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" title="Fullscreen" onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </Button>
        </div>
      </div>

      {/* Terminal container */}
      <div ref={containerRef} className="flex-1 overflow-hidden p-1" />

      {status !== 'connected' && (
        <div className="absolute inset-0 top-10 flex items-center justify-center bg-black/80">
          <div className="text-center space-y-2">
            {status === 'connecting' && (
              <div className="size-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
            )}
            <p className="text-text-secondary text-sm">{statusText}</p>
            {status === 'error' && (
              <Button size="sm" onClick={() => window.location.reload()}>Retry</Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
