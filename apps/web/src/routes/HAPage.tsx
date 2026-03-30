import { useHAResources, useHAGroups, useHAStatus } from '@/lib/queries/ha'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { Shield, Server, Layers } from 'lucide-react'

export function HAPage() {
  const { data: resources, isLoading: resLoading } = useHAResources()
  const { data: groups, isLoading: grpLoading } = useHAGroups()
  const { data: status } = useHAStatus()

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">High Availability</h1>
        <p className="text-sm text-text-muted mt-0.5">HA manager status and resource configuration</p>
      </div>

      {/* HA Manager Status */}
      {status && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(status as Record<string, unknown>).map(([key, val]) => (
            <Card key={key}>
              <CardContent className="p-4">
                <p className="text-xs text-text-muted capitalize">{key.replace(/_/g, ' ')}</p>
                <p className="text-lg font-semibold text-text-primary mt-1">{String(val)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Tabs defaultValue="resources">
        <TabsList>
          <TabsTrigger value="resources">
            <Shield className="size-3.5 mr-1.5" />
            Resources
          </TabsTrigger>
          <TabsTrigger value="groups">
            <Layers className="size-3.5 mr-1.5" />
            Groups
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resources">
          {resLoading ? (
            <SkeletonCard />
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Resource ID</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Group</TableHead>
                      <TableHead>Max Restart</TableHead>
                      <TableHead>Max Relocate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resources?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-text-muted py-12">
                          No HA resources configured
                        </TableCell>
                      </TableRow>
                    ) : (
                      resources?.map((r) => (
                        <TableRow key={r.sid}>
                          <TableCell className="font-medium text-text-primary">{r.sid}</TableCell>
                          <TableCell className="text-text-secondary text-sm">{r.type}</TableCell>
                          <TableCell>
                            <StatusBadge status={r.state ?? 'unknown'} />
                          </TableCell>
                          <TableCell className="text-text-secondary">{r.group ?? '—'}</TableCell>
                          <TableCell className="text-text-secondary tabular-nums">
                            {r.max_restart ?? 1}
                          </TableCell>
                          <TableCell className="text-text-secondary tabular-nums">
                            {r.max_relocate ?? 1}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="groups">
          {grpLoading ? (
            <SkeletonCard />
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Group</TableHead>
                      <TableHead>Nodes</TableHead>
                      <TableHead>Restricted</TableHead>
                      <TableHead>No Failback</TableHead>
                      <TableHead>Comment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groups?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-text-muted py-12">
                          No HA groups configured
                        </TableCell>
                      </TableRow>
                    ) : (
                      groups?.map((g) => (
                        <TableRow key={g.group}>
                          <TableCell className="font-medium text-text-primary">{g.group}</TableCell>
                          <TableCell className="text-text-secondary text-sm">{g.nodes}</TableCell>
                          <TableCell>
                            {g.restricted ? (
                              <span className="text-status-paused text-xs">Yes</span>
                            ) : (
                              <span className="text-text-muted text-xs">No</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {g.nofailback ? (
                              <span className="text-status-paused text-xs">Yes</span>
                            ) : (
                              <span className="text-text-muted text-xs">No</span>
                            )}
                          </TableCell>
                          <TableCell className="text-text-muted text-sm">
                            {g.comment ?? '—'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
