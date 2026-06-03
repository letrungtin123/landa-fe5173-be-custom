// ============================================================
// useProgress Hook — Theo dõi tiến độ học tập
// Adapted for Custom Backend
// ============================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { markBlockComplete, markBlocksComplete, getMyCourseProgress } from "@/api/progress";
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
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const { data: averagePercent, isLoading, error } = useQuery({
    queryKey: ["average-course-completion", courseIds.join(',')],
    queryFn: async () => {
      if (!courseIds || courseIds.length === 0) return 0;
      const progressPromises = courseIds.map((id) => getMyCourseProgress(id));
      const progressList = await Promise.all(progressPromises);
      const total = progressList.reduce((acc, curr) => acc + curr, 0);
      return total / courseIds.length;
    },
    enabled: isAuthenticated && courseIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  return {
    data: averagePercent || 0,
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
      const results = await Promise.all(
        courseIds.map(async (id) => {
          const p = await getMyCourseProgress(id);
          return [id, p] as [string, number];
        })
      );
      return new Map(results);
    },
    enabled: isAuthenticated && courseIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}
