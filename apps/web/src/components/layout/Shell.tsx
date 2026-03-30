import { Outlet } from 'react-router'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { useUIStore } from '@/stores/ui'
import { cn } from '@/lib/utils'

/**
 * Root authenticated layout: fixed sidebar on the left, topbar across the top,
 * main content area fills the rest of the viewport.
 */
export function Shell() {
  const { sidebarCollapsed } = useUIStore()

  return (
    <div className="flex h-dvh overflow-hidden bg-bg-base">
      {/* Left sidebar */}
      <Sidebar />

      {/* Main area */}
      <div
        className={cn(
          'flex flex-1 flex-col overflow-hidden transition-[margin] duration-200',
          sidebarCollapsed ? 'ml-[64px]' : 'ml-[240px]',
        )}
      >
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
