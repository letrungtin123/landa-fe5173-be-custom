import type { CourseBlock, CourseBlocksResponse, EnrollmentItem } from "@/api/types";

const STRUCTURAL_BLOCK_TYPES = new Set(["course", "chapter", "sequential", "vertical"]);

type CourseState = {
  leafIds: Set<string>;
  completedIds: Set<string>;
};

const courses = new Map<string, CourseState>();

function ensureCourse(courseId: string): CourseState {
  let state = courses.get(courseId);
  if (!state) {
    state = { leafIds: new Set(), completedIds: new Set() };
    courses.set(courseId, state);
  }
  return state;
}

function isLeaf(block: CourseBlock): boolean {
  return !STRUCTURAL_BLOCK_TYPES.has(block.block_type);
}

export function resetDemoIframeLearning(): void {
  courses.clear();
}

export function registerDemoIframeCourseBlocks(courseId: string, blocks: CourseBlock[]): void {
  const state = ensureCourse(courseId);
  state.leafIds = new Set(blocks.filter(isLeaf).map((block) => block.id));
  for (const completedId of Array.from(state.completedIds)) {
    if (!state.leafIds.has(completedId)) state.completedIds.delete(completedId);
  }
}

export function markDemoIframeBlocksComplete(courseId: string, blockIds: string[]): { marked: number } {
  const state = ensureCourse(courseId);
  let marked = 0;
  for (const blockId of blockIds) {
    if (state.completedIds.has(blockId)) continue;
    state.completedIds.add(blockId);
    marked += 1;
  }
  return { marked };
}

export function getDemoIframeCourseProgress(courseId: string) {
  const state = ensureCourse(courseId);
  const total = state.leafIds.size;
  const completed = total > 0
    ? Array.from(state.completedIds).filter((id) => state.leafIds.has(id)).length
    : state.completedIds.size;
  const progress = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;
  const isCompleted = total > 0 && completed >= total;
  return {
    progress,
    is_completed: isCompleted,
    completed_at: null,
    last_activity_at: null,
  };
}

export function overlayDemoIframeBlocks(courseId: string, response: CourseBlocksResponse): CourseBlocksResponse {
  registerDemoIframeCourseBlocks(courseId, response.blocks);
  const state = ensureCourse(courseId);
  return {
    ...response,
    blocks: response.blocks.map((block) => ({
      ...block,
      completed: state.completedIds.has(block.id),
    })),
  };
}

export function overlayDemoIframeEnrollments(enrollments: EnrollmentItem[]): EnrollmentItem[] {
  return enrollments.map((item) => {
    const progress = getDemoIframeCourseProgress(item.course_id);
    return {
      ...item,
      progress: progress.progress,
      is_completed: progress.is_completed,
      completed_at: progress.completed_at,
      last_activity_at: progress.last_activity_at,
    };
  });
}
