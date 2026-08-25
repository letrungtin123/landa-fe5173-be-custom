import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { evaluateUserBadges, updateBadgeShown } from "@/api/badges";
import type { BadgeDefinitionFromAPI } from "@/api/types";
import { BADGE_DEFINITIONS, type BadgeDefinition } from "@/data/badgeConfig";
import type { BadgeProgressMap, EarnedBadge } from "@/types/badges";
import { useAuthStore } from "@/stores/useAuthStore";
import { storageUrl } from "@/utils/storageUrl";

export interface BadgeImageMap {
  [badgeId: string]: {
    cardUrl: string | null;
    iconUrl: string | null;
    mobileCardUrl: string | null;
  };
}

export interface UseBadgesResult {
  earnedBadges: EarnedBadge[];
  unearnedBadges: BadgeDefinition[];
  totalBadges: number;
  earnedCount: number;
  isLoading: boolean;
  isEnabled: boolean;
  newlyEarned: EarnedBadge | null;
  dismissNewBadge: () => void;
  activeBadgeIds: string[];
  badgeImageMap: BadgeImageMap;
  badgeProgressMap: BadgeProgressMap;
  badgeDefinitions: BadgeDefinition[];
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function toBadgeDefinition(apiBadge: BadgeDefinitionFromAPI): BadgeDefinition {
  const template = BADGE_DEFINITIONS.find((badge) => badge.id === apiBadge.id);
  const name = text(apiBadge.title) || text(apiBadge.name) || template?.name || apiBadge.id;
  const description = text(apiBadge.desc) || text(apiBadge.description) || template?.description || "";

  return {
    id: apiBadge.id,
    name,
    description,
    category: template?.category || "introduction",
    tier: template?.tier || "diamond",
    requirement: template?.requirement || description,
    bgGradient: template?.bgGradient,
  };
}

export function useBadges(): UseBadgesResult {
  const queryClient = useQueryClient();
  const username = useAuthStore((state) => state.user?.username);
  const tenantId = useAuthStore((state) => state.user?.tenantId);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const sessionMode = useAuthStore((state) => state.sessionMode);
  const tenantModules = useAuthStore((state) => state.tenantModules);
  const isEnabled = tenantModules.includes("badge_management") && sessionMode !== "demo_iframe";

  const overviewQuery = useQuery({
    queryKey: ["badge-overview", username, tenantId, sessionMode],
    queryFn: evaluateUserBadges,
    enabled: isAuthenticated && Boolean(username) && Boolean(tenantId) && isEnabled,
    staleTime: 30_000,
    refetchOnMount: "always",
  });

  const overview = overviewQuery.data;
  const badgeDefinitions = useMemo(
    () => (overview?.badge_definitions || []).map(toBadgeDefinition),
    [overview?.badge_definitions],
  );
  const definitionById = useMemo(
    () => new Map(badgeDefinitions.map((badge) => [badge.id, badge])),
    [badgeDefinitions],
  );
  const activeBadgeIds = useMemo(
    () => badgeDefinitions.map((badge) => badge.id),
    [badgeDefinitions],
  );
  const earnedBadges = useMemo<EarnedBadge[]>(
    () => (overview?.earned_badges || []).flatMap((earned) => {
      const badge = definitionById.get(earned.badge_id);
      return badge ? [{ badge, earnedAt: earned.earned_at }] : [];
    }),
    [definitionById, overview?.earned_badges],
  );
  const unearnedBadges = useMemo(() => {
    const earnedIds = new Set(earnedBadges.map((earned) => earned.badge.id));
    return badgeDefinitions.filter((badge) => !earnedIds.has(badge.id));
  }, [badgeDefinitions, earnedBadges]);
  const badgeImageMap = useMemo<BadgeImageMap>(() => {
    const map: BadgeImageMap = {};
    for (const badge of overview?.badge_definitions || []) {
      map[badge.id] = {
        cardUrl: badge.card_image_url ? storageUrl(badge.card_image_url) : null,
        iconUrl: badge.icon_image_url ? storageUrl(badge.icon_image_url) : null,
        mobileCardUrl: badge.mobile_card_image_url ? storageUrl(badge.mobile_card_image_url) : null,
      };
    }
    return map;
  }, [overview?.badge_definitions]);
  const badgeProgressMap = useMemo<BadgeProgressMap>(() => {
    const map: BadgeProgressMap = {};
    for (const [badgeId, item] of Object.entries(overview?.progress || {})) {
      map[badgeId] = {
        current: item.current,
        target: item.target,
        percent: item.percent,
        label: `${item.current}/${item.target} ${item.unit_label}`,
      };
    }
    return map;
  }, [overview?.progress]);

  const popupScope = `${tenantId || ""}:${username || ""}`;
  const [dismissed, setDismissed] = useState<{ scope: string; ids: Set<string> }>(
    () => ({ scope: popupScope, ids: new Set() }),
  );
  const pendingBadge = (overview?.pending_popups || []).find(
    (badge) => dismissed.scope !== popupScope || !dismissed.ids.has(badge.badge_id),
  );
  const newlyEarned = pendingBadge
    ? (() => {
        const badge = definitionById.get(pendingBadge.badge_id);
        return badge ? { badge, earnedAt: pendingBadge.earned_at } : null;
      })()
    : null;

  const shownMutation = useMutation({
    mutationFn: updateBadgeShown,
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["badge-overview"] }),
  });
  const dismissNewBadge = useCallback(() => {
    if (!pendingBadge) return;
    setDismissed((current) => {
      const next = current.scope === popupScope ? new Set(current.ids) : new Set<string>();
      next.add(pendingBadge.badge_id);
      return { scope: popupScope, ids: next };
    });
    shownMutation.mutate(pendingBadge.badge_id);
  }, [pendingBadge, popupScope, shownMutation]);

  return {
    earnedBadges,
    unearnedBadges,
    totalBadges: badgeDefinitions.length,
    earnedCount: earnedBadges.length,
    isLoading: isEnabled && overviewQuery.isPending,
    isEnabled,
    newlyEarned,
    dismissNewBadge,
    activeBadgeIds,
    badgeImageMap,
    badgeProgressMap,
    badgeDefinitions,
  };
}
