// ============================================================
// useLibrary — Hooks cho Kho Thư Viện Nội Bộ (API v1)
//
// Không cần enroll course ảo — gọi thẳng LANDA Library API.
// Hỗ trợ phân trang, filter category, search.
// ============================================================

import { useQuery } from "@tanstack/react-query";
import {
  getLibraryCategories,
  getLibraryDocuments,
} from "@/api/library";
import type { LibraryDocumentsParams } from "@/api/library";
import { useAuthStore } from "@/stores/useAuthStore";

export const libraryKeys = {
  all: ["library"] as const,
  categories: () => [...libraryKeys.all, "categories"] as const,
  documents: (params?: LibraryDocumentsParams) =>
    [...libraryKeys.all, "documents", params] as const,
};

// ── Categories Hook ──

export function useLibraryCategories() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery({
    queryKey: libraryKeys.categories(),
    queryFn: getLibraryCategories,
    enabled: isAuthenticated,
    staleTime: 10 * 60 * 1000,
    placeholderData: { categories: [], total: 0 },
  });
}

// ── Documents Hook (phân trang + filter + search) ──

export function useLibraryDocuments(params?: LibraryDocumentsParams) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery({
    queryKey: libraryKeys.documents(params),
    queryFn: () => getLibraryDocuments(params),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
    placeholderData: { count: 0, next: null, previous: null, results: [] },
  });
}
