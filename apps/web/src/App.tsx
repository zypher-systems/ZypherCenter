import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router'
import { Toaster } from 'sonner'
import { router } from '@/router'
import { GlobalErrorBoundary } from '@/components/layout/GlobalErrorBoundary'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5_000,
      retry: (failureCount, error) => {
        // Don't retry on 401/403
        if (error instanceof Error && 'status' in error) {
          const status = (error as { status: number }).status
          if (status === 401 || status === 403) return false
        }
        return failureCount < 2
      },
    },
  },
})

import { ThemeProvider } from '@/components/providers/ThemeProvider'

export default function App() {
  return (
    <GlobalErrorBoundary>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
          <Toaster position="bottom-right" />
        </QueryClientProvider>
      </ThemeProvider>
    </GlobalErrorBoundary>
  )
}
