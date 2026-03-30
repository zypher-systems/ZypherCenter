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
        target: 'http://localhost:3001',
        changeOrigin: true,
        ws: true, // proxy WebSocket connections too (for console)
      },
    },
  },
  // noVNC uses top-level await (valid ESM), prevent Vite from pre-bundling it
  // or converting it to CJS (which strips top-level await support)
  optimizeDeps: {
    exclude: ['@novnc/novnc'],
  },
  build: {
    // Target ES2022+ so Rollup keeps top-level await as valid syntax
    target: 'es2022',
  },
})
