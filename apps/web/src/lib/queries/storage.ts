import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
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
