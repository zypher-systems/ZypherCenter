import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { PlusCircle } from 'lucide-react'
import { useClusterResources } from '@/lib/queries/cluster'
import { useNodeStorage, useNodeNetwork } from '@/lib/queries/nodes'
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
  cpuType: string
  cores: string
  memory: string
  diskSize: string
  storage: string
  bridge: string
  vlan: string
  diskDiscard: boolean
  diskSSD: boolean
}

const OS_TYPES = [
  { value: 'l26', label: 'Linux 6.x – 2.6 Kernel' },
  { value: 'l24', label: 'Linux 2.4 Kernel' },
  { value: 'win11', label: 'Windows 11 / Server 2022' },
  { value: 'win10', label: 'Windows 10 / Server 2016' },
  { value: 'win2019', label: 'Windows Server 2019' },
  { value: 'other', label: 'Other' },
]

const CPU_TYPES = [
  { value: 'kvm64',         label: 'kvm64 (default)' },
  { value: 'host',          label: 'host (pass-through)' },
  { value: 'x86-64-v2-AES', label: 'x86-64-v2-AES' },
  { value: 'x86-64-v3',    label: 'x86-64-v3' },
  { value: 'x86-64-v4',    label: 'x86-64-v4' },
  { value: 'Haswell',       label: 'Haswell' },
  { value: 'Broadwell',     label: 'Broadwell' },
  { value: 'SandyBridge',   label: 'Sandy Bridge' },
  { value: 'IvyBridge',     label: 'Ivy Bridge' },
  { value: 'qemu64',        label: 'qemu64' },
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

  // Filter to storages that support VM images / disks AND are active on this node
  const diskStorages = (storages ?? []).filter(
    (s) => s.active !== 0 && s.content && (s.content.includes('images') || s.content.includes('rootdir')),
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
      {node && !isLoading && <option value="">Select storage…</option>}
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
      cpuType: 'kvm64',
      cores: '1',
      memory: '2048',
      diskSize: '20',
      storage: '',
      bridge: '',
      vlan: '',
      diskDiscard: true,
      diskSSD: false,
    },
  })

  const selectedNode = watch('node')
  const { data: networkData } = useNodeNetwork(selectedNode)
  const bridges = (networkData ?? []).filter((iface) => iface.type === 'bridge' || iface.type === 'OVSBridge')

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

  // Clear storage selection when node changes to prevent stale cross-node selection
  useEffect(() => {
    setSelectedStorage('')
  }, [selectedNode])

  const [selectedStorage, setSelectedStorage] = useState('')

  const createVM = useCreateVM(selectedNode)

  const onSubmit = handleSubmit(async (values) => {
    const vmid = parseInt(values.vmid, 10)
    const storage = selectedStorage || values.storage
    const diskFlags = [values.diskDiscard ? 'discard=on' : '', values.diskSSD ? 'ssd=1' : ''].filter(Boolean).join(',')

    await createVM.mutateAsync({
      vmid,
      name: values.name,
      ostype: values.ostype,
      cpu: values.cpuType,
      cores: parseInt(values.cores, 10),
      memory: parseInt(values.memory, 10),
      scsi0: `${storage}:${values.diskSize},format=raw${diskFlags ? `,${diskFlags}` : ''}`,
      net0: `virtio,bridge=${values.bridge || 'vmbr0'}${values.vlan ? `,tag=${values.vlan}` : ''}`,
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

      <DialogContent className="max-w-lg">
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
          <div className="grid grid-cols-3 gap-3">
            <FieldSelect label="CPU Type" id="vm-cputype" {...register('cpuType')}>
              {CPU_TYPES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </FieldSelect>
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

          {/* Storage / Disk size + disk options */}
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
          {(selectedStorage || watch('storage')) && (
            <div className="flex items-center gap-6 pl-1">
              <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                <input type="checkbox" {...register('diskDiscard')} className="accent-accent" />
                Discard (TRIM/UNMAP)
              </label>
              <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                <input type="checkbox" {...register('diskSSD')} className="accent-accent" />
                SSD emulation
              </label>
            </div>
          )}

          {/* Network bridge + VLAN */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5">
              <label htmlFor="vm-bridge" className="block text-sm font-medium text-text-secondary">
                Network Bridge<span className="text-status-error ml-0.5">*</span>
              </label>
              <select
                id="vm-bridge"
                disabled={!selectedNode}
                className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed"
                {...register('bridge', { required: true })}
              >
                <option value="">{!selectedNode ? 'Select a node first' : bridges.length === 0 ? 'No bridges found' : 'Select bridge…'}</option>
                {bridges.map((b) => (
                  <option key={b.iface} value={b.iface}>{b.iface}</option>
                ))}
              </select>
            </div>
            <FieldInput
              label="VLAN Tag"
              id="vm-vlan"
              type="number"
              min={1}
              max={4094}
              placeholder="None"
              {...register('vlan')}
            />
          </div>

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
