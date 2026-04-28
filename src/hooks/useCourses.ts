// ============================================================
// useCourses Hook — Course list, enrollment, and structure
// ============================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCourses,
  getCourse,
  getCourseBlocks,
  getMyEnrollments,
  enrollCourse,
  getCourseMentors,
} from "@/api/courses";
import { transformBlocksToCourse } from "@/transformers/blockTransformer";
import { useAuthStore } from "@/stores/useAuthStore";

/**
 * Get paginated list of all available courses.
 */
export function useCourses(searchTerm?: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery({
    queryKey: ["courses", searchTerm],
    queryFn: () =>
      getCourses({
        search_term: searchTerm || undefined,
        page_size: 20,
      }),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get details for a specific course.
 */
export function useCourse(courseId: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery({
    queryKey: ["course", courseId],
    queryFn: () => getCourse(courseId),
    enabled: isAuthenticated && !!courseId,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Get the user's enrolled courses.
 */
export function useMyEnrollments() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery({
    queryKey: ["enrollments"],
    queryFn: getMyEnrollments,
    enabled: isAuthenticated,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Get the course block structure, transformed to the FE Course type.
 * This powers the CourseSidebar navigation.
 *
 * Auto-enroll: Nếu user chưa enrolled, tự enroll trước khi fetch blocks.
 * Giải quyết 403 cho user được tạo qua Admin mà chưa enroll thủ công.
 */
export function useCourseStructure(courseId: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const username = useAuthStore((s) => s.user?.username);
  const qc = useQueryClient();

  return useQuery({
    queryKey: ["course-blocks", courseId, username],
    queryFn: async () => {
      try {
        return await getCourseBlocks(courseId, username);
      } catch (err: any) {
        if (err?.response?.status === 403) {
          try {
            await enrollCourse(courseId);
            console.log("[AutoEnroll] Enrolled in", courseId);
            // Invalidate enrollment cache — bạn bè useBadges cần biết
            qc.invalidateQueries({ queryKey: ["enrollments"] });
          } catch {
            // Enroll fail → bỏ qua, throw lỗi gốc
          }
          return await getCourseBlocks(courseId, username);
        }
        throw err;
      }
    },
    enabled: isAuthenticated && !!courseId,
    staleTime: 2 * 60 * 1000,
    select: (data) => transformBlocksToCourse(data),
  });
}

/**
 * Get raw blocks data (not transformed) for lesson content resolution.
 * Cùng logic auto-enroll như useCourseStructure.
 */
export function useCourseBlocksRaw(courseId: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const username = useAuthStore((s) => s.user?.username);
  const qc = useQueryClient();

  return useQuery({
    queryKey: ["course-blocks", courseId, username],
    queryFn: async () => {
      try {
        return await getCourseBlocks(courseId, username);
      } catch (err: any) {
        if (err?.response?.status === 403) {
          try {
            await enrollCourse(courseId);
            qc.invalidateQueries({ queryKey: ["enrollments"] });
          } catch { /* ignore */ }
          return await getCourseBlocks(courseId, username);
        }
        throw err;
      }
    },
    enabled: isAuthenticated && !!courseId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Mutation to enroll the current user in a course.
 */
export function useEnrollCourse() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: enrollCourse,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["enrollments"] });
      qc.invalidateQueries({ queryKey: ["courses"] });
    },
  });
}

/**
 * Get the mentors for a specific course
 */
export function useCourseMentors(courseId: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery({
    queryKey: ["course-mentors", courseId],
    queryFn: () => getCourseMentors(courseId),
    enabled: isAuthenticated && !!courseId,
    staleTime: 60 * 60 * 1000, // 1 hour (mentors don't change often)
  });
}
