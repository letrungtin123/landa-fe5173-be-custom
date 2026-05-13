// ============================================================
// Modal Config API — Fetch cấu hình modal cho course
// ============================================================

import { apiClient } from "./client";

export interface CourseModalConfigData {
  welcome_enabled: boolean;
  welcome_title: string;
  welcome_description: string;
  confirm_enabled: boolean;
  confirm_title: string;
  confirm_description: string;
  confirm_checkbox_text: string;
  completion_enabled: boolean;
  completion_title: string;
  completion_description: string;
}

export async function getCourseModalConfig(courseId: string): Promise<CourseModalConfigData> {
  try {
    const { data } = await apiClient.get("/api/landa/v1/course-modal-config/", {
      params: { course_id: courseId },
    });
    return data;
  } catch {
    // Fallback defaults nếu API lỗi
    return {
      welcome_enabled: true,
      welcome_title: "",
      welcome_description: "",
      confirm_enabled: true,
      confirm_title: "",
      confirm_description: "",
      confirm_checkbox_text: "",
      completion_enabled: true,
      completion_title: "",
      completion_description: "",
    };
  }
}
