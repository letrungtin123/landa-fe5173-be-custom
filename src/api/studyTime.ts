// ============================================================
// Study Time API — Sync thời gian học lên server
//
// POST /api/landa/v1/study-time/sync/
//     → Batch upsert entries [{date, minutes}]
//
// GET /api/landa/v1/study-time/weekly/
//     → Trả 7 ngày tuần hiện tại
// ============================================================

import { apiClient } from "./client";

export interface StudyTimeEntry {
  date: string; // format 'yyyy-MM-dd'
  minutes: number;
}

export interface StudyTimeWeeklyResponse {
  entries: StudyTimeEntry[];
}

/**
 * Sync study time lên server.
 * FE gửi tất cả entries tuần hiện tại → server dùng GREATEST() upsert.
 * Chỉ gửi entries có minutes > 0 để tiết kiệm bandwidth.
 */
export async function syncStudyTime(
  entries: StudyTimeEntry[]
): Promise<{ success: boolean; synced: number }> {
  // Chỉ gửi entries có data thật
  const filtered = entries.filter((e) => e.minutes > 0);
  if (filtered.length === 0) return { success: true, synced: 0 };

  try {
    const { data } = await apiClient.post("/api/landa/v1/study-time/sync/", {
      entries: filtered,
    });
    return data;
  } catch (error) {
    console.warn("[syncStudyTime] Failed:", error);
    return { success: false, synced: 0 };
  }
}

/**
 * Lấy study time 7 ngày tuần hiện tại từ server.
 * Dùng khi page load để merge với localStorage.
 */
export async function getWeeklyStudyTime(): Promise<StudyTimeEntry[]> {
  try {
    const { data } = await apiClient.get<StudyTimeWeeklyResponse>(
      "/api/landa/v1/study-time/weekly/"
    );
    return data.entries || [];
  } catch (error) {
    console.warn("[getWeeklyStudyTime] Failed:", error);
    return [];
  }
}
