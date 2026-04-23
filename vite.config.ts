import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"

export default defineConfig(({ mode }) => {
  // Tải biến môi trường để dùng trong config
  const env = loadEnv(mode, process.cwd(), 'VITE_')

  const lmsUrl = env.VITE_OPENEDX_LMS_URL
  if (!lmsUrl) {
    throw new Error('[Vite] Thiếu VITE_OPENEDX_LMS_URL trong .env.local')
  }

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      // Proxy API requests → Open edX LMS (chỉ trong development)
      // Giúp tránh CORS khi phát triển local
      proxy: {
        '/api': {
          target: lmsUrl,
          changeOrigin: true,
          secure: false,
        },
        '/oauth2': {
          target: lmsUrl,
          changeOrigin: true,
          secure: false,
        },
        '/xblock': {
          target: lmsUrl,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
