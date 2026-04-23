// ============================================================
// Progress & Completion API
// ============================================================

import { apiClient } from "./client";
import type { CourseCompletionResponse, CourseGradeResponse } from "./types";

/**
 * Get overall completion for a course (0.0 → 1.0).
 */
export async function getCourseCompletion(
  courseId: string
): Promise<CourseCompletionResponse> {
  const { data } = await apiClient.get<CourseCompletionResponse>(
    `/api/completion/v1/course-completion/${encodeURIComponent(courseId)}/`
  );
  return data;
}

/**
 * Mark a block/subsection as completed.
 */
export async function markBlockComplete(usageKey: string): Promise<unknown> {
  const { data } = await apiClient.post(
    "/api/completion/v1/subsection-completion/",
    {
      usage_key: usageKey,
      completion: 1.0,
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
