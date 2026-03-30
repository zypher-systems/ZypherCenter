import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { PlusCircle } from 'lucide-react'
import { useClusterResources } from '@/lib/queries/cluster'
import { useNodeStorage } from '@/lib/queries/nodes'
import { useStorageContent } from '@/lib/queries/storage'
import { useCreateLXC } from '@/lib/queries/lxc'
import { useNextVMId } from '@/lib/queries/vms'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/Dialog'

interface FormValues {
  node: string
  vmid: string
  hostname: string
  password: string
  confirmPassword: string
  memory: string
  swap: string
  cores: string
  diskSize: string
  storage: string
  bridge: string
  unprivileged: boolean
  startOnBoot: boolean
}

// ── Thin helpers ──────────────────────────────────────────────────────────────

function FieldSelect({
  label,
  id,
  required,
  disabled,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; id: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-status-error ml-0.5">*</span>}
      </Label>
      <select
        id={id}
        disabled={disabled}
        className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed"
        {...props}
      >
        {children}
      </select>
    </div>
  )
}

function FieldInput({
  label,
  id,
  required,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; id: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-status-error ml-0.5">*</span>}
      </Label>
      <Input id={id} {...props} />
    </div>
  )
}

// ── Template picker (queries storage content filtered to vztmpl) ──────────────

function TemplateSelect({
  node,
  templateStorage,
  value,
  onChange,
}: {
  node: string
  templateStorage: string
  value: string
  onChange: (v: string) => void
}) {
  const { data, isLoading } = useStorageContent(node, templateStorage, 'vztmpl')
  const templates = data ?? []

  return (
    <div className="space-y-1.5">
      <Label htmlFor="lxc-template">
        Template<span className="text-status-error ml-0.5">*</span>
      </Label>
      <select
        id="lxc-template"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={!node || !templateStorage || isLoading}
        className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <option value="">
          {!node ? 'Select a node first' : !templateStorage ? 'Select a storage first' : isLoading ? 'Loading…' : templates.length === 0 ? 'No templates found' : 'Select template…'}
        </option>
        {templates.map((t) => (
          <option key={t.volid} value={t.volid}>
            {t.volid.split('/').pop() ?? t.volid}
          </option>
        ))}
      </select>
    </div>
  )
}

// ── Storage select (shows storages for a node) ────────────────────────────────

function StorageSelect({
  node,
  value,
  onChange,
  label = 'Storage',
  filterFn,
}: {
  node: string
  value: string
  onChange: (v: string) => void
  label?: string
  filterFn?: (content: string) => boolean
}) {
  const { data: storages, isLoading } = useNodeStorage(node)
  const filtered = filterFn
    ? (storages ?? []).filter((s) => s.content && filterFn(s.content))
    : (storages ?? [])

  return (
    <FieldSelect
      label={label}
      id={`lxc-storage-${label}`}
      required
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={!node || isLoading}
    >
      <option value="">{!node ? 'Select a node first' : isLoading ? 'Loading…' : 'Select storage…'}</option>
      {filtered.map((s) => (
        <option key={s.storage} value={s.storage}>
          {s.storage} ({s.type})
        </option>
      ))}
    </FieldSelect>
  )
}

// ── Dialog ────────────────────────────────────────────────────────────────────

