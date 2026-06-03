// ============================================================
// progressRefetch — Invalidate progress data sau khi mark complete
//
// Chỉ invalidate queries liên quan đến course HIỆN TẠI.
// KHÔNG dùng broad invalidation (["course-blocks"]) vì sẽ trigger
// refetch cho TẤT CẢ courses → 429 Too Many Requests.
//
// Debounce 500ms — nếu gọi nhiều lần trong 500ms chỉ chạy 1 lần.
// KHÔNG retry — invalidate 1 lần là đủ, React Query tự handle stale.
// ============================================================

import type { QueryClient } from "@tanstack/react-query";

// Debounce tracker — tránh gọi nhiều lần liên tiếp
let pendingTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Invalidate progress queries cho 1 course cụ thể.
 * Debounce 500ms — nếu gọi nhiều lần trong 500ms chỉ chạy 1 lần.
 *
 * @param qc QueryClient instance
 * @param courseId Course ID cụ thể (BẮT BUỘC)
 */
export function refetchProgressWithRetry(
  qc: QueryClient,
  courseId?: string,
): () => void {
  // Cleanup pending timer từ lần gọi trước
  if (pendingTimer) {
    clearTimeout(pendingTimer);
    pendingTimer = null;
  }

  // Debounce 500ms
  pendingTimer = setTimeout(() => {
    // 1. Invalidate course-blocks CHỈ cho course hiện tại
    if (courseId) {
      qc.invalidateQueries({ queryKey: ["course-blocks", courseId] });
    }

    // 2. Invalidate progress/completion (nhẹ, ít data)
    qc.invalidateQueries({ queryKey: ["course-completion-fast"] });
    qc.invalidateQueries({ queryKey: ["enrollments"] });

    // 3. Invalidate badge data cho course hiện tại (nếu có)
    if (courseId) {
      qc.invalidateQueries({ queryKey: ["badge-blocks", courseId] });
    }
  }, 500);

  // Return cleanup function
  return () => {
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      pendingTimer = null;
    }
  };
}
