import { Link } from 'react-router'
import { RefreshCw, Download, ChevronRight } from 'lucide-react'
import { useNodeUpdates, useNodeAptCheck } from '@/lib/queries/nodes'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface NodeUpdatesCardProps {
  node: string
  className?: string
}

export function NodeUpdatesCard({ node, className }: NodeUpdatesCardProps) {
  const { data: packages, isLoading, isFetching } = useNodeUpdates(node)
  const aptCheck = useNodeAptCheck(node)

  const updateCount = packages?.length ?? 0
  const hasUpdates = updateCount > 0

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <RefreshCw className={cn('size-3.5 text-text-muted', (isFetching || aptCheck.isPending) && 'animate-spin')} />
          System Updates
        </CardTitle>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-text-disabled hover:text-text-primary"
          onClick={() => aptCheck.mutate()}
          disabled={aptCheck.isPending || isFetching}
          title="Check for updates"
        >
          <RefreshCw className="size-3.5" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className={cn(
                "text-xl font-bold tracking-tight sm:text-2xl",
                hasUpdates ? "text-status-warning" : "text-text-primary"
              )}>
                {isLoading ? '—' : updateCount}
              </span>
              <span className="text-xs text-text-muted font-medium">
                pending
              </span>
            </div>
            <p className="text-[10px] text-text-disabled mt-1 uppercase tracking-wider font-semibold">
              {isLoading ? 'Checking status...' : hasUpdates ? 'Updates available' : 'System up to date'}
            </p>
          </div>
          
          <div className="flex flex-col gap-1.5">
            {hasUpdates ? (
              <Button asChild size="sm" className="h-8 gap-1.5 px-3">
                <Link to={`/nodes/${node}/updates`}>
                  <Download className="size-3.5" />
                  Upgrade
                </Link>
              </Button>
            ) : (
              <Button asChild variant="outline" size="sm" className="h-8 gap-1 px-2 text-xs">
                <Link to={`/nodes/${node}/updates`}>
                  Details
                  <ChevronRight className="size-3" />
                </Link>
              </Button>
            )}
          </div>
        </div>

        {hasUpdates && packages && (
          <div className="mt-4 pt-3 border-t border-border-muted">
            <div className="flex flex-wrap gap-1.5">
              {packages.slice(0, 3).map((pkg: any) => (
                <span 
                  key={pkg.Package} 
                  className="px-1.5 py-0.5 rounded bg-bg-elevated border border-border text-[10px] font-mono text-text-secondary truncate max-w-[120px]"
                  title={pkg.Package}
                >
                  {pkg.Package}
                </span >
              ))}
              {updateCount > 3 && (
                <span className="px-1.5 py-0.5 text-[10px] text-text-disabled font-medium">
                  +{updateCount - 3} more
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
