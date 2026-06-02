// ============================================================
// useNotifications Hook — Fetches notifications from Custom Backend
// ============================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/api/notifications";
import { useAuthStore } from "@/stores/useAuthStore";
import type { Notification as FENotification } from "@/data/types";

/**
 * Transform custom BE notification → FE Notification type.
 */
function transformNotification(n: any): FENotification {
  return {
    id: String(n.id),
    icon: n.course_id ? "course" : "system",
    title: n.title || "Thông báo",
    message: n.message || "",
    time: formatRelativeTime(n.created_at),
    read: !!n.is_read,
  };
}

function formatRelativeTime(isoDate: string): string {
  try {
    const now = Date.now();
    const then = new Date(isoDate).getTime();
    const diffMs = now - then;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return "Vừa xong";
    if (diffMin < 60) return `${diffMin} phút trước`;
    if (diffHour < 24) return `${diffHour} giờ trước`;
    if (diffDay < 7) return `${diffDay} ngày trước`;
    return new Date(isoDate).toLocaleDateString("vi-VN");
  } catch {
    return "";
  }
}

/**
 * Hook to get notifications, transformed to the FE Notification type.
 * Polls every 60 seconds for new notifications.
 */
export function useNotifications() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const query = useQuery({
    queryKey: ["notifications"],
    queryFn: () => getNotifications({ page_size: 20 }),
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    select: (data) => {
      const notifications = (data.data || []).map(transformNotification);
      return {
        notifications,
        total: data.total || 0,
        unreadCount: data.unread_count || notifications.filter((n) => !n.read).length,
      };
    },
  });

  return {
    notifications: query.data?.notifications ?? ([] as FENotification[]),
    total: query.data?.total ?? 0,
    unreadCount: query.data?.unreadCount ?? 0,
    isLoading: query.isLoading,
    error: query.error,
  };
}

/**
 * Hook to get the count of unread notifications.
 */
export function useUnreadNotificationCount() {
  const { unreadCount } = useNotifications();
  return { count: unreadCount };
}

/**
 * Mutation to mark a single notification as read.
 */
export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

/**
 * Mutation to mark all notifications as read.
 */
export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
