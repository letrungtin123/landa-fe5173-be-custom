// ============================================================
// Session-level store: Lưu kết quả submit của các interactive block
// (Quiz, Crossword, Sortable) trong phiên xem course hiện tại.
//
// Mục đích: Khi learner quay lại unit trước đó bằng nút navigation,
// component mount lại sẽ khôi phục trạng thái đã submit thay vì reset.
//
// KHÔNG persist: khi learner rời trang course detail → store bị xóa
// → learner vào lại sẽ làm bài từ đầu.
// ============================================================

import { create } from "zustand";

interface BlockSubmitResult {
  resultMessage: string;
  isCorrect: boolean;
  // Lưu thêm answers cho Quiz để hiện lại lựa chọn đã chọn
  answers?: Record<string, string | string[]>;
  // Lưu explanation cho Quiz
  explanationHtml?: string;
  // Lưu parsed problems cho Quiz (tránh re-fetch XBlock HTML bị thay đổi sau submit)
  parsedProblems?: unknown[];
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

export const useBlockSubmitStore = create<BlockSubmitStore>((set, get) => ({
  results: {},

  setResult: (usageKey, result) =>
    set((state) => ({
      results: { ...state.results, [usageKey]: result },
    })),

  getResult: (usageKey) => get().results[usageKey],

  clearAll: () => set({ results: {} }),
}));
