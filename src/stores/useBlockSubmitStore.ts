// ============================================================
// Session-level store: Lưu kết quả submit của các interactive block
// (Quiz, Crossword, Sortable) trong phiên xem course hiện tại.
//
// Mục đích: Khi learner quay lại unit trước đó bằng nút navigation
// hoặc F5 reload, component mount lại sẽ khôi phục trạng thái đã
// submit thay vì reset.
//
// Persist bằng sessionStorage: F5 reload → giữ state,
// đóng tab → mất state (learner vào lại sẽ fetch từ server).
// ============================================================

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface BlockSubmitResult {
  resultMessage: string;
  isCorrect: boolean;
  // Lưu thêm answers cho Quiz để hiện lại lựa chọn đã chọn
  answers?: Record<string, string | string[]>;
  // Lưu explanation cho Quiz
  explanationHtml?: string;
  // Lưu parsed problems cho Quiz (tránh re-fetch XBlock HTML bị thay đổi sau submit)
  parsedProblems?: unknown[];
  // Fingerprint nội dung — dùng để phát hiện admin đã update content
  // Nếu fingerprint khác so với data server hiện tại → cache bị stale → xóa
  contentFingerprint?: string;
  activeIndex?: number;
  completedQuestionIds?: string[];
  blockCompleted?: boolean;
}

interface BlockSubmitStore {
  results: Record<string, BlockSubmitResult>;

  /** Lưu kết quả submit cho 1 block */
  setResult: (usageKey: string, result: BlockSubmitResult) => void;

  /** Lấy kết quả đã lưu (nếu có) */
  getResult: (usageKey: string) => BlockSubmitResult | undefined;

  /** Xóa toàn bộ (khi unmount page hoặc đổi course) */
  clearAll: () => void;
}

export const useBlockSubmitStore = create<BlockSubmitStore>()(
  persist(
    (set, get) => ({
      results: {},

      setResult: (usageKey, result) =>
        set((state) => ({
          results: { ...state.results, [usageKey]: result },
        })),

      getResult: (usageKey) => get().results[usageKey],

      clearAll: () => set({ results: {} }),
    }),
    {
      name: "la-block-submit",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
