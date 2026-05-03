import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router'
import { Search, Server, Monitor, Box, Database, Play, Square, RotateCcw, Power, Terminal } from 'lucide-react'
import { useClusterResources } from '@/lib/queries/cluster'
import type { ClusterResource } from '@zyphercenter/proxmox-types'
import { Command } from 'cmdk'
import { api } from '@/lib/api'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

function resourcePath(r: ClusterResource): string {
  if (r.type === 'qemu') return `/nodes/${r.node}/vms/${r.vmid}`
  if (r.type === 'lxc')  return `/nodes/${r.node}/lxc/${r.vmid}`
  if (r.type === 'node') return `/nodes/${r.node ?? r.name ?? r.id}`
  if (r.type === 'storage') return `/storage`
  return '/'
}

function ResourceIcon({ type, className = "size-4 text-text-muted shrink-0" }: { type: string | undefined, className?: string }) {
  if (type === 'qemu')    return <Monitor className={`size-4 text-blue-400 shrink-0 ${className.replace(/text-[^\s]+/, '')}`} />
  if (type === 'lxc')     return <Box className={`size-4 text-purple-400 shrink-0 ${className.replace(/text-[^\s]+/, '')}`} />
  if (type === 'node')    return <Server className={className} />
  if (type === 'storage') return <Database className={className} />
  return <Search className={className} />
}

