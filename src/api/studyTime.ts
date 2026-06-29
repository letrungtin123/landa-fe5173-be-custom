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
  meta?: StudyTimeMeta;
}

export type StudyTimeGranularity = "day" | "month" | "year";

export interface StudyTimeMeta {
  from: string;
  to: string;
  granularity: StudyTimeGranularity;
  requested_granularity: StudyTimeGranularity;
  default_weekly: boolean;
  point_count: number;
  reduced_granularity: boolean;
}

export interface StudyTimeQueryParams {
  from?: string;
  to?: string;
  granularity?: StudyTimeGranularity;
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
    const { data } = await apiClient.post<ApiResponse<{ success: boolean; synced: number }>>(
      "/api/enrollments/study-session",
      { entries: filtered.map((entry) => ({ date: entry.date, minutes: entry.minutes })) }
    );
    return { success: true, synced: data.data.synced };
  } catch {
    return { success: false, synced: 0 };
  }
}

/**
 * Lấy study time 7 ngày tuần hiện tại.
 */
export async function getWeeklyStudyTime(
  params?: StudyTimeQueryParams
): Promise<StudyTimeEntry[]> {
  const response = await getStudyTimeSeries(params);
  return response.entries;
}

export async function getStudyTimeSeries(
  params?: StudyTimeQueryParams
): Promise<StudyTimeWeeklyResponse> {
  try {
    const { data } = await apiClient.get<ApiResponse<StudyTimeWeeklyResponse>>(
      "/api/enrollments/weekly-study-time",
      { params }
    );
    return data.data;
  } catch {
    return { entries: [] };
  }
}
