import { defineConfig, loadEnv, type Plugin, type PreviewServer, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"
import { parseFrameablePaths, requestPathname, securityHeadersFor } from './server-security.mjs'

/** nosniff, referrer policy and framing rules on every response (server-security.mjs). */
function securityHeadersPlugin(frameablePaths: string[]): Plugin {
  const install = (server: ViteDevServer | PreviewServer) => {
    server.middlewares.use((req, res, next) => {
      for (const [name, value] of Object.entries(securityHeadersFor(requestPathname(req.url), frameablePaths))) {
        res.setHeader(name, value)
      }
      next()
    })
  }
  return { name: 'landa-security-headers', configureServer: install, configurePreviewServer: install }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // Backend URL cho Vite proxy. PROXY_* chi dung server-side, khong bake vao browser bundle.
  const backendProxyTarget = env.PROXY_BACKEND_URL || env.VITE_PROXY_TARGET || env.VITE_API_BASE_URL || 'http://localhost:3001'

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

  const proxyConfig = {
    '/api': {
      target: backendProxyTarget,
      changeOrigin: true,
      secure: false,
      // Append the connecting client address to X-Forwarded-For (never replace
      // it); the backend trusts only its configured proxy hops.
      xfwd: true,
    },
  }

  return {
    plugins: [react(), stripConsolePlugin, securityHeadersPlugin(parseFrameablePaths(env.LEARNER_FRAMEABLE_PATHS))].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      allowedHosts,
      proxy: proxyConfig,
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
      proxy: proxyConfig,
    },
  }
})
