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
  try {
    const { data } = await apiClient.get<NotificationResponse>(
      "/api/notifications/",
      { params }
    );
    return data;
  } catch (error: any) {
    // Gracefully handle missing notifications API on Open edX (e.g. 404)
    if (error.response?.status === 404) {
      return { count: 0, next: null, results: [] };
    }
    throw error;
  }
}

/**
 * Mark a single notification as read.
 */
export async function markNotificationRead(
  notificationId: number
): Promise<unknown> {
  const { data } = await apiClient.patch(
    `/api/notifications/read/`,
    { notification_id: notificationId }
  );
  return data;
}

/**
 * Mark all notifications as read.
 */
export async function markAllNotificationsRead(): Promise<unknown> {
  // Open edX requires app_name to mark all as read. We patch the core apps.
  const apps = ['discussion', 'updates', 'grading'];
  await Promise.all(
    apps.map(app_name => 
      apiClient.patch("/api/notifications/read/", { app_name })
    )
  );
  return { success: true };
}

/**
 * Get count of unread notifications.
 */
export async function getUnreadCount(): Promise<{ count: number }> {
  const { data } = await apiClient.get<{ count: number }>(
    "/api/notifications/count/"
  );
  return data;
}
