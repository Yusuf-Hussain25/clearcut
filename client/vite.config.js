import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Dev only: with VITE_API_URL="/" the page and the API share one origin
  server: {
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
})
