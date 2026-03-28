import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/** Python backend (server.py). */
const API_TARGET = process.env.VITE_DEV_API_PROXY ?? 'http://128.84.40.118:8000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: API_TARGET, changeOrigin: true },
      '/chat': { target: API_TARGET, changeOrigin: true },
      '/data': { target: API_TARGET, changeOrigin: true },
      '/generated': { target: API_TARGET, changeOrigin: true },
      '/imgs': { target: API_TARGET, changeOrigin: true },
      // Frontend uses /st/… and /sm/…; server serves them under /data/
      '/st': {
        target: API_TARGET,
        changeOrigin: true,
        rewrite: (p) => '/data' + p,
      },
      '/sm': {
        target: API_TARGET,
        changeOrigin: true,
        rewrite: (p) => '/data' + p,
      },
    },
  },
})
