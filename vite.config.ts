import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"

export default defineConfig(({ mode }) => {
  // Tải biến môi trường để dùng trong config
  const env = loadEnv(mode, process.cwd(), 'VITE_')

  const lmsUrl = env.VITE_OPENEDX_LMS_URL
  const cmsUrl = env.VITE_OPENEDX_CMS_URL
  if (!lmsUrl) {
    throw new Error('[Vite] Thiếu VITE_OPENEDX_LMS_URL trong .env.local')
  }

  // ── Server-side session storage ──
  // Open edX set SESSION_COOKIE_SECURE=True trong Tutor production → browser
  // từ chối lưu Secure cookie trên HTTP localhost. Giải pháp: proxy capture
  // sessionid từ /login_ajax response, lưu trong biến Node.js, rồi tự inject
  // vào mọi request cần session auth (VD: /xblock/).
  let lmsSessionId = ''
  let lmsCsrfToken = ''

  /**
   * Helper: Extract cookie value from Set-Cookie headers
   */
  function extractCookieFromResponse(
    setCookieHeaders: string | string[] | undefined,
    cookieName: string
  ): string | null {
    if (!setCookieHeaders) return null
    const headers = Array.isArray(setCookieHeaders)
      ? setCookieHeaders
      : [setCookieHeaders]
    for (const header of headers) {
      const match = header.match(new RegExp(`${cookieName}=([^;]+)`))
      if (match) return match[1]
    }
    return null
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
        // ── Asset proxy — ảnh/file từ course content ──
        // Open edX lưu static assets tại /asset-v1:Org+Course+Run+type@asset+block@filename
        // student_view_data trả raw HTML với /static/xxx → FE rewrite thành /asset-v1:...
        '/asset-v1': {
          target: lmsUrl,
          changeOrigin: true,
          secure: false,
        },
        // ── Auth proxy — cho social auth (Google SSO) ──
        // Exchange token: /auth/complete/google-oauth2/
        '/auth': {
          target: lmsUrl,
          changeOrigin: true,
          secure: false,
          cookieDomainRewrite: '',
        },
        '/api': {
          target: lmsUrl,
          changeOrigin: true,
          secure: false,
          autoRewrite: true,
        },
        // ── Account proxy — password change cho user đã login ──
        '/account': {
          target: lmsUrl,
          changeOrigin: true,
          secure: false,
          cookieDomainRewrite: '',
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.setHeader('origin', lmsUrl)
              proxyReq.setHeader('referer', `${lmsUrl}/`)
              // Inject session cookie server-side
              if (lmsSessionId) {
                const existingCookies = proxyReq.getHeader('cookie') as string || ''
                const sessionPart = `sessionid=${lmsSessionId}`
                const csrfPart = lmsCsrfToken ? `; csrftoken=${lmsCsrfToken}` : ''
                const merged = existingCookies
                  ? `${existingCookies}; ${sessionPart}${csrfPart}`
                  : `${sessionPart}${csrfPart}`
                proxyReq.setHeader('cookie', merged)
              }
            })
          },
        },
        // ── Password reset proxy — cho user chưa login ──
        '/password_reset': {
          target: lmsUrl,
          changeOrigin: true,
          secure: false,
          cookieDomainRewrite: '',
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.setHeader('origin', lmsUrl)
              proxyReq.setHeader('referer', `${lmsUrl}/`)
              // Inject csrftoken cookie server-side (browser có thể không lưu do Secure flag)
              if (lmsCsrfToken) {
                const existingCookies = proxyReq.getHeader('cookie') as string || ''
                const csrfPart = `csrftoken=${lmsCsrfToken}`
                const sessionPart = lmsSessionId ? `; sessionid=${lmsSessionId}` : ''
                const merged = existingCookies
                  ? `${existingCookies}; ${csrfPart}${sessionPart}`
                  : `${csrfPart}${sessionPart}`
                proxyReq.setHeader('cookie', merged)
              }
            })
          },
        },
        // ── Media proxy — file download từ MEDIA_ROOT ──
        // Library documents lưu tại /media/library_documents/...
        '/media': {
          target: lmsUrl,
          changeOrigin: true,
          secure: false,
          autoRewrite: true,
        },
        // ── OAuth2 proxy ──
        // Capture sessionid từ /oauth2/login/ response (exchange access_token → session)
        '/oauth2': {
          target: lmsUrl,
          changeOrigin: true,
          secure: false,
          cookieDomainRewrite: '',
          configure: (proxy) => {
            proxy.on('proxyRes', (proxyRes, req) => {
              // Chỉ capture từ /oauth2/login/ (LoginWithAccessTokenView)
              if (req.url?.includes('/oauth2/login')) {
                const sessionId = extractCookieFromResponse(
                  proxyRes.headers['set-cookie'],
                  'sessionid'
                )
                if (sessionId) {
                  lmsSessionId = sessionId
                  console.log('[proxy:oauth2/login] ✅ Captured sessionid from access token exchange')
                }
                const csrf = extractCookieFromResponse(
                  proxyRes.headers['set-cookie'],
                  'csrftoken'
                )
                if (csrf) lmsCsrfToken = csrf
              }
            })
          },
        },
        // ── CSRF token proxy ──
        // Capture csrftoken từ response để inject vào các request khác
        '/csrf': {
          target: lmsUrl,
          changeOrigin: true,
          secure: false,
          cookieDomainRewrite: '',
          configure: (proxy) => {
            proxy.on('proxyRes', (proxyRes) => {
              const csrf = extractCookieFromResponse(
                proxyRes.headers['set-cookie'],
                'csrftoken'
              )
              if (csrf) {
                lmsCsrfToken = csrf
                console.log('[proxy:csrf] ✅ Captured csrftoken')
              }
            })
          },
        },
        // ── Login proxy ──
        // Capture sessionid từ /login_ajax response.
        // Open edX set Secure flag → browser không lưu → ta lưu server-side.
        '/login_ajax': {
          target: lmsUrl,
          changeOrigin: true,
          secure: false,
          cookieDomainRewrite: '',
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.setHeader('origin', lmsUrl)
              proxyReq.setHeader('referer', `${lmsUrl}/`)
            })
            proxy.on('proxyRes', (proxyRes) => {
              // Capture sessionid
              const sessionId = extractCookieFromResponse(
                proxyRes.headers['set-cookie'],
                'sessionid'
              )
              if (sessionId) {
                lmsSessionId = sessionId
                console.log('[proxy:login_ajax] ✅ Captured sessionid')
              }
              // Also capture csrftoken if present
              const csrf = extractCookieFromResponse(
                proxyRes.headers['set-cookie'],
                'csrftoken'
              )
              if (csrf) {
                lmsCsrfToken = csrf
              }
            })
          },
        },
        // ── XBlock proxy — Inject session cookie server-side ──
        // Browser không có sessionid (Secure cookie trên HTTP) →
        // proxy tự inject sessionid đã capture từ /login_ajax.
        '/xblock': {
          target: lmsUrl,
          changeOrigin: true,
          secure: false,
          cookieDomainRewrite: '',
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              // /xblock/ endpoint không chấp nhận Bearer → xóa đi
              proxyReq.removeHeader('authorization')

              // Inject server-side session cookie
              if (lmsSessionId) {
                const existingCookies = proxyReq.getHeader('cookie') as string || ''
                const sessionPart = `sessionid=${lmsSessionId}`
                const csrfPart = lmsCsrfToken ? `; csrftoken=${lmsCsrfToken}` : ''
                // Merge với cookies browser đã gửi (nếu có)
                const merged = existingCookies
                  ? `${existingCookies}; ${sessionPart}${csrfPart}`
                  : `${sessionPart}${csrfPart}`
                proxyReq.setHeader('cookie', merged)
                console.log('[proxy:xblock] ✅ Injected sessionid into request')
              } else {
                console.warn('[proxy:xblock] ⚠️ No sessionid available — user needs to login first')
              }
            })
          },
        },
        // ── Courses proxy — cho submit quiz + xblock_view API ──
        // ⚠️ CHỈ proxy requests chứa /xblock/ (LMS API calls).
        // Các URL khác (/courses/{id}/lessons/...) là FE route → bypass.
        '/courses': {
          target: lmsUrl,
          changeOrigin: true,
          secure: false,
          cookieDomainRewrite: '',
          bypass: (req) => {
            // Chỉ proxy khi URL chứa /xblock/ hoặc /handler/
            // VD: /courses/{courseKey}/xblock/{usageKey}/handler/...
            // VD: /courses/{courseKey}/xblock/{usageKey}/view/...
            if (!req.url?.includes('/xblock/')) {
              // Không phải LMS API → bypass proxy → Vite serve SPA
              return req.url
            }
            // Là LMS API → proxy tới LMS (return undefined)
          },
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.setHeader('origin', lmsUrl)
              proxyReq.setHeader('referer', `${lmsUrl}/`)
              // Inject session cookie cho các endpoint cần session auth
              if (lmsSessionId) {
                const existingCookies = proxyReq.getHeader('cookie') as string || ''
                const sessionPart = `sessionid=${lmsSessionId}`
                const csrfPart = lmsCsrfToken ? `; csrftoken=${lmsCsrfToken}` : ''
                const merged = existingCookies
                  ? `${existingCookies}; ${sessionPart}${csrfPart}`
                  : `${sessionPart}${csrfPart}`
                proxyReq.setHeader('cookie', merged)
              }
              // Inject X-CSRFToken header cho POST/PUT/DELETE (Open edX yêu cầu)
              // Lấy csrftoken từ cookie của REQUEST (browser gửi), không dùng biến stored
              if (proxyReq.method && proxyReq.method !== 'GET') {
                const cookieHeader = proxyReq.getHeader('cookie') as string || ''
                const csrfMatch = cookieHeader.match(/csrftoken=([^;]+)/)
                const csrfValue = csrfMatch?.[1] || lmsCsrfToken
                if (csrfValue) {
                  proxyReq.setHeader('X-CSRFToken', csrfValue)
                  console.log('[proxy:courses] ✅ Injected X-CSRFToken for', proxyReq.method, proxyReq.path)
                } else {
                  console.warn('[proxy:courses] ⚠️ No csrftoken found in cookies for', proxyReq.method, proxyReq.path)
                }
              }
            })
          },
        },
        // Proxy CMS API → Studio (lấy HTML content cho text blocks)
        '/cms-api': {
          target: cmsUrl || lmsUrl,
          changeOrigin: true,
          secure: false,
          rewrite: (p: string) => p.replace(/^\/cms-api/, '/api'),
        },
      },
    },
  }
})
