import { apiClient } from "./client";

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

// Gọi API thật theo yêu cầu của user, KHÔNG mock data.
// Nếu backend chưa có endpoint này, request sẽ trả về 404 cho đến khi được implement.

export async function getLibraryCategories(): Promise<LibraryCategoriesResponse> {
  const { data } = await apiClient.get("/api/v1/library/categories");
  return data;
}

export async function getLibraryDocuments(
  params?: { search?: string; type?: string }
): Promise<LibraryDocumentsResponse> {
  const { data } = await apiClient.get("/api/v1/library/documents", { params });
  return data;
}
