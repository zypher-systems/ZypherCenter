import { useState } from 'react'
import { useClusterOptions, useUpdateClusterOptions } from '@/lib/queries/cluster'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import { Pencil, Save, X } from 'lucide-react'

type EditableKey = 'keyboard' | 'language' | 'http_proxy' | 'next_id' | 'description'

const EDITABLE_KEYS: EditableKey[] = ['keyboard', 'language', 'http_proxy', 'next_id', 'description']
const KEYBOARDS = ['de','de-ch','da','en-gb','en-us','es','fi','fr','fr-be','fr-ch','hu','is','it','ja','lt','mk','nl','no','pl','pt','pt-br','sl','sv','tr']
const LANGUAGES = ['ca','da','de','en','es','eu','fa','fr','he','it','ja','nb','nn','pl','pt_BR','ru','sl','sv','tr','zh_CN','zh_TW']

function EditOptionsDialog({
  options,
  onClose,
}: {
  options: Record<string, unknown>
  onClose: () => void
}) {
  const update = useUpdateClusterOptions()
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const key of EDITABLE_KEYS) {
      if (options[key] != null) init[key] = String(options[key])
    }
    return init
  })

  function set(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  function submit() {
    const patch: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(values)) {
      if (v.trim()) patch[k] = v.trim()
    }
    update.mutate(patch, { onSuccess: () => onClose() })
  }

  const inp = 'w-full rounded border border-border-subtle bg-bg-input px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-bg-card border border-border-subtle rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">Edit Cluster Options</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-text-secondary mb-1">Keyboard Layout</label>
            <select value={values.keyboard ?? ''} onChange={(e) => set('keyboard', e.target.value)} className={inp}>
              <option value="">— default —</option>
              {KEYBOARDS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Language</label>
            <select value={values.language ?? ''} onChange={(e) => set('language', e.target.value)} className={inp}>
              <option value="">— default —</option>
              {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">HTTP Proxy</label>
            <input value={values.http_proxy ?? ''} onChange={(e) => set('http_proxy', e.target.value)} placeholder="http://proxy:3128" className={inp} />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Next VM/CT ID</label>
            <input type="number" value={values.next_id ?? ''} onChange={(e) => set('next_id', e.target.value)} placeholder="100" className={inp} />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Description</label>
            <textarea value={values.description ?? ''} onChange={(e) => set('description', e.target.value)} rows={3} placeholder="Cluster description" className={inp + ' resize-none'} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose}><X className="size-3.5 mr-1" />Cancel</Button>
          <Button size="sm" onClick={submit} disabled={update.isPending}>
            <Save className="size-3.5 mr-1" />{update.isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export function ClusterOptionsPage() {
  const { data: options, isLoading } = useClusterOptions()
  const [showEdit, setShowEdit] = useState(false)

  return (
    <div className="space-y-4">
      {showEdit && options && (
        <EditOptionsDialog options={options as Record<string, unknown>} onClose={() => setShowEdit(false)} />
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Cluster Options</h1>
          <p className="text-sm text-text-muted mt-0.5">Global cluster configuration settings</p>
        </div>
        {!isLoading && (
          <Button size="sm" variant="outline" onClick={() => setShowEdit(true)}>
            <Pencil className="size-3.5 mr-1" />Edit
          </Button>
        )}
      </div>

      {isLoading ? (
        <SkeletonCard />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {options && (
            <Card>
              <CardHeader>
                <CardTitle>Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3">
                  {Object.entries(options as Record<string, unknown>)
                    .filter(([, v]) => v != null && typeof v !== 'object')
                    .map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <dt className="text-text-muted capitalize">{key.replace(/_/g, ' ')}</dt>
                        <dd className="text-text-primary font-medium">{String(value)}</dd>
                      </div>
                    ))}
                </dl>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Migration</CardTitle>
            </CardHeader>
            <CardContent>
              {options ? (() => {
                const migrationKeys = Object.entries(options as Record<string, unknown>).filter(
                  ([key]) => key.toLowerCase().includes('migration'),
                )
                return migrationKeys.length > 0 ? (
                  <dl className="space-y-3">
                    {migrationKeys.map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <dt className="text-text-muted capitalize">{key.replace(/_/g, ' ')}</dt>
                        <dd className="text-text-primary font-medium">{String(value)}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <div className="flex h-24 items-center justify-center">
                    <p className="text-text-muted text-sm">No migration options configured</p>
                  </div>
                )
              })() : (
                <div className="flex h-24 items-center justify-center">
                  <p className="text-text-muted text-sm">No data</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
