import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIState {
  sidebarCollapsed: boolean
  /** Which nodes have their VM/LXC sub-tree expanded in the sidebar */
  expandedNodes: Set<string>
  toggleSidebar: () => void
  setSidebarCollapsed: (v: boolean) => void
  toggleNodeExpanded: (node: string) => void
  setNodeExpanded: (node: string, expanded: boolean) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      expandedNodes: new Set<string>(),

      toggleSidebar() {
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed }))
      },

      setSidebarCollapsed(v) {
        set({ sidebarCollapsed: v })
      },

      toggleNodeExpanded(node) {
        set((s) => {
          const next = new Set(s.expandedNodes)
          if (next.has(node)) next.delete(node)
          else next.add(node)
          return { expandedNodes: next }
        })
      },

      setNodeExpanded(node, expanded) {
        set((s) => {
          const next = new Set(s.expandedNodes)
          if (expanded) next.add(node)
          else next.delete(node)
          return { expandedNodes: next }
        })
      },
    }),
    {
      name: 'zc-ui',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        // Serialize Set as array for JSON storage
        expandedNodes: [...state.expandedNodes],
      }),
      // Restore Set from array after rehydration
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.expandedNodes = new Set(state.expandedNodes as unknown as string[])
        }
      },
    },
  ),
)
