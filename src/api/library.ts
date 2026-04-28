// ============================================================
// library.ts — Kho tài liệu nội bộ (Global Library)
//
// Dùng LMS Mobile Handouts API của course LIBRARY ảo:
//   course-v1:LAndA2+LIBRARY+2026
//
// Admin setup (1 lần):
//   1. Tạo course LAndA2+LIBRARY+2026 trên Studio
//   2. Files & Uploads: upload tài liệu → Unlock từng file
//   3. Course Info → Handouts: paste HTML links đến file
//
// User thường (enrolled) gọi được API này, không cần course_author_access.
// ============================================================

import { getCourseHandoutsHtml, parseHandoutsToDocuments } from "./courseAssets";
import { config } from "@/config/env";
import type { ParsedDocument } from "./courseAssets";

// ID của course ảo dùng làm kho tài liệu
const LIBRARY_COURSE_ID =
  (import.meta.env.VITE_LIBRARY_COURSE_ID as string) ||
  "course-v1:LAndA2+LIBRARY+2026";

// ── Shared types cho LibraryPage UI ──

export interface DocumentCategory {
  id: string;
  name: string;
  type: string;
  count: number;
}

export interface LibraryDocument {
  id: string;
  title: string;
  code: string;
  uploader_name: string;
  uploader_email: string;
  uploader_avatar: string;
  type: string;
  url: string;
  created_at: string;
}

export interface LibraryCategoriesResponse {
  categories: DocumentCategory[];
}

export interface LibraryDocumentsResponse {
  documents: LibraryDocument[];
  total: number;
}

// ── Extension → Category mapping ──

const EXT_CATEGORY: Record<string, { name: string; type: string }> = {
  pdf:  { name: "PDF Documents", type: "pdf" },
  doc:  { name: "Word Documents", type: "word" },
  docx: { name: "Word Documents", type: "word" },
  ppt:  { name: "Presentations", type: "ppt" },
  pptx: { name: "Presentations", type: "ppt" },
  xls:  { name: "Spreadsheets", type: "excel" },
  xlsx: { name: "Spreadsheets", type: "excel" },
  csv:  { name: "Spreadsheets", type: "excel" },
  txt:  { name: "Text Files", type: "text" },
};

// ── Converters ──

function mapToLibraryDocument(doc: ParsedDocument): LibraryDocument {
  return {
    id: doc.title + doc.url,
    title: doc.title,
    code: doc.extension.toUpperCase(),
    uploader_name: "L&A Academy",
    uploader_email: "academy@leassociates.vn",
    uploader_avatar: "",
    type: doc.extension,
    url: doc.fullUrl,
    created_at: "",
  };
}

function buildCategories(docs: ParsedDocument[]): DocumentCategory[] {
  const countMap: Record<string, { name: string; type: string; count: number }> = {};

  for (const doc of docs) {
    const cat = EXT_CATEGORY[doc.extension] || { name: "Other Files", type: "other" };
    if (!countMap[cat.type]) {
      countMap[cat.type] = { ...cat, count: 0 };
    }
    countMap[cat.type].count++;
  }

  return Object.entries(countMap).map(([id, val]) => ({ id, ...val }));
}

// ── Public API functions ──

export async function getLibraryDocuments(
  params?: { search?: string; type?: string }
): Promise<LibraryDocumentsResponse> {
  const { handouts_html } = await getCourseHandoutsHtml(LIBRARY_COURSE_ID);
  let docs = parseHandoutsToDocuments(handouts_html || "", config.lmsBaseUrl);

  if (params?.type) {
    const targetType = params.type.toLowerCase();
    docs = docs.filter((d) => {
      const cat = EXT_CATEGORY[d.extension];
      return cat?.type === targetType;
    });
  }

  if (params?.search) {
    const q = params.search.toLowerCase();
    docs = docs.filter((d) => d.title.toLowerCase().includes(q));
  }

  return {
    documents: docs.map(mapToLibraryDocument),
    total: docs.length,
  };
}

export async function getLibraryCategories(): Promise<LibraryCategoriesResponse> {
  const { handouts_html } = await getCourseHandoutsHtml(LIBRARY_COURSE_ID);
  const docs = parseHandoutsToDocuments(handouts_html || "", config.lmsBaseUrl);
  return { categories: buildCategories(docs) };
}
