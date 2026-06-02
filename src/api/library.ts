// ============================================================
// library.ts — Kho tài liệu nội bộ (LANDA Library)
//
// Gọi backend API:
//   GET /api/learner/library/documents?page=1&category=...&search=...
//   GET /api/learner/library/categories
//
// Team-scoped: learner chỉ thấy docs từ categories assign cho team mình.
// ============================================================

import { apiClient } from "@/api/client";

// ── Types ──

export interface DocumentCategory {
  id: string;
  name: string;
  slug: string;
  count: number;
}

export interface LibraryDocument {
  id: string;
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
  const { data } = await apiClient.get<{ success: boolean; data: LibraryDocumentsResponse }>(
    "/api/learner/library/documents",
    { params }
  );
  return data.data;
}

export async function getLibraryCategories(): Promise<LibraryCategoriesResponse> {
  const { data } = await apiClient.get<{ success: boolean; data: LibraryCategoriesResponse }>(
    "/api/learner/library/categories"
  );
  return data.data;
}

export async function downloadLibraryFileBlob(url: string): Promise<Blob> {
  // For Supabase Storage URLs, fetch directly (public bucket)
  if (url.includes('/storage/v1/object/public/')) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Download failed: ${response.status}`);
    return response.blob();
  }

  // For relative URLs, use apiClient with proxy
  let requestUrl = url;
  try {
    if (url.startsWith('http')) {
      const urlObj = new URL(url);
      requestUrl = urlObj.pathname + urlObj.search;
    }
  } catch {
    // Fallback
  }

  const { data } = await apiClient.get<Blob>(requestUrl, {
    responseType: 'blob',
    headers: { 'Content-Type': undefined as any },
    timeout: 300_000,
  });
  return data;
}

export async function handleSecureDownload(url: string, filename: string) {
  try {
    const blob = await downloadLibraryFileBlob(url);
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(blobUrl);
    document.body.removeChild(a);
  } catch (error: any) {
    console.error("Lỗi khi tải file:", error);
    alert(`Không thể tải file: ${error.message || 'Lỗi hệ thống'}`);
  }
}
