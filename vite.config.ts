import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')

  // Backend URL cho Vite proxy
  const apiUrl = env.VITE_PROXY_TARGET || env.VITE_API_BASE_URL || 'http://localhost:3001'

  // Legacy edX LMS URL — chỉ cần cho asset/xblock proxy
  const lmsUrl = env.VITE_LMS_BASE_URL || ''

  // Allowed hosts — đọc từ env, phân cách bằng dấu phẩy
  const allowedHosts = env.VITE_ALLOWED_HOSTS
    ? env.VITE_ALLOWED_HOSTS.split(',').map(h => h.trim()).filter(Boolean)
    : []

  // Preview port
  const previewPort = Number(env.VITE_PREVIEW_PORT) || 5173

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      allowedHosts,
      proxy: {
        '/api': {
          target: apiUrl,
          changeOrigin: true,
          secure: false,
        },
        ...(lmsUrl ? {
          '/asset-v1': {
            target: lmsUrl,
            changeOrigin: true,
            secure: false,
          },
        } : {}),
        '/media': {
          target: lmsUrl || apiUrl,
          changeOrigin: true,
          secure: false,
          autoRewrite: true,
        },
        ...(lmsUrl ? {
          '/xblock': {
            target: lmsUrl,
            changeOrigin: true,
            secure: false,
            cookieDomainRewrite: '',
          },
          '/courses': {
            target: lmsUrl,
            changeOrigin: true,
            secure: false,
            cookieDomainRewrite: '',
            bypass: (req) => {
              if (!req.url?.includes('/xblock/')) {
                return req.url
              }
            },
          },
        } : {}),
      },
    },
    preview: {
      host: '0.0.0.0',
      port: previewPort,
      allowedHosts,
    },
  }
})
