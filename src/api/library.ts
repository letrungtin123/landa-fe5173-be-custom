// ============================================================
// library.ts — Kho tài liệu nội bộ (LANDA Library API v1)
//
// Gọi backend API:
//   GET /api/landa/v1/library/documents/?page=1&category=nhan-su&search=...
//   GET /api/landa/v1/library/categories/
//
// Không phụ thuộc course ảo — file lưu trong Django MEDIA_ROOT.
// Admin quản lý qua CMS Django Admin → /admin/landa_library/
// ============================================================

import { apiClient } from "@/api/client";

// ── Types ──

export interface DocumentCategory {
  id: number;
  name: string;
  slug: string;
  count: number;
}

export interface LibraryDocument {
  id: number;
  title: string;
  extension: string;
  file_size: number;
  category_name: string;
  category_slug: string;
  download_url: string;
  uploaded_by_name: string;
  created_at: string;
}

export interface LibraryCategoriesResponse {
  categories: DocumentCategory[];
  total: number;
}

export interface LibraryDocumentsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: LibraryDocument[];
}

export interface LibraryDocumentsParams {
  page?: number;
  page_size?: number;
  category?: string;
  extension?: string;
  search?: string;
  ordering?: string;
}

// ── API calls ──

export async function getLibraryDocuments(
  params?: LibraryDocumentsParams
): Promise<LibraryDocumentsResponse> {
  const { data } = await apiClient.get<LibraryDocumentsResponse>(
    "/api/landa/v1/library/documents/",
    { params }
  );
  return data;
}

export async function getLibraryCategories(): Promise<LibraryCategoriesResponse> {
  const { data } = await apiClient.get<LibraryCategoriesResponse>(
    "/api/landa/v1/library/categories/"
  );
  return data;
}
