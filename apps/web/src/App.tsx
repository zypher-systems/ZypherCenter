import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router'
import { Toaster } from 'sonner'
import { router } from '@/router'

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

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'rgb(20 20 25)',
            border: '1px solid rgb(39 39 50)',
            color: 'rgb(228 228 235)',
          },
        }}
      />
    </QueryClientProvider>
  )
}
