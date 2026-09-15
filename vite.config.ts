import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // Pre-bundling moves maplibre-gl but not its worker module, which then 404s.
    exclude: ['maplibre-gl'],
  },
})
