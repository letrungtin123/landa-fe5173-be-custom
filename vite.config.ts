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

  // Strip console.log/debug in production builds
  // Vite 8 dùng oxc transpiler (không phải esbuild) nên esbuild.pure không hoạt động
  // → Dùng Rollup transform plugin thay thế
  const stripConsolePlugin = mode === 'production' ? {
    name: 'strip-console',
    transform(code: string, id: string) {
      if (id.includes('node_modules')) return null;
      if (!code.includes('console.log') && !code.includes('console.debug')) return null;

      // Match console.log/debug with balanced parentheses
      let result = code;
      for (const method of ['console.log', 'console.debug']) {
        let idx = result.indexOf(method);
        while (idx !== -1) {
          const parenStart = result.indexOf('(', idx);
          if (parenStart === -1) break;
          // Find matching closing paren
          let depth = 1;
          let j = parenStart + 1;
          while (j < result.length && depth > 0) {
            if (result[j] === '(') depth++;
            else if (result[j] === ')') depth--;
            j++;
          }
          if (depth === 0) {
            // Remove the entire statement including trailing semicolon
            const end = result[j] === ';' ? j + 1 : j;
            result = result.slice(0, idx) + result.slice(end);
          } else {
            break;
          }
          idx = result.indexOf(method, idx);
        }
      }

      if (result === code) return null;
      return { code: result, map: null };
    },
  } : null;

  return {
    plugins: [react(), stripConsolePlugin].filter(Boolean),
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

    // ── Production build ──
    build: {
      sourcemap: false,
      // Chỉ inline ảnh/icon nhỏ ≤ 8KB, ảnh lớn hơn → file riêng trên CDN
      assetsInlineLimit: 8 * 1024,
      cssCodeSplit: false,
      rollupOptions: {
        output: {
          // Tách vendor chunks — update app code chỉ bust cache app chunk
          manualChunks(id: string) {
            // Core React runtime — hiếm khi thay đổi, cache lâu
            if (id.includes('node_modules/react-dom') ||
                id.includes('node_modules/react/') ||
                id.includes('node_modules/scheduler')) {
              return 'vendor-react';
            }
            // Data layer — router + query
            if (id.includes('node_modules/react-router') ||
                id.includes('node_modules/@tanstack/react-query')) {
              return 'vendor-data';
            }
            // UI libs — animation + icons
            if (id.includes('node_modules/framer-motion') ||
                id.includes('node_modules/lucide-react')) {
              return 'vendor-ui';
            }
            // Security — DOMPurify
            if (id.includes('node_modules/dompurify')) {
              return 'vendor-security';
            }
            // Utils — nhỏ, gom chung
            if (id.includes('node_modules/zustand') ||
                id.includes('node_modules/date-fns')) {
              return 'vendor-utils';
            }
          },
        },
      },
    },

    preview: {
      host: '0.0.0.0',
      port: previewPort,
      allowedHosts,
    },
  }
})
