import { cn, formatBytes, formatPercent } from '@/lib/utils'

interface ResourceGaugeProps {
  label: string
  used: number
  total: number
  /** 'bytes' formats values as KB/MB/GB. 'percent' shows raw percent. Defaults to 'bytes'. */
  format?: 'bytes' | 'percent' | 'count'
  className?: string
}

function getBarColor(pct: number): string {
  if (pct >= 0.9) return 'bg-status-error'
  if (pct >= 0.75) return 'bg-status-paused'
  return 'bg-accent'
}

export function ResourceGauge({ label, used, total, format = 'bytes', className }: ResourceGaugeProps) {
  const pct = total > 0 ? Math.min(used / total, 1) : 0

  const formatValue = (v: number) => {
    if (format === 'bytes') return formatBytes(v)
    if (format === 'percent') return formatPercent(v)
    return v.toString()
  }

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-text-secondary font-medium">{label}</span>
        <span className="text-text-muted tabular-nums">
          {formatValue(used)}
          {total > 0 && (
            <>
              {' '}
              <span className="text-text-disabled">/</span> {formatValue(total)}
            </>
          )}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-bg-muted overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-300', getBarColor(pct))}
          style={{ width: `${pct * 100}%` }}
          role="progressbar"
          aria-valuenow={Math.round(pct * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  )
}

interface MultiGaugeProps {
  items: ResourceGaugeProps[]
  className?: string
}

export function MultiGauge({ items, className }: MultiGaugeProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {items.map((item) => (
        <ResourceGauge key={item.label} {...item} />
      ))}
    </div>
  )
}
