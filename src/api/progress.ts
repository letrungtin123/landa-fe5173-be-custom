// ============================================================
// Progress & Completion API — Custom Backend
//
// Block completion tracking:
// - POST /api/learner/complete-blocks (batch)
// - BE tự tính lại course progress %
// ============================================================

import { apiClient } from "./client";
import { enrollCourse } from "./courses";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  getDemoIframeCourseProgress,
  markDemoIframeBlocksComplete,
} from "@/stores/demoIframeLearningStore";
import type { ApiResponse, CourseProgress } from "./types";

function isDemoIframeSession(): boolean {
  return useAuthStore.getState().sessionMode === "demo_iframe";
}

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
  if (isDemoIframeSession()) {
    return markDemoIframeBlocksComplete(courseId, blockIds);
  }

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
  if (isDemoIframeSession()) {
    return getDemoIframeCourseProgress(courseId).progress;
  }
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
  if (isDemoIframeSession()) {
    return getDemoIframeCourseProgress(courseId);
  }
  const { data } = await apiClient.get<ApiResponse<CourseProgress>>(
    `/api/learner/progress/${encodeURIComponent(courseId)}`
  );
  return data.data;
}

/**
 * Lấy progress cho nhiều courses cùng lúc — 1 API call thay vì N calls tuần tự.
 */
export async function getBatchCourseProgress(
  courseIds: string[]
): Promise<Record<string, { progress: number; is_completed: boolean; completed_at: string | null }>> {
  if (courseIds.length === 0) return {};
  if (isDemoIframeSession()) {
    return Object.fromEntries(courseIds.map((courseId) => [courseId, getDemoIframeCourseProgress(courseId)]));
  }
  try {
    const { data } = await apiClient.get<ApiResponse<{
      progress: Record<string, { progress: number; is_completed: boolean; completed_at: string | null }>;
    }>>('/api/learner/progress-batch', {
      params: { courseIds: courseIds.join(',') },
    });
    return data.data.progress;
  } catch {
    return {};
  }
}
