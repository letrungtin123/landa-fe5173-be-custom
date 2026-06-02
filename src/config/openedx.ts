// ============================================================
// URL Helpers — Build URLs cho API calls
//
// Dev mode:  trả relative path → Vite proxy xử lý
// Production: trả absolute URL nếu cần
// ============================================================

/** Đảm bảo path luôn bắt đầu bằng "/" */
function ensureLeadingSlash(path: string): string {
  if (path.startsWith("/")) {
    return path;
  }
  return `/${path}`;
}

/**
 * Build URL tới API backend từ relative path.
 *
 * Luôn trả relative path vì:
 *   - Dev:  Vite proxy intercept và forward tới custom backend
 *   - Prod: reverse proxy route /api/* về backend
 */
export function lmsUrl(path: string): string {
  return ensureLeadingSlash(path);
}

/**
 * Build URL tới CMS/Studio từ relative path.
 * @deprecated Studio không còn dùng trong custom BE
 */
export function cmsUrl(path: string): string {
  return ensureLeadingSlash(path);
}
