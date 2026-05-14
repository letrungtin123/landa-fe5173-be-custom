import { apiClient } from "./client";

export interface CourseModalState {
  course_id: string;
  welcome_shown: boolean;
  confirm_shown: boolean;
  complete_shown: boolean;
}

export const getCourseModalState = async (courseId: string): Promise<CourseModalState> => {
  const { data } = await apiClient.get(`/api/landa/v1/course-modal-state/`, {
    params: { course_id: courseId }
  });
  return data;
};

export const updateCourseModalState = async (
  courseId: string,
  updates: Partial<Omit<CourseModalState, "course_id">>
): Promise<CourseModalState> => {
  const { data } = await apiClient.patch("/api/landa/v1/course-modal-state/", {
    course_id: courseId,
    ...updates,
  });
  return data;
};
