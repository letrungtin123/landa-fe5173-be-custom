// ============================================================
// Modal State API — Per-user modal state cho course
// GET  /api/learner/courses/:courseId/modal-state
// PATCH /api/learner/courses/:courseId/modal-state
// ============================================================

import { apiClient } from "./client";

export interface CourseModalState {
  course_id: string;
  welcome_shown: boolean;
  confirm_shown: boolean;
  complete_shown: boolean;
}

export const getCourseModalState = async (courseId: string): Promise<CourseModalState> => {
  const { data } = await apiClient.get<{ success: boolean; data: CourseModalState }>(
    `/api/learner/courses/${courseId}/modal-state`
  );
  return data.data;
};

export const updateCourseModalState = async (
  courseId: string,
  updates: Partial<Omit<CourseModalState, "course_id">>
): Promise<CourseModalState> => {
  const { data } = await apiClient.patch<{ success: boolean; data: CourseModalState }>(
    `/api/learner/courses/${courseId}/modal-state`,
    updates
  );
  return data.data;
};
