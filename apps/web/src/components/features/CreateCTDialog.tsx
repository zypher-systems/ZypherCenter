import { useState, useEffect } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X, ChevronRight, ChevronLeft, Box, CheckCircle, HardDrive, Cpu, Database } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useClusterResources } from '@/lib/queries/cluster'
import { useNextVMId } from '@/lib/queries/vms'
import { useCreateLXC } from '@/lib/queries/lxc'
import { useStorageContent } from '@/lib/queries/storage'
import { useNodeNetwork } from '@/lib/queries/nodes'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

const ctSchema = z.object({
  node: z.string().min(1, 'Target node is required'),
  vmid: z.number().min(100, 'CT ID must be >= 100'),
  hostname: z.string().min(1, 'Hostname is required').regex(/^[a-zA-Z0-9-]+$/, 'Invalid characters in hostname'),
  password: z.string().min(5, 'Password must be at least 5 characters'),
  templateStorage: z.string().min(1, 'Template storage is required'),
  ostemplate: z.string().min(1, 'Template is required'),
  diskStorage: z.string().min(1, 'Target storage is required'),
  diskSize: z.number().min(1, 'Disk size must be >= 1GB'),
  cores: z.number().min(1).max(128).default(1),
  memory: z.number().min(256).max(65536).default(512),
  swap: z.number().min(0).max(65536).default(512),
  bridge: z.string().default('vmbr0'),
})

type CTFormData = z.infer<typeof ctSchema>

const STEPS = [
  { id: 'general', title: 'General', icon: <Box className="size-4" /> },
  { id: 'template', title: 'Template', icon: <Database className="size-4" /> },
  { id: 'disk', title: 'Disks', icon: <HardDrive className="size-4" /> },
  { id: 'compute', title: 'Compute', icon: <Cpu className="size-4" /> },
  { id: 'confirm', title: 'Confirm', icon: <CheckCircle className="size-4" /> },
]

