// ============================================================
// BadgeCard — Component hiển thị 1 badge đơn lẻ
//
// - Earned: glassmorphism + glow + animated icon
// - Locked: grayscale + mờ + lock overlay
// - Hover: scale up + tooltip requirement
// ============================================================

import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { BadgeIcon } from "./BadgeIcon";
import { TIER_CONFIG, type BadgeDefinition, type BadgeTier } from "@/data/badgeConfig";
import type { EarnedBadge } from "@/lib/badgeEvaluator";
import { cn } from "@/lib/utils";

interface BadgeCardProps {
  badge: BadgeDefinition;
  earned?: EarnedBadge;
  compact?: boolean;
}

export function BadgeCard({ badge, earned, compact = false }: BadgeCardProps) {
  const isEarned = !!earned;
  const tierStyle = TIER_CONFIG[badge.tier];

  const timeAgo = earned?.earnedAt ? getTimeAgo(earned.earnedAt) : null;

  if (compact) {
    return (
      <motion.div
        className={cn(
          "group relative flex items-center gap-3 rounded-2xl border p-3 transition-all",
          isEarned
            ? `${tierStyle.bgColor} ${tierStyle.borderColor} hover:shadow-md`
            : "bg-muted/30 border-border/30"
        )}
        whileHover={isEarned ? { scale: 1.02, y: -1 } : undefined}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <BadgeIcon
          badgeId={badge.id}
          tier={badge.tier}
          earned={isEarned}
          size={40}
        />
        <div className="flex-1 min-w-0">
          <p className={cn(
            "text-sm font-semibold truncate",
            isEarned ? "text-foreground" : "text-muted-foreground/60"
          )}>
            {badge.name}
          </p>
          <p className="text-[11px] text-muted-foreground truncate">
            {isEarned ? badge.description : badge.requirement}
          </p>
        </div>
        {!isEarned && (
          <Lock className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      className={cn(
        "group relative flex flex-col items-center rounded-3xl border-2 p-6 text-center transition-all",
        isEarned
          ? `${tierStyle.bgColor} ${tierStyle.borderColor} hover:shadow-xl ${tierStyle.glow}`
          : "bg-muted/20 border-border/20 hover:border-border/40"
      )}
      whileHover={isEarned ? { scale: 1.04, y: -4 } : { scale: 1.01 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {/* Tier ribbon */}
      {isEarned && (
        <div className="absolute -top-0.5 right-4">
          <TierRibbon tier={badge.tier} />
        </div>
      )}

      {/* Badge Icon */}
      <div className="mb-4">
        <BadgeIcon
          badgeId={badge.id}
          tier={badge.tier}
          earned={isEarned}
          size={80}
        />
      </div>

      {/* Lock overlay for unearned */}
      {!isEarned && (
        <div className="absolute top-5 right-5">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted">
            <Lock className="h-3 w-3 text-muted-foreground" />
          </div>
        </div>
      )}

      {/* Badge name */}
      <h3 className={cn(
        "text-sm font-bold mb-1",
        isEarned ? "text-foreground" : "text-muted-foreground/50"
      )}>
        {badge.name}
      </h3>

      {/* Description or requirement */}
      <p className={cn(
        "text-xs leading-relaxed mb-2",
        isEarned ? "text-muted-foreground" : "text-muted-foreground/40"
      )}>
        {isEarned ? badge.description : badge.requirement}
      </p>

      {/* Earned time */}
      {isEarned && timeAgo && (
        <p className="text-[10px] text-muted-foreground/60 mt-auto pt-1">
          {timeAgo}
        </p>
      )}

      {/* Course name if applicable */}
      {earned?.courseName && (
        <p className="text-[10px] text-accent/80 font-medium truncate max-w-full mt-1">
          {earned.courseName}
        </p>
      )}
    </motion.div>
  );
}

function TierRibbon({ tier }: { tier: BadgeTier }) {
  const labels: Record<BadgeTier, string> = {
    bronze: "🥉",
    silver: "🥈",
    gold: "🥇",
    diamond: "💎",
  };
  return (
    <motion.span
      className="text-sm"
      animate={{ y: [0, -2, 0] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
    >
      {labels[tier]}
    </motion.span>
  );
}

function getTimeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 30) return `${Math.floor(days / 30)} tháng trước`;
  if (days > 0) return `${days} ngày trước`;
  if (hours > 0) return `${hours} giờ trước`;
  if (minutes > 0) return `${minutes} phút trước`;
  return "Vừa đạt";
}
