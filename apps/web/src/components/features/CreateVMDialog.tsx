import { useState, useEffect } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X, ChevronRight, ChevronLeft, Monitor, CheckCircle, HardDrive, Cpu, Database, Network } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useClusterResources } from '@/lib/queries/cluster'
import { useNextVMId, useCreateVM } from '@/lib/queries/vms'
import { useStorageContent } from '@/lib/queries/storage'
import { useNodeNetwork } from '@/lib/queries/nodes'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

const vmSchema = z.object({
  node: z.string().min(1, 'Target node is required'),
  vmid: z.number().min(100, 'VM ID must be >= 100'),
  name: z.string().min(1, 'Name is required').regex(/^[a-zA-Z0-9-]+$/, 'Invalid characters in name'),
  ostype: z.string().default('l26'),
  isoStorage: z.string().optional(),
  cdrom: z.string().optional(),
  diskStorage: z.string().min(1, 'Target storage is required'),
  diskSize: z.number().min(1, 'Disk size must be >= 1GB'),
  discard: z.boolean().default(false),
  ssd: z.boolean().default(false),
  cores: z.number().min(1).max(128).default(1),
  cpuType: z.string().default('kvm64'),
  memory: z.number().min(512).max(65536).default(2048),
  bridge: z.string().default('vmbr0'),
  vlan: z.number().min(1).max(4094).optional().or(z.literal(0)),
})

type VMFormData = z.infer<typeof vmSchema>

const STEPS = [
  { id: 'general', title: 'General', icon: <Monitor className="size-4" /> },
  { id: 'os', title: 'OS', icon: <Database className="size-4" /> },
  { id: 'disk', title: 'Disks', icon: <HardDrive className="size-4" /> },
  { id: 'compute', title: 'Compute', icon: <Cpu className="size-4" /> },
  { id: 'network', title: 'Network', icon: <Network className="size-4" /> },
  { id: 'confirm', title: 'Confirm', icon: <CheckCircle className="size-4" /> },
]

