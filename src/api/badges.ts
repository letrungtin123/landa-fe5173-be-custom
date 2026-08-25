// ============================================================
// Badges API — Custom Backend
// ============================================================

import { apiClient } from "./client";
import { useAuthStore } from "@/stores/useAuthStore";
import type { ApiResponse, UserBadge, BadgeDefinitionFromAPI } from "./types";

export interface BadgeProgressFromAPI {
  current: number;
  target: number;
  percent: number;
  unit_label: string;
}

export interface BadgeEvaluationResponse {
  badge_definitions: BadgeDefinitionFromAPI[];
  earned_badges: UserBadge[];
  newly_earned: UserBadge[];
  pending_popups: UserBadge[];
  progress: Record<string, BadgeProgressFromAPI>;
}

function isDemoIframeSession(): boolean {
  return useAuthStore.getState().sessionMode === "demo_iframe";
}

export async function evaluateUserBadges(): Promise<BadgeEvaluationResponse> {
  if (isDemoIframeSession()) {
    return {
      badge_definitions: [],
      earned_badges: [],
      newly_earned: [],
      pending_popups: [],
      progress: {},
    };
  }
  const { data } = await apiClient.post<ApiResponse<BadgeEvaluationResponse>>(
    "/api/learner/badges/evaluate",
  );
  return data.data;
}

export async function updateBadgeShown(badgeId: string): Promise<void> {
  if (isDemoIframeSession()) return;
  await apiClient.patch(`/api/learner/badges/${encodeURIComponent(badgeId)}/shown`);
}
