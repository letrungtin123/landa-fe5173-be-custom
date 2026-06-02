// ============================================================
// Section Modal API — Khích lệ hoàn thành từng section
// GET  /api/learner/courses/:courseId/section-modal-configs
// GET  /api/learner/courses/:courseId/section-modal-shown
// POST /api/learner/courses/:courseId/section-modal-shown
// ============================================================

import { apiClient } from "./client";

export interface SectionModalConfigItem {
  section_id: string;
  title: string;
  description: string;
}

export const getSectionModalConfigs = async (courseId: string): Promise<SectionModalConfigItem[]> => {
  const { data } = await apiClient.get<{ success: boolean; data: SectionModalConfigItem[] }>(
    `/api/learner/courses/${courseId}/section-modal-configs`
  );
  return data.data;
};

export const getSectionModalShown = async (courseId: string): Promise<{ shown_sections: string[] }> => {
  const { data } = await apiClient.get<{ success: boolean; data: { shown_sections: string[] } }>(
    `/api/learner/courses/${courseId}/section-modal-shown`
  );
  return data.data;
};

export const markSectionModalShown = async (courseId: string, sectionId: string): Promise<{ success: boolean }> => {
  const { data } = await apiClient.post<{ success: boolean; data: { success: boolean } }>(
    `/api/learner/courses/${courseId}/section-modal-shown`,
    { section_id: sectionId }
  );
  return data.data;
};
