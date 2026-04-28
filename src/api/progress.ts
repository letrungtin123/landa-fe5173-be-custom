// ============================================================
// Progress & Completion API
//
// Open edX completion tracking:
// - Completion chỉ áp dụng cho LEAF blocks (html, video, problem)
// - Sequential/Chapter KHÔNG có completion riêng
// - Phải mark completion cho từng leaf block riêng
// - POST /api/completion/v1/completion-batch hỗ trợ batch update
// ============================================================

import { apiClient } from "./client";
import { enrollCourse } from "./courses";
import type { CourseGradeResponse } from "./types";

/**
 * Gọi completion-batch API.
 * Nếu 400 (user chưa enrolled) → tự enroll rồi retry 1 lần.
 *
 * Cần thiết vì staff user xem blocks không cần enrolled,
 * nhưng completion API bắt buộc phải enrolled.
 */
async function postCompletionWithAutoEnroll(
  courseId: string,
  payload: Record<string, unknown>
): Promise<unknown> {
  try {
    const { data } = await apiClient.post(
      "/api/completion/v1/completion-batch",
      payload
    );
    return data;
  } catch (err: any) {
    if (err?.response?.status === 400) {
      // Thử enroll rồi retry
      try {
        await enrollCourse(courseId);
        console.log("[AutoEnroll] Enrolled before completion:", courseId);
      } catch {
        // Enroll fail → throw lỗi gốc
      }
      const { data } = await apiClient.post(
        "/api/completion/v1/completion-batch",
        payload
      );
      return data;
    }
    throw err;
  }
}

/**
 * Mark một block hoàn thành.
 * Dùng cho single block (backward compat).
 */
export async function markBlockComplete(
  username: string,
  courseId: string,
  usageKey: string
): Promise<unknown> {
  return postCompletionWithAutoEnroll(courseId, {
    username,
    course_key: courseId,
    blocks: {
      [usageKey]: 1.0,
    },
  });
}

/**
 * Mark nhiều blocks hoàn thành cùng lúc (batch).
 *
 * Dùng khi user click "Hoàn thành" cho lesson (sequential) chỉ có text/video:
 * - Lấy tất cả leaf block IDs (html, video) trong lesson
 * - Gửi 1 batch request thay vì N requests
 *
 * Problem blocks KHÔNG cần gọi hàm này — chúng tự mark completion
 * khi user submit đáp án đúng qua xmodule_handler.
 */
export async function markBlocksComplete(
  username: string,
  courseId: string,
  blockIds: string[]
): Promise<unknown> {
  if (blockIds.length === 0) return null;

  const blocksMap: Record<string, number> = {};
  for (const id of blockIds) {
    blocksMap[id] = 1.0;
  }

  return postCompletionWithAutoEnroll(courseId, {
    username,
    course_key: courseId,
    blocks: blocksMap,
  });
}

/**
 * Get grade info for a user in a course.
 */
export async function getCourseGrade(
  courseId: string,
  username: string
): Promise<CourseGradeResponse> {
  const { data } = await apiClient.get<CourseGradeResponse>(
    `/api/grades/v1/courses/${encodeURIComponent(courseId)}/`,
    { params: { username } }
  );
  return data;
}
