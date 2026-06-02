// ============================================================
// Progress & Completion API — Custom Backend
//
// Block completion tracking:
// - POST /api/learner/complete-blocks (batch)
// - BE tự tính lại course progress %
// ============================================================

import { apiClient } from "./client";
import { enrollCourse } from "./courses";
import type { ApiResponse, CourseProgress } from "./types";

/**
 * Mark nhiều blocks hoàn thành cùng lúc (batch).
 * BE tự tính lại % progress sau khi mark.
 *
 * Nếu 400 (chưa enroll) → tự enroll rồi retry.
 */
export async function markBlocksComplete(
  courseId: string,
  blockIds: string[]
): Promise<unknown> {
  if (blockIds.length === 0) return null;

  try {
    const { data } = await apiClient.post<ApiResponse<{ marked: number }>>(
      "/api/learner/complete-blocks",
      { course_id: courseId, block_ids: blockIds }
    );
    return data.data;
  } catch (err: any) {
    if (err?.response?.status === 400) {
      // Chưa enroll → tự enroll rồi retry
      try {
        await enrollCourse(courseId);
      } catch { /* ignore */ }
      const { data } = await apiClient.post<ApiResponse<{ marked: number }>>(
        "/api/learner/complete-blocks",
        { course_id: courseId, block_ids: blockIds }
      );
      return data.data;
    }
    throw err;
  }
}

/**
 * Mark 1 block hoàn thành (wrapper cho markBlocksComplete).
 */
export async function markBlockComplete(
  courseId: string,
  blockId: string
): Promise<unknown> {
  return markBlocksComplete(courseId, [blockId]);
}

/**
 * Lấy progress chi tiết cho 1 khóa học.
 */
export async function getMyCourseProgress(courseId: string): Promise<number> {
  try {
    const { data } = await apiClient.get<ApiResponse<CourseProgress>>(
      `/api/learner/progress/${encodeURIComponent(courseId)}`
    );
    return Number(data.data?.progress) || 0;
  } catch {
    return 0;
  }
}

/**
 * Lấy progress đầy đủ (bao gồm is_completed, completed_at).
 */
export async function getCourseProgressDetail(courseId: string): Promise<CourseProgress> {
  const { data } = await apiClient.get<ApiResponse<CourseProgress>>(
    `/api/learner/progress/${encodeURIComponent(courseId)}`
  );
  return data.data;
}
