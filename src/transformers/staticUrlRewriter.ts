// ============================================================
// Static URL Rewriter — Chuyển đổi URL ảnh từ course HTML blocks
//
// Custom BE trả raw HTML, FE cần rewrite /static/xxx thành
// URL asset đầy đủ.
// ============================================================

import { config } from "@/config/env";


/**
 * Trích xuất phần course key identifier từ courseId.
 * Ví dụ: "course-v1:LA+LMS101+2025" → "LA+LMS101+2025"
 */
function extractCourseRun(courseId: string): string {
  const match = courseId.match(/^course-v1:(.+)$/);
  return match ? match[1] : courseId;
}

/**
 * Chuyển đổi các URL tuyệt đối (absolute URL) thành URL tương đối (relative path).
 * Dùng cho các URL đơn như videoUrl, studentViewUrl, avatar...
 * - Bỏ API base URL (nếu có)
 * - Bỏ cứng http://192.168.0.226.nip.io
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
  
  // Bỏ cứng domain IP (kể cả http hay https)
  newUrl = newUrl.replace(/^https?:\/\/192\.168\.0\.226\.nip\.io/, "");
  
  // Đề phòng trường hợp newUrl == rỗng
  if (newUrl === "") newUrl = "/";
  
  return newUrl;
}

/**
 * Rewrite tất cả URL /static/xxx trong HTML thành URL asset đầy đủ.
 *
 * Quy tắc chuyển đổi:
 *   /static/filename.ext
 *     → /asset-v1:{courseRun}+type@asset+block@filename.ext
 *
 * @param html - Raw HTML từ course block data
 * @param courseId - Course ID dạng "course-v1:Org+Course+Run"
 * @returns HTML đã rewrite URL
 */
export function rewriteStaticUrls(html: string, courseId: string): string {
  if (!html || !courseId) return html;

  const courseRun = extractCourseRun(courseId);
  const assetBase = `/asset-v1:${courseRun}+type@asset+block@`;

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
  
  // Strip thêm hardcode IP
  updatedHtml = updatedHtml.replace(/(['"(\s])https?:\/\/192\.168\.0\.226\.nip\.io/g, '$1');

  // 2. Pattern: match /static/filename trong attribute values
  updatedHtml = updatedHtml.replace(
    /(['"(\s])\/static\/([^'")\s?#]+)/g,
    (_, prefix: string, filename: string) => {
      return `${prefix}${assetBase}${filename}`;
    }
  );

  // 3. Pattern: match raw Supabase storage paths (VD: UUID/courses/...)
  // Chuyển thành URL đi qua Backend Proxy: {apiBaseUrl}/api/storage/{path}
  const storageRegex = /(['"(\s])([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\/(courses|library|avatars|branding)\/[^'")\s]+)/gi;
  updatedHtml = updatedHtml.replace(storageRegex, (_, prefix, path) => {
    const baseUrl = config.apiBaseUrl ? config.apiBaseUrl.replace(/\/$/, '') : '';
    return `${prefix}${baseUrl}/api/storage/${path}`;
  });

  return updatedHtml;
}
