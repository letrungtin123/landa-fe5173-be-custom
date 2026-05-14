import { apiClient } from "./client";

export interface SectionModalConfigItem {
  section_id: string;
  title: string;
  description: string;
}

export const getSectionModalConfigs = async (courseId: string): Promise<SectionModalConfigItem[]> => {
  const { data } = await apiClient.get("/api/landa/v1/section-modal-config/", {
    params: { course_id: courseId }
  });
  return data;
};

export const getSectionModalShown = async (courseId: string): Promise<{ shown_sections: string[] }> => {
  const { data } = await apiClient.get("/api/landa/v1/section-modal-shown/", {
    params: { course_id: courseId }
  });
  return data;
};

export const markSectionModalShown = async (courseId: string, sectionId: string): Promise<{ success: boolean }> => {
  const { data } = await apiClient.post("/api/landa/v1/section-modal-shown/", {
    course_id: courseId,
    section_id: sectionId,
  });
  return data;
};
