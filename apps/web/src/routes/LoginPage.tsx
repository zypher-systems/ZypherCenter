import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Cpu, Eye, EyeOff, Loader2, Server } from 'lucide-react'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'

const LoginSchema = z.object({
  proxmoxHost: z
    .string()
    .min(1, 'Proxmox host is required')
    .url('Must be a valid URL, e.g. https://192.168.1.100:8006'),
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  realm: z.string().default('pam'),
})

type LoginForm = z.infer<typeof LoginSchema>

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [hostLocked, setHostLocked] = useState(false)

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/'

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(LoginSchema), defaultValues: { realm: 'pam' } })

  // If the server has PROXMOX_HOST configured, pre-fill and lock the field
  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((cfg: { proxmoxHost: string | null }) => {
        if (cfg.proxmoxHost) {
          setValue('proxmoxHost', cfg.proxmoxHost)
          setHostLocked(true)
        }
      })
      .catch(() => {/* ignore — server may not be up yet */})
  }, [setValue])

  const onSubmit = async (data: LoginForm) => {
    setServerError(null)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const body = (await res.json()) as { error?: string }
        setServerError(body.error ?? 'Login failed')
        return
      }

      const body = (await res.json()) as { username: string; cap: Record<string, unknown> }
      login(body.username, body.cap)
      navigate(from, { replace: true })
    } catch {
      setServerError('Cannot reach the ZypherCenter API. Is it running?')
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg-base px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-accent shadow-lg shadow-accent/20">
            <Cpu className="size-7 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-text-primary">ZypherCenter</h1>
            <p className="text-sm text-text-muted mt-0.5">Sign in to your Proxmox cluster</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="rounded-xl border border-border bg-bg-card p-6 shadow-xl shadow-black/20 space-y-4">
            {serverError && (
              <div className="rounded-lg bg-danger/10 border border-danger/20 px-3 py-2.5 text-sm text-danger">
                {serverError}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="proxmoxHost">Proxmox Host</Label>
              <div className="relative">
                <Server className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-text-muted" />
                <Input
                  id="proxmoxHost"
                  placeholder="https://192.168.1.100:8006"
                  className="pl-8"
                  readOnly={hostLocked}
                  {...register('proxmoxHost')}
                />
              </div>
              {errors.proxmoxHost && (
                <p className="text-xs text-danger">{errors.proxmoxHost.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="root"
                autoComplete="username"
                {...register('username')}
              />
              {errors.username && (
                <p className="text-xs text-danger">{errors.username.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="pr-10"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-danger">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="realm">Realm</Label>
              <Input
                id="realm"
                placeholder="pam"
                {...register('realm')}
              />
              <p className="text-xs text-text-disabled">
                Use <code className="bg-bg-muted px-1 rounded">pam</code> for Linux system users or{' '}
                <code className="bg-bg-muted px-1 rounded">pve</code> for Proxmox users
              </p>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Signing in…
              </>
            ) : (
              'Sign in'
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
