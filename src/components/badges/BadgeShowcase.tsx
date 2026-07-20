// ============================================================
// BadgeShowcase — Dashboard sidebar widget
//
// Hiển thị 3 badges gần nhất đã earn (compact view).
// Nếu chưa có badge → hiển thị next achievable badge.
// Link "Xem tất cả" → /badges
// ============================================================

import { useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Trophy, ChevronRight, X } from "lucide-react";
import { useBadges } from "@/hooks/useBadges";
import { BadgeCard } from "./BadgeCard";
import { BadgeIcon } from "./BadgeIcon";
import { BADGE_DEFINITIONS } from "@/data/badgeConfig";
import { BADGE_CARD_IMAGES, BADGE_MOBILE_CARD_IMAGES } from "@/data/badgeImages";
import type { EarnedBadge } from "@/lib/badgeEvaluator";

export function BadgeShowcase() {
  const { earnedBadges, totalBadges, earnedCount, isLoading, badgeImageMap } = useBadges();
  const [selectedBadge, setSelectedBadge] = useState<EarnedBadge | null>(null);

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

  const selectedImgSrc = selectedBadge
    ? (badgeImageMap[selectedBadge.badge.id]?.cardUrl || BADGE_CARD_IMAGES[selectedBadge.badge.id] || BADGE_CARD_IMAGES["onboarding_warrior"])
    : "";
  const selectedMobileImgSrc = selectedBadge
    ? (badgeImageMap[selectedBadge.badge.id]?.mobileCardUrl || BADGE_MOBILE_CARD_IMAGES[selectedBadge.badge.id] || BADGE_MOBILE_CARD_IMAGES["onboarding_warrior"])
    : "";

  return (
    <>
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
              <button
                key={eb.badge.id}
                type="button"
                onClick={() => setSelectedBadge(eb)}
                className="block w-full rounded-2xl text-left outline-none transition-transform focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                aria-label={`Xem danh hiệu ${eb.badge.name}`}
              >
                <BadgeCard
                  badge={eb.badge}
                  earned={eb}
                  compact
                  cardImageUrl={badgeImageMap[eb.badge.id]?.cardUrl}
                  iconImageUrl={badgeImageMap[eb.badge.id]?.iconUrl}
                />
              </button>
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

      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {selectedBadge && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[99998] bg-transparent"
                onClick={() => setSelectedBadge(null)}
              />
              <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 pointer-events-none">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="w-full max-w-[360px] outline-none pointer-events-auto relative flex flex-col items-center"
                >
                  <div className="w-full aspect-[84/113] overflow-hidden rounded-xl shadow-2xl relative group md:aspect-[4/6.5] md:rounded-[2rem]">
                    <button
                      type="button"
                      onClick={() => setSelectedBadge(null)}
                      className="absolute right-3 top-3 z-30 rounded-full p-2 bg-black/40 text-white/80 transition-colors hover:bg-black/60 hover:text-white backdrop-blur-sm"
                      aria-label="Đóng"
                    >
                      <X className="h-5 w-5" />
                    </button>

                    <picture className="block h-full w-full">
                      <source media="(max-width: 767px)" srcSet={selectedMobileImgSrc} />
                      <img
                        src={selectedImgSrc}
                        alt={selectedBadge.badge.name}
                        className="block w-full h-full object-cover"
                      />
                    </picture>

                    <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden rounded-[20px]">
                      <motion.div
                        className="absolute top-[-50%] w-[60%] h-[200%] bg-gradient-to-r from-transparent via-white/60 to-transparent skew-x-[-25deg]"
                        animate={{ left: ["-100%", "250%"] }}
                        transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 1.5, ease: "easeInOut" }}
                      />
                    </div>
                  </div>
                </motion.div>
              </div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
