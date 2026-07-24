// ============================================================
// Modal State API — Per-user modal state cho course
// GET  /api/learner/courses/:courseId/modal-state
// PATCH /api/learner/courses/:courseId/modal-state
// ============================================================

import { apiClient } from "./client";
import { useAuthStore } from "@/stores/useAuthStore";

export interface CourseModalState {
  course_id: string;
  welcome_shown: boolean;
  confirm_shown: boolean;
  complete_shown: boolean;
}

const demoModalStates = new Map<string, CourseModalState>();

export function resetDemoCourseModalStates(): void {
  demoModalStates.clear();
}

function isDemoIframeSession(): boolean {
  return useAuthStore.getState().sessionMode === "demo_iframe";
}

function defaultDemoState(courseId: string): CourseModalState {
  return demoModalStates.get(courseId) || {
    course_id: courseId,
    welcome_shown: false,
    confirm_shown: false,
    complete_shown: false,
  };
}

export const getCourseModalState = async (courseId: string): Promise<CourseModalState> => {
  if (isDemoIframeSession()) return defaultDemoState(courseId);

  const { data } = await apiClient.get<{ success: boolean; data: CourseModalState }>(
    `/api/learner/courses/${courseId}/modal-state`
  );
  return data.data;
};

export const updateCourseModalState = async (
  courseId: string,
  updates: Partial<Omit<CourseModalState, "course_id">>
): Promise<CourseModalState> => {
  if (isDemoIframeSession()) {
    const next = { ...defaultDemoState(courseId), ...updates, course_id: courseId };
    demoModalStates.set(courseId, next);
    return next;
  }

  const { data } = await apiClient.patch<{ success: boolean; data: CourseModalState }>(
    `/api/learner/courses/${courseId}/modal-state`,
    updates
  );
  return data.data;
};
