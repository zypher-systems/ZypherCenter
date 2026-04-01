import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router'
import { RefreshCw, Search, ChevronLeft, ChevronRight, Radio } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { formatTimestamp } from '@/lib/utils'

const PAGE_SIZE = 500

type SyslogLine = {
  n: number
  t: number
  m: string
  p?: string
}

export function NodeSyslogPage() {
  const { node } = useParams<{ node: string }>()
  const [lines, setLines] = useState<SyslogLine[]>([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [start, setStart] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [refreshInterval, setRefreshInterval] = useState(10)
  const listRef = useRef<HTMLDivElement>(null)

  const fetchLogs = useCallback(
    async (startLine = 0) => {
      setIsLoading(true)
      try {
        const params = new URLSearchParams({ start: String(startLine), limit: String(PAGE_SIZE) })
        const res = await fetch(`/api/proxmox/nodes/${node}/syslog?${params}`, {
          credentials: 'include',
        })
        const json = (await res.json()) as { data: SyslogLine[] }
        const fetched = json.data ?? []
        setLines(fetched)
        setStart(startLine)
        setHasMore(fetched.length === PAGE_SIZE)
        if (listRef.current) listRef.current.scrollTop = 0
      } finally {
        setIsLoading(false)
      }
    },
    [node],
  )

  useEffect(() => {
    fetchLogs(0)
  }, [fetchLogs])

  useEffect(() => {
    if (!autoRefresh) return
    const id = setInterval(() => fetchLogs(start), refreshInterval * 1000)
    return () => clearInterval(id)
  }, [autoRefresh, refreshInterval, fetchLogs, start])

  const filtered = search
    ? lines.filter((l) => l.m.toLowerCase().includes(search.toLowerCase()))
    : lines

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Syslog</h1>
          <p className="text-sm text-text-muted mt-0.5">System log for {node}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-text-muted" />
            <Input
              placeholder="Filter log…"
              className="pl-8 w-56 h-8 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            className="rounded border border-border-subtle bg-bg-input px-2 py-1.5 text-sm text-text-primary outline-none focus:border-accent [color-scheme:dark]"
          >
            <option value={5}>5s</option>
            <option value={10}>10s</option>
            <option value={30}>30s</option>
            <option value={60}>60s</option>
          </select>
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAutoRefresh((v) => !v)}
          >
            <Radio className={`size-4 mr-1.5 ${autoRefresh ? 'animate-pulse' : ''}`} />
            {autoRefresh ? 'Live' : 'Auto'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchLogs(0)}
            disabled={isLoading}
          >
            <RefreshCw className={`size-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div
            ref={listRef}
            className="overflow-y-auto max-h-[calc(100vh-260px)] font-mono text-xs p-4 space-y-0.5"
          >
            {isLoading && lines.length === 0 ? (
              <p className="text-text-muted text-sm font-sans py-8 text-center">Loading syslog…</p>
            ) : filtered.length === 0 ? (
              <p className="text-text-muted text-sm font-sans py-8 text-center">No log entries</p>
            ) : (
              filtered.map((line) => (
                <div key={line.n} className="flex gap-3 leading-5">
                  <span className="text-text-muted shrink-0 w-20">
                    {formatTimestamp(line.t)}
                  </span>
                  {line.p && (
                    <span className="text-accent shrink-0 max-w-32 truncate">{line.p}</span>
                  )}
                  <span
                    className={
                      line.m.includes('error') || line.m.includes('Error') || line.m.includes('ERROR')
                        ? 'text-status-error'
                        : line.m.includes('warn') || line.m.includes('Warning')
                          ? 'text-status-paused'
                          : 'text-text-primary'
                    }
                  >
                    {line.m}
                  </span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-sm text-text-muted">
        <span>Lines {start + 1}–{start + lines.length}</span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={start === 0 || isLoading}
            onClick={() => fetchLogs(Math.max(0, start - PAGE_SIZE))}
          >
            <ChevronLeft className="size-4 mr-1" />Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasMore || isLoading}
            onClick={() => fetchLogs(start + PAGE_SIZE)}
          >
            Next<ChevronRight className="size-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  )
}
