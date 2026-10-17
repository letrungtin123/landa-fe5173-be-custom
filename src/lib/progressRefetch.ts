import type { QueryClient } from "@tanstack/react-query";
import { markBlocksComplete } from "@/api/progress";
import type { BlocksResponse, EnrollmentItem } from "@/api/types";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  chunkIds,
  completionMilestones,
  mergeRefreshScopes,
  pendingCompletionIds,
  refreshAfterCompletion,
  STRUCTURAL_BLOCK_TYPES,
  withCompletedBlocks,
  type CompleteBlocksResult,
  type RefreshScope,
} from "@/lib/completionSync.logic";

// ── Debounced, targeted refresh ──
// A burst of completions (quick "next" clicks, a quiz answered right after a
// unit opened) is fetched again once, and only what a completion can change.

const REFRESH_DEBOUNCE_MS = 500;
const REFRESH_MAX_WAIT_MS = 2_000;

type PendingRefresh = { scope: RefreshScope; timer: ReturnType<typeof setTimeout>; firstAt: number };
const pendingRefreshes = new Map<string, PendingRefresh>();

function flushRefresh(qc: QueryClient, courseId: string) {
  const pending = pendingRefreshes.get(courseId);
  if (!pending) return;
  pendingRefreshes.delete(courseId);
  const { scope } = pending;
  if (scope.courseBlocks) void qc.invalidateQueries({ queryKey: ["course-blocks", courseId] });
  if (scope.courseProgress) void qc.invalidateQueries({ queryKey: ["course-completion-fast", courseId] });
  if (scope.courseList) {
    void qc.invalidateQueries({ queryKey: ["batch-course-progress"] });
    void qc.invalidateQueries({ queryKey: ["enrollments"] });
  }
  if (scope.assignments) {
    void qc.invalidateQueries({ queryKey: ["course-assignments", courseId] });
    void qc.invalidateQueries({ queryKey: ["assignment"] });
  }
  if (scope.badges) void qc.invalidateQueries({ queryKey: ["badge-overview"] });
}

/** Fetches again what `scope` names for this course, once per burst. */
export function scheduleProgressRefresh(qc: QueryClient, courseId: string, scope: RefreshScope): void {
  if (!courseId || !Object.values(scope).some(Boolean)) return;
  const now = Date.now();
  const pending = pendingRefreshes.get(courseId);
  if (pending) clearTimeout(pending.timer);
  const firstAt = pending?.firstAt ?? now;
  const delay = Math.max(0, Math.min(REFRESH_DEBOUNCE_MS, firstAt + REFRESH_MAX_WAIT_MS - now));
  pendingRefreshes.set(courseId, {
    scope: mergeRefreshScopes(pending?.scope ?? {}, scope),
    firstAt,
    timer: setTimeout(() => flushRefresh(qc, courseId), delay),
  });
}

/**
 * After an assignment submission: its progress counts for the course and may
 * complete it.
 */
export function refreshAfterAssignmentSubmit(qc: QueryClient, courseId: string): void {
  scheduleProgressRefresh(qc, courseId, { courseProgress: true, courseList: true, badges: true, assignments: true });
}

// ── Completion ──

function setCourseProgress(qc: QueryClient, courseId: string, progress: number, isCompleted: boolean | null) {
  qc.setQueriesData<number>({ queryKey: ["course-completion-fast", courseId] }, () => progress);
  qc.setQueriesData<Map<string, number>>({ queryKey: ["batch-course-progress"] }, (current) => {
    if (!(current instanceof Map) || !current.has(courseId)) return current;
    const next = new Map(current);
    next.set(courseId, progress);
    return next;
  });
  qc.setQueriesData<EnrollmentItem[]>({ queryKey: ["enrollments"] }, (current) => {
    if (!Array.isArray(current) || !current.some((item) => item.course_id === courseId)) return current;
    return current.map((item) => (item.course_id === courseId
      ? { ...item, progress, ...(isCompleted === null ? {} : { is_completed: isCompleted }) }
      : item));
  });
}

/**
 * Marks blocks complete and updates what the learner sees right away:
 * blocks the cached course tree already shows as completed are not sent; the
 * tree (checkmarks, "next") and the progress bar are updated from the
 * server's answer; the course list and badges are fetched again only when a
 * chapter or the course was just completed.
 */
export async function completeBlocksAndSync(qc: QueryClient, courseId: string, blockIds: readonly string[]): Promise<void> {
  if (!courseId) return;
  const sessionMode = useAuthStore.getState().sessionMode;
  const treeKey = ["course-blocks", courseId, sessionMode] as const;
  const before = qc.getQueryData<BlocksResponse>(treeKey);
  const pending = pendingCompletionIds(before, blockIds);
  if (pending.length === 0) return;

  const results: CompleteBlocksResult[] = [];
  for (const chunk of chunkIds(pending)) {
    const result = await markBlocksComplete(courseId, chunk);
    if (result) results.push(result);
  }

  const after = before ? withCompletedBlocks(before, pending) : undefined;
  if (before && after && after !== before) qc.setQueryData<BlocksResponse>(treeKey, after);

  const sentKnownLeaves = before
    ? pending.filter((id) => before.blocks[id] && !STRUCTURAL_BLOCK_TYPES.has(before.blocks[id].type)).length
    : pending.length;
  const { scope, progress, courseCompleted } = refreshAfterCompletion({
    sentKnownLeaves,
    results,
    milestones: before && after ? completionMilestones(before, after) : null,
  });
  if (progress !== null) setCourseProgress(qc, courseId, progress, courseCompleted);
  // Without a cached tree there is nothing to patch: fetch it.
  scheduleProgressRefresh(qc, courseId, before ? scope : { ...scope, courseBlocks: true });
}
