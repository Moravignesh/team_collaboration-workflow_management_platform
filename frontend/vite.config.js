import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/auth':          { target: 'http://localhost:8000', changeOrigin: true },
      '/admin':         { target: 'http://localhost:8000', changeOrigin: true },
      '/workspaces':    { target: 'http://localhost:8000', changeOrigin: true },
      '/teams':         { target: 'http://localhost:8000', changeOrigin: true },
      '/projects':      { target: 'http://localhost:8000', changeOrigin: true },
      '/tasks':         { target: 'http://localhost:8000', changeOrigin: true },
      '/activity-logs': { target: 'http://localhost:8000', changeOrigin: true },
      '/notifications': { target: 'http://localhost:8000', changeOrigin: true },
      '/uploads':       { target: 'http://localhost:8000', changeOrigin: true },
      '/ws':            { target: 'ws://localhost:8000',   ws: true, changeOrigin: true }
    }
  }
})