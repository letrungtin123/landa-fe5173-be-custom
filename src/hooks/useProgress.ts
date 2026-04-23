// ============================================================
// useProgress Hook — Theo dõi tiến độ học tập
// ============================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCourseCompletion,
  markBlockComplete,
  getCourseGrade,
} from "@/api/progress";
import { useAuthStore } from "@/stores/useAuthStore";

/**
 * Lấy phần trăm hoàn thành tổng thể cho một khóa học.
 * Trả về số từ 0 → 100.
 */
export function useCourseCompletion(courseId?: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const query = useQuery({
    queryKey: ["course-completion", courseId],
    queryFn: () => getCourseCompletion(courseId!),
    enabled: isAuthenticated && !!courseId,
    staleTime: 2 * 60 * 1000, // 2 phút
  });

  return {
    /** Phần trăm hoàn thành (0-100) */
    completionPercent: query.data
      ? Math.round(query.data.completion * 100)
      : 0,
    isLoading: query.isLoading,
    error: query.error,
  };
}

/**
 * Mutation đánh dấu một block/subsection đã hoàn thành.
 */
export function useMarkComplete() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (usageKey: string) => markBlockComplete(usageKey),
    onSuccess: () => {
      // Cập nhật lại tất cả dữ liệu tiến độ
      qc.invalidateQueries({ queryKey: ["course-completion"] });
      qc.invalidateQueries({ queryKey: ["course-blocks"] });
      qc.invalidateQueries({ queryKey: ["enrollments"] });
    },
  });
}

/**
 * Lấy điểm số của user cho một khóa học.
 */
export function useCourseGrade(courseId?: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const username = useAuthStore((s) => s.user?.username);

  return useQuery({
    queryKey: ["course-grade", courseId, username],
    queryFn: () => getCourseGrade(courseId!, username!),
    enabled: isAuthenticated && !!courseId && !!username,
    staleTime: 5 * 60 * 1000, // 5 phút
  });
}
