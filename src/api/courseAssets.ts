// ============================================================
// courseAssets.ts — LMS Mobile Handouts API
//
// Dùng Mobile API (không phải CMS API) vì:
//   - CMS Assets API: yêu cầu course_author_access → 403 user thường
//   - Mobile Handouts API: chỉ cần enrolled → 200 OK user thường
//
// Endpoint: GET /api/mobile/v0.5/course_info/{courseId}/handouts
// Auth: Bearer JWT, user phải enrolled trong course
// ============================================================

import { apiClient } from "./client";
import { config } from "@/config/env";

// ── Types ──

export interface CourseHandoutsResponse {
  handouts_html: string | null;
}

export interface ParsedDocument {
  title: string;
  url: string;       // relative: /asset-v1:... hoặc /static/...
  fullUrl: string;   // absolute: http://...
  extension: string; // "pdf", "docx", "pptx", "xlsx", "doc"...
  fileName: string;  // tên file thuần: "Slide_Tuan_01.pdf"
}

// ── API Call ──

/**
 * Fetch handouts HTML từ LMS Mobile API.
 * Accessible bởi user thường đã enrolled (không cần course_author_access).
 */
export async function getCourseHandoutsHtml(
  courseId: string
): Promise<CourseHandoutsResponse> {
  const encodedId = encodeURIComponent(courseId);
  const { data } = await apiClient.get<CourseHandoutsResponse>(
    `/api/mobile/v0.5/course_info/${encodedId}/handouts`
  );
  return data;
}

// ── HTML Parser ──

const DOCUMENT_EXTENSIONS = new Set([
  "pdf", "doc", "docx", "ppt", "pptx",
  "xls", "xlsx", "csv", "txt", "zip"
]);

/**
 * Parse handouts_html để extract danh sách file download.
 *
 * Open edX rewrites /static/filename.pdf → /asset-v1:... tự động
 * khi render (apply_wrappers_to_content). FE chỉ cần extract href từ <a> tags.
 *
 * Ưu tiên filter:
 * 1. href chứa /asset-v1: → file từ course Assets
 * 2. href chứa /static/  → portable URL của asset
 * 3. href là external URL kết thúc bằng extension document
 */
export function parseHandoutsToDocuments(
  html: string,
  lmsBaseUrl: string = ""
): ParsedDocument[] {
  if (!html || html.trim() === "") return [];

  // Dùng DOMParser để parse HTML an toàn (chạy trong browser context)
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const anchors = Array.from(doc.querySelectorAll("a[href]"));

  const docs: ParsedDocument[] = [];

  for (const anchor of anchors) {
    const href = anchor.getAttribute("href") || "";
    const rawTitle = anchor.textContent?.trim() || "";

    // Bỏ qua anchor rỗng hoặc javascript:
    if (!href || href.startsWith("javascript:") || href === "#") continue;

    // Chỉ lấy file tài liệu (asset URLs hoặc links có extension hợp lệ)
    const isAssetUrl = href.includes("/asset-v1:") || href.includes("/static/");
    const ext = getExtension(href);
    const isDocumentLink = isAssetUrl || DOCUMENT_EXTENSIONS.has(ext);

    if (!isDocumentLink) continue;

    // Build full URL
    const fullUrl = href.startsWith("http")
      ? href
      : `${lmsBaseUrl}${href}`;

    // Extract tên file từ href nếu title trống
    const fileName = extractFileName(href);
    const title = rawTitle || fileName;

    docs.push({
      title,
      url: href,
      fullUrl,
      extension: ext || "file",
      fileName,
    });
  }

  // Dedup theo URL
  const seen = new Set<string>();
  return docs.filter(d => {
    if (seen.has(d.url)) return false;
    seen.add(d.url);
    return true;
  });
}

// ── Helpers ──

function getExtension(url: string): string {
  // Lấy phần path, bỏ query string
  const path = url.split("?")[0].split("#")[0];
  const lastPart = path.split("/").pop() || "";
  const dotIdx = lastPart.lastIndexOf(".");
  if (dotIdx === -1) return "";
  return lastPart.slice(dotIdx + 1).toLowerCase();
}

function extractFileName(url: string): string {
  const path = url.split("?")[0].split("#")[0];
  const parts = path.split("/");
  let fileName = parts[parts.length - 1] || "document";

  // asset-v1 URL: ...+block@filename.pdf → lấy phần sau @
  if (url.includes("+block@")) {
    const blockPart = url.split("+block@").pop() || "";
    fileName = blockPart.split("?")[0].split("#")[0];
  }

  // Decode URI
  try {
    fileName = decodeURIComponent(fileName);
  } catch {
    // giữ nguyên nếu decode fail
  }

  return fileName;
}
