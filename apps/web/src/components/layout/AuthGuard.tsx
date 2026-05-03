import { Navigate, useLocation } from 'react-router'
import { useAuthStore } from '@/stores/auth'
import { useEffect, useRef } from 'react'

interface AuthGuardProps {
  children: React.ReactNode
}

/**
 * Wraps protected routes. If the client-side store says the user isn't
 * authenticated, redirect to /login. On mount, also verifies with the server
 * (in case the session expired) so a page refresh always re-checks.
 *
 * BUG-05: Also re-verifies every 5 minutes so that expired server sessions are
 * detected without requiring a full page reload.
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, logout } = useAuthStore()
  const location = useLocation()
  const verified = useRef(false)

  async function verifySession() {
    const res = await fetch('/api/auth/me', { credentials: 'include' })
    if (res.status === 401) logout()
  }

  useEffect(() => {
    if (!isAuthenticated) return

    // Verify on first mount
    if (!verified.current) {
      verified.current = true
      verifySession()
    }

    // BUG-05: Re-verify every 5 minutes to catch expired server-side sessions
    const intervalId = setInterval(verifySession, 5 * 60 * 1000)
    return () => clearInterval(intervalId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}
