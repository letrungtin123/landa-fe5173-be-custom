// ============================================================
// BadgesPage — Trang danh hiệu đầy đủ
//
// - Header: tiêu đề + progress tổng
// - Filter tabs
// - BadgeGrid component
// - Section "Bạn sắp đạt" — badges gần nhất chưa earn
// ============================================================

import { motion } from "framer-motion";
import { Trophy, TrendingUp } from "lucide-react";
import { BadgeGrid } from "@/components/badges/BadgeGrid";
import { BadgeCard } from "@/components/badges/BadgeCard";
import { useBadges } from "@/hooks/useBadges";
import { BADGE_DEFINITIONS } from "@/data/badgeConfig";

export function BadgesPage() {
  const {
    earnedBadges,
    unearnedBadges,
    totalBadges,
    earnedCount,
    isLoading,
    activeBadgeIds,
    badgeImageMap,
  } = useBadges();

  const progressPercent = totalBadges ? Math.round((earnedCount / totalBadges) * 100) : 0;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1000px] px-4 py-8 md:px-6">
        <div className="space-y-8">
          {/* Header skeleton */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-muted animate-pulse shrink-0" />
              <div className="space-y-2">
                <div className="h-7 w-44 rounded-lg bg-muted animate-pulse" />
                <div className="h-4 w-64 max-w-full rounded bg-muted animate-pulse" />
              </div>
            </div>

            {/* Progress bar skeleton */}
            <div className="mt-6 rounded-2xl border border-border/50 bg-card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="h-4 w-28 rounded bg-muted animate-pulse" />
                <div className="h-4 w-24 rounded bg-muted animate-pulse" />
              </div>
              <div className="h-3 w-full rounded-full bg-muted animate-pulse" />
              <div className="mt-2 h-3 w-40 rounded bg-muted animate-pulse" />
            </div>
          </div>

          {/* Filter tabs skeleton */}
          <div className="flex flex-wrap gap-2">
            {[72, 64, 72, 88, 80, 80].map((w, i) => (
              <div
                key={i}
                className="h-8 rounded-full bg-muted animate-pulse"
                style={{ width: w }}
              />
            ))}
          </div>

          {/* Badge grid skeleton — matches real grid: 2 / 3 / 4 cols */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 w-full">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="flex flex-col gap-3 rounded-3xl border border-border/30 bg-card p-4 animate-pulse">
                <div className="aspect-square w-full rounded-2xl bg-muted" />
                <div className="h-4 w-3/4 rounded bg-muted mx-auto" />
                <div className="h-3 w-1/2 rounded bg-muted mx-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="mx-auto w-full max-w-[1000px] px-4 py-8 md:px-6"
      >
        {/* Header section */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-yellow-500 text-white shadow-md">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-foreground">
                Danh Hiệu Của Bạn
              </h1>
              <p className="text-sm text-muted-foreground">
                Hoàn thành các mục tiêu để mở khóa danh hiệu mới
              </p>
            </div>
          </div>

          {/* Overall progress */}
          <div className="mt-6 rounded-2xl border border-border/50 bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-foreground">Tiến độ tổng thể</span>
              <span className="text-sm font-bold text-accent">
                {earnedCount}/{totalBadges} danh hiệu
              </span>
            </div>
            <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {progressPercent}% hoàn thành — {earnedCount === totalBadges
                ? "Bạn đã đạt tất cả! 🎉"
                : `Còn ${totalBadges - earnedCount} danh hiệu nữa`
              }
            </p>
          </div>
        </motion.div>

        {/* Badge Grid */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mb-10"
        >
          <BadgeGrid earnedBadges={earnedBadges} activeBadgeIds={activeBadgeIds} badgeImageMap={badgeImageMap} />
        </motion.div>

        {/* "Coming Soon" section — badges sắp đạt */}
        {unearnedBadges.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-4 w-4 text-accent" />
              <h2 className="text-lg font-bold text-foreground">Sắp đạt được</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Hãy tiếp tục cố gắng để mở khóa các danh hiệu này
            </p>
            <div className="space-y-2">
              {unearnedBadges.slice(0, 3).map(badge => (
                <BadgeCard
                  key={badge.id}
                  badge={badge}
                  compact
                  cardImageUrl={badgeImageMap[badge.id]?.cardUrl}
                  iconImageUrl={badgeImageMap[badge.id]?.iconUrl}
                />
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>
    </>
  );
}
