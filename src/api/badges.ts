import { apiClient } from "./client";

export interface UserBadgeAPI {
  badge_id: string;
  is_shown: boolean;
  earned_at: string;
}

/**
 * Lấy danh sách danh hiệu của user từ Backend
 */
export async function getUserBadges(): Promise<UserBadgeAPI[]> {
  try {
    const { data } = await apiClient.get<UserBadgeAPI[]>('/api/landa/v1/user-badges/');
    return data;
  } catch (error) {
    console.warn("Failed to get user badges", error);
    return [];
  }
}

/**
 * Lưu danh hiệu mới lên Backend
 */
export async function saveUserBadge(badgeId: string, markAsShown: boolean = false): Promise<void> {
  await apiClient.post('/api/landa/v1/user-badges/', { badge_id: badgeId });
  if (markAsShown) {
    await apiClient.patch('/api/landa/v1/user-badges/', { badge_id: badgeId, is_shown: true });
  }
}

/**
 * Đánh dấu danh hiệu đã hiển thị popup chúc mừng
 */
export async function updateBadgeShown(badgeId: string, isShown: boolean): Promise<void> {
  await apiClient.patch('/api/landa/v1/user-badges/', { badge_id: badgeId, is_shown: isShown });
}
