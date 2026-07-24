// ============================================================
// Section Modal API — Khích lệ hoàn thành từng section
// GET  /api/learner/courses/:courseId/section-modal-configs
// GET  /api/learner/courses/:courseId/section-modal-shown
// POST /api/learner/courses/:courseId/section-modal-shown
// ============================================================

import { apiClient } from "./client";
import { useAuthStore } from "@/stores/useAuthStore";

export interface SectionModalConfigItem {
  section_id: string;
  title: string;
  description: string;
}

const demoShownSections = new Map<string, Set<string>>();

export function resetDemoSectionModalStates(): void {
  demoShownSections.clear();
}

function isDemoIframeSession(): boolean {
  return useAuthStore.getState().sessionMode === "demo_iframe";
}

export const getSectionModalConfigs = async (courseId: string): Promise<SectionModalConfigItem[]> => {
  const { data } = await apiClient.get<{ success: boolean; data: SectionModalConfigItem[] }>(
    `/api/learner/courses/${courseId}/section-modal-configs`
  );
  return data.data;
};

export const getSectionModalShown = async (courseId: string): Promise<{ shown_sections: string[] }> => {
  if (isDemoIframeSession()) {
    return { shown_sections: Array.from(demoShownSections.get(courseId) || []) };
  }

  const { data } = await apiClient.get<{ success: boolean; data: { shown_sections: string[] } }>(
    `/api/learner/courses/${courseId}/section-modal-shown`
  );
  return data.data;
};

export const markSectionModalShown = async (courseId: string, sectionId: string): Promise<{ success: boolean }> => {
  if (isDemoIframeSession()) {
    const shown = demoShownSections.get(courseId) || new Set<string>();
    shown.add(sectionId);
    demoShownSections.set(courseId, shown);
    return { success: true };
  }

  const { data } = await apiClient.post<{ success: boolean; data: { success: boolean } }>(
    `/api/learner/courses/${courseId}/section-modal-shown`,
    { section_id: sectionId }
  );
  return data.data;
};
