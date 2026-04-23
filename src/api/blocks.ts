// ============================================================
// Blocks & XBlock Content API
// ============================================================

import { apiClient } from "./client";
import type { Block } from "./types";

/**
 * Lấy chi tiết block đơn lẻ (video, problem, html, etc.).
 */
export async function getBlockDetail(usageKey: string): Promise<Block> {
  const { data } = await apiClient.get<Block>(
    `/api/courses/v1/blocks/${usageKey}/`,
    {
      params: {
        requested_fields:
          "student_view_data,display_name,type,children,completion",
        student_view_data: "video",
      },
    }
  );
  return data;
}

/**
 * Lấy rendered HTML content qua Courseware Sequence API.
 * Đây là API được dùng bởi frontend-app-learning MFE chính thức.
 * Trả về rendered XBlock HTML cho từng unit trong sequence.
 */
export interface SequenceContent {
  items: Array<{
    id: string;
    content: string;  // Rendered HTML
    type: string;
  }>;
}

export async function getSequenceContent(
  sequenceId: string
): Promise<SequenceContent> {
  const { data } = await apiClient.get<SequenceContent>(
    `/api/courseware/sequence/${sequenceId}`
  );
  return data;
}

/**
 * Lấy rendered HTML content của XBlock qua /xblock/ endpoint.
 * Dùng fetch thay vì apiClient vì cần nhận text/html.
 * Path tương đối (/xblock/{id}) → qua Vite proxy → LMS.
 */
export async function getXBlockHtml(
  xblockPath: string
): Promise<string> {
  // Lấy token từ auth store
  const { useAuthStore } = await import("@/stores/useAuthStore");
  const token = useAuthStore.getState().accessToken;

  const res = await fetch(xblockPath, {
    headers: {
      Accept: "text/html",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) throw new Error(`XBlock fetch failed: ${res.status}`);
  return res.text();
}

/**
 * Submit đáp án quiz/problem.
 * Dùng xmodule_handler endpoint (v1).
 */
export async function submitProblemAnswer(
  usageKey: string,
  answers: Record<string, string>
): Promise<Record<string, unknown>> {
  const { data } = await apiClient.post(
    `/courses/${usageKey}/handler/xmodule_handler/problem_check`,
    answers
  );
  return data;
}
