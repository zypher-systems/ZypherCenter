import { Link, useLocation } from 'react-router'
import {
  Server,
  Monitor,
  Box,
  Database,
  Network,
  Shield,
  Users,
  Settings,
  BarChart3,
  RefreshCw,
  HardDrive,
  Clock,
  ScrollText,
  Terminal,
  Wifi,
  ChevronDown,
  ChevronRight,
  Layers,
  Activity,
  ShieldCheck,
  Boxes,
  GitFork,
  BellRing,
  PanelLeftClose,
  PanelLeft,
  Cpu,
  MemoryStick,
  CircleDot,
  Globe,
  Timer,
  Cog,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/stores/ui'
import { useClusterResources } from '@/lib/queries/cluster'
import { StatusBadge } from '@/components/ui/StatusBadge'
import type { ClusterResource } from '@zyphercenter/proxmox-types'

// ── Nav item types ────────────────────────────────────────────────────────────

interface NavItem {
  label: string
  to: string
  icon: React.ReactNode
  exact?: boolean
}

function NavLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const { pathname } = useLocation()
  const isActive = item.exact ? pathname === item.to : pathname.startsWith(item.to)

  return (
    <Link
      to={item.to}
      title={collapsed ? item.label : undefined}
      className={cn(
        'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors',
        'hover:bg-bg-hover hover:text-text-primary',
        isActive
          ? 'bg-accent-muted text-text-primary font-medium'
          : 'text-text-secondary',
        collapsed && 'justify-center px-2',
      )}
    >
      <span className="shrink-0 [&_svg]:size-4">{item.icon}</span>
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  )
}

function SectionLabel({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) return <div className="my-1 h-px bg-border-muted" />
  return (
    <p className="mt-4 mb-1 px-2.5 text-[10px] font-semibold uppercase tracking-wider text-text-disabled select-none">
      {label}
    </p>
  )
}

// ── Node subtree ──────────────────────────────────────────────────────────────

