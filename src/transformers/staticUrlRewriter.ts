// ============================================================
// Static URL Rewriter — URL ảnh/file trong HTML bài học
//
// Custom BE trả raw HTML: bỏ host API tuyệt đối và chuyển đường dẫn
// Storage thô sang /api/storage/.
// ============================================================

import { config } from "@/config/env";


/**
 * Chuyển đổi các URL tuyệt đối (absolute URL) thành URL tương đối (relative path).
 * Dùng cho các URL đơn như videoUrl, studentViewUrl, avatar...
 * - Bỏ API base URL (nếu có)
 * - Giữ nguyên query string (nếu có)
 * - Không rewrite các loại url: data:, blob:, URL ngoài
 */
export function sanitizeUrlToRelative(url: string | null): string | null {
  if (!url) return url;
  
  if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('/assets/')) {
    return url;
  }

  // Don't sanitize Supabase Storage URLs — they are hosted on a different server
  if (url.includes('/storage/v1/object/')) {
    return url;
  }
  
  let newUrl = url;
  
  // Bỏ API base URL host (nếu config có)
  const apiBaseUrl = config.apiBaseUrl;
  if (apiBaseUrl) {
    try {
      const apiUrlObj = new URL(apiBaseUrl);
      const apiHost = apiUrlObj.host; 
      const apiRegex = new RegExp(`^https?:\\/\\/${apiHost.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
      newUrl = newUrl.replace(apiRegex, '');
    } catch {
      if (newUrl.startsWith(apiBaseUrl)) {
        newUrl = newUrl.substring(apiBaseUrl.length);
      }
    }
  }
  
  // Đề phòng trường hợp newUrl == rỗng
  if (newUrl === "") newUrl = "/";
  
  return newUrl;
}

/**
 * Chuẩn hóa URL trong HTML bài học: bỏ host API tuyệt đối và chuyển đường
 * dẫn Storage thô thành /api/storage/... (the Open edX /static → /asset-v1
 * rewrite was removed: no course content uses it).
 *
 * @param html - Raw HTML từ course block data
 * @returns HTML đã rewrite URL
 */
export function rewriteStaticUrls(html: string): string {
  if (!html) return html;

  let updatedHtml = html;

  // 1. Strip absolute API/LMS URLs (chuyển absolute → relative)
  const apiBaseUrl = config.apiBaseUrl;
  if (apiBaseUrl) {
    try {
      const apiUrlObj = new URL(apiBaseUrl);
      const apiHost = apiUrlObj.host; 
      const apiRegex = new RegExp(`(['"\\(])https?:\\/\\/${apiHost.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g');
      updatedHtml = updatedHtml.replace(apiRegex, '$1');
    } catch {
      const escaped = apiBaseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const apiRegex = new RegExp(`(['"\\(])${escaped}`, 'g');
      updatedHtml = updatedHtml.replace(apiRegex, '$1');
    }
  }
  
  // 2. Pattern: match raw Supabase storage paths (VD: UUID/courses/...)
  // Chuyển thành URL đi qua Backend Proxy: {apiBaseUrl}/api/storage/{path}
  const storageRegex = /(['"(\s])([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\/(courses|library|avatars|branding)\/[^'")\s]+)/gi;
  updatedHtml = updatedHtml.replace(storageRegex, (_, prefix, path) => {
    const baseUrl = config.apiBaseUrl ? config.apiBaseUrl.replace(/\/$/, '') : '';
    return `${prefix}${baseUrl}/api/storage/${path}`;
  });

  return updatedHtml;
}
