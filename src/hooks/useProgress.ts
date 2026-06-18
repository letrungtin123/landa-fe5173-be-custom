// ============================================================
// useProgress Hook — Theo dõi tiến độ học tập
// Adapted for Custom Backend
// ============================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { markBlockComplete, markBlocksComplete, getMyCourseProgress, getBatchCourseProgress } from "@/api/progress";
import { refetchProgressWithRetry } from "@/lib/progressRefetch";
import { useAuthStore } from "@/stores/useAuthStore";

/**
 * Lấy phần trăm hoàn thành tổng thể cho một khóa học.
 * Trả về số từ 0 → 100.
 */
export function useCourseCompletion(courseId?: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const { data: completionPercent, isLoading, error } = useQuery({
    queryKey: ["course-completion-fast", courseId],
    queryFn: () => getMyCourseProgress(courseId!),
    enabled: isAuthenticated && !!courseId,
    staleTime: 5 * 60 * 1000,
  });

  return {
    completionPercent: completionPercent || 0,
    isLoading,
    error,
  };
}

/**
 * Lấy phần trăm hoàn thành trung bình cho nhiều khóa học.
 */
export function useAverageCourseCompletion(courseIds: string[]) {
  // Reuse batch query — không tạo thêm API calls
  const { data: progressMap, isLoading, error } = useBatchCourseProgress(courseIds);

  const averagePercent = progressMap && courseIds.length > 0
    ? Array.from(progressMap.values()).reduce((a, b) => a + b, 0) / courseIds.length
    : 0;

  return {
    data: averagePercent,
    isLoading,
    error,
  };
}

/**
 * Mutation đánh dấu một block đã hoàn thành.
 */
export function useMarkComplete() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ courseId, usageKey }: { courseId: string; usageKey: string }) =>
      markBlockComplete(courseId, usageKey),
    onSuccess: (_data, variables) => {
      refetchProgressWithRetry(qc, variables.courseId);
    },
  });
}

/**
 * Mutation đánh dấu NHIỀU blocks hoàn thành (batch).
 */
export function useMarkBlocksComplete() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ courseId, blockIds }: { courseId: string; blockIds: string[] }) =>
      markBlocksComplete(courseId, blockIds),
    onSuccess: (_data, variables) => {
      refetchProgressWithRetry(qc, variables.courseId);
    },
  });
}

/**
 * Lấy tiến độ cho nhiều khóa học cùng lúc.
 */
export function useBatchCourseProgress(courseIds: string[]) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const stableKey = courseIds.sort().join(',');

  return useQuery({
    queryKey: ["batch-course-progress", stableKey],
    queryFn: async (): Promise<Map<string, number>> => {
      if (!courseIds || courseIds.length === 0) return new Map();
      // 1 API call cho tất cả courses (thay vì N calls tuần tự)
      const batchResult = await getBatchCourseProgress(courseIds);
      const map = new Map<string, number>();
      for (const id of courseIds) {
        map.set(id, batchResult[id]?.progress ?? 0);
      }
      return map;
    },
    enabled: isAuthenticated && courseIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}
