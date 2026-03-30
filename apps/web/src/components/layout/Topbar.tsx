import { useLocation, Link } from 'react-router'
import { LogOut, User, ChevronRight, Activity } from 'lucide-react'
import { useAuthStore } from '@/stores/auth'
import { useClusterTasks } from '@/lib/queries/tasks'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import { cn } from '@/lib/utils'

// ── Breadcrumb ────────────────────────────────────────────────────────────────

function buildBreadcrumbs(pathname: string): { label: string; to: string }[] {
  const segments = pathname.split('/').filter(Boolean)
  const crumbs: { label: string; to: string }[] = [{ label: 'Datacenter', to: '/' }]

  const labels: Record<string, string> = {
    nodes: 'Nodes',
    vms: 'VMs',
    lxc: 'Containers',
    storage: 'Storage',
    cluster: 'Cluster',
    backup: 'Backup',
    replication: 'Replication',
    ha: 'HA',
    sdn: 'SDN',
    firewall: 'Firewall',
    options: 'Options',
    access: 'Access',
    users: 'Users',
    groups: 'Groups',
    roles: 'Roles',
    acl: 'Permissions',
    realms: 'Realms',
    tasks: 'Tasks',
    network: 'Network',
    disks: 'Disks',
    updates: 'Updates',
    syslog: 'Syslog',
    shell: 'Shell',
    console: 'Console',
    summary: 'Summary',
    hardware: 'Hardware',
    snapshots: 'Snapshots',
    backups: 'Backups',
  }

  let path = ''
  for (const seg of segments) {
    path += `/${seg}`
    crumbs.push({
      label: labels[seg] ?? seg,
      to: path,
    })
  }

  return crumbs
}

// ── Active tasks indicator ─────────────────────────────────────────────────────

function ActiveTasksIndicator() {
  const { data: tasks } = useClusterTasks()
  const running = tasks?.filter((t) => t.status === 'running').length ?? 0

  if (!running) return null

  return (
    <Link
      to="/tasks"
      className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
    >
      <Activity className="size-3.5 animate-pulse text-status-running" />
      <span>{running} active {running === 1 ? 'task' : 'tasks'}</span>
    </Link>
  )
}

// ── Topbar ────────────────────────────────────────────────────────────────────

export function Topbar() {
  const { pathname } = useLocation()
  const { username, logout } = useAuthStore()
  const crumbs = buildBreadcrumbs(pathname)

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border px-5 bg-bg-sidebar/80 backdrop-blur-sm">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm overflow-hidden" aria-label="Breadcrumb">
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1
          return (
            <span key={crumb.to} className="flex items-center gap-1 min-w-0">
              {i > 0 && <ChevronRight className="size-3.5 text-text-disabled shrink-0" />}
              {isLast ? (
                <span className="text-text-primary font-medium truncate">{crumb.label}</span>
              ) : (
                <Link
                  to={crumb.to}
                  className="text-text-muted hover:text-text-secondary transition-colors truncate"
                >
                  {crumb.label}
                </Link>
              )}
            </span>
          )
        })}
      </nav>

      {/* Right side */}
      <div className="flex items-center gap-2 shrink-0">
        <ActiveTasksIndicator />

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-text-secondary',
                'hover:bg-bg-hover hover:text-text-primary transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              )}
            >
              <span className="flex size-6 items-center justify-center rounded-md bg-bg-muted text-xs font-semibold text-text-primary shrink-0">
                {username?.[0]?.toUpperCase() ?? 'U'}
              </span>
              <span className="hidden sm:block truncate max-w-[120px]">{username}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="font-medium text-text-primary">{username}</span>
                <span className="text-xs text-text-muted font-normal">Proxmox User</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/access/users" className="gap-2">
                <User className="size-4" />
                User Management
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={logout}
              className="text-danger hover:text-danger focus:text-danger gap-2"
            >
              <LogOut className="size-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
