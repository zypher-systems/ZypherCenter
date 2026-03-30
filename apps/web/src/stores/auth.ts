import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  isAuthenticated: boolean
  username: string | null
  /** Proxmox capability map (what the user can do) */
  cap: Record<string, unknown> | null
  login: (username: string, cap: Record<string, unknown>) => void
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      username: null,
      cap: null,

      login(username, cap) {
        set({ isAuthenticated: true, username, cap })
      },

      async logout() {
        try {
          await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
        } finally {
          set({ isAuthenticated: false, username: null, cap: null })
        }
      },
    }),
    {
      name: 'zc-auth',
      // Only persist authentication state (not sensitive data — the actual
      // auth token lives in the server-side session)
      partialize: (state) => ({ isAuthenticated: state.isAuthenticated, username: state.username }),
    },
  ),
)
