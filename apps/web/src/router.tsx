import { createBrowserRouter } from 'react-router'

import { AuthGuard } from '@/components/layout/AuthGuard'
import { Shell } from '@/components/layout/Shell'

// Auth
import { LoginPage } from '@/routes/LoginPage'

// Authenticated pages
// Authenticated pages
import { DatacenterDetailPage } from '@/routes/DatacenterDetailPage'

// Node pages
import { NodeDetailPage } from '@/routes/NodeDetailPage'
import { NodeShellPage } from '@/routes/NodeShellPage'
import { NodeListPage } from '@/routes/NodeListPage'

// VM pages
import { VMListPage } from '@/routes/VMListPage'
import { VMDetailPage } from '@/routes/VMDetailPage'
import { VMConsolePage } from '@/routes/VMConsolePage'

// LXC pages
import { LXCListPage } from '@/routes/LXCListPage'
import { LXCDetailPage } from '@/routes/LXCDetailPage'
import { LXCConsolePage } from '@/routes/LXCConsolePage'

// Storage
import { StorageListPage } from '@/routes/StorageListPage'
import { StorageDetailPage } from '@/routes/StorageDetailPage'

// Global tasks
import { GlobalTasksPage } from '@/routes/GlobalTasksPage'

// 404
import { NotFoundPage } from '@/routes/NotFoundPage'

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
      // Datacenter
      { index: true, element: <DatacenterDetailPage /> },

      // Nodes
      { path: 'nodes', element: <NodeListPage /> },

      // Storage
      { path: 'storage', element: <StorageListPage /> },
      { path: 'storage/:storageid', element: <StorageDetailPage /> },

      // Global tasks
      { path: 'tasks', element: <GlobalTasksPage /> },

      // Node routes
      { path: 'nodes/:node', element: <NodeDetailPage /> },

      // VM routes (list per-node or global)
      { path: 'nodes/:node/vms', element: <VMListPage /> },
      { path: 'nodes/:node/vms/:vmid', element: <VMDetailPage /> },

      // LXC routes
      { path: 'nodes/:node/lxc', element: <LXCListPage /> },
      { path: 'nodes/:node/lxc/:vmid', element: <LXCDetailPage /> },

      // CQ-07: Catch-all 404 route — must be last so it only fires for unmatched paths
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
