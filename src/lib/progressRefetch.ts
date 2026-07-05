import type { QueryClient } from "@tanstack/react-query";

const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function refetchProgressWithRetry(
  qc: QueryClient,
  courseId?: string,
): () => void {
  const timerKey = courseId || "__all__";
  const existingTimer = pendingTimers.get(timerKey);
  if (existingTimer) {
    clearTimeout(existingTimer);
    pendingTimers.delete(timerKey);
  }

  const timer = setTimeout(() => {
    pendingTimers.delete(timerKey);

    if (courseId) {
      qc.invalidateQueries({ queryKey: ["course-blocks", courseId] });
      qc.invalidateQueries({ queryKey: ["course-completion-fast", courseId] });
      qc.invalidateQueries({ queryKey: ["course-assignments", courseId] });
      qc.invalidateQueries({ queryKey: ["badge-blocks", courseId] });
    }

    qc.invalidateQueries({ queryKey: ["batch-course-progress"] });
    qc.invalidateQueries({ queryKey: ["course-completion-fast"] });
    qc.invalidateQueries({ queryKey: ["enrollments"] });
    qc.invalidateQueries({ queryKey: ["assignment"] });
    qc.invalidateQueries({ queryKey: ["badge-progress-batch"] });
  }, 250);

  pendingTimers.set(timerKey, timer);

  return () => {
    const activeTimer = pendingTimers.get(timerKey);
    if (activeTimer) {
      clearTimeout(activeTimer);
      pendingTimers.delete(timerKey);
    }
  };
}
