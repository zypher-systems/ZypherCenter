import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import type { StorageConfig, StorageContentItem } from '@zyphercenter/proxmox-types'

export const storageKeys = {
  all: ['storage'] as const,
  list: () => [...storageKeys.all, 'list'] as const,
  detail: (storageId: string) => [...storageKeys.all, storageId] as const,
  content: (node: string, storageId: string) =>
    [...storageKeys.all, node, storageId, 'content'] as const,
}

export function useStorage() {
  return useQuery({
    queryKey: storageKeys.list(),
    queryFn: () => api.get<StorageConfig[]>('storage'),
  })
}

export function useStorageContent(node: string, storageId: string, content?: string) {
  return useQuery({
    queryKey: [...storageKeys.content(node, storageId), content],
    queryFn: () =>
      api.get<StorageContentItem[]>(
        `nodes/${node}/storage/${storageId}/content${content ? `?content=${content}` : ''}`,
      ),
    enabled: !!node && !!storageId,
  })
}

export function useCreateStorage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: Record<string, unknown>) => api.post('storage', params),
    onSuccess: (_, vars) => {
      toast.success(`Storage "${vars.storage}" created`)
      qc.invalidateQueries({ queryKey: storageKeys.list() })
    },
    onError: (err) => toast.error(`Failed to create storage — ${err.message}`),
  })
}

export function useDeleteStorage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (storageId: string) => api.del(`storage/${encodeURIComponent(storageId)}`),
    onSuccess: (_, storageId) => {
      toast.success(`Storage "${storageId}" deleted`)
      qc.invalidateQueries({ queryKey: storageKeys.list() })
    },
    onError: (err) => toast.error(`Failed to delete storage — ${err.message}`),
  })
}

export function useDeleteStorageContent(node: string, storageId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (volid: string) =>
      api.del(`nodes/${node}/storage/${storageId}/content/${encodeURIComponent(volid)}`),
    onSuccess: (_, volid) => {
      toast.success(`Deleted ${volid.split('/').pop() ?? volid}`)
      qc.invalidateQueries({ queryKey: storageKeys.content(node, storageId) })
    },
    onError: (err) => toast.error(`Delete failed — ${err.message}`),
  })
}

export function useUploadContent(node: string, storageId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ file, content }: { file: File; content: 'iso' | 'vztmpl' }) => {
      const fd = new FormData()
      fd.append('content', content)
      fd.append('filename', file, file.name)
      return api.upload<{ data: string }>(`nodes/${node}/storage/${storageId}/upload`, fd)
    },
    onSuccess: () => {
      toast.success('Upload started — check Tasks for progress')
      qc.invalidateQueries({ queryKey: storageKeys.content(node, storageId) })
    },
    onError: (err) => toast.error(`Upload failed — ${err.message}`),
  })
}
