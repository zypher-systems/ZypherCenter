import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useStorage } from '@/lib/queries/storage'
import { useRestoreVM } from '@/lib/queries/vms'
import { useRestoreLXC } from '@/lib/queries/lxc'
import type { StorageContentItem } from '@zyphercenter/proxmox-types'

export function detectBackupType(volid: string): 'qemu' | 'lxc' | null {
  const filename = volid.split('/').pop() ?? ''
  if (filename.includes('vzdump-qemu-')) return 'qemu'
  if (filename.includes('vzdump-lxc-') || filename.includes('vzdump-openvz-')) return 'lxc'
  if (volid.includes('backup/vm')) return 'qemu'
  if (volid.includes('backup/ct')) return 'lxc'
  return null
}

export function RestoreDialog({
  item,
  node,
  onClose,
  defaultVmid,
}: {
  item: StorageContentItem
  node: string
  onClose: () => void
  defaultVmid?: number
}) {
  const { data: storages } = useStorage()
  const restoreVM = useRestoreVM(node)
  const restoreLXC = useRestoreLXC(node)

  const backupType = detectBackupType(item.volid) || (item.vmid ? 'qemu' : null) // Fallback to qemu if vmid exists
  const [vmid, setVmid] = useState(String(defaultVmid ?? item.vmid ?? ''))
  const [storage, setStorage] = useState('local')
  const [unique, setUnique] = useState(true)
  const [startAfter, setStartAfter] = useState(false)

  const eligibleStorages = storages?.filter((s) => {
    const c = s.content ?? ''
    return backupType === 'lxc'
      ? c.includes('rootdir') || c.includes('images')
      : c.includes('images')
  }) ?? []

  const isPending = restoreVM.isPending || restoreLXC.isPending

  function handleRestore() {
    const vid = parseInt(vmid)
    if (!vid || vid < 100) return
    const params = { archive: item.volid, vmid: vid, storage, unique: unique ? 1 : 0, start: startAfter ? 1 : 0 }
    if (backupType === 'qemu') {
      restoreVM.mutate(params, { onSuccess: onClose })
    } else {
      restoreLXC.mutate(params, { onSuccess: onClose })
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <RotateCcw className="size-4 text-text-muted" />
            Restore Backup
          </CardTitle>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">✕</button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs font-mono text-text-muted truncate">{item.volid.split(':').pop()}</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-text-muted">Type</label>
            <p className="text-sm text-text-primary font-medium capitalize">{backupType ?? 'Unknown'}</p>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-text-muted">Target VMID</label>
            <input
              type="number"
              min={100}
              max={999999999}
              value={vmid}
              onChange={(e) => setVmid(e.target.value)}
              className="w-full rounded border border-border-subtle bg-bg-input px-2 py-1 text-sm text-text-primary outline-none focus:border-accent"
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-text-muted">Target Storage</label>
          <select
            value={storage}
            onChange={(e) => setStorage(e.target.value)}
            className="w-full rounded border border-border-subtle bg-bg-input px-2 py-1.5 text-sm text-text-primary outline-none focus:border-accent [color-scheme:dark]"
          >
            {eligibleStorages.length > 0
              ? eligibleStorages.map((s) => <option key={s.storage} value={s.storage}>{s.storage}</option>)
              : storages?.map((s) => <option key={s.storage} value={s.storage}>{s.storage}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-1.5 text-sm cursor-pointer">
            <input type="checkbox" checked={unique} onChange={(e) => setUnique(e.target.checked)} className="accent-accent" />
            <span className="text-text-secondary">Unique MACs/IDs</span>
          </label>
          <label className="flex items-center gap-1.5 text-sm cursor-pointer">
            <input type="checkbox" checked={startAfter} onChange={(e) => setStartAfter(e.target.checked)} className="accent-accent" />
            <span className="text-text-secondary">Start after restore</span>
          </label>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button size="sm" variant="ghost" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button size="sm" onClick={handleRestore} disabled={isPending || !vmid || backupType === null}>
            {isPending ? 'Starting…' : 'Restore'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
