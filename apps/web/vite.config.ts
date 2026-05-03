import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // In development, proxy all /api calls to the Fastify backend
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        ws: true, // proxy WebSocket connections too (for console)
      },
    },
  },

  build: {
    // Target ES2022+ so Rollup keeps top-level await as valid syntax
    target: 'es2022',
  },
})