function NodeTree({
  node,
  guests,
  collapsed,
}: {
  node: ClusterResource
  guests: ClusterResource[]
  collapsed: boolean
}) {
  const { expandedNodes, toggleNodeExpanded } = useUIStore()
  const { pathname } = useLocation()
  const nodeName = node.node ?? node.name ?? node.id
  const isExpanded = expandedNodes.has(nodeName)
  const isNodeActive = pathname.startsWith(`/nodes/${nodeName}`)

  const vms = guests.filter((g) => g.type === 'qemu' && g.node === nodeName)
  const lxcs = guests.filter((g) => g.type === 'lxc' && g.node === nodeName)

  const nodeOnline = (node.status ?? '') !== 'offline'

  return (
    <div>
      {/* Node row */}
      <div
        className={cn(
          'flex items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors cursor-pointer',
          'hover:bg-bg-hover',
          isNodeActive ? 'text-text-primary font-medium' : 'text-text-secondary',
        )}
        onClick={() => !collapsed && toggleNodeExpanded(nodeName)}
      >
        <Link
          to={`/nodes/${nodeName}`}
          className="flex items-center gap-2.5 flex-1 min-w-0"
          onClick={(e) => e.stopPropagation()}
        >
          <Server className="size-4 shrink-0" />
          {!collapsed && (
            <>
              <span className="truncate flex-1">{nodeName}</span>
              <span
                className={cn(
                  'size-1.5 rounded-full shrink-0',
                  nodeOnline ? 'bg-status-running' : 'bg-status-stopped',
                )}
              />
            </>
          )}
        </Link>
        {!collapsed && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              toggleNodeExpanded(nodeName)
            }}
            className="text-text-disabled hover:text-text-muted shrink-0"
            aria-label={isExpanded ? 'Collapse node' : 'Expand node'}
          >
            {isExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
          </button>
        )}
      </div>

      {/* Node sub-pages + guests */}
      {isExpanded && !collapsed && (
        <div className="ml-4 border-l border-border-muted pl-2 space-y-0.5">
          {[
            { label: 'Summary', to: `/nodes/${nodeName}`, icon: <BarChart3 />, exact: true },
            { label: 'Shell', to: `/nodes/${nodeName}/shell`, icon: <Terminal /> },
            { label: 'Network', to: `/nodes/${nodeName}/network`, icon: <Wifi /> },
            { label: 'Disks', to: `/nodes/${nodeName}/disks`, icon: <HardDrive /> },
            { label: 'Storage', to: `/nodes/${nodeName}/storage`, icon: <Database /> },
            { label: 'Updates', to: `/nodes/${nodeName}/updates`, icon: <RefreshCw /> },
            { label: 'DNS', to: `/nodes/${nodeName}/dns`, icon: <Globe /> },
            { label: 'Time', to: `/nodes/${nodeName}/time`, icon: <Timer /> },
            { label: 'Services', to: `/nodes/${nodeName}/services`, icon: <Cog /> },
            { label: 'Syslog', to: `/nodes/${nodeName}/syslog`, icon: <ScrollText /> },
            { label: 'Tasks', to: `/nodes/${nodeName}/tasks`, icon: <Clock /> },
          ].map((item) => (
            <NavLink key={item.to} item={item} collapsed={false} />
          ))}

          {/* VMs */}
          {vms.length > 0 && (
            <>
              <p className="px-2.5 pt-2 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-text-disabled">
                VMs
              </p>
              {vms.map((vm) => (
                <GuestLink key={vm.id} guest={vm} type="vm" />
              ))}
            </>
          )}

          {/* LXC Containers */}
          {lxcs.length > 0 && (
            <>
              <p className="px-2.5 pt-2 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-text-disabled">
                CT
              </p>
              {lxcs.map((lxc) => (
                <GuestLink key={lxc.id} guest={lxc} type="lxc" />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function GuestLink({ guest, type }: { guest: ClusterResource; type: 'vm' | 'lxc' }) {
  const { pathname } = useLocation()
  const nodeName = guest.node ?? ''
  const vmid = guest.vmid ?? 0
  const basePath = type === 'vm' ? `/nodes/${nodeName}/vms/${vmid}` : `/nodes/${nodeName}/lxc/${vmid}`
  const isActive = pathname.startsWith(basePath)
  const status = (guest.status ?? 'unknown') as string

  return (
    <Link
      to={basePath}
      className={cn(
        'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition-colors',
        'hover:bg-bg-hover hover:text-text-primary',
        isActive ? 'bg-accent-muted text-text-primary font-medium' : 'text-text-secondary',
      )}
    >
      {type === 'vm' ? <Monitor className="size-3.5 shrink-0" /> : <Box className="size-3.5 shrink-0" />}
      <span className="truncate flex-1">
        {vmid} {guest.name ? `· ${guest.name}` : ''}
      </span>
      <StatusBadge status={status} dotOnly size="sm" />
    </Link>
  )
}

// ── Main Sidebar ──────────────────────────────────────────────────────────────

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore()
  const { data: resources } = useClusterResources()

  const nodes = resources?.filter((r) => r.type === 'node') ?? []
  const guests = resources?.filter((r) => r.type === 'qemu' || r.type === 'lxc') ?? []

  const datacenterNav: NavItem[] = [
    { label: 'Dashboard', to: '/', icon: <Layers />, exact: true },
    { label: 'Virtual Machines', to: '/vms', icon: <Monitor /> },
    { label: 'Containers', to: '/lxc', icon: <Box /> },
    { label: 'Storage',     to: '/storage',              icon: <Database /> },
    { label: 'Ceph',        to: '/cluster/ceph',         icon: <CircleDot /> },
    { label: 'Backup Jobs', to: '/cluster/backup',       icon: <HardDrive /> },
    { label: 'Replication', to: '/cluster/replication', icon: <GitFork /> },
    { label: 'HA', to: '/cluster/ha', icon: <ShieldCheck /> },
    { label: 'SDN', to: '/cluster/sdn', icon: <Network /> },
    { label: 'Firewall', to: '/cluster/firewall', icon: <Shield /> },
    { label: 'Options', to: '/cluster/options', icon: <Settings /> },
  ]

  const accessNav: NavItem[] = [
    { label: 'Users', to: '/access/users', icon: <Users /> },
    { label: 'Groups', to: '/access/groups', icon: <Boxes /> },
    { label: 'Roles', to: '/access/roles', icon: <ShieldCheck /> },
    { label: 'Permissions', to: '/access/acl', icon: <Shield /> },
    { label: 'Realms', to: '/access/realms', icon: <BellRing /> },
  ]

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-30 flex flex-col bg-bg-sidebar border-r border-border',
        'transition-[width] duration-200',
        sidebarCollapsed ? 'w-[64px]' : 'w-[240px]',
      )}
    >
      {/* Logo */}
      <div className={cn('flex h-14 items-center border-b border-border px-3 gap-2.5')}>
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent">
          <Cpu className="size-4 text-white" />
        </div>
        {!sidebarCollapsed && (
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-text-primary truncate">ZypherCenter</span>
            <span className="text-[10px] text-text-muted">Proxmox Console</span>
          </div>
        )}
      </div>

      {/* Nav content */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        <SectionLabel label="Datacenter" collapsed={sidebarCollapsed} />
        {datacenterNav.map((item) => (
          <NavLink key={item.to} item={item} collapsed={sidebarCollapsed} />
        ))}

        <SectionLabel label="Tasks" collapsed={sidebarCollapsed} />
        <NavLink
          item={{ label: 'Task Log', to: '/tasks', icon: <Activity /> }}
          collapsed={sidebarCollapsed}
        />

        <SectionLabel label="Nodes" collapsed={sidebarCollapsed} />
        {nodes.map((node) => (
          <NodeTree
            key={node.id}
            node={node}
            guests={guests}
            collapsed={sidebarCollapsed}
          />
        ))}

        <SectionLabel label="Access" collapsed={sidebarCollapsed} />
        {accessNav.map((item) => (
          <NavLink key={item.to} item={item} collapsed={sidebarCollapsed} />
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-border p-2">
        <button
          onClick={toggleSidebar}
          className="flex w-full items-center justify-center gap-2 rounded-md p-2 text-text-muted transition-colors hover:bg-bg-hover hover:text-text-primary"
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? <PanelLeft className="size-4" /> : <PanelLeftClose className="size-4" />}
          {!sidebarCollapsed && <span className="text-xs">Collapse</span>}
        </button>
      </div>
    </aside>
  )
}
