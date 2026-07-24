// ============================================================
// Courses & Enrollment API — Custom Backend
// ============================================================

import { apiClient } from "./client";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  overlayDemoIframeBlocks,
  overlayDemoIframeEnrollments,
} from "@/stores/demoIframeLearningStore";
import type {
  ApiResponse,
  CourseListResponse,
  CourseInfo,
  CourseBlocksResponse,
  EnrollmentItem,
} from "./types";

function isDemoIframeSession(): boolean {
  return useAuthStore.getState().sessionMode === "demo_iframe";
}

/**
 * Lấy danh sách khóa học learner được thấy.
 * - learner: chỉ courses assign qua team
 * - staff/superuser/superadmin: toàn bộ trong tenant
 */
export async function getCourses(params?: {
  search?: string;
  category_id?: string;
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
  return isDemoIframeSession() ? overlayDemoIframeBlocks(courseId, data.data) : data.data;
}

/**
 * Lấy enrollments hiện tại kèm progress.
 */
export async function getMyEnrollments(): Promise<EnrollmentItem[]> {
  const { data } = await apiClient.get<ApiResponse<EnrollmentItem[]>>(
    "/api/learner/enrollments"
  );
  return isDemoIframeSession() ? overlayDemoIframeEnrollments(data.data) : data.data;
}

/**
 * Ghi danh vào khóa học.
 */
export async function enrollCourse(courseId: string): Promise<{
  enrollment_id: string;
  already_enrolled: boolean;
}> {
  if (isDemoIframeSession()) {
    return { enrollment_id: "", already_enrolled: true };
  }
  const { data } = await apiClient.post<ApiResponse<{
    enrollment_id: string;
    already_enrolled: boolean;
  }>>("/api/learner/enroll", { course_id: courseId });
  return data.data;
}
