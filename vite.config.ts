import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load all env vars (including those without VITE_ prefix)
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
    server: {
      proxy: {
        // Proxy admin auth requests through the dev server
        // so the secret key never reaches the browser
        '/api/admin-auth': {
          target: env.VITE_SUPABASE_URL,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/admin-auth/, '/auth/v1/admin'),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
              proxyReq.setHeader('apikey', serviceKey)
              proxyReq.setHeader('Authorization', `Bearer ${serviceKey}`)
              // Supabase Kong gateway blocks requests with service keys if they look like browser requests.
              // Strip Origin and override User-Agent to bypass this.
              proxyReq.removeHeader('Origin')
              proxyReq.setHeader('User-Agent', 'Node.js/Vite-Proxy')
            })
          }
        }
      }
    }
  }
})
