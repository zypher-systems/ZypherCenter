import { useState } from 'react'
import { Network, Layers } from 'lucide-react'
import { useSDNVNets, useSDNZones } from '@/lib/queries/cluster'
import { Card, CardContent } from '@/components/ui/Card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table'
import { SkeletonCard } from '@/components/ui/Skeleton'

function VNetsTab() {
  const { data: vnets, isLoading } = useSDNVNets()
  if (isLoading) return <SkeletonCard />
  return (
    <Card>
      <CardContent className="p-0">
        {!vnets?.length ? (
          <p className="text-center text-text-muted text-sm py-10">No VNets configured</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>VNet</TableHead>
                <TableHead>Zone</TableHead>
                <TableHead>Tag</TableHead>
                <TableHead>Alias</TableHead>
                <TableHead>VLAN aware</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vnets.map((v) => (
                <TableRow key={v['vnet'] as string}>
                  <TableCell className="font-mono font-medium text-text-primary">{v['vnet'] as string}</TableCell>
                  <TableCell className="text-text-secondary">{v['zone'] as string ?? '—'}</TableCell>
                  <TableCell className="font-mono text-text-muted">{v['tag'] != null ? String(v['tag']) : '—'}</TableCell>
                  <TableCell className="text-text-muted">{v['alias'] as string ?? '—'}</TableCell>
                  <TableCell>
                    <span className={`text-xs ${v['vlanaware'] ? 'text-status-running' : 'text-text-disabled'}`}>
                      {v['vlanaware'] ? 'Yes' : 'No'}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function ZonesTab() {
  const { data: zones, isLoading } = useSDNZones()
  if (isLoading) return <SkeletonCard />
  return (
    <Card>
      <CardContent className="p-0">
        {!zones?.length ? (
          <p className="text-center text-text-muted text-sm py-10">No SDN zones configured</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Zone</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Bridge</TableHead>
                <TableHead>Nodes</TableHead>
                <TableHead>DNS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {zones.map((z) => (
                <TableRow key={z['zone'] as string}>
                  <TableCell className="font-mono font-medium text-text-primary">{z['zone'] as string}</TableCell>
                  <TableCell>
                    <span className="text-xs uppercase tracking-wide text-text-muted bg-bg-elevated px-2 py-0.5 rounded">
                      {z['type'] as string ?? '—'}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-text-secondary">{z['bridge'] as string ?? '—'}</TableCell>
                  <TableCell className="text-text-muted text-sm">{z['nodes'] as string ?? 'All'}</TableCell>
                  <TableCell className="font-mono text-xs text-text-muted">{z['dns'] as string ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

export function SDNPage() {
  const [tab, setTab] = useState('vnets')
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">SDN</h1>
        <p className="text-sm text-text-muted mt-0.5">Software-Defined Networking — VNets and Zones</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="vnets"><Network className="size-3.5 mr-1.5" />VNets</TabsTrigger>
          <TabsTrigger value="zones"><Layers className="size-3.5 mr-1.5" />Zones</TabsTrigger>
        </TabsList>
        <TabsContent value="vnets"><VNetsTab /></TabsContent>
        <TabsContent value="zones"><ZonesTab /></TabsContent>
      </Tabs>
    </div>
  )
}