export function CreateVMDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [step, setStep] = useState(0)

  const { data: resources } = useClusterResources()
  const { data: nextId } = useNextVMId()
  
  const nodes = resources?.filter((r) => r.type === 'node') ?? []
  const storages = resources?.filter((r) => r.type === 'storage') ?? []

  const { control, handleSubmit, watch, setValue, trigger, reset, formState: { errors } } = useForm<VMFormData>({
    resolver: zodResolver(vmSchema),
    defaultValues: {
      node: '',
      name: '',
      ostype: 'l26',
      isoStorage: '',
      cdrom: '',
      diskStorage: '',
      diskSize: 32,
      discard: true,
      ssd: true,
      cores: 2,
      cpuType: 'host',
      memory: 2048,
      bridge: 'vmbr0',
      vlan: undefined,
    },
  })

  const selectedNode = watch('node')
  const selectedIsoStorage = watch('isoStorage')
  
  // Update default VM ID when fetched
  useEffect(() => {
    if (open && nextId) setValue('vmid', Number(nextId))
  }, [open, nextId, setValue])

  // Select first node by default
  useEffect(() => {
    if (open && nodes.length > 0 && !selectedNode) setValue('node', nodes[0]?.node || '')
  }, [open, nodes, selectedNode, setValue])

  const { data: isoContents } = useStorageContent(selectedNode, selectedIsoStorage || '')
  const isos = isoContents?.filter((c) => c.volid.endsWith('.iso')) ?? []

  const { data: networkData } = useNodeNetwork(selectedNode)
  const bridges = (networkData ?? []).filter((iface) => iface.type === 'bridge' || iface.type === 'OVSBridge')

  // Auto select first bridge
  useEffect(() => {
    if (bridges.length > 0 && !watch('bridge')) {
      setValue('bridge', bridges[0]?.iface || '')
    }
  }, [bridges, setValue, watch])

  const createVM = useCreateVM(selectedNode)

  async function nextStep() {
    const fieldsToValidate = (() => {
      if (step === 0) return ['node', 'vmid', 'name'] as const
      if (step === 1) return ['ostype', 'cdrom'] as const
      if (step === 2) return ['diskStorage', 'diskSize', 'discard', 'ssd'] as const
      if (step === 3) return ['cores', 'memory', 'cpuType'] as const
      if (step === 4) return ['bridge', 'vlan'] as const
      return []
    })()
    
    const valid = await trigger(fieldsToValidate)
    if (valid) setStep((s) => s + 1)
  }

  function prevStep() {
    setStep((s) => Math.max(0, s - 1))
  }

  function onSubmit(data: VMFormData) {
    const params: any = {
      vmid: data.vmid,
      name: data.name,
      memory: data.memory,
      cores: data.cores,
      ostype: data.ostype,
      cdrom: data.cdrom || 'none',
    }
    
    if (data.diskStorage && data.diskSize) {
      let scsi = `${data.diskStorage}:${data.diskSize}`
      if (data.discard) scsi += ',discard=on'
      if (data.ssd) scsi += ',ssd=1'
      params.scsi0 = scsi
    }

    let net = `virtio,bridge=${data.bridge}`
    if (data.vlan) net += `,tag=${data.vlan}`
    params.net0 = net

    params.cpu = data.cpuType

    createVM.mutate(params, {
      onSuccess: () => {
        onOpenChange(false)
        setStep(0)
        reset()
      }
    })
  }

  if (!open) return null

  const SType = STEPS[step]?.id

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => { if (!o) { setStep(0); reset(); } onOpenChange(o); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-4xl translate-x-[-50%] translate-y-[-50%] border border-border bg-bg-elevated shadow-2xl rounded-xl flex flex-col max-h-[85vh] outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
          
          <div className="flex items-center justify-between px-6 py-4 border-b border-border-muted bg-bg-base/50 rounded-t-xl">
            <DialogPrimitive.Title className="text-lg font-semibold text-text-primary flex items-center gap-2">
              <Monitor className="size-5 text-accent" />
              Create Virtual Machine
            </DialogPrimitive.Title>
            <DialogPrimitive.Close className="rounded-sm opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-accent text-text-muted hover:text-text-primary transition-colors">
              <X className="size-5" />
            </DialogPrimitive.Close>
          </div>

          <div className="flex flex-1 overflow-hidden min-h-[400px]">
            {/* Sidebar Stepper */}
            <div className="w-56 border-r border-border-muted bg-bg-base/30 p-6 hidden sm:block shrink-0 overflow-y-auto">
              <div className="space-y-2 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent hidden">
                {/* Visual line */}
              </div>
              <div className="space-y-1">
                {STEPS.map((s, i) => {
                  const isActive = step === i
                  const isDone = step > i
                  return (
                    <div key={s.id} className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-sm relative z-10",
                      isActive ? "bg-accent/10 text-accent font-medium shadow-sm border border-accent/20" :
                      isDone ? "text-text-primary hover:bg-bg-hover" : "text-text-muted"
                    )}>
                      <span className={cn("size-6 rounded-full flex items-center justify-center shrink-0 border transition-colors", 
                        isActive ? "border-accent bg-accent text-white" : 
                        isDone ? "border-accent/50 bg-accent/10 text-accent" : "border-border-muted bg-bg-muted text-text-disabled"
                      )}>
                        {isDone ? <CheckCircle className="size-3.5" /> : <span className="text-[10px] font-bold">{i + 1}</span>}
                      </span>
                      {s.title}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Form Content */}
            <div className="flex-1 overflow-y-auto p-8 bg-bg-elevated relative">
              <form id="create-vm-form" onSubmit={handleSubmit(onSubmit)} className="max-w-xl">
                
                {SType === 'general' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div>
                      <h2 className="text-xl font-semibold text-text-primary">General Configuration</h2>
                      <p className="text-sm text-text-muted mt-1">Basic identification for your new virtual machine.</p>
                    </div>
                    
                    <div className="space-y-4 pt-2">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-text-primary">Target Node <span className="text-status-error">*</span></label>
                        <Controller
                          name="node"
                          control={control}
                          render={({ field }) => (
                            <select {...field} className="w-full rounded-md border border-border bg-bg-input px-3 py-2.5 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent shadow-sm">
                              <option value="">Select node...</option>
                              {nodes.map(n => <option key={n.id} value={n.node}>{n.node}</option>)}
                            </select>
                          )}
                        />
                        {errors.node && <p className="text-xs text-status-error">{errors.node.message}</p>}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-text-primary">VM ID <span className="text-status-error">*</span></label>
                          <Controller
                            name="vmid"
                            control={control}
                            render={({ field }) => (
                              <input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} className="w-full rounded-md border border-border bg-bg-input px-3 py-2.5 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent shadow-sm font-mono" />
                            )}
                          />
                          {errors.vmid && <p className="text-xs text-status-error">{errors.vmid.message}</p>}
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-text-primary">Name <span className="text-status-error">*</span></label>
                          <Controller
                            name="name"
                            control={control}
                            render={({ field }) => (
                              <input {...field} placeholder="e.g. web-server-01" className="w-full rounded-md border border-border bg-bg-input px-3 py-2.5 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent shadow-sm" />
                            )}
                          />
                          {errors.name && <p className="text-xs text-status-error">{errors.name.message}</p>}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {SType === 'os' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div>
                      <h2 className="text-xl font-semibold text-text-primary">Operating System</h2>
                      <p className="text-sm text-text-muted mt-1">Select the guest OS type and installation media.</p>
                    </div>

                    <div className="space-y-4 pt-2">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-text-primary">OS Type</label>
                        <Controller
                          name="ostype"
                          control={control}
                          render={({ field }) => (
                            <select {...field} className="w-full rounded-md border border-border bg-bg-input px-3 py-2.5 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent shadow-sm">
                              <option value="l26">Linux (2.6+ Kernel)</option>
                              <option value="win11">Windows 11 / Server 2022</option>
                              <option value="win10">Windows 10 / Server 2016-2019</option>
                              <option value="other">Other</option>
                            </select>
                          )}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-text-primary">ISO Image Storage</label>
                        <Controller
                          name="isoStorage"
                          control={control}
                          render={({ field }) => (
                            <select {...field} className="w-full rounded-md border border-border bg-bg-input px-3 py-2.5 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent shadow-sm">
                              <option value="">Do not use any media</option>
                              {storages.filter(s => s.node === selectedNode).map(s => (
                                <option key={s.id} value={s.storage}>{s.storage}</option>
                              ))}
                            </select>
                          )}
                        />
                      </div>

                      {selectedIsoStorage && (
                        <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
                          <label className="text-sm font-medium text-text-primary">ISO Image</label>
                          <Controller
                            name="cdrom"
                            control={control}
                            render={({ field }) => (
                              <select {...field} className="w-full rounded-md border border-border bg-bg-input px-3 py-2.5 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent shadow-sm">
                                <option value="">Select an ISO...</option>
                                {isos.map(iso => (
                                  <option key={iso.volid} value={iso.volid}>{iso.volid.split('/').pop()}</option>
                                ))}
                              </select>
                            )}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {SType === 'disk' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div>
                      <h2 className="text-xl font-semibold text-text-primary">Virtual Disk</h2>
                      <p className="text-sm text-text-muted mt-1">Configure the primary storage for your VM.</p>
                    </div>

                    <div className="space-y-6 pt-2">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-text-primary">Target Storage Pool <span className="text-status-error">*</span></label>
                        <Controller
                          name="diskStorage"
                          control={control}
                          render={({ field }) => (
                            <select {...field} className="w-full rounded-md border border-border bg-bg-input px-3 py-2.5 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent shadow-sm">
                              <option value="">Select storage pool...</option>
                              {storages.filter(s => s.node === selectedNode).map(s => (
                                <option key={s.id} value={s.storage}>{s.storage}</option>
                              ))}
                            </select>
                          )}
                        />
                        {errors.diskStorage && <p className="text-xs text-status-error">{errors.diskStorage.message}</p>}
                      </div>

                      <div className="space-y-3 p-4 border border-border rounded-lg bg-bg-base/30">
                        <div className="flex justify-between items-center">
                          <label className="text-sm font-medium text-text-primary">Disk Size (GiB)</label>
                          <span className="text-lg text-accent font-bold font-mono">{watch('diskSize')} GiB</span>
                        </div>
                        <Controller
                          name="diskSize"
                          control={control}
                          render={({ field }) => (
                            <input type="range" min="1" max="1000" step="1" {...field} onChange={e => field.onChange(parseInt(e.target.value))} className="w-full accent-accent h-2 bg-border rounded-lg appearance-none cursor-pointer" />
                          )}
                        />
                        <div className="flex justify-between text-xs text-text-muted mt-1">
                          <span>1 GiB</span>
                          <span>1000 GiB</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <label className="flex items-center gap-3 p-4 border border-border rounded-lg bg-bg-base/30 cursor-pointer hover:bg-bg-hover transition-colors">
                          <Controller
                            name="discard"
                            control={control}
                            render={({ field }) => (
                              <input type="checkbox" checked={field.value} onChange={field.onChange} className="size-4 accent-accent" />
                            )}
                          />
                          <div className="space-y-0.5">
                            <p className="text-sm font-medium text-text-primary">Discard</p>
                            <p className="text-[10px] text-text-muted">TRIM support for thin provisioning</p>
                          </div>
                        </label>
                        <label className="flex items-center gap-3 p-4 border border-border rounded-lg bg-bg-base/30 cursor-pointer hover:bg-bg-hover transition-colors">
                          <Controller
                            name="ssd"
                            control={control}
                            render={({ field }) => (
                              <input type="checkbox" checked={field.value} onChange={field.onChange} className="size-4 accent-accent" />
                            )}
                          />
                          <div className="space-y-0.5">
                            <p className="text-sm font-medium text-text-primary">SSD Emulation</p>
                            <p className="text-[10px] text-text-muted">Report disk as non-rotational</p>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {SType === 'compute' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div>
                      <h2 className="text-xl font-semibold text-text-primary">Compute Resources</h2>
                      <p className="text-sm text-text-muted mt-1">Allocate CPU and Memory resources.</p>
                    </div>

                    <div className="space-y-6 pt-2">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-text-primary">CPU Type</label>
                        <Controller
                          name="cpuType"
                          control={control}
                          render={({ field }) => (
                            <select {...field} className="w-full rounded-md border border-border bg-bg-input px-3 py-2.5 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent shadow-sm">
                              <optgroup label="Generic / Best Performance">
                                <option value="host">Host (Maximum Performance)</option>
                                <option value="max">Max (All features of host)</option>
                                <option value="x86-64-v4">x86-64-v4 (AVX-512)</option>
                                <option value="x86-64-v3">x86-64-v3 (AVX2)</option>
                                <option value="x86-64-v2-AES">x86-64-v2-AES (Standard/Compatible)</option>
                                <option value="kvm64">KVM64 (Compatibility)</option>
                                <option value="qemu64">QEMU64 (Compatibility)</option>
                              </optgroup>
                              <optgroup label="Intel Models">
                                <option value="Icelake-Server">Icelake-Server</option>
                                <option value="Icelake-Client">Icelake-Client</option>
                                <option value="Cascadelake-Server">Cascadelake-Server</option>
                                <option value="Skylake-Server">Skylake-Server</option>
                                <option value="Skylake-Client">Skylake-Client</option>
                                <option value="Broadwell">Broadwell</option>
                                <option value="Haswell">Haswell</option>
                                <option value="IvyBridge">IvyBridge</option>
                                <option value="SandyBridge">SandyBridge</option>
                                <option value="Westmere">Westmere</option>
                                <option value="Nehalem">Nehalem</option>
                                <option value="Penryn">Penryn</option>
                                <option value="Conroe">Conroe</option>
                              </optgroup>
                              <optgroup label="AMD Models">
                                <option value="EPYC-Milan">EPYC-Milan</option>
                                <option value="EPYC-Rome">EPYC-Rome</option>
                                <option value="EPYC">EPYC</option>
                                <option value="Opteron_G5">Opteron_G5</option>
                                <option value="Opteron_G4">Opteron_G4</option>
                                <option value="Opteron_G3">Opteron_G3</option>
                                <option value="Opteron_G2">Opteron_G2</option>
                                <option value="Opteron_G1">Opteron_G1</option>
                                <option value="Phenom">Phenom</option>
                              </optgroup>
                            </select>
                          )}
                        />
                        <p className="text-[10px] text-text-disabled uppercase font-medium">Host type provides best performance but limits migration compatibility</p>
                      </div>

                      <div className="space-y-3 p-4 border border-border rounded-lg bg-bg-base/30">
                        <div className="flex justify-between items-center">
                          <label className="text-sm font-medium text-text-primary">CPU Cores</label>
                          <span className="text-lg text-accent font-bold font-mono">{watch('cores')}</span>
                        </div>
                        <Controller
                          name="cores"
                          control={control}
                          render={({ field }) => (
                            <input type="range" min="1" max="32" step="1" {...field} onChange={e => field.onChange(parseInt(e.target.value))} className="w-full accent-accent h-2 bg-border rounded-lg appearance-none cursor-pointer" />
                          )}
                        />
                        <div className="flex justify-between text-xs text-text-muted mt-1">
                          <span>1 Core</span>
                          <span>32 Cores</span>
                        </div>
                      </div>

                      <div className="space-y-3 p-4 border border-border rounded-lg bg-bg-base/30">
                        <div className="flex justify-between items-center">
                          <label className="text-sm font-medium text-text-primary">Memory (MiB)</label>
                          <span className="text-lg text-accent font-bold font-mono">{watch('memory')} MiB</span>
                        </div>
                        <Controller
                          name="memory"
                          control={control}
                          render={({ field }) => (
                            <input type="range" min="512" max="32768" step="512" {...field} onChange={e => field.onChange(parseInt(e.target.value))} className="w-full accent-accent h-2 bg-border rounded-lg appearance-none cursor-pointer" />
                          )}
                        />
                        <div className="flex justify-between text-xs text-text-muted mt-1">
                          <span>512 MiB</span>
                          <span>32 GiB</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {SType === 'network' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div>
                      <h2 className="text-xl font-semibold text-text-primary">Network Configuration</h2>
                      <p className="text-sm text-text-muted mt-1">Configure the virtual network adapter.</p>
                    </div>

                    <div className="space-y-4 pt-2">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-text-primary">Network Bridge</label>
                        <Controller
                          name="bridge"
                          control={control}
                          render={({ field }) => (
                            <select {...field} className="w-full rounded-md border border-border bg-bg-input px-3 py-2.5 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent shadow-sm">
                              {bridges.map(b => <option key={b.iface} value={b.iface}>{b.iface}</option>)}
                            </select>
                          )}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-text-primary">VLAN Tag</label>
                        <Controller
                          name="vlan"
                          control={control}
                          render={({ field }) => (
                            <input 
                              type="number" 
                              placeholder="No VLAN Tag"
                              value={field.value || ''} 
                              onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              className="w-full rounded-md border border-border bg-bg-input px-3 py-2.5 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent shadow-sm font-mono" 
                            />
                          )}
                        />
                        <p className="text-[10px] text-text-disabled uppercase font-medium">Optional: Specify a VLAN tag (1-4094)</p>
                      </div>
                    </div>
                  </div>
                )}

                {SType === 'confirm' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div>
                      <h2 className="text-xl font-semibold text-text-primary">Review Configuration</h2>
                      <p className="text-sm text-text-muted mt-1">Almost done! Review the settings for your new VM.</p>
                    </div>

                    <div className="rounded-lg border border-border-muted bg-bg-muted/30 p-5 space-y-3 text-sm">
                      <div className="flex justify-between border-b border-border/50 pb-2"><span className="text-text-muted">Target Node</span><span className="font-medium">{watch('node')}</span></div>
                      <div className="flex justify-between border-b border-border/50 pb-2"><span className="text-text-muted">VM ID</span><span className="font-medium font-mono bg-accent/10 text-accent px-1.5 rounded">{watch('vmid')}</span></div>
                      <div className="flex justify-between border-b border-border/50 pb-2"><span className="text-text-muted">Name</span><span className="font-medium">{watch('name')}</span></div>
                      <div className="flex justify-between border-b border-border/50 pb-2"><span className="text-text-muted">OS Type</span><span className="font-medium">{watch('ostype')}</span></div>
                      <div className="flex justify-between border-b border-border/50 pb-2"><span className="text-text-muted">ISO Media</span><span className="font-medium text-xs max-w-[250px] truncate" title={watch('cdrom') || 'None'}>{watch('cdrom') || 'None'}</span></div>
                      <div className="flex justify-between border-b border-border/50 pb-2"><span className="text-text-muted">Primary Disk</span><span className="font-medium">{watch('diskSize')} GiB on <span className="text-accent">{watch('diskStorage')}</span> {watch('discard') && '(Discard)'} {watch('ssd') && '(SSD)'}</span></div>
                      <div className="flex justify-between border-b border-border/50 pb-2"><span className="text-text-muted">Compute</span><span className="font-medium">{watch('cores')} Cores ({watch('cpuType')}), {watch('memory')} MiB RAM</span></div>
                      <div className="flex justify-between pb-1"><span className="text-text-muted">Network</span><span className="font-medium">{watch('bridge')} {watch('vlan') ? `(VLAN ${watch('vlan')})` : ''}</span></div>
                    </div>
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-bg-base/80 rounded-b-xl backdrop-blur-md">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <div className="flex items-center gap-3">
              {step > 0 && (
                <Button type="button" variant="outline" onClick={prevStep}>
                  <ChevronLeft className="size-4 mr-1" /> Back
                </Button>
              )}
              {step < STEPS.length - 1 ? (
                <Button type="button" className="bg-text-primary text-bg-base hover:bg-text-secondary" onClick={nextStep}>
                  Next <ChevronRight className="size-4 ml-1" />
                </Button>
              ) : (
                <Button type="submit" form="create-vm-form" className="bg-status-running text-white hover:bg-status-running/90 shadow-lg shadow-status-running/20" disabled={createVM.isPending}>
                  {createVM.isPending ? 'Creating VM...' : 'Complete & Create VM'}
                </Button>
              )}
            </div>
          </div>

        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
