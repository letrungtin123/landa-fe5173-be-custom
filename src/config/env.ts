// ============================================================
// Cấu hình môi trường — Custom Backend
// ============================================================

/**
 * Số dương từ biến môi trường. The value is passed in as a static
 * `import.meta.env.VITE_X` read: a dynamic `import.meta.env[key]` makes Vite
 * embed EVERY VITE_* key in the bundle, including server-only ones such as
 * VITE_ALLOWED_HOSTS and VITE_PROXY_TARGET.
 */
function requireEnvNumber(key: string, raw: string | undefined, fallback?: number): number {
  if (!raw && fallback !== undefined) return fallback;
  const num = Number(raw);
  if (isNaN(num) || num <= 0) {
    throw new Error(
      `[ENV] Biến ${key} phải là số dương, nhận được: "${raw}"`
    );
  }
  return num;
}

function normalizePublicBaseUrl(raw: unknown): string {
  return String(raw || "").trim().replace(/\/+$/, "");
}

function wouldCauseMixedContent(baseUrl: string): boolean {
  return (
    typeof window !== "undefined" &&
    window.location.protocol === "https:" &&
    /^http:\/\//i.test(baseUrl)
  );
}

let mixedContentWarningShown = false;

function getPublicApiBaseUrl(): string {
  const baseUrl = normalizePublicBaseUrl(import.meta.env.VITE_API_BASE_URL);
  if (wouldCauseMixedContent(baseUrl)) {
    if (!mixedContentWarningShown) {
      mixedContentWarningShown = true;
      console.warn("[ENV] VITE_API_BASE_URL dùng HTTP trên trang HTTPS, tự chuyển sang same-origin /api để tránh mixed content.");
    }
    return "";
  }
  return baseUrl;
}

export const config = {
  /** Timeout (ms) cho API calls */
  apiTimeoutMs: requireEnvNumber("VITE_API_TIMEOUT_MS", import.meta.env.VITE_API_TIMEOUT_MS, 30_000),

  /** Thời gian (ms) refresh token trước khi hết hạn */
  tokenRefreshBufferMs: requireEnvNumber("VITE_TOKEN_REFRESH_BUFFER_MS", import.meta.env.VITE_TOKEN_REFRESH_BUFFER_MS, 300_000),

  /**
   * Base URL cho API calls.
   * Dev: Vite proxy (server.proxy) intercept và forward tới custom backend
   * Production: Kong Gateway hoặc reverse proxy route /api/* về backend
   */
  get apiBaseUrl(): string {
    return getPublicApiBaseUrl();
  },

  /** @deprecated SSO — hiện tại không dùng, giữ cho LoginPage guard */
  microsoftClientId: import.meta.env.VITE_MICROSOFT_CLIENT_ID || "",
  keycloakClientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || "",
} as const;
