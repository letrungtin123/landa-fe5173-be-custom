// ============================================================
// groupCourses.ts — Lấy courses được phân cho learner qua group membership
//
// Endpoint: GET /api/landa/v0/my-group-courses/
// Response: CourseListResponse (cùng format với /api/courses/v1/courses/)
// Auth: Bearer token qua apiClient
// ============================================================

import { apiClient } from "./client";
import type { CourseListResponse } from "./types";

/**
 * Lấy danh sách courses learner được phép thấy dựa trên group membership.
 *
 * Logic backend:
 * - Tìm các SubGroup user đang là member
 * - Lấy SubGroupCourseAssignment của các groups đó
 * - Trả về CourseOverview của từng course (distinct)
 *
 * Response format giống /api/courses/v1/courses/ để CoursesPage
 * không cần thay đổi logic render.
 */
export async function getMyGroupCourses(searchTerm?: string): Promise<CourseListResponse> {
  const { data } = await apiClient.get<CourseListResponse>(
    "/api/landa/v0/my-group-courses/",
    { params: { search_term: searchTerm || undefined } }
  );
  return data;
}
