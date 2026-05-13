import { create } from "zustand";

interface AppState {
  sidebarOpen: boolean;
  currentModuleId: string;
  currentLessonId: string;
  currentUnitIndex: number;
  isCourseModalActive: boolean;

  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setCurrentLesson: (moduleId: string, lessonId: string) => void;
  setUnitIndex: (index: number) => void;
  nextUnit: (totalUnits: number) => boolean; // returns false if already at last
  prevUnit: () => boolean; // returns false if already at first
  setCourseModalActive: (active: boolean) => void;
}

export const useAppStore = create<AppState>()((set, get) => ({
  sidebarOpen: false,
  currentModuleId: "m2",
  currentLessonId: "l-m2-1",
  currentUnitIndex: 0,
  isCourseModalActive: false,

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setCurrentLesson: (moduleId, lessonId) =>
    set({ currentModuleId: moduleId, currentLessonId: lessonId, currentUnitIndex: 0 }),
  setUnitIndex: (index) => set({ currentUnitIndex: index }),
  nextUnit: (totalUnits) => {
    const current = get().currentUnitIndex;
    if (current >= totalUnits - 1) return false;
    set({ currentUnitIndex: current + 1 });
    return true;
  },
  prevUnit: () => {
    const current = get().currentUnitIndex;
    if (current <= 0) return false;
    set({ currentUnitIndex: current - 1 });
    return true;
  },
  setCourseModalActive: (active) => set({ isCourseModalActive: active }),
}));
