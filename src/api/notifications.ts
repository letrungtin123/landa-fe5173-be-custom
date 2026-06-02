// ============================================================
// Notifications API — Custom Backend
// ============================================================

import { apiClient } from "./client";
import type { ApiResponse, NotificationListResponse } from "./types";

/**
 * Lấy danh sách thông báo (phân trang).
 */
export async function getNotifications(params?: {
  page?: number;
  page_size?: number;
}): Promise<NotificationListResponse> {
  try {
    const { data } = await apiClient.get<ApiResponse<NotificationListResponse>>(
      "/api/learner/notifications",
      { params }
    );
    return data.data;
  } catch {
    return { data: [], total: 0, unread_count: 0 };
  }
}

/**
 * Đánh dấu 1 thông báo đã đọc.
 */
export async function markNotificationRead(notificationId: string): Promise<void> {
  await apiClient.patch(`/api/learner/notifications/${notificationId}/read`);
}

/**
 * Đánh dấu tất cả thông báo đã đọc.
 */
export async function markAllNotificationsRead(): Promise<void> {
  await apiClient.patch("/api/learner/notifications/read-all");
}

/**
 * Lấy số thông báo chưa đọc.
 */
export async function getUnreadCount(): Promise<{ count: number }> {
  const { data } = await apiClient.get<ApiResponse<{ count: number }>>(
    "/api/learner/notifications/unread-count"
  );
  return data.data;
}
