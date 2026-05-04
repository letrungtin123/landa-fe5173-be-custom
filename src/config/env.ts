// ============================================================
// Cấu hình môi trường — Xác thực bắt buộc, không fallback
// Ứng dụng sẽ CRASH ngay nếu thiếu bất kỳ biến nào
// ============================================================

/**
 * Lấy giá trị biến môi trường — throw error nếu thiếu.
 * Không bao giờ trả về giá trị mặc định để tránh lộ secrets.
 */
function requireEnv(key: string): string {
  const value = import.meta.env[key];
  if (!value || value.trim() === "") {
    throw new Error(
      `[ENV] Thiếu biến môi trường bắt buộc: ${key}. ` +
      `Hãy kiểm tra file .env.local (copy từ .env.example).`
    );
  }
  return value.trim();
}

/**
 * Lấy giá trị số từ biến môi trường — throw nếu không phải số.
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

/**
 * Xác thực URL hợp lệ — phải bắt đầu bằng http:// hoặc https://
 */
function requireUrl(key: string): string {
  const url = requireEnv(key);
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    throw new Error(
      `[ENV] ${key} phải là URL hợp lệ (http:// hoặc https://), nhận được: "${url}"`
    );
  }
  // Bỏ trailing slash
  return url.replace(/\/+$/, "");
}

// ── Xác thực tất cả biến khi app khởi động ──

export const config = {
  /** URL LMS chính — dùng cho API calls */
  lmsBaseUrl: requireUrl("VITE_OPENEDX_LMS_URL"),

  /** URL Studio (CMS) — redirect admin/mentor */
  studioBaseUrl: requireUrl("VITE_OPENEDX_CMS_URL"),

  /** OAuth2 Client ID */
  clientId: requireEnv("VITE_OPENEDX_CLIENT_ID"),

  /** OAuth2 Client Secret */
  clientSecret: requireEnv("VITE_OPENEDX_CLIENT_SECRET"),

  /** Thời gian (ms) refresh token trước khi hết hạn */
  tokenRefreshBufferMs: requireEnvNumber("VITE_TOKEN_REFRESH_BUFFER_MS", 300_000),

  /** Timeout (ms) cho API calls */
  apiTimeoutMs: requireEnvNumber("VITE_API_TIMEOUT_MS", 30_000),

  /** Google OAuth2 Client ID — tùy chọn, không crash nếu thiếu */
  googleClientId: (import.meta.env.VITE_GOOGLE_CLIENT_ID || "").trim(),

  /** Base URL cho API — trong dev dùng proxy (rỗng), production dùng LMS URL */
  get apiBaseUrl(): string {
    return import.meta.env.DEV ? "" : this.lmsBaseUrl;
  },
} as const;
