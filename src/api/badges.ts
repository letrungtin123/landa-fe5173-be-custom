// ============================================================
// Badges API — Custom Backend
// ============================================================

import { apiClient } from "./client";
import type { ApiResponse, UserBadge, BadgeDefinitionFromAPI } from "./types";

/**
 * Lấy danh sách huy hiệu của user.
 */
export async function getUserBadges(): Promise<UserBadge[]> {
  try {
    const { data } = await apiClient.get<ApiResponse<UserBadge[]>>("/api/learner/badges");
    return data.data;
  } catch {
    return [];
  }
}

/**
 * Lấy danh sách badge definitions đang active cho tenant hiện tại.
 * Trả về full badge definitions kèm image URLs.
 */
export async function getActiveBadges(): Promise<BadgeDefinitionFromAPI[]> {
  try {
    const { data } = await apiClient.get<ApiResponse<BadgeDefinitionFromAPI[]>>("/api/learner/badges/active");
    return data.data;
  } catch {
    // Nếu lỗi (ví dụ chưa login), trả về rỗng để an toàn
    return [];
  }
}

/**
 * Lưu huy hiệu mới.
 */
export async function saveUserBadge(badgeId: string, markAsShown: boolean = false): Promise<void> {
  await apiClient.post("/api/learner/badges", { badge_id: badgeId });
  if (markAsShown) {
    await apiClient.patch("/api/learner/badges", { badge_id: badgeId, is_shown: true });
  }
}

/**
 * Đánh dấu huy hiệu đã hiển thị popup.
 */
export async function updateBadgeShown(badgeId: string, isShown: boolean): Promise<void> {
  await apiClient.patch("/api/learner/badges", { badge_id: badgeId, is_shown: isShown });
}
