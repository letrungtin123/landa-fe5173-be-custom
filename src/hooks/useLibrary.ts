// ============================================================
// useLibrary — Hooks cho Kho Thư Viện Nội Bộ
//
// Khi user vào /library, tự động enroll vào LIBRARY course
// rồi fetch handouts HTML làm danh sách tài liệu.
// ============================================================

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { getLibraryCategories, getLibraryDocuments } from "@/api/library";
import { enrollCourse } from "@/api/courses";
import { useAuthStore } from "@/stores/useAuthStore";

const LIBRARY_COURSE_ID =
  (import.meta.env.VITE_LIBRARY_COURSE_ID as string) ||
  "course-v1:LAndA2+LIBRARY+2026";

export const libraryKeys = {
  all: ["library"] as const,
  categories: () => [...libraryKeys.all, "categories"] as const,
  documents: (filters?: object) =>
    [...libraryKeys.all, "documents", filters] as const,
};

// ── Auto-enroll vào LIBRARY course ──

function useLibraryEnroll() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) return;
    enrollCourse(LIBRARY_COURSE_ID).catch(() => {
      // Lỗi thường là "already enrolled" → bỏ qua
    });
  }, [isAuthenticated]);
}

// ── Hooks ──

export function useLibraryCategories() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  useLibraryEnroll();

  return useQuery({
    queryKey: libraryKeys.categories(),
    queryFn: getLibraryCategories,
    enabled: isAuthenticated,
    staleTime: 10 * 60 * 1000,
    placeholderData: { categories: [] },
  });
}

export function useLibraryDocuments(search?: string, type?: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  useLibraryEnroll();

  return useQuery({
    queryKey: libraryKeys.documents({ search, type }),
    queryFn: () => getLibraryDocuments({ search, type }),
    enabled: isAuthenticated,
    staleTime: 10 * 60 * 1000,
    placeholderData: { documents: [], total: 0 },
  });
}
