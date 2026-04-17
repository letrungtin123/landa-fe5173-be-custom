import { create } from "zustand";

interface AppState {
  sidebarOpen: boolean;
  currentModuleId: string;
  currentLessonId: string;

  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setCurrentLesson: (moduleId: string, lessonId: string) => void;
}

export const useAppStore = create<AppState>()((set) => ({
  sidebarOpen: false,
  currentModuleId: "m2",
  currentLessonId: "l-m2-1",

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setCurrentLesson: (moduleId, lessonId) =>
    set({ currentModuleId: moduleId, currentLessonId: lessonId }),
}));
