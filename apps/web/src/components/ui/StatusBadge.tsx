import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import type { VMStatus } from '@zyphercenter/proxmox-types'

const dotVariants = cva('inline-block rounded-full shrink-0', {
  variants: {
    status: {
      running: 'bg-status-running shadow-[0_0_6px_var(--color-status-running)]',
      stopped: 'bg-status-stopped',
      paused: 'bg-status-paused',
      suspended: 'bg-status-paused',
      error: 'bg-status-error',
      migrating: 'bg-status-migrating',
      unknown: 'bg-status-unknown',
    },
    size: {
      sm: 'size-1.5',
      md: 'size-2',
      lg: 'size-2.5',
    },
  },
  defaultVariants: { status: 'unknown', size: 'md' },
})

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
  {
    variants: {
      status: {
        running:
          'bg-status-running-muted text-status-running ring-status-running/20',
        stopped:
          'bg-status-stopped-muted text-status-stopped ring-status-stopped/20',
        paused:
          'bg-status-paused-muted text-status-paused ring-status-paused/20',
        suspended:
          'bg-status-paused-muted text-status-paused ring-status-paused/20',
        error: 'bg-status-error-muted text-status-error ring-status-error/20',
        migrating:
          'bg-status-migrating-muted text-status-migrating ring-status-migrating/20',
        unknown: 'bg-bg-muted text-text-muted ring-border',
      },
    },
    defaultVariants: { status: 'unknown' },
  },
)

type StatusKey = NonNullable<VariantProps<typeof badgeVariants>['status']>

const STATUS_LABELS: Record<StatusKey, string> = {
  running: 'Running',
  stopped: 'Stopped',
  paused: 'Paused',
  suspended: 'Suspended',
  error: 'Error',
  migrating: 'Migrating',
  unknown: 'Unknown',
}

interface StatusBadgeProps {
  status: VMStatus | string
  /** Show as just a dot, no text */
  dotOnly?: boolean
  /** Override the displayed label */
  label?: string
  size?: VariantProps<typeof dotVariants>['size']
  className?: string
}

function toStatusKey(s: string): StatusKey {
  const map: Record<string, StatusKey> = {
    running: 'running',
    stopped: 'stopped',
    paused: 'paused',
    suspended: 'suspended',
    error: 'error',
    migrating: 'migrating',
  }
  return map[s] ?? 'unknown'
}

export function StatusBadge({ status, dotOnly = false, label, size, className }: StatusBadgeProps) {
  const key = toStatusKey(status)

  if (dotOnly) {
    return <span className={cn(dotVariants({ status: key, size }), className)} aria-label={label ?? STATUS_LABELS[key]} />
  }

  return (
    <span className={cn(badgeVariants({ status: key }), className)}>
      <span className={dotVariants({ status: key, size: 'sm' })} />
      {label ?? STATUS_LABELS[key]}
    </span>
  )
}
