// ============================================================
// Study Time API — Custom Backend
// POST /api/enrollments/study-session
// ============================================================

import { apiClient } from "./client";
import type { ApiResponse } from "./types";

export interface StudyTimeEntry {
  date: string; // format 'yyyy-MM-dd'
  minutes: number;
}

export interface StudyTimeWeeklyResponse {
  entries: StudyTimeEntry[];
}

/**
 * Ghi nhận study session.
 * FE gửi course_id + duration_minutes.
 */
export async function syncStudyTime(
  entries: StudyTimeEntry[]
): Promise<{ success: boolean; synced: number }> {
  const filtered = entries.filter((e) => e.minutes > 0);
  if (filtered.length === 0) return { success: true, synced: 0 };

  try {
    // Gửi từng entry như study session
    for (const entry of filtered) {
      await apiClient.post("/api/enrollments/study-session", {
        duration_minutes: entry.minutes,
        started_at: new Date(`${entry.date}T00:00:00`).toISOString(),
      });
    }
    return { success: true, synced: filtered.length };
  } catch {
    return { success: false, synced: 0 };
  }
}

/**
 * Lấy study time 7 ngày tuần hiện tại.
 */
export async function getWeeklyStudyTime(): Promise<StudyTimeEntry[]> {
  try {
    const { data } = await apiClient.get<ApiResponse<{ entries: StudyTimeEntry[] }>>(
      "/api/enrollments/weekly-study-time"
    );
    return data.data.entries;
  } catch {
    return [];
  }
}
