import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { PlusCircle } from 'lucide-react'
import { useClusterResources } from '@/lib/queries/cluster'
import { useNodeStorage } from '@/lib/queries/nodes'
import { useCreateVM, useNextVMId } from '@/lib/queries/vms'
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
  name: string
  ostype: string
  cores: string
  memory: string
  diskSize: string
  storage: string
  bridge: string
}

const OS_TYPES = [
  { value: 'l26', label: 'Linux 6.x – 2.6 Kernel' },
  { value: 'l24', label: 'Linux 2.4 Kernel' },
  { value: 'win11', label: 'Windows 11 / Server 2022' },
  { value: 'win10', label: 'Windows 10 / Server 2016' },
  { value: 'win2019', label: 'Windows Server 2019' },
  { value: 'other', label: 'Other' },
]

// ── Thin select wrapper ───────────────────────────────────────────────────────

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

// ── Storage sub-form ──────────────────────────────────────────────────────────

function StorageSelect({
  node,
  value,
  onChange,
}: {
  node: string
  value: string
  onChange: (v: string) => void
}) {
  const { data: storages, isLoading } = useNodeStorage(node)

  // Filter to storages that support VM images / disks
  const diskStorages = (storages ?? []).filter(
    (s) => s.content && (s.content.includes('images') || s.content.includes('rootdir')),
  )

  return (
    <FieldSelect
      label="Storage"
      id="vm-storage"
      required
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={!node || isLoading}
    >
      {!node && <option value="">Select a node first</option>}
      {node && isLoading && <option value="">Loading…</option>}
      {diskStorages.map((s) => (
        <option key={s.storage} value={s.storage}>
          {s.storage} ({s.type})
        </option>
      ))}
    </FieldSelect>
  )
}

// ── Dialog ────────────────────────────────────────────────────────────────────

export function CreateVMDialog({ defaultNode }: { defaultNode?: string } = {}) {
  const [open, setOpen] = useState(false)

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
      name: '',
      ostype: 'l26',
      cores: '1',
      memory: '2048',
      diskSize: '20',
      storage: '',
      bridge: 'vmbr0',
    },
  })

  const selectedNode = watch('node')

  // Auto-fill next VMID when the dialog opens
  useEffect(() => {
    if (open && nextId) {
      setValue('vmid', String(nextId))
    }
  }, [open, nextId, setValue])

  // Auto-select first node if only one
  useEffect(() => {
    if (nodes.length === 1 && !selectedNode) {
      setValue('node', nodes[0] ?? '')
    }
  }, [nodes, selectedNode, setValue])

  const [selectedStorage, setSelectedStorage] = useState('')

  const createVM = useCreateVM(selectedNode)

  const onSubmit = handleSubmit(async (values) => {
    const vmid = parseInt(values.vmid, 10)
    const storage = selectedStorage || values.storage

    await createVM.mutateAsync({
      vmid,
      name: values.name,
      ostype: values.ostype,
      cores: parseInt(values.cores, 10),
      memory: parseInt(values.memory, 10),
      scsi0: `${storage}:${values.diskSize},format=raw`,
      net0: `virtio,bridge=${values.bridge}`,
      boot: 'order=scsi0',
    })
    reset()
    setSelectedStorage('')
    setOpen(false)
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm">
          <PlusCircle className="size-4 mr-1.5" />
          New VM
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Create Virtual Machine</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Node + VMID row */}
          <div className="grid grid-cols-2 gap-3">
            <FieldSelect label="Node" id="vm-node" required {...register('node', { required: true })}>
              <option value="">Select node…</option>
              {nodes.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </FieldSelect>

            <FieldInput
              label="VM ID"
              id="vm-vmid"
              type="number"
              required
              min={100}
              max={999999999}
              {...register('vmid', { required: true, min: 100 })}
            />
          </div>

          {/* Name + OS row */}
          <div className="grid grid-cols-2 gap-3">
            <FieldInput
              label="Name"
              id="vm-name"
              placeholder="my-vm"
              required
              {...register('name', { required: true })}
            />

            <FieldSelect label="OS Type" id="vm-ostype" {...register('ostype')}>
              {OS_TYPES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </FieldSelect>
          </div>

          {/* CPU / Memory row */}
          <div className="grid grid-cols-2 gap-3">
            <FieldInput
              label="CPU Cores"
              id="vm-cores"
              type="number"
              min={1}
              max={256}
              required
              {...register('cores', { required: true, min: 1 })}
            />
            <FieldInput
              label="Memory (MiB)"
              id="vm-memory"
              type="number"
              min={16}
              required
              step={128}
              {...register('memory', { required: true, min: 16 })}
            />
          </div>

          {/* Storage / Disk size row */}
          <div className="grid grid-cols-2 gap-3">
            <StorageSelect
              node={selectedNode}
              value={selectedStorage}
              onChange={setSelectedStorage}
            />
            <FieldInput
              label="Disk Size (GB)"
              id="vm-disksize"
              type="number"
              min={1}
              required
              {...register('diskSize', { required: true, min: 1 })}
            />
          </div>

          {/* Network bridge */}
          <FieldInput
            label="Network Bridge"
            id="vm-bridge"
            placeholder="vmbr0"
            {...register('bridge')}
          />

          {(errors.node || errors.vmid || errors.name) && (
            <p className="text-xs text-status-error">Please fill in all required fields.</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || createVM.isPending}>
              {createVM.isPending ? 'Creating…' : 'Create VM'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
