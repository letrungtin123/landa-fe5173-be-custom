import type { QueryClient } from "@tanstack/react-query";

type Timer = ReturnType<typeof setTimeout>;

const pendingTimers = new Map<string, Timer[]>();

function clearPendingTimers(timerKey: string) {
  const timers = pendingTimers.get(timerKey);
  if (!timers) return;
  for (const timer of timers) clearTimeout(timer);
  pendingTimers.delete(timerKey);
}

function removePendingTimer(timerKey: string, timer: Timer) {
  const timers = pendingTimers.get(timerKey);
  if (!timers) return;
  const nextTimers = timers.filter((item) => item !== timer);
  if (nextTimers.length > 0) pendingTimers.set(timerKey, nextTimers);
  else pendingTimers.delete(timerKey);
}

function scheduleTrackedTimer(
  timerKey: string,
  timers: Timer[],
  delayMs: number,
  callback: () => void,
) {
  const timer = setTimeout(() => {
    removePendingTimer(timerKey, timer);
    callback();
  }, delayMs);
  timers.push(timer);
}

function refreshBadgeOverview(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ["badge-overview"] });
  void qc.refetchQueries({ queryKey: ["badge-overview"], type: "active" });
}

export function refetchProgressWithRetry(
  qc: QueryClient,
  courseId?: string,
): () => void {
  const timerKey = courseId || "__all__";
  clearPendingTimers(timerKey);

  const invalidateProgress = () => {
    if (courseId) {
      qc.invalidateQueries({ queryKey: ["course-blocks", courseId] });
      qc.invalidateQueries({ queryKey: ["course-completion-fast", courseId] });
      qc.invalidateQueries({ queryKey: ["course-assignments", courseId] });
    }

    qc.invalidateQueries({ queryKey: ["batch-course-progress"] });
    qc.invalidateQueries({ queryKey: ["course-completion-fast"] });
    qc.invalidateQueries({ queryKey: ["enrollments"] });
    qc.invalidateQueries({ queryKey: ["assignment"] });
    refreshBadgeOverview(qc);
  };

  const timers: Timer[] = [];
  scheduleTrackedTimer(timerKey, timers, 250, invalidateProgress);
  scheduleTrackedTimer(timerKey, timers, 1_250, () => refreshBadgeOverview(qc));
  pendingTimers.set(timerKey, timers);

  return () => {
    clearPendingTimers(timerKey);
  };
}
