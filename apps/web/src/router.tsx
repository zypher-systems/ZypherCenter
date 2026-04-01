import { createBrowserRouter } from 'react-router'

import { AuthGuard } from '@/components/layout/AuthGuard'
import { Shell } from '@/components/layout/Shell'

// Auth
import { LoginPage } from '@/routes/LoginPage'

// Authenticated pages
import { DashboardPage } from '@/routes/DashboardPage'

// Node pages
import { NodeSummaryPage } from '@/routes/NodeSummaryPage'
import { NodeShellPage } from '@/routes/NodeShellPage'
import { NodeNetworkPage } from '@/routes/NodeNetworkPage'
import { NodeDisksPage } from '@/routes/NodeDisksPage'
import { NodeStoragePage } from '@/routes/NodeStoragePage'
import { NodeUpdatesPage } from '@/routes/NodeUpdatesPage'
import { NodeSyslogPage } from '@/routes/NodeSyslogPage'
import { NodeTasksPage } from '@/routes/NodeTasksPage'
import { NodeDNSPage } from '@/routes/NodeDNSPage'
import { NodeTimePage } from '@/routes/NodeTimePage'
import { NodeServicesPage } from '@/routes/NodeServicesPage'
import { NodeFirewallPage } from '@/routes/NodeFirewallPage'

// VM pages
import { VMListPage } from '@/routes/VMListPage'
import { VMDetailPage } from '@/routes/VMDetailPage'
import { VMConsolePage } from '@/routes/VMConsolePage'
import { AllVMsPage } from '@/routes/AllVMsPage'

// LXC pages
import { LXCListPage } from '@/routes/LXCListPage'
import { LXCDetailPage } from '@/routes/LXCDetailPage'
import { LXCConsolePage } from '@/routes/LXCConsolePage'
import { AllLXCPage } from '@/routes/AllLXCPage'

// Storage
import { StorageListPage } from '@/routes/StorageListPage'
import { StorageDetailPage } from '@/routes/StorageDetailPage'

// Cluster
import { ClusterBackupPage } from '@/routes/ClusterBackupPage'
import { ClusterReplicationPage } from '@/routes/ClusterReplicationPage'
import { HAPage } from '@/routes/HAPage'
import { SDNPage } from '@/routes/SDNPage'
import { ClusterFirewallPage } from '@/routes/ClusterFirewallPage'
import { ClusterOptionsPage } from '@/routes/ClusterOptionsPage'
import { CephPage } from '@/routes/CephPage'
import { PoolsPage } from '@/routes/PoolsPage'

// Access
import { AccessUsersPage } from '@/routes/AccessUsersPage'
import { AccessGroupsPage } from '@/routes/AccessGroupsPage'
import { AccessRolesPage } from '@/routes/AccessRolesPage'
import { ACLPage } from '@/routes/ACLPage'
import { RealmsPage } from '@/routes/RealmsPage'

// Tasks
import { GlobalTasksPage } from '@/routes/GlobalTasksPage'

export const router = createBrowserRouter([
  // ── Public route ────────────────────────────────────────────────────────────
  {
    path: '/login',
    element: <LoginPage />,
  },

  // ── Full-screen console routes (outside Shell layout) ────────────────────
  {
    path: '/nodes/:node/vms/:vmid/console',
    element: (
      <AuthGuard>
        <VMConsolePage />
      </AuthGuard>
    ),
  },
  {
    path: '/nodes/:node/lxc/:vmid/console',
    element: (
      <AuthGuard>
        <LXCConsolePage />
      </AuthGuard>
    ),
  },
  {
    path: '/nodes/:node/shell',
    element: (
      <AuthGuard>
        <NodeShellPage />
      </AuthGuard>
    ),
  },

  // ── Main shell (authenticated) ───────────────────────────────────────────
  {
    path: '/',
    element: (
      <AuthGuard>
        <Shell />
      </AuthGuard>
    ),
    children: [
      // Dashboard
      { index: true, element: <DashboardPage /> },

      // Cluster-wide VM and LXC lists
      { path: 'vms', element: <AllVMsPage /> },
      { path: 'lxc', element: <AllLXCPage /> },

      // Storage
      { path: 'storage', element: <StorageListPage /> },
      { path: 'storage/:storageid', element: <StorageDetailPage /> },

      // Cluster sub-features
      { path: 'cluster/backup', element: <ClusterBackupPage /> },
      { path: 'cluster/replication', element: <ClusterReplicationPage /> },
      { path: 'cluster/ha', element: <HAPage /> },
      { path: 'cluster/sdn', element: <SDNPage /> },
      { path: 'cluster/firewall', element: <ClusterFirewallPage /> },
      { path: 'cluster/options', element: <ClusterOptionsPage /> },
      { path: 'cluster/ceph', element: <CephPage /> },
      { path: 'cluster/pools', element: <PoolsPage /> },

      // Access management
      { path: 'access/users', element: <AccessUsersPage /> },
      { path: 'access/groups', element: <AccessGroupsPage /> },
      { path: 'access/roles', element: <AccessRolesPage /> },
      { path: 'access/acl', element: <ACLPage /> },
      { path: 'access/realms', element: <RealmsPage /> },

      // Global tasks
      { path: 'tasks', element: <GlobalTasksPage /> },

      // Node routes
      { path: 'nodes/:node', element: <NodeSummaryPage /> },
      { path: 'nodes/:node/network', element: <NodeNetworkPage /> },
      { path: 'nodes/:node/disks', element: <NodeDisksPage /> },
      { path: 'nodes/:node/storage', element: <NodeStoragePage /> },
      { path: 'nodes/:node/updates', element: <NodeUpdatesPage /> },
      { path: 'nodes/:node/syslog', element: <NodeSyslogPage /> },
      { path: 'nodes/:node/tasks', element: <NodeTasksPage /> },
      { path: 'nodes/:node/dns', element: <NodeDNSPage /> },
      { path: 'nodes/:node/time', element: <NodeTimePage /> },
      { path: 'nodes/:node/services', element: <NodeServicesPage /> },
      { path: 'nodes/:node/firewall', element: <NodeFirewallPage /> },

      // VM routes (list per-node or global)
      { path: 'nodes/:node/vms', element: <VMListPage /> },
      { path: 'nodes/:node/vms/:vmid', element: <VMDetailPage /> },

      // LXC routes
      { path: 'nodes/:node/lxc', element: <LXCListPage /> },
      { path: 'nodes/:node/lxc/:vmid', element: <LXCDetailPage /> },
    ],
  },
])
