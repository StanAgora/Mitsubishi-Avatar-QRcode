import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// Dev server proxies /api to the local Express backend so the browser
// never needs a separate origin/CORS config for API calls. HTTPS (via a
// self-signed cert) is required even in dev because getUserMedia is only
// available in a secure context, and LAN IP access (needed for phone QR
// scanning) doesn't count as one over plain HTTP.
// APP_VITE_BASE_PATH lets this app be deployed under a reverse-proxy subpath
// (e.g. /avatar/) instead of domain root — set by quick-deploy.sh.
export default defineConfig({
  base: process.env.APP_VITE_BASE_PATH || '/',
  plugins: [react(), basicSsl()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
