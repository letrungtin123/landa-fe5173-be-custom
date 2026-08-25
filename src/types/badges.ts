import type { BadgeDefinition } from "@/data/badgeConfig";

export interface EarnedBadge {
  badge: BadgeDefinition;
  earnedAt: string;
}

export interface BadgeProgressInfo {
  current: number;
  target: number;
  percent: number;
  label: string;
}

export type BadgeProgressMap = Record<string, BadgeProgressInfo>;
