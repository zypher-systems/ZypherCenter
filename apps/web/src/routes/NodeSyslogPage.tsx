import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router'
import { RefreshCw, Search } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { formatTimestamp } from '@/lib/utils'

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
  const listRef = useRef<HTMLDivElement>(null)

  const fetchLogs = useCallback(
    async (startLine = 0) => {
      setIsLoading(true)
      try {
        const params = new URLSearchParams({ start: String(startLine), limit: '500' })
        const res = await fetch(`/api/proxmox/nodes/${node}/syslog?${params}`, {
          credentials: 'include',
        })
        const json = (await res.json()) as { data: SyslogLine[] }
        setLines(json.data ?? [])
        setStart(startLine)
      } finally {
        setIsLoading(false)
      }
    },
    [node],
  )

  useEffect(() => {
    fetchLogs(0)
  }, [fetchLogs])

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
            className="overflow-y-auto max-h-[calc(100vh-220px)] font-mono text-xs p-4 space-y-0.5"
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
    </div>
  )
}
