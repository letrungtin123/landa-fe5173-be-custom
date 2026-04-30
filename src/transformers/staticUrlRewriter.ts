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
 * Rewrite tất cả URL /static/xxx trong HTML thành URL asset đầy đủ
 * trên LMS server.
 *
 * Quy tắc chuyển đổi:
 *   /static/filename.ext
 *     → {LMS_BASE}/asset-v1:{courseRun}+type@asset+block@filename.ext
 *
 * Hoạt động cho cả development (Vite proxy) và production (absolute URL).
 *
 * @param html - Raw HTML từ student_view_data
 * @param courseId - Course ID dạng "course-v1:Org+Course+Run"
 * @returns HTML đã rewrite URL
 */
export function rewriteStaticUrls(html: string, courseId: string): string {
  if (!html || !courseId) return html;

  const courseRun = extractCourseRun(courseId);

  // Tạo base URL cho asset
  // Trong development: dùng relative path qua proxy
  // Trong production: dùng absolute LMS URL
  const assetBase = import.meta.env.DEV
    ? `/asset-v1:${courseRun}+type@asset+block@`
    : `${config.lmsBaseUrl}/asset-v1:${courseRun}+type@asset+block@`;

  // Pattern: match /static/filename trong attribute values (src, href, url())
  // Bắt cả dạng có/không quote, encoded/unencoded
  // Ví dụ:
  //   src="/static/image.png"
  //   src='/static/image.png'
  //   url(/static/bg.jpg)
  return html.replace(
    /(['"]|url\()\/static\/([^'")\s?#]+)/g,
    (_, prefix: string, filename: string) => {
      return `${prefix}${assetBase}${filename}`;
    }
  );
}
