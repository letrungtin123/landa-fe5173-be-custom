import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

const MODAL_RELEASE_DELAY_MS = 1_000;
let modalReleaseTimer: ReturnType<typeof setTimeout> | null = null;

interface AppState {
  sidebarOpen: boolean;
  desktopCourseSidebarCollapsed: boolean;
  currentModuleId: string;
  currentLessonId: string;
  currentUnitIndex: number;
  isCourseModalActive: boolean;
  blockingModalIds: string[];
  confirmJustClosed: boolean;

  toggleSidebar: () => void;
  toggleDesktopCourseSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setCurrentLesson: (moduleId: string, lessonId: string) => void;
  setUnitIndex: (index: number) => void;
  nextUnit: (totalUnits: number) => boolean; // returns false if already at last
  prevUnit: () => boolean; // returns false if already at first
  setBlockingModalActive: (modalId: string, active: boolean) => void;
  setConfirmJustClosed: (v: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      sidebarOpen: false,
      desktopCourseSidebarCollapsed: false,
      currentModuleId: "",
      currentLessonId: "",
      currentUnitIndex: 0,
      isCourseModalActive: false,
      blockingModalIds: [],
      confirmJustClosed: false,

      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      toggleDesktopCourseSidebar: () => set((s) => ({ desktopCourseSidebarCollapsed: !s.desktopCourseSidebarCollapsed })),
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
      setBlockingModalActive: (modalId, active) => {
        const currentIds = get().blockingModalIds;
        const isRegistered = currentIds.includes(modalId);

        if (active) {
          if (modalReleaseTimer) {
            clearTimeout(modalReleaseTimer);
            modalReleaseTimer = null;
          }
          if (isRegistered) {
            if (!get().isCourseModalActive) set({ isCourseModalActive: true });
            return;
          }
          set({ blockingModalIds: [...currentIds, modalId], isCourseModalActive: true });
          return;
        }

        if (!isRegistered) return;
        const nextIds = currentIds.filter((id) => id !== modalId);
        set({ blockingModalIds: nextIds, isCourseModalActive: true });
        if (nextIds.length > 0) return;

        if (modalReleaseTimer) clearTimeout(modalReleaseTimer);
        modalReleaseTimer = setTimeout(() => {
          modalReleaseTimer = null;
          if (get().blockingModalIds.length === 0) {
            set({ isCourseModalActive: false });
          }
        }, MODAL_RELEASE_DELAY_MS);
      },
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
