// ============================================================
// Notifications API
// ============================================================

import { apiClient } from "./client";
import type { NotificationResponse } from "./types";

/**
 * Get paginated list of notifications for the current user.
 */
export async function getNotifications(params?: {
  page?: number;
  page_size?: number;
}): Promise<NotificationResponse> {
  const { data } = await apiClient.get<NotificationResponse>(
    "/api/notifications/v1/",
    { params }
  );
  return data;
}

/**
 * Mark a single notification as read.
 */
export async function markNotificationRead(
  notificationId: number
): Promise<unknown> {
  const { data } = await apiClient.patch(
    `/api/notifications/v1/${notificationId}/`,
    { read: true }
  );
  return data;
}

/**
 * Mark all notifications as read.
 */
export async function markAllNotificationsRead(): Promise<unknown> {
  const { data } = await apiClient.patch(
    "/api/notifications/v1/mark-all-read/"
  );
  return data;
}

/**
 * Get count of unread notifications.
 */
export async function getUnreadCount(): Promise<{ count: number }> {
  const { data } = await apiClient.get<{ count: number }>(
    "/api/notifications/v1/count/"
  );
  return data;
}
