import { useTaskLog } from '@/lib/queries/tasks'

interface TaskLogViewerProps {
  node: string
  upid: string
  maxHeight?: string
  autoScroll?: boolean
}

export function TaskLogViewer({ node, upid, maxHeight = '400px', autoScroll = true }: TaskLogViewerProps) {
  const { data: lines, isLoading } = useTaskLog(node, upid, autoScroll)

  return (
    <div 
      className="rounded-lg bg-bg-elevated border border-border overflow-hidden"
      style={{ maxHeight }}
    >
      <div className="bg-bg-card border-b border-border px-4 py-2 flex items-center justify-between">
        <span className="text-xs font-mono text-text-muted truncate">{upid}</span>
        {isLoading && (
          <span className="flex items-center gap-2 text-[10px] text-accent font-medium uppercase tracking-wider">
            <span className="size-1.5 rounded-full bg-accent animate-pulse" />
            Live Log
          </span>
        )}
      </div>
      <div className="p-4 overflow-y-auto font-mono text-xs leading-relaxed text-text-secondary custom-scrollbar" style={{ maxHeight: `calc(${maxHeight} - 40px)` }}>
        {isLoading && (!lines || (lines as any[]).length === 0) ? (
          <p className="text-text-disabled italic">Initializing task log...</p>
        ) : lines && (lines as any[]).length > 0 ? (
          <pre className="whitespace-pre-wrap break-all">
            {(lines as any[]).map((l) => l.t).join('\n')}
          </pre>
        ) : (
          <p className="text-text-disabled italic text-center py-8">No output recorded</p>
        )}
      </div>
    </div>
  )
}
