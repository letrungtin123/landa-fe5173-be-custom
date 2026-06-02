// ============================================================
// Courses & Enrollment API — Custom Backend
// ============================================================

import { apiClient } from "./client";
import type {
  ApiResponse,
  CourseListResponse,
  CourseInfo,
  CourseBlocksResponse,
  EnrollmentItem,
} from "./types";

/**
 * Lấy danh sách khóa học learner được thấy.
 * - learner: chỉ courses assign qua team
 * - staff/superuser/superadmin: toàn bộ trong tenant
 */
export async function getCourses(params?: {
  search?: string;
  page?: number;
  page_size?: number;
}): Promise<CourseListResponse> {
  const { data } = await apiClient.get<ApiResponse<CourseListResponse>>(
    "/api/learner/courses",
    { params }
  );
  return data.data;
}

/**
 * Lấy chi tiết 1 khóa học.
 */
export async function getCourse(courseId: string): Promise<CourseInfo> {
  const { data } = await apiClient.get<ApiResponse<CourseInfo>>(
    `/api/learner/courses/${encodeURIComponent(courseId)}`
  );
  return data.data;
}

/**
 * Lấy cấu trúc blocks đầy đủ của khóa học.
 * Trả về flat list blocks kèm completion status.
 */
export async function getCourseBlocks(
  courseId: string,
): Promise<CourseBlocksResponse> {
  const { data } = await apiClient.get<ApiResponse<CourseBlocksResponse>>(
    `/api/learner/courses/${encodeURIComponent(courseId)}/blocks`
  );
  return data.data;
}

/**
 * Lấy enrollments hiện tại kèm progress.
 */
export async function getMyEnrollments(): Promise<EnrollmentItem[]> {
  const { data } = await apiClient.get<ApiResponse<EnrollmentItem[]>>(
    "/api/learner/enrollments"
  );
  return data.data;
}

/**
 * Ghi danh vào khóa học.
 */
export async function enrollCourse(courseId: string): Promise<{
  enrollment_id: string;
  already_enrolled: boolean;
}> {
  const { data } = await apiClient.post<ApiResponse<{
    enrollment_id: string;
    already_enrolled: boolean;
  }>>("/api/learner/enroll", { course_id: courseId });
  return data.data;
}
