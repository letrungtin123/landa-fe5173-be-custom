// ============================================================
// Notification Transformer — Open edX → FE Notification type
// ============================================================

import type { OpenEdXNotification } from "@/api/types";
import type { Notification } from "@/data/types";

/**
 * Transform Open edX notification into the FE Notification interface.
 */
export function transformNotification(
  n: OpenEdXNotification
): Notification {
  const courseName = n.content_context?.course_name;
  let title = courseName || n.app_name || "Thông báo";
  
  // Format app_name đẹp hơn nếu fallback
  if (!courseName) {
    if (n.app_name === "updates") title = "Cập nhật khóa học";
    else if (n.app_name === "discussion") title = "Thảo luận";
    else if (n.app_name === "grading") title = "Chấm điểm";
  }

  return {
    id: String(n.id),
    icon: mapNotificationType(n.notification_type),
    title: title,
    message: n.content,
    time: formatRelativeTime(n.created),
    read: n.last_read !== null,
  };
}

export function transformNotifications(
  items: OpenEdXNotification[]
): Notification[] {
  return items.map(transformNotification);
}

function mapNotificationType(
  type: string
): "badge" | "course" | "system" {
  const lower = type.toLowerCase();
  if (lower.includes("badge") || lower.includes("achievement"))
    return "badge";
  if (
    lower.includes("course") ||
    lower.includes("enroll") ||
    lower.includes("grade")
  )
    return "course";
  return "system";
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
