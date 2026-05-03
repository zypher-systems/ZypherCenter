import { ErrorBoundary } from 'react-error-boundary'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

function ErrorFallback({ error, resetErrorBoundary }: { error: any; resetErrorBoundary: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-base p-4">
      <Card className="max-w-md w-full border-status-error/20 bg-bg-elevated">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-status-error/10">
            <AlertCircle className="h-6 w-6 text-status-error" />
          </div>
          <CardTitle className="text-xl">Something went wrong</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md bg-bg-card p-3 text-sm text-status-error overflow-auto max-h-48 border border-border-subtle">
            <p className="font-mono">{error.message}</p>
          </div>
          <div className="flex justify-center pt-2">
            <Button onClick={resetErrorBoundary} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Reload Application
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function GlobalErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {
        window.location.reload()
      }}
    >
      {children}
    </ErrorBoundary>
  )
}
