// ============================================================
// useNotifications Hook — Fetches notifications from Open edX
// ============================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/api/notifications";
import { transformNotifications } from "@/transformers/notificationTransformer";
import { useAuthStore } from "@/stores/useAuthStore";
import type { Notification } from "@/data/types";

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
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Poll every minute
    select: (data) => {
      const notifications = transformNotifications(data.results);
      return {
        notifications,
        total: data.count,
        unreadCount: notifications.filter((n) => !n.read).length,
      };
    },
  });

  return {
    notifications: query.data?.notifications ?? ([] as Notification[]),
    total: query.data?.total ?? 0,
    unreadCount: query.data?.unreadCount ?? 0,
    isLoading: query.isLoading,
    error: query.error,
  };
}

/**
 * Hook to get the count of unread notifications.
 * Derives count from the notifications list (last_read === null)
 * instead of the /count/ API (which counts unseen and resets on tray open).
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
    mutationFn: (id: number) => markNotificationRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["unreadNotificationsCount"] });
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
      qc.invalidateQueries({ queryKey: ["unreadNotificationsCount"] });
    },
  });
}
