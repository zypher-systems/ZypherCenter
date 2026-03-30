import { useClusterOptions } from '@/lib/queries/cluster'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { SkeletonCard } from '@/components/ui/Skeleton'

export function ClusterOptionsPage() {
  const { data: options, isLoading } = useClusterOptions()

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Cluster Options</h1>
        <p className="text-sm text-text-muted mt-0.5">Global cluster configuration settings</p>
      </div>

      {isLoading ? (
        <SkeletonCard />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {options && (
            <Card>
              <CardHeader>
                <CardTitle>Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3">
                  {Object.entries(options as Record<string, unknown>)
                    .filter(([, v]) => v != null && typeof v !== 'object')
                    .map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <dt className="text-text-muted capitalize">{key.replace(/_/g, ' ')}</dt>
                        <dd className="text-text-primary font-medium">{String(value)}</dd>
                      </div>
                    ))}
                </dl>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Migration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex h-24 items-center justify-center">
                <p className="text-text-muted text-sm">Migration options — coming soon</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
