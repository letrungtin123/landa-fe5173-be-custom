// ============================================================
// Static URL Rewriter — Chuyển đổi URL ảnh từ Open edX HTML
//
// Open edX lưu ảnh trong HTML block dạng: /static/image.png
// Khi render qua student_view, framework sẽ rewrite thành
// /asset-v1:Org+Course+Run+type@asset+block@image.png
//
// Tuy nhiên, student_view_data() trả raw HTML chưa qua
// rewrite, nên FE phải tự xử lý.
//
// Hàm này chuyển /static/xxx thành URL asset đầy đủ trên LMS.
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
 * Chuyển đổi các URL tuyệt đối (absolute URL) của LMS thành URL tương đối (relative path).
 * Dùng cho các URL đơn như videoUrl, studentViewUrl...
 * - Bỏ config.lmsBaseUrl
 * - Bỏ http://192.168.0.226.nip.io
 */
export function sanitizeUrlToRelative(url: string | null): string | null {
  if (!url) return url;
  
  let newUrl = url;
  
  // Bỏ LMS base URL
  if (newUrl.startsWith(config.lmsBaseUrl)) {
    newUrl = newUrl.substring(config.lmsBaseUrl.length);
  }
  
  // Bỏ cứng domain IP (nếu có hardcode trong DB Open edX)
  newUrl = newUrl.replace(/^https?:\/\/192\.168\.0\.226\.nip\.io/, "");
  
  // Nếu url sau khi bỏ trở thành rỗng (rất hiếm, nhưng đề phòng), ta có thể gán nó thành '/'
  if (newUrl === "") newUrl = "/";
  
  return newUrl;
}

/**
 * Rewrite tất cả URL /static/xxx trong HTML thành URL asset đầy đủ
 * trên LMS server.
 *
 * Quy tắc chuyển đổi:
 *   /static/filename.ext
 *     → /asset-v1:{courseRun}+type@asset+block@filename.ext
 *
 * Hoạt động cho cả development (Vite proxy) và production (same-domain).
 *
 * @param html - Raw HTML từ student_view_data
 * @param courseId - Course ID dạng "course-v1:Org+Course+Run"
 * @returns HTML đã rewrite URL
 */
export function rewriteStaticUrls(html: string, courseId: string): string {
  if (!html || !courseId) return html;

  const courseRun = extractCourseRun(courseId);

  // Asset URL luôn dùng relative path — Kong Gateway route /asset-v1 về LMS
  const assetBase = `/asset-v1:${courseRun}+type@asset+block@`;

  let updatedHtml = html;

  // 1. Strip absolute LMS URLs (chuyển các URL từ absolute -> relative)
  const lmsBaseUrlEscaped = config.lmsBaseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const lmsRegex = new RegExp(`(['"\\(])${lmsBaseUrlEscaped}`, 'g');
  updatedHtml = updatedHtml.replace(lmsRegex, '$1');
  
  // Strip thêm hardcode IP (192.168.0.226.nip.io)
  updatedHtml = updatedHtml.replace(/(['"\(\s])https?:\/\/192\.168\.0\.226\.nip\.io/g, '$1');

  // 2. Pattern: match /static/filename trong attribute values (src, href, url())
  // Bắt cả dạng có/không quote, encoded/unencoded
  // Ví dụ:
  //   src="/static/image.png"
  //   src='/static/image.png'
  //   url(/static/bg.jpg)
  updatedHtml = updatedHtml.replace(
    /(['"\(\s])\/static\/([^'"\)\s?#]+)/g,
    (_, prefix: string, filename: string) => {
      return `${prefix}${assetBase}${filename}`;
    }
  );

  return updatedHtml;
}
