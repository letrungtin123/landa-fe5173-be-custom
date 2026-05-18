// ============================================================
// Open edX URL Helpers — Tập trung xây dựng URL cho API calls
//
// Dev mode:  trả relative path → Vite proxy xử lý
// Production: trả absolute URL từ biến môi trường
//
// Dùng import.meta.env.DEV để phân biệt môi trường.
// KHÔNG hardcode IP/domain — lấy từ config.
// ============================================================

import { config } from "./env";

/** Đảm bảo path luôn bắt đầu bằng "/" */
function ensureLeadingSlash(path: string): string {
  if (path.startsWith("/")) {
    return path;
  }
  return `/${path}`;
}

/**
 * Build URL tới LMS từ relative path.
 *
 * Luôn trả relative path vì:
 *   - Dev:  Vite proxy intercept và forward tới LMS backend
 *   - Prod: Kong Gateway route same-domain (elearning.l-a.vn/api/... → LMS)
 *
 * @example
 *   lmsUrl("/oauth2/access_token")  → "/oauth2/access_token"
 *   lmsUrl("/csrf/api/v1/token")    → "/csrf/api/v1/token"
 */
export function lmsUrl(path: string): string {
  return ensureLeadingSlash(path);
}

/**
 * Build URL tới CMS/Studio từ relative path.
 *
 * @example
 *   cmsUrl("/api/contentstore/v1/...")
 *   // Dev  → "/api/contentstore/v1/..."
 *   // Prod → "http://studio.192.168.0.226.nip.io/api/contentstore/v1/..."
 */
export function cmsUrl(path: string): string {
  const normalized = ensureLeadingSlash(path);
  if (import.meta.env.DEV) {
    return normalized;
  }
  return `${config.studioBaseUrl}${normalized}`;
}
