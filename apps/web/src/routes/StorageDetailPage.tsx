import { useState, useRef } from 'react'
import { useParams } from 'react-router'
import { HardDrive, Package, Server, Trash2, Upload } from 'lucide-react'
import { useStorage, useStorageContent, useDeleteStorageContent, useUploadContent } from '@/lib/queries/storage'
import { useNodeStorage } from '@/lib/queries/nodes'
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
import { ResourceGauge } from '@/components/ui/ResourceGauge'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { formatBytes, formatPercent, formatTimestamp } from '@/lib/utils'

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
  const [showUpload, setShowUpload] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadType, setUploadType] = useState<'iso' | 'vztmpl'>('iso')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: storages } = useStorage()
  const storageInfo = storages?.find((s) => s.storage === storageid)

  const targetNode = activeNode || storageInfo?.nodes?.split(',')[0]?.trim() || 'pve'

  const { data: nodeStorages } = useNodeStorage(targetNode)
  const capacityInfo = nodeStorages?.find((ns) => ns.storage === storageid)

  const { data: content, isLoading } = useStorageContent(
    targetNode,
    storageid!,
    contentFilter || undefined,
  )
  const deleteContent = useDeleteStorageContent(targetNode, storageid!)
  const uploadContent = useUploadContent(targetNode, storageid!)

  // Allowed content types for upload
  const supportedContent = storageInfo?.content?.split(',').map((s) => s.trim()) ?? []
  const canUploadIso = supportedContent.includes('iso') || supportedContent.length === 0
  const canUploadTemplate = supportedContent.includes('vztmpl') || supportedContent.length === 0
  const canUpload = canUploadIso || canUploadTemplate

  function handleUpload() {
    if (!uploadFile) return
    uploadContent.mutate(
      { file: uploadFile, content: uploadType },
      {
        onSuccess: () => {
          setShowUpload(false)
          setUploadFile(null)
          if (fileInputRef.current) fileInputRef.current.value = ''
        },
      },
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">{storageid}</h1>
          <p className="text-sm text-text-muted mt-0.5">
            {storageInfo?.type ?? 'storage'} · {storageInfo?.content?.replace(/,/g, ', ') ?? ''}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {canUpload && (
            <Button size="sm" variant="default" onClick={() => setShowUpload(true)}>
              <Upload className="size-3.5" /> Upload
            </Button>
          )}
          {storageInfo?.nodes && storageInfo.nodes.includes(',') && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted">Node:</span>
              <select
                value={activeNode || (storageInfo.nodes!.split(',')[0] ?? '').trim()}
                onChange={(e) => setActiveNode(e.target.value)}
                className="rounded border border-border-subtle bg-bg-input px-2 py-1.5 text-sm text-text-primary outline-none focus:border-accent [color-scheme:dark]"
              >
                {storageInfo.nodes.split(',').map((n) => n.trim()).map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Upload dialog */}
      {showUpload && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Upload className="size-4 text-text-muted" /> Upload ISO / Template
              </CardTitle>
              <button onClick={() => { setShowUpload(false); setUploadFile(null) }} className="text-text-muted hover:text-text-primary">
                ✕
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-xs text-text-muted w-20">Type</span>
              <select
                value={uploadType}
                onChange={(e) => setUploadType(e.target.value as 'iso' | 'vztmpl')}
                className="rounded border border-border-subtle bg-bg-input px-2 py-1.5 text-sm text-text-primary outline-none focus:border-accent [color-scheme:dark]"
              >
                {canUploadIso && <option value="iso">ISO Image</option>}
                {canUploadTemplate && <option value="vztmpl">CT Template</option>}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-text-muted w-20">File</span>
              <input
                ref={fileInputRef}
                type="file"
                accept={uploadType === 'iso' ? '.iso,.img' : '.tar.gz,.tar.xz,.tar.zst'}
                onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                className="flex-1 text-sm text-text-primary file:mr-3 file:rounded file:border-0 file:bg-bg-surface file:px-2 file:py-1 file:text-xs file:text-text-secondary hover:file:bg-bg-surface/70"
              />
            </div>
            {uploadFile && (
              <p className="text-xs text-text-muted pl-[6rem]">{uploadFile.name} ({(uploadFile.size / 1024 / 1024).toFixed(1)} MB)</p>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <Button size="sm" variant="ghost" onClick={() => { setShowUpload(false); setUploadFile(null) }}>Cancel</Button>
              <Button size="sm" onClick={handleUpload} disabled={!uploadFile || uploadContent.isPending}>
                {uploadContent.isPending ? 'Uploading…' : 'Upload'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Capacity card */}
      {capacityInfo && capacityInfo.total != null && capacityInfo.total > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <HardDrive className="size-4 text-text-muted" />
              <CardTitle className="text-sm font-medium">Capacity</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-6">
              <div className="space-y-1.5">
                <p className="text-xs text-text-muted">Used</p>
                <p className="text-lg font-semibold tabular-nums text-text-primary">
                  {formatBytes(capacityInfo.used ?? 0)}
                </p>
                <p className="text-xs text-text-disabled">
                  {formatPercent(capacityInfo.used_fraction ?? ((capacityInfo.used ?? 0) / capacityInfo.total))} of total
                </p>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs text-text-muted">Available</p>
                <p className="text-lg font-semibold tabular-nums text-text-primary">
                  {formatBytes(capacityInfo.avail ?? 0)}
                </p>
                <p className="text-xs text-text-disabled">free space</p>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs text-text-muted">Total</p>
                <p className="text-lg font-semibold tabular-nums text-text-primary">
                  {formatBytes(capacityInfo.total)}
                </p>
                <p className="text-xs text-text-disabled">{targetNode}</p>
              </div>
            </div>
            <div className="mt-4">
              <ResourceGauge
                label=""
                used={capacityInfo.used ?? 0}
                total={capacityInfo.total}
                format="bytes"
              />
            </div>
          </CardContent>
        </Card>
      )}

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
