import { Link } from 'react-router'

/**
 * CQ-07: Catch-all 404 page rendered when the user navigates to an undefined route.
 * Without this, React Router renders nothing inside the Shell layout (blank page).
 */
export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[40vh] space-y-4 text-center">
      <p className="text-6xl font-bold text-text-disabled">404</p>
      <h1 className="text-xl font-semibold text-text-primary">Page Not Found</h1>
      <p className="text-sm text-text-muted max-w-xs">
        The page you requested doesn&apos;t exist or has been moved.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 rounded-md border border-accent/40 px-4 py-2 text-sm text-accent hover:bg-accent/10 transition-colors"
      >
        ← Back to Dashboard
      </Link>
    </div>
  )
}
