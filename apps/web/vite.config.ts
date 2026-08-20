import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Keeps the browser talking to a single origin (this dev server) so
      // the httpOnly auth cookie set by the API is same-site without any
      // extra CORS/cookie configuration needed in dev.
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