export function CreateCTDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [step, setStep] = useState(0)

  const { data: resources } = useClusterResources()
  const { data: nextId } = useNextVMId()
  
  const nodes = resources?.filter((r) => r.type === 'node') ?? []
  const storages = resources?.filter((r) => r.type === 'storage') ?? []

  const { control, handleSubmit, watch, setValue, trigger, reset, formState: { errors } } = useForm<CTFormData>({
    resolver: zodResolver(ctSchema),
    defaultValues: {
      node: '',
      hostname: '',
      password: '',
      templateStorage: '',
      ostemplate: '',
      diskStorage: '',
      diskSize: 8,
      cores: 1,
      memory: 512,
      swap: 512,
      bridge: 'vmbr0',
    },
  })

  const selectedNode = watch('node')
  const selectedTemplateStorage = watch('templateStorage')
  
  // Update default CT ID when fetched
  useEffect(() => {
    if (open && nextId) setValue('vmid', Number(nextId))
  }, [open, nextId, setValue])

  // Select first node by default
  useEffect(() => {
    if (open && nodes.length > 0 && !selectedNode) setValue('node', nodes[0]?.node || '')
  }, [open, nodes, selectedNode, setValue])

  const { data: templateContents } = useStorageContent(selectedNode, selectedTemplateStorage || '')
  const templates = templateContents?.filter((c) => c.volid.includes('vztmpl/')) ?? []

  const { data: networkData } = useNodeNetwork(selectedNode)
  const bridges = (networkData ?? []).filter((iface) => iface.type === 'bridge' || iface.type === 'OVSBridge')

  // Auto select first bridge
  useEffect(() => {
    if (bridges.length > 0 && !watch('bridge')) {
      setValue('bridge', bridges[0]?.iface || '')
    }
  }, [bridges, setValue, watch])

  const createCT = useCreateLXC(selectedNode)

  async function nextStep() {
    const fieldsToValidate = (() => {
      if (step === 0) return ['node', 'vmid', 'hostname', 'password'] as const
      if (step === 1) return ['templateStorage', 'ostemplate'] as const
      if (step === 2) return ['diskStorage', 'diskSize'] as const
      if (step === 3) return ['cores', 'memory', 'swap', 'bridge'] as const
      return []
    })()
    
    const valid = await trigger(fieldsToValidate)
    if (valid) setStep((s) => s + 1)
  }

  function prevStep() {
    setStep((s) => Math.max(0, s - 1))
  }

  function onSubmit(data: CTFormData) {
    const params: any = {
      vmid: data.vmid,
      hostname: data.hostname,
      password: data.password,
      memory: data.memory,
      swap: data.swap,
      cores: data.cores,
      ostemplate: data.ostemplate,
      rootfs: `${data.diskStorage}:${data.diskSize}`,
      net0: `name=eth0,bridge=${data.bridge},ip=dhcp`, // Default to DHCP for simplicity
      unprivileged: 1, // Default to unprivileged for security
    }

    createCT.mutate(params, {
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
              <Box className="size-5 text-accent" />
              Create LXC Container
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
              <form id="create-ct-form" onSubmit={handleSubmit(onSubmit)} className="max-w-xl">
                
                {SType === 'general' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div>
                      <h2 className="text-xl font-semibold text-text-primary">General Configuration</h2>
                      <p className="text-sm text-text-muted mt-1">Basic identification and security for your container.</p>
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
                          <label className="text-sm font-medium text-text-primary">CT ID <span className="text-status-error">*</span></label>
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
                          <label className="text-sm font-medium text-text-primary">Hostname <span className="text-status-error">*</span></label>
                          <Controller
                            name="hostname"
                            control={control}
                            render={({ field }) => (
                              <input {...field} placeholder="e.g. web-server-01" className="w-full rounded-md border border-border bg-bg-input px-3 py-2.5 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent shadow-sm" />
                            )}
                          />
                          {errors.hostname && <p className="text-xs text-status-error">{errors.hostname.message}</p>}
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-2 border-t border-border/50">
                        <label className="text-sm font-medium text-text-primary">Root Password <span className="text-status-error">*</span></label>
                        <Controller
                          name="password"
                          control={control}
                          render={({ field }) => (
                            <input type="password" {...field} placeholder="Enter a strong password" className="w-full rounded-md border border-border bg-bg-input px-3 py-2.5 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent shadow-sm" />
                          )}
                        />
                        {errors.password && <p className="text-xs text-status-error">{errors.password.message}</p>}
                      </div>
                    </div>
                  </div>
                )}

                {SType === 'template' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div>
                      <h2 className="text-xl font-semibold text-text-primary">OS Template</h2>
                      <p className="text-sm text-text-muted mt-1">Select the container template to install.</p>
                    </div>

                    <div className="space-y-4 pt-2">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-text-primary">Template Storage <span className="text-status-error">*</span></label>
                        <Controller
                          name="templateStorage"
                          control={control}
                          render={({ field }) => (
                            <select {...field} className="w-full rounded-md border border-border bg-bg-input px-3 py-2.5 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent shadow-sm">
                              <option value="">Select storage with templates...</option>
                              {storages.filter(s => s.node === selectedNode).map(s => (
                                <option key={s.id} value={s.storage}>{s.storage}</option>
                              ))}
                            </select>
                          )}
                        />
                        {errors.templateStorage && <p className="text-xs text-status-error">{errors.templateStorage.message}</p>}
                      </div>

                      {selectedTemplateStorage && (
                        <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
                          <label className="text-sm font-medium text-text-primary">Template <span className="text-status-error">*</span></label>
                          <Controller
                            name="ostemplate"
                            control={control}
                            render={({ field }) => (
                              <select {...field} className="w-full rounded-md border border-border bg-bg-input px-3 py-2.5 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent shadow-sm">
                                <option value="">Select a template...</option>
                                {templates.map(t => (
                                  <option key={t.volid} value={t.volid}>{t.volid.split('/').pop()}</option>
                                ))}
                              </select>
                            )}
                          />
                          {errors.ostemplate && <p className="text-xs text-status-error">{errors.ostemplate.message}</p>}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {SType === 'disk' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div>
                      <h2 className="text-xl font-semibold text-text-primary">Root Disk</h2>
                      <p className="text-sm text-text-muted mt-1">Configure the primary storage volume.</p>
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
                    </div>
                  </div>
                )}

                {SType === 'compute' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div>
                      <h2 className="text-xl font-semibold text-text-primary">Compute & Network</h2>
                      <p className="text-sm text-text-muted mt-1">Allocate CPU, Memory, and Network resources.</p>
                    </div>

                    <div className="space-y-6 pt-2">
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

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-3 p-4 border border-border rounded-lg bg-bg-base/30">
                          <div className="flex justify-between items-center">
                            <label className="text-sm font-medium text-text-primary">Memory (MiB)</label>
                            <span className="text-sm text-accent font-bold font-mono">{watch('memory')}</span>
                          </div>
                          <Controller
                            name="memory"
                            control={control}
                            render={({ field }) => (
                              <input type="range" min="256" max="16384" step="256" {...field} onChange={e => field.onChange(parseInt(e.target.value))} className="w-full accent-accent h-2 bg-border rounded-lg appearance-none cursor-pointer" />
                            )}
                          />
                        </div>

                        <div className="space-y-3 p-4 border border-border rounded-lg bg-bg-base/30">
                          <div className="flex justify-between items-center">
                            <label className="text-sm font-medium text-text-primary">Swap (MiB)</label>
                            <span className="text-sm text-accent font-bold font-mono">{watch('swap')}</span>
                          </div>
                          <Controller
                            name="swap"
                            control={control}
                            render={({ field }) => (
                              <input type="range" min="0" max="16384" step="256" {...field} onChange={e => field.onChange(parseInt(e.target.value))} className="w-full accent-accent h-2 bg-border rounded-lg appearance-none cursor-pointer" />
                            )}
                          />
                        </div>
                      </div>

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
                    </div>
                  </div>
                )}

                {SType === 'confirm' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div>
                      <h2 className="text-xl font-semibold text-text-primary">Review Configuration</h2>
                      <p className="text-sm text-text-muted mt-1">Almost done! Review the settings for your new Container.</p>
                    </div>

                    <div className="rounded-lg border border-border-muted bg-bg-muted/30 p-5 space-y-3 text-sm">
                      <div className="flex justify-between border-b border-border/50 pb-2"><span className="text-text-muted">Target Node</span><span className="font-medium">{watch('node')}</span></div>
                      <div className="flex justify-between border-b border-border/50 pb-2"><span className="text-text-muted">CT ID</span><span className="font-medium font-mono bg-accent/10 text-accent px-1.5 rounded">{watch('vmid')}</span></div>
                      <div className="flex justify-between border-b border-border/50 pb-2"><span className="text-text-muted">Hostname</span><span className="font-medium">{watch('hostname')}</span></div>
                      <div className="flex justify-between border-b border-border/50 pb-2"><span className="text-text-muted">Template</span><span className="font-medium text-xs max-w-[250px] truncate" title={watch('ostemplate') || 'None'}>{watch('ostemplate') || 'None'}</span></div>
                      <div className="flex justify-between border-b border-border/50 pb-2"><span className="text-text-muted">Root Disk</span><span className="font-medium">{watch('diskSize')} GiB on <span className="text-accent">{watch('diskStorage')}</span></span></div>
                      <div className="flex justify-between border-b border-border/50 pb-2"><span className="text-text-muted">Compute</span><span className="font-medium">{watch('cores')} Cores, {watch('memory')} MiB RAM, {watch('swap')} MiB Swap</span></div>
                      <div className="flex justify-between pb-1"><span className="text-text-muted">Network</span><span className="font-medium">{watch('bridge')} (DHCP)</span></div>
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
                <Button type="submit" form="create-ct-form" className="bg-status-running text-white hover:bg-status-running/90 shadow-lg shadow-status-running/20" disabled={createCT.isPending}>
                  {createCT.isPending ? 'Creating Container...' : 'Complete & Create Container'}
                </Button>
              )}
            </div>
          </div>

        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
