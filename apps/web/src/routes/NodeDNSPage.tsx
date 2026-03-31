import { useState, useEffect } from 'react'
import { useParams } from 'react-router'
import { Globe, Pencil, Save, X } from 'lucide-react'
import { useNodeDNS, useUpdateNodeDNS } from '@/lib/queries/nodes'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SkeletonCard } from '@/components/ui/Skeleton'

const FIELD_LABELS: { key: keyof DraftDNS; label: string; placeholder: string }[] = [
  { key: 'search',  label: 'Search Domain', placeholder: 'example.com' },
  { key: 'dns1',    label: 'DNS Server 1',   placeholder: '1.1.1.1' },
  { key: 'dns2',    label: 'DNS Server 2',   placeholder: '1.0.0.1' },
  { key: 'dns3',    label: 'DNS Server 3',   placeholder: '8.8.8.8' },
]

interface DraftDNS {
  search: string
  dns1: string
  dns2: string
  dns3: string
}

export function NodeDNSPage() {
  const { node } = useParams<{ node: string }>()
  const { data: dns, isLoading } = useNodeDNS(node!)
  const update = useUpdateNodeDNS(node!)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<DraftDNS>({ search: '', dns1: '', dns2: '', dns3: '' })

  useEffect(() => {
    if (dns) {
      setDraft({
        search: dns.search ?? '',
        dns1: dns.dns1 ?? '',
        dns2: dns.dns2 ?? '',
        dns3: dns.dns3 ?? '',
      })
    }
  }, [dns])

  function handleSave() {
    const params: Record<string, string> = {}
    if (draft.search.trim()) params.search = draft.search.trim()
    if (draft.dns1.trim()) params.dns1 = draft.dns1.trim()
    if (draft.dns2.trim()) params.dns2 = draft.dns2.trim()
    if (draft.dns3.trim()) params.dns3 = draft.dns3.trim()
    update.mutate(params as Parameters<typeof update.mutate>[0], {
      onSuccess: () => setEditing(false),
    })
  }

  function handleCancel() {
    if (dns) {
      setDraft({
        search: dns.search ?? '',
        dns1: dns.dns1 ?? '',
        dns2: dns.dns2 ?? '',
        dns3: dns.dns3 ?? '',
      })
    }
    setEditing(false)
  }

  const inp = 'w-full rounded border border-border-subtle bg-bg-input px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed'

  return (
    <div className="space-y-4 max-w-xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">DNS</h1>
          <p className="text-sm text-text-muted mt-0.5">Name resolution settings for {node}</p>
        </div>
        {!editing ? (
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            <Pencil className="size-3.5 mr-1.5" />Edit
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={handleCancel} disabled={update.isPending}>
              <X className="size-3.5 mr-1" />Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={update.isPending}>
              <Save className="size-3.5 mr-1" />
              {update.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <SkeletonCard />
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Globe className="size-4 text-text-muted" />
              <CardTitle className="text-sm font-medium">DNS Configuration</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {FIELD_LABELS.map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  {label}
                </label>
                {editing ? (
                  <input
                    value={draft[key]}
                    onChange={(e) => setDraft((prev) => ({ ...prev, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className={inp}
                    disabled={update.isPending}
                  />
                ) : (
                  <p className="text-sm text-text-primary font-mono">
                    {dns?.[key] ?? <span className="text-text-disabled italic">not configured</span>}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
