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
import type { CourseGradeResponse } from "./types";

/**
 * Mark một block hoàn thành.
 * Dùng cho single block (backward compat).
 */
export async function markBlockComplete(
  username: string,
  courseId: string,
  usageKey: string
): Promise<unknown> {
  const { data } = await apiClient.post(
    "/api/completion/v1/completion-batch",
    {
      username,
      course_key: courseId,
      blocks: {
        [usageKey]: 1.0,
      },
    }
  );
  return data;
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

  const { data } = await apiClient.post(
    "/api/completion/v1/completion-batch",
    {
      username,
      course_key: courseId,
      blocks: blocksMap,
    }
  );
  return data;
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
