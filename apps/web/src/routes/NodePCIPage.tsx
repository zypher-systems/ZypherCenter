import { useParams } from 'react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { useNodeHardwarePCI } from '@/lib/queries/nodes'
import { SkeletonCard } from '@/components/ui/Skeleton'

export function NodePCIPage() {
  const { node } = useParams<{ node: string }>()
  const { data: pciDevices, isLoading } = useNodeHardwarePCI(node!)

  if (isLoading) return <SkeletonCard />

  return (
    <Card>
      <CardHeader>
        <CardTitle>PCIe Devices ({pciDevices?.length ?? 0})</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {!pciDevices || pciDevices.length === 0 ? (
          <p className="text-center text-text-muted py-8 text-sm">No PCI devices found on this node.</p>
        ) : (
          <div className="divide-y divide-border-muted">
            {pciDevices.map((dev: any) => (
              <div key={dev.id} className="flex items-start gap-3 px-4 py-3">
                <span className="font-mono text-sm text-text-muted shrink-0 w-24 pt-0.5">{dev.id}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text-primary break-all">
                    {dev.device_name ?? dev.device ?? '—'}
                  </p>
                  <p className="text-sm text-text-muted mt-0.5 break-all">
                    {dev.vendor_name ?? dev.vendor ?? ''}
                    {dev.iommugroup != null ? ` · IOMMU group ${dev.iommugroup}` : ''}
                    {dev.mdev ? ' · mdev' : ''}
                  </p>
                </div>
                <span className="text-sm text-text-muted font-mono shrink-0 pt-0.5">{dev.class}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
