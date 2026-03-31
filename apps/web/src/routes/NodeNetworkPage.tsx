import { useParams } from 'react-router'
import { Network, Activity } from 'lucide-react'
import { useNodeNetwork, useNodeApplyNetwork } from '@/lib/queries/nodes'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import { formatBytes } from '@/lib/utils'

function ifaceType(iface: { type?: string }): string {
  return iface.type ?? 'unknown'
}

export function NodeNetworkPage() {
  const { node } = useParams<{ node: string }>()
  const { data: ifaces, isLoading } = useNodeNetwork(node!)
  const applyNetwork = useNodeApplyNetwork(node!)

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Network</h1>
          <p className="text-sm text-text-muted mt-0.5">Network interfaces on {node}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => applyNetwork.mutate()}
          disabled={applyNetwork.isPending}
        >
          {applyNetwork.isPending ? 'Applying…' : 'Apply Configuration'}
        </Button>
      </div>

      {isLoading ? (
        <SkeletonCard />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>IPv4</TableHead>
                  <TableHead>IPv6</TableHead>
                  <TableHead>MAC</TableHead>
                  <TableHead>Speed</TableHead>
                  <TableHead>Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ifaces?.map((iface) => (
                  <TableRow key={iface.iface}>
                    <TableCell className="font-medium font-mono text-text-primary">
                      <div className="flex items-center gap-2">
                        <Network className="size-3.5 text-text-muted shrink-0" />
                        {iface.iface}
                      </div>
                    </TableCell>
                    <TableCell className="text-text-secondary text-xs uppercase tracking-wide">
                      {ifaceType(iface)}
                    </TableCell>
                    <TableCell className="font-mono text-sm text-text-secondary">
                      {iface.address ? `${iface.address}${iface.netmask ? '/' + iface.netmask : ''}` : '—'}
                    </TableCell>
                    <TableCell className="font-mono text-sm text-text-secondary">
                      {iface.address6 ? `${iface.address6}${iface.netmask6 ? '/' + iface.netmask6 : ''}` : '—'}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-text-muted">
                        {(iface as Record<string, unknown>)['hwaddr'] as string ?? '—'}
                      </TableCell>
                      <TableCell className="text-text-secondary">
                        {(iface as Record<string, unknown>)['speed'] != null
                          ? `${(iface as Record<string, unknown>)['speed']} Mbit/s`
                          : '—'}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex size-2 rounded-full ${
                          iface.active ? 'bg-status-running' : 'bg-status-stopped'
                        }`}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Traffic Stats */}
      {ifaces && ifaces.some((i) => i.iface === 'eth0' || i.iface === 'ens3') && (
        <Card>
          <CardHeader>
            <CardTitle>
              <Activity className="size-4 inline-block mr-2 text-text-muted" />
              Traffic
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {ifaces
                .filter((i) => (i as Record<string, unknown>)['receive'] != null || (i as Record<string, unknown>)['transmit'] != null)
                .slice(0, 4)
                .map((i) => (
                  <div key={i.iface} className="text-center">
                    <p className="text-xs text-text-muted">{i.iface}</p>
                    <p className="text-sm font-medium text-status-running">
                      ↓ {formatBytes(((i as Record<string, unknown>)['receive'] as number) ?? 0)}
                    </p>
                    <p className="text-sm font-medium text-accent">
                      ↑ {formatBytes(((i as Record<string, unknown>)['transmit'] as number) ?? 0)}
                    </p>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
