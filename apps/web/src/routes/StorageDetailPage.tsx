import { useState } from 'react'
import { useParams } from 'react-router'
import { HardDrive, Package, Server, Trash2 } from 'lucide-react'
import { useStorage, useStorageContent, useDeleteStorageContent } from '@/lib/queries/storage'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { formatBytes, formatTimestamp } from '@/lib/utils'

const CONTENT_TYPES = [
  { value: '', label: 'All' },
  { value: 'vztmpl', label: 'Templates' },
  { value: 'iso', label: 'ISOs' },
  { value: 'images', label: 'Disk Images' },
  { value: 'backup', label: 'Backups' },
  { value: 'snippets', label: 'Snippets' },
]

function contentIcon(type?: string) {
  if (type === 'iso') return <Package className="size-3.5 text-text-muted" />
  if (type === 'backup') return <HardDrive className="size-3.5 text-text-muted" />
  return <Server className="size-3.5 text-text-muted" />
}

export function StorageDetailPage() {
  const { storageid } = useParams<{ storageid: string }>()
  const [activeNode, setActiveNode] = useState<string>('')
  const [contentFilter, setContentFilter] = useState<string>('')
  const { data: storages } = useStorage()
  const storageInfo = storages?.find((s) => s.storage === storageid)

  const targetNode = activeNode || storageInfo?.nodes?.split(',')[0]?.trim() || 'pve'

  const { data: content, isLoading } = useStorageContent(
    targetNode,
    storageid!,
    contentFilter || undefined,
  )
  const deleteContent = useDeleteStorageContent(targetNode, storageid!)

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">{storageid}</h1>
          <p className="text-sm text-text-muted mt-0.5">
            {storageInfo?.type ?? 'storage'} · {storageInfo?.content?.replace(/,/g, ', ') ?? ''}
          </p>
        </div>
      </div>

      {/* Content type filter */}
      <div className="flex items-center gap-1 flex-wrap">
        {CONTENT_TYPES.map((ct) => (
          <Button
            key={ct.value}
            size="sm"
            variant={contentFilter === ct.value ? 'default' : 'ghost'}
            onClick={() => setContentFilter(ct.value)}
          >
            {ct.label}
          </Button>
        ))}
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
                  <TableHead>Size</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>VM</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {content?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-text-muted py-10">
                      No content
                    </TableCell>
                  </TableRow>
                ) : (
                  content?.map((item) => (
                    <TableRow key={item.volid}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {contentIcon(item.content)}
                          <span className="font-mono text-sm text-text-primary">
                            {item.volid.split(':').pop() ?? item.volid}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-text-secondary text-xs uppercase tracking-wide">
                        {item.content}
                      </TableCell>
                      <TableCell className="tabular-nums text-text-secondary">
                        {item.size ? formatBytes(item.size) : '—'}
                      </TableCell>
                      <TableCell className="tabular-nums text-text-secondary text-sm">
                        {item.ctime ? formatTimestamp(item.ctime) : '—'}
                      </TableCell>
                      <TableCell className="font-mono text-text-muted text-sm">
                        {item.vmid ?? '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <button
                          onClick={() => {
                            if (confirm(`Delete "${item.volid.split(':').pop()}"?`)) {
                              deleteContent.mutate(item.volid)
                            }
                          }}
                          disabled={deleteContent.isPending}
                          className="inline-flex items-center gap-1 rounded border border-status-error/40 px-2 py-0.5 text-xs text-status-error hover:bg-status-error/10 disabled:opacity-50"
                        >
                          <Trash2 className="size-3" />
                          Delete
                        </button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
