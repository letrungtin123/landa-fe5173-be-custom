import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface AppState {
  sidebarOpen: boolean;
  currentModuleId: string;
  currentLessonId: string;
  currentUnitIndex: number;
  isCourseModalActive: boolean;
  confirmJustClosed: boolean;

  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setCurrentLesson: (moduleId: string, lessonId: string) => void;
  setUnitIndex: (index: number) => void;
  nextUnit: (totalUnits: number) => boolean; // returns false if already at last
  prevUnit: () => boolean; // returns false if already at first
  setCourseModalActive: (active: boolean) => void;
  setConfirmJustClosed: (v: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      sidebarOpen: false,
      currentModuleId: "",
      currentLessonId: "",
      currentUnitIndex: 0,
      isCourseModalActive: false,
      confirmJustClosed: false,

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
      setConfirmJustClosed: (v) => set({ confirmJustClosed: v }),
    }),
    {
      name: "la-app-nav",
      storage: createJSONStorage(() => sessionStorage),
      // Chỉ persist vị trí navigation — không persist UI state (sidebar, modals)
      partialize: (state) => ({
        currentModuleId: state.currentModuleId,
        currentLessonId: state.currentLessonId,
        currentUnitIndex: state.currentUnitIndex,
      }),
    }
  )
);
