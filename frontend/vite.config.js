import { sentryVitePlugin } from "@sentry/vite-plugin";
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), sentryVitePlugin({
    org: "pj-sentry-global",
    project: "sentry-build-otlp-workshop-frontend"
  })],

  server: {
    port: 5173,
    strictPort: true, // Fail if port is already in use instead of trying next port
  },

  build: {
    sourcemap: true
  }
})