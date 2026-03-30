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
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, logout } = useAuthStore()
  const location = useLocation()
  const verified = useRef(false)

  useEffect(() => {
    if (!verified.current && isAuthenticated) {
      verified.current = true
      fetch('/api/auth/me', { credentials: 'include' }).then((res) => {
        if (res.status === 401) logout()
      })
    }
  }, [isAuthenticated, logout])

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}
