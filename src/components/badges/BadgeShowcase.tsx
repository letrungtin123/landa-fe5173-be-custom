// ============================================================
// BadgeShowcase — Dashboard sidebar widget
//
// Hiển thị 3 badges gần nhất đã earn (compact view).
// Nếu chưa có badge → hiển thị next achievable badge.
// Link "Xem tất cả" → /badges
// ============================================================

import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Trophy, ChevronRight } from "lucide-react";
import { useBadges } from "@/hooks/useBadges";
import { BadgeCard } from "./BadgeCard";
import { BadgeIcon } from "./BadgeIcon";
import { BADGE_DEFINITIONS } from "@/data/badgeConfig";

export function BadgeShowcase() {
  const { earnedBadges, totalBadges, earnedCount, isLoading, badgeImageMap } = useBadges();

  if (isLoading) {
    return (
      <div className="rounded-3xl bg-[#F9FAFB] dark:bg-card border border-transparent dark:border-border/50 p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-5 w-5 rounded bg-muted animate-pulse" />
          <div className="h-4 w-24 rounded bg-muted animate-pulse" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-14 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // Lấy 3 badges gần nhất (earned gần nhất theo timestamp)
  const recentBadges = [...earnedBadges]
    .sort((a, b) => new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime())
    .slice(0, 3);

  // Next badge chưa earned (badge đầu tiên chưa có)
  const nextBadge = BADGE_DEFINITIONS.find(
    b => !earnedBadges.some(eb => eb.badge.id === b.id)
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="rounded-3xl bg-[#F9FAFB] dark:bg-card border border-transparent dark:border-border/50 overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 pt-6 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-[#0062DF]" />
            <h3 className="text-sm font-bold text-foreground">Danh hiệu</h3>
          </div>
          <span className="text-xs font-semibold text-accent">
            {earnedCount}/{totalBadges}
          </span>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-[#0062DF]"
            initial={{ width: 0 }}
            animate={{ width: `${(earnedCount / totalBadges) * 100}%` }}
            transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Badge list */}
      <div className="px-4 pb-3 space-y-2">
        {recentBadges.length > 0 ? (
          recentBadges.map(eb => (
            <BadgeCard
              key={eb.badge.id}
              badge={eb.badge}
              earned={eb}
              compact
              cardImageUrl={badgeImageMap[eb.badge.id]?.cardUrl}
              iconImageUrl={badgeImageMap[eb.badge.id]?.iconUrl}
            />
          ))
        ) : (
          // No badges yet → show next achievable
          <div className="flex flex-col items-center py-3 text-center">
            {nextBadge && (
              <>
                <BadgeIcon
                  badgeId={nextBadge.id}
                  tier={nextBadge.tier}
                  earned={false}
                  size={48}
                  iconImageUrl={badgeImageMap[nextBadge.id]?.iconUrl}
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Tiếp theo: <span className="font-medium text-foreground">{nextBadge.name}</span>
                </p>
                <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                  {nextBadge.requirement}
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* View all link */}
      <Link
        to="/badges"
        className="flex items-center justify-center gap-1 border-t border-border/30 py-3 text-xs font-medium text-accent hover:bg-accent/5 transition-colors"
      >
        Xem tất cả danh hiệu
        <ChevronRight className="h-3 w-3" />
      </Link>
    </motion.div>
  );
}