export function CreateLXCDialog({ defaultNode }: { defaultNode?: string } = {}) {
  const [open, setOpen] = useState(false)
  const [templateStorage, setTemplateStorage] = useState('')
  const [rootfsStorage, setRootfsStorage] = useState('')
  const [template, setTemplate] = useState('')

  const { data: resources } = useClusterResources('node')
  const { data: nextId } = useNextVMId()
  const nodes = (resources ?? []).map((n) => n.node ?? n.name ?? '')

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      node: defaultNode ?? '',
      vmid: '',
      hostname: '',
      password: '',
      confirmPassword: '',
      memory: '512',
      swap: '512',
      cores: '1',
      diskSize: '8',
      storage: '',
      bridge: 'vmbr0',
      unprivileged: true,
      startOnBoot: false,
    },
  })

  const selectedNode = watch('node')

  useEffect(() => {
    if (open && nextId) setValue('vmid', String(nextId))
  }, [open, nextId, setValue])

  useEffect(() => {
    if (nodes.length === 1 && !selectedNode) setValue('node', nodes[0] ?? '')
  }, [nodes, selectedNode, setValue])

  const createLXC = useCreateLXC(selectedNode)

  const onSubmit = handleSubmit(async (values) => {
    if (!template) return

    await createLXC.mutateAsync({
      vmid: parseInt(values.vmid, 10),
      hostname: values.hostname,
      password: values.password,
      ostemplate: template,
      memory: parseInt(values.memory, 10),
      swap: parseInt(values.swap, 10),
      cores: parseInt(values.cores, 10),
      rootfs: `${rootfsStorage}:${values.diskSize}`,
      net0: `name=eth0,bridge=${values.bridge},ip=dhcp`,
      unprivileged: values.unprivileged ? 1 : 0,
      onboot: values.startOnBoot ? 1 : 0,
    })
    reset()
    setTemplateStorage('')
    setRootfsStorage('')
    setTemplate('')
    setOpen(false)
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm">
          <PlusCircle className="size-4 mr-1.5" />
          New Container
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create LXC Container</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Node + CTID */}
          <div className="grid grid-cols-2 gap-3">
            <FieldSelect label="Node" id="lxc-node" required {...register('node', { required: true })}>
              <option value="">Select node…</option>
              {nodes.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </FieldSelect>
            <FieldInput
              label="CT ID"
              id="lxc-vmid"
              type="number"
              required
              min={100}
              max={999999999}
              {...register('vmid', { required: true, min: 100 })}
            />
          </div>

          {/* Hostname */}
          <FieldInput
            label="Hostname"
            id="lxc-hostname"
            placeholder="my-container"
            required
            {...register('hostname', { required: true })}
          />

          {/* Password */}
          <div className="grid grid-cols-2 gap-3">
            <FieldInput
              label="Password"
              id="lxc-password"
              type="password"
              required
              {...register('password', { required: true, minLength: 5 })}
            />
            <FieldInput
              label="Confirm Password"
              id="lxc-confirm"
              type="password"
              required
              {...register('confirmPassword', { required: true })}
            />
          </div>

          {/* Template storage + Template */}
          <StorageSelect
            node={selectedNode}
            value={templateStorage}
            onChange={setTemplateStorage}
            label="Template Storage"
            filterFn={(c) => c.includes('vztmpl')}
          />
          <TemplateSelect
            node={selectedNode}
            templateStorage={templateStorage}
            value={template}
            onChange={setTemplate}
          />

          {/* Root disk storage + size */}
          <div className="grid grid-cols-2 gap-3">
            <StorageSelect
              node={selectedNode}
              value={rootfsStorage}
              onChange={setRootfsStorage}
              label="Root Disk Storage"
              filterFn={(c) => c.includes('rootdir') || c.includes('images')}
            />
            <FieldInput
              label="Disk Size (GB)"
              id="lxc-disksize"
              type="number"
              min={1}
              required
              {...register('diskSize', { required: true, min: 1 })}
            />
          </div>

          {/* CPU / Memory / Swap */}
          <div className="grid grid-cols-3 gap-3">
            <FieldInput
              label="CPU Cores"
              id="lxc-cores"
              type="number"
              min={1}
              max={256}
              required
              {...register('cores', { required: true, min: 1 })}
            />
            <FieldInput
              label="Memory (MiB)"
              id="lxc-memory"
              type="number"
              min={16}
              step={128}
              required
              {...register('memory', { required: true, min: 16 })}
            />
            <FieldInput
              label="Swap (MiB)"
              id="lxc-swap"
              type="number"
              min={0}
              step={128}
              {...register('swap')}
            />
          </div>

          {/* Network bridge */}
          <FieldInput
            label="Network Bridge"
            id="lxc-bridge"
            placeholder="vmbr0"
            {...register('bridge')}
          />

          {/* Options */}
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
              <input type="checkbox" {...register('unprivileged')} className="accent-accent" />
              Unprivileged container
            </label>
            <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
              <input type="checkbox" {...register('startOnBoot')} className="accent-accent" />
              Start at boot
            </label>
          </div>

          {!template && (
            <p className="text-xs text-text-muted">Please select a template to continue.</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || createLXC.isPending || !template || !rootfsStorage}>
              {createLXC.isPending ? 'Creating…' : 'Create Container'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
