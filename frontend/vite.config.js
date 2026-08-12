import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The dev proxy is load-bearing, not a convenience. It makes /api and /voice
// same-origin from the browser's point of view, which means no CORS preflight
// and no cross-origin EventSource for the SSE stream. Remove it and every
// request fails with "Invalid CORS request" even though the backend is healthy.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true, // fail loudly instead of drifting to 5174 and breaking CORS
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/voice': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
