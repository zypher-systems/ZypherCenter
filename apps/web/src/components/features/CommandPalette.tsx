import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router'
import { Search, Server, Monitor, Box, Database } from 'lucide-react'
import { useClusterResources } from '@/lib/queries/cluster'
import type { ClusterResource } from '@zyphercenter/proxmox-types'

function resourcePath(r: ClusterResource): string {
  if (r.type === 'qemu') return `/nodes/${r.node}/vms/${r.vmid}`
  if (r.type === 'lxc')  return `/nodes/${r.node}/lxc/${r.vmid}`
  if (r.type === 'node') return `/nodes/${r.node ?? r.name ?? r.id}`
  if (r.type === 'storage') return `/storage`
  return '/'
}

function ResourceIcon({ type }: { type: string | undefined }) {
  if (type === 'qemu')    return <Monitor className="size-4 text-blue-400 shrink-0" />
  if (type === 'lxc')     return <Box className="size-4 text-purple-400 shrink-0" />
  if (type === 'node')    return <Server className="size-4 text-text-muted shrink-0" />
  if (type === 'storage') return <Database className="size-4 text-text-muted shrink-0" />
  return <Search className="size-4 text-text-muted shrink-0" />
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
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const { data: resources } = useClusterResources()

  // Global keyboard shortcut
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('')
      setSelected(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const results = useMemo(() => {
    if (!resources) return []
    const q = query.toLowerCase().trim()
    if (!q) {
      // Show recent/all in useful order: running VMs first, then nodes
      return resources
        .filter((r) => ['qemu', 'lxc', 'node'].includes(r.type ?? ''))
        .sort((a, b) => {
          const aRun = a.status === 'running' ? 0 : 1
          const bRun = b.status === 'running' ? 0 : 1
          return aRun - bRun
        })
        .slice(0, 12)
    }
    return resources.filter((r) => {
      const name = (r.name ?? '').toLowerCase()
      const id   = String(r.vmid ?? '').toLowerCase()
      const node = (r.node ?? r.name ?? '').toLowerCase()
      const type = typeLabel(r.type).toLowerCase()
      return name.includes(q) || id.includes(q) || node.includes(q) || type.includes(q)
    }).slice(0, 20)
  }, [resources, query])

  function go(r: ClusterResource) {
    navigate(resourcePath(r))
    setOpen(false)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelected((s) => Math.min(s + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelected((s) => Math.max(s - 1, 0))
    } else if (e.key === 'Enter' && results[selected]) {
      go(results[selected])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={() => setOpen(false)}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative w-full max-w-xl mx-4 rounded-xl border border-border bg-bg-elevated shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border-muted">
          <Search className="size-4 text-text-muted shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelected(0) }}
            onKeyDown={onKeyDown}
            placeholder="Search VMs, containers, nodes…"
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-disabled outline-none"
          />
          <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-border-subtle bg-bg-muted px-1.5 text-[10px] font-medium text-text-muted">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[360px] overflow-y-auto">
          {results.length === 0 ? (
            <p className="py-8 text-center text-sm text-text-muted">No results found</p>
          ) : (
            <div className="py-1">
              {results.map((r, i) => {
                const name = r.name ?? `${typeLabel(r.type)} ${r.vmid}`
                const isSelected = i === selected
                const isRunning = r.status === 'running'
                return (
                  <button
                    key={r.id}
                    onMouseEnter={() => setSelected(i)}
                    onClick={() => go(r)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      isSelected ? 'bg-bg-hover' : 'hover:bg-bg-hover'
                    }`}
                  >
                    <ResourceIcon type={r.type} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{name}</p>
                      <p className="text-xs text-text-muted truncate">
                        {typeLabel(r.type)}{r.vmid ? ` ${r.vmid}` : ''}
                        {r.node && r.type !== 'node' ? ` · ${r.node}` : ''}
                      </p>
                    </div>
                    <span className={`shrink-0 text-xs px-1.5 py-0.5 rounded-full border ${
                      isRunning
                        ? 'text-status-running border-status-running/30 bg-status-running/10'
                        : r.status
                          ? 'text-text-muted border-border-subtle'
                          : ''
                    }`}>
                      {r.status ?? ''}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-border-muted text-[11px] text-text-disabled">
          <span><kbd className="font-mono">↑↓</kbd> navigate</span>
          <span><kbd className="font-mono">↵</kbd> open</span>
          <span><kbd className="font-mono">Esc</kbd> close</span>
          <span className="ml-auto opacity-60">{results.length} result{results.length !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </div>
  )
}
