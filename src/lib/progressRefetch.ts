// ============================================================
// progressRefetch — Retry refetch cho course-completion-fast
//
// Backend Open edX aggregate completion async (Celery task).
// Sau khi mark block complete, progress API có thể chưa cập nhật ngay.
// Helper này refetch nhiều lần với delay tăng dần để bắt kịp.
// ============================================================

import type { QueryClient } from "@tanstack/react-query";

/**
 * Invalidate ngay + retry refetch course-completion-fast với delay tăng dần.
 * Đảm bảo modal confirm/complete bắt được thay đổi progress real-time.
 *
 * @param qc QueryClient instance
 * @param retries Số lần retry (default 3)
 * @param delays Mảng delay ms cho mỗi lần retry (default [2000, 4000, 7000])
 */
export function refetchProgressWithRetry(
  qc: QueryClient,
  retries = 3,
  delays = [2000, 4000, 7000]
): () => void {
  // Invalidate ngay lập tức (lần 1)
  qc.invalidateQueries({ queryKey: ["course-completion-fast"] });
  qc.invalidateQueries({ queryKey: ["course-blocks"] });
  qc.invalidateQueries({ queryKey: ["enrollments"] });
  qc.invalidateQueries({ queryKey: ["average-course-completion"] });

  // Retry refetch với delay để bắt kịp backend aggregation
  const timers: ReturnType<typeof setTimeout>[] = [];

  for (let i = 0; i < retries && i < delays.length; i++) {
    const timer = setTimeout(() => {
      qc.refetchQueries({ queryKey: ["course-completion-fast"] });
      qc.refetchQueries({ queryKey: ["course-blocks"] });
    }, delays[i]);
    timers.push(timer);
  }

  // Return cleanup function
  return () => {
    for (const t of timers) {
      clearTimeout(t);
    }
  };
}
