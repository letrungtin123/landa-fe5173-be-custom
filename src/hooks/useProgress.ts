// ============================================================
// useProgress Hook — Theo dõi tiến độ học tập
// ============================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { markBlockComplete, markBlocksComplete, getCourseGrade } from "@/api/progress";
import { useAuthStore } from "@/stores/useAuthStore";
import { useCourseStructure } from "./useCourses";

/**
 * Lấy phần trăm hoàn thành tổng thể cho một khóa học.
 * Trả về số từ 0 → 100.
 */
export function useCourseCompletion(courseId?: string) {
  const { data: course, isLoading, error } = useCourseStructure(courseId || "");

  const completionPercent = useMemo(() => {
    if (!course || !course.modules || course.modules.length === 0) {
      return 0;
    }
    const sum = course.modules.reduce((acc, m) => {
      const p = parseInt(m.progress || "0", 10);
      return acc + (isNaN(p) ? 0 : p);
    }, 0);
    return Math.round(sum / course.modules.length);
  }, [course]);

  return {
    completionPercent,
    isLoading,
    error,
  };
}

/**
 * Mutation đánh dấu một block/subsection đã hoàn thành.
 */
export function useMarkComplete() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: ({ courseId, usageKey }: { courseId: string; usageKey: string }) => 
      markBlockComplete(user?.username || "", courseId, usageKey),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["course-completion"] });
      qc.invalidateQueries({ queryKey: ["course-blocks"] });
      qc.invalidateQueries({ queryKey: ["enrollments"] });
    },
  });
}

/**
 * Mutation đánh dấu NHIỀU leaf blocks hoàn thành (batch).
 *
 * Dùng khi user click "Hoàn thành" cho lesson chỉ có text/video.
 * Sẽ mark tất cả html/video blocks trong lesson.
 */
export function useMarkBlocksComplete() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: ({ courseId, blockIds }: { courseId: string; blockIds: string[] }) =>
      markBlocksComplete(user?.username || "", courseId, blockIds),
    onSuccess: () => {
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
    staleTime: 5 * 60 * 1000,
  });
}
