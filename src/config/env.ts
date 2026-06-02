// ============================================================
// Cấu hình môi trường — Custom Backend
// ============================================================

/**
 * Lấy giá trị biến môi trường — throw error nếu thiếu.
 */
function requireEnvNumber(key: string, fallback?: number): number {
  const raw = import.meta.env[key];
  if (!raw && fallback !== undefined) return fallback;
  const num = Number(raw);
  if (isNaN(num) || num <= 0) {
    throw new Error(
      `[ENV] Biến ${key} phải là số dương, nhận được: "${raw}"`
    );
  }
  return num;
}

export const config = {
  /** Timeout (ms) cho API calls */
  apiTimeoutMs: requireEnvNumber("VITE_API_TIMEOUT_MS", 30_000),

  /** Thời gian (ms) refresh token trước khi hết hạn */
  tokenRefreshBufferMs: requireEnvNumber("VITE_TOKEN_REFRESH_BUFFER_MS", 300_000),

  /**
   * Base URL cho API calls.
   * Dev: Vite proxy (server.proxy) intercept và forward tới custom backend
   * Production: Kong Gateway hoặc reverse proxy route /api/* về backend
   */
  get apiBaseUrl(): string {
    return (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
  },

  /** @deprecated SSO — hiện tại không dùng, giữ cho LoginPage guard */
  microsoftClientId: import.meta.env.VITE_MICROSOFT_CLIENT_ID || "",
  keycloakClientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || "",

  /** @deprecated Chỉ dùng cho staticUrlRewriter fallback */
  get lmsBaseUrl(): string {
    return (import.meta.env.VITE_LMS_BASE_URL || import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
  },

  /** @deprecated Studio không còn dùng */
  get studioBaseUrl(): string {
    return import.meta.env.VITE_STUDIO_BASE_URL || "";
  },
} as const;