function typeLabel(type: string | undefined): string {
  if (type === 'qemu')    return 'VM'
  if (type === 'lxc')     return 'CT'
  if (type === 'node')    return 'Node'
  if (type === 'storage') return 'Storage'
  return type ?? ''
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const { data: resources } = useClusterResources()
  const qc = useQueryClient()

  // Global keyboard shortcut
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  function go(path: string) {
    navigate(path)
    setOpen(false)
  }

  // Action Executors
  async function execGuestAction(r: ClusterResource, action: 'start' | 'stop' | 'shutdown' | 'reboot') {
    const t = r.type === 'qemu' ? 'qemu' : 'lxc'
    const name = r.name ?? `${typeLabel(r.type)} ${r.vmid}`
    toast.loading(`Sending ${action} command to ${name}...`, { id: `cmd-${r.vmid}-${action}` })
    setOpen(false)
    try {
      await api.post(`nodes/${r.node}/${t}/${r.vmid}/status/${action}`)
      toast.success(`${action} command initiated for ${name}`, { id: `cmd-${r.vmid}-${action}` })
      qc.invalidateQueries({ queryKey: ['cluster', 'resources'] })
    } catch (err: any) {
      toast.error(`Failed to ${action} ${name}: ${err.message}`, { id: `cmd-${r.vmid}-${action}` })
    }
  }

  async function execNodeAction(r: ClusterResource, action: 'reboot' | 'shutdown') {
    const name = r.node ?? r.name ?? ''
    if (!name) return
    toast.loading(`Sending ${action} command to node ${name}...`, { id: `cmd-node-${name}-${action}` })
    setOpen(false)
    try {
      await api.post(`nodes/${name}/status`, { command: action })
      toast.success(`${action} command initiated for node ${name}`, { id: `cmd-node-${name}-${action}` })
    } catch (err: any) {
      toast.error(`Failed to ${action} node ${name}: ${err.message}`, { id: `cmd-node-${name}-${action}` })
    }
  }

  function openConsole(r: ClusterResource) {
    if (r.type === 'qemu' || r.type === 'lxc') {
      window.open(`/nodes/${r.node}/${r.type}/${r.vmid}/console`, '_blank', 'width=800,height=600')
    } else if (r.type === 'node') {
      window.open(`/nodes/${r.node ?? r.name}/console`, '_blank', 'width=800,height=600')
    }
    setOpen(false)
  }

  // Filter resources based on query
  const q = query.toLowerCase().trim()
  const qIsAction = q.startsWith('start ') || q.startsWith('stop ') || q.startsWith('reboot ') || q.startsWith('shutdown ') || q.startsWith('console ') || q.startsWith('shell ')

  const filteredResources = useMemo(() => {
    if (!resources) return []
    if (!q) {
      return resources
        .filter((r) => ['qemu', 'lxc', 'node'].includes(r.type ?? ''))
        .sort((a, b) => (a.status === 'running' ? 0 : 1) - (b.status === 'running' ? 0 : 1))
        .slice(0, 12)
    }

    let searchStr = q
    if (qIsAction) {
      searchStr = q.split(' ').slice(1).join(' ') // Remove the action verb for search
    }

    return resources.filter((r) => {
      const name = (r.name ?? '').toLowerCase()
      const id   = String(r.vmid ?? '').toLowerCase()
      const node = (r.node ?? r.name ?? '').toLowerCase()
      return name.includes(searchStr) || id.includes(searchStr) || node.includes(searchStr)
    }).slice(0, 20)
  }, [resources, q, qIsAction])

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Global Command Palette"
      className="fixed top-[15vh] left-1/2 w-full max-w-xl -translate-x-1/2 rounded-xl border border-border bg-bg-elevated shadow-2xl overflow-hidden z-[100]"
      overlayClassName="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
    >
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border-muted" cmdk-input-wrapper="">
        <Search className="size-4 text-text-muted shrink-0" />
        <Command.Input
          value={query}
          onValueChange={setQuery}
          placeholder="Search VMs, nodes, or type 'start 104'..."
          className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-disabled outline-none"
        />
        <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-border-subtle bg-bg-muted px-1.5 text-[10px] font-medium text-text-muted">
          Esc
        </kbd>
      </div>

      <Command.List className="max-h-[360px] overflow-y-auto p-2 space-y-1 cmdk-list">
        <Command.Empty className="py-8 text-center text-sm text-text-muted">
          No results found.
        </Command.Empty>

        {/* ── ACTION GROUPS ── */}
        {qIsAction && filteredResources.length > 0 && (
          <Command.Group heading="Actions" className="cmdk-group">
            {filteredResources.map((r) => {
              const name = r.name ?? `${typeLabel(r.type)} ${r.vmid}`
              const isGuest = r.type === 'qemu' || r.type === 'lxc'
              
              if (q.startsWith('start ') && isGuest && r.status !== 'running') {
                return (
                  <Command.Item key={`start-${r.id}`} onSelect={() => execGuestAction(r, 'start')} className="cmdk-item flex items-center gap-3 px-3 py-2 text-sm rounded-md cursor-pointer aria-selected:bg-bg-hover text-text-primary">
                    <Play className="size-4 text-status-running" /> Start {name}
                  </Command.Item>
                )
              }
              if (q.startsWith('stop ') && isGuest && r.status === 'running') {
                return (
                  <Command.Item key={`stop-${r.id}`} onSelect={() => execGuestAction(r, 'stop')} className="cmdk-item flex items-center gap-3 px-3 py-2 text-sm rounded-md cursor-pointer aria-selected:bg-bg-hover text-text-primary">
                    <Square className="size-4 text-status-error" /> Stop {name}
                  </Command.Item>
                )
              }
              if (q.startsWith('shutdown ') && isGuest && r.status === 'running') {
                return (
                  <Command.Item key={`shut-${r.id}`} onSelect={() => execGuestAction(r, 'shutdown')} className="cmdk-item flex items-center gap-3 px-3 py-2 text-sm rounded-md cursor-pointer aria-selected:bg-bg-hover text-text-primary">
                    <Power className="size-4 text-text-muted" /> Shutdown {name}
                  </Command.Item>
                )
              }
              if (q.startsWith('reboot ')) {
                return (
                  <Command.Item key={`reboot-${r.id}`} onSelect={() => isGuest ? execGuestAction(r, 'reboot') : execNodeAction(r, 'reboot')} className="cmdk-item flex items-center gap-3 px-3 py-2 text-sm rounded-md cursor-pointer aria-selected:bg-bg-hover text-text-primary">
                    <RotateCcw className="size-4 text-status-warning" /> Reboot {name}
                  </Command.Item>
                )
              }
              if (q.startsWith('console ') || q.startsWith('shell ')) {
                return (
                  <Command.Item key={`console-${r.id}`} onSelect={() => openConsole(r)} className="cmdk-item flex items-center gap-3 px-3 py-2 text-sm rounded-md cursor-pointer aria-selected:bg-bg-hover text-text-primary">
                    <Terminal className="size-4 text-text-muted" /> Console for {name}
                  </Command.Item>
                )
              }
              return null
            })}
          </Command.Group>
        )}

        {/* ── NAVIGATION GROUP ── */}
        {!qIsAction && filteredResources.length > 0 && (
          <Command.Group heading="Navigation" className="cmdk-group">
            {filteredResources.map((r) => {
              const name = r.name ?? `${typeLabel(r.type)} ${r.vmid ?? ''}`
              const isRunning = r.status === 'running'
              return (
                <Command.Item
                  key={r.id}
                  value={`${name} ${r.vmid} ${r.node} ${r.type}`} // Help cmdk filter
                  onSelect={() => go(resourcePath(r))}
                  className="cmdk-item flex items-center gap-3 px-3 py-2.5 text-sm rounded-md cursor-pointer aria-selected:bg-bg-hover text-text-primary transition-colors"
                >
                  <ResourceIcon type={r.type} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{name}</p>
                    <p className="text-[11px] text-text-muted truncate">
                      {typeLabel(r.type)}{r.vmid ? ` ${r.vmid}` : ''}
                      {r.node && r.type !== 'node' ? ` · ${r.node}` : ''}
                    </p>
                  </div>
                  <span className={`shrink-0 text-xs px-1.5 py-0.5 rounded border ${
                    isRunning
                      ? 'text-status-running border-status-running/30 bg-status-running/10'
                      : r.status
                        ? 'text-text-muted border-border-subtle'
                        : ''
                  }`}>
                    {r.status ?? ''}
                  </span>
                </Command.Item>
              )
            })}
          </Command.Group>
        )}
      </Command.List>

      <div className="flex items-center justify-between px-4 py-2.5 border-t border-border-muted bg-bg-muted/30">
        <div className="flex items-center gap-3 text-[11px] text-text-disabled">
          <span className="flex items-center gap-1">
            <kbd className="font-mono bg-bg-muted border border-border-subtle rounded px-1">↑↓</kbd> navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="font-mono bg-bg-muted border border-border-subtle rounded px-1">↵</kbd> select
          </span>
        </div>
        {!qIsAction && (
          <div className="text-[10px] text-text-muted italic">
            Try typing "start", "stop", or "console"
          </div>
        )}
      </div>
    </Command.Dialog>
  )
}
