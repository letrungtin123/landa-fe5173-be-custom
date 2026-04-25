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
 */
export function useCourseStructure(courseId: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const username = useAuthStore((s) => s.user?.username);

  return useQuery({
    queryKey: ["course-blocks", courseId, username],
    queryFn: () => getCourseBlocks(courseId, username),
    enabled: isAuthenticated && !!courseId,
    staleTime: 2 * 60 * 1000, // 2 minutes — shorter for fresh completion data
    select: (data) => transformBlocksToCourse(data),
  });
}

/**
 * Get raw blocks data (not transformed) for lesson content resolution.
 */
export function useCourseBlocksRaw(courseId: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const username = useAuthStore((s) => s.user?.username);

  return useQuery({
    queryKey: ["course-blocks", courseId, username],
    queryFn: () => getCourseBlocks(courseId, username),
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
