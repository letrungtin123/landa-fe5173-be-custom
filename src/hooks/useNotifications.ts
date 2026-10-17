// ============================================================
// useNotifications Hook — Fetches notifications from Custom Backend
// ============================================================

import { useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getNotifications,
  getUnreadCount,
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
    type: n.type || null,
    courseId: n.course_id || null,
    sentByName: n.sent_by_name || null,
    createdAt: n.created_at || null,
    metadata: n.metadata && typeof n.metadata === "object" ? n.metadata : null,
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

/** How often the header asks for the unread count while the tab is visible. */
const UNREAD_COUNT_POLL_MS = 60 * 1000;
const NOTIFICATIONS_STALE_MS = 30 * 1000;

const notificationKeys = {
  all: ["notifications"] as const,
  list: () => ["notifications", "list"] as const,
  unreadCount: () => ["notifications", "unread-count"] as const,
};

/**
 * Hook to get notifications, transformed to the FE Notification type.
 * Not polled: fetched on mount and again when the polled unread count
 * changes (see useUnreadNotificationCount) or after marking as read.
 */
export function useNotifications() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const query = useQuery({
    queryKey: notificationKeys.list(),
    queryFn: () => getNotifications({ page_size: 20 }),
    enabled: isAuthenticated,
    staleTime: NOTIFICATIONS_STALE_MS,
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
 * Hook to get the count of unread notifications. Polls the small count
 * endpoint every minute while the tab is visible (paused while hidden, asked
 * once when the tab comes back if the count is older than 30 s). When the
 * count changes, the notification list is fetched again.
 */
export function useUnreadNotificationCount() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: async () => (await getUnreadCount()).count,
    enabled: isAuthenticated,
    staleTime: NOTIFICATIONS_STALE_MS,
    refetchInterval: UNREAD_COUNT_POLL_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  const count = query.data;
  const previousCount = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (count === undefined) return;
    if (previousCount.current !== undefined && previousCount.current !== count) {
      void qc.invalidateQueries({ queryKey: notificationKeys.list() });
    }
    previousCount.current = count;
  }, [count, qc]);

  return { count: count ?? 0 };
}

/**
 * Mutation to mark a single notification as read.
 */
export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.all });
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
      qc.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
