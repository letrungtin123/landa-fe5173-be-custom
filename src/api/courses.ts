// ============================================================
// Courses & Enrollment API
// ============================================================

import { apiClient } from "./client";
import type {
  CourseListResponse,
  CourseInfo,
  BlocksResponse,
  EnrollmentItem,
} from "./types";

/**
 * Get paginated list of all available courses.
 */
export async function getCourses(params?: {
  search_term?: string;
  page?: number;
  page_size?: number;
  org?: string;
}): Promise<CourseListResponse> {
  const { data } = await apiClient.get<CourseListResponse>(
    "/api/courses/v1/courses/",
    { params }
  );
  return data;
}

/**
 * Get details for a single course.
 */
export async function getCourse(courseId: string): Promise<CourseInfo> {
  const { data } = await apiClient.get<CourseInfo>(
    `/api/courses/v1/courses/${courseId}/`
  );
  return data;
}

/**
 * Lấy cấu trúc blocks đầy đủ của khóa học (sections → subsections → units → components).
 * API chính để xây sidebar / navigation.
 * - `student_view_data`: param riêng, chỉ định block type nào trả thêm data phát video
 * - `requested_fields`: chứa `student_view_data` để include field đó trong response
 */
export async function getCourseBlocks(
  courseId: string,
  username?: string
): Promise<BlocksResponse> {
  const { data } = await apiClient.get<BlocksResponse>(
    "/api/courses/v1/blocks/",
    {
      params: {
        course_id: courseId,
        depth: "all",
        nav_depth: 3,
        // username is REQUIRED for completion field to return per-user data
        ...(username ? { username } : {}),
        requested_fields:
          "children,display_name,type,graded,completion,student_view_url,student_view_data",
        student_view_data: "video,html",
      },
    }
  );
  return data;
}

/**
 * Get the currently authenticated user's enrollments.
 */
export async function getMyEnrollments(): Promise<EnrollmentItem[]> {
  const { data } = await apiClient.get<EnrollmentItem[]>(
    "/api/enrollment/v1/enrollment"
  );
  return data;
}

/**
 * Enroll the current user in a course.
 */
export async function enrollCourse(courseId: string): Promise<unknown> {
  const { data } = await apiClient.post("/api/enrollment/v1/enrollment", {
    course_details: { course_id: courseId },
  });
  return data;
}

/**
 * Lấy danh sách mentors (giảng viên/staff) cho khoá học
 */
export async function getCourseMentors(courseId: string) {
  const { data } = await apiClient.get<
    {
      mentors: {
        id: number;
        username: string;
        email: string;
        full_name: string;
        profile_image_url: string | null;
        role: string;
      }[];
    }
  >(`/api/courses/v1/courses/${encodeURIComponent(courseId)}/mentors/`);
  return data.mentors;
}
