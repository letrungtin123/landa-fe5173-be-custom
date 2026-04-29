// ============================================================
// BadgeGrid — Grid layout hiển thị tất cả badges
//
// - Earned badges nổi bật trước
// - Locked badges mờ phía dưới
// - Stagger animation khi load
// - Filter theo category
// ============================================================

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar, BookOpen } from "lucide-react";
import { BadgeCard } from "./BadgeCard";
import { BadgeIcon } from "./BadgeIcon";
import { BADGE_DEFINITIONS, CATEGORY_LABELS, type BadgeCategory, type BadgeDefinition } from "@/data/badgeConfig";
import type { EarnedBadge } from "@/lib/badgeEvaluator";
import { cn } from "@/lib/utils";

interface BadgeGridProps {
  earnedBadges: EarnedBadge[];
  className?: string;
}

type FilterType = "all" | "earned" | "locked" | BadgeCategory;

const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "earned", label: "Đã đạt" },
  { value: "locked", label: "Chưa đạt" },
  { value: "completion", label: "Hoàn thành" },
  { value: "grade", label: "Thành tích" },
  { value: "certificate", label: "Chứng chỉ" },
  { value: "enrollment", label: "Tham gia" },
];

export function BadgeGrid({ earnedBadges, className }: BadgeGridProps) {
  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedBadge, setSelectedBadge] = useState<{ badge: BadgeDefinition; earned: EarnedBadge } | null>(null);

  const earnedMap = useMemo(() => {
    const map = new Map<string, EarnedBadge>();
    for (const eb of earnedBadges) {
      map.set(eb.badge.id, eb);
    }
    return map;
  }, [earnedBadges]);

  const filteredBadges = useMemo(() => {
    let badges = [...BADGE_DEFINITIONS];

    if (filter === "earned") {
      badges = badges.filter(b => earnedMap.has(b.id));
    } else if (filter === "locked") {
      badges = badges.filter(b => !earnedMap.has(b.id));
    } else if (filter !== "all") {
      badges = badges.filter(b => b.category === filter);
    }

    // Earned badges trước, locked sau
    badges.sort((a, b) => {
      const aEarned = earnedMap.has(a.id) ? 0 : 1;
      const bEarned = earnedMap.has(b.id) ? 0 : 1;
      return aEarned - bEarned;
    });

    return badges;
  }, [filter, earnedMap]);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {FILTER_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={cn(
              "rounded-full px-4 py-1.5 text-xs font-medium transition-all",
              filter === opt.value
                ? "bg-accent text-accent-foreground shadow-sm"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {opt.label}
            {opt.value === "earned" && ` (${earnedBadges.length})`}
            {opt.value === "locked" && ` (${BADGE_DEFINITIONS.length - earnedBadges.length})`}
          </button>
        ))}
      </div>

      {/* Badge grid */}
      <AnimatePresence mode="popLayout">
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          layout
        >
          {filteredBadges.map((badge, i) => (
            <motion.div
              key={badge.id}
              layout
              className="h-full"
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{
                duration: 0.3,
                delay: i * 0.05,
                type: "spring",
                stiffness: 300,
                damping: 25,
              }}
            >
              <BadgeCard
                badge={badge}
                earned={earnedMap.get(badge.id)}
                onClick={() => {
                  const earned = earnedMap.get(badge.id);
                  if (earned) setSelectedBadge({ badge, earned });
                }}
              />
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>

      {filteredBadges.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <p className="text-sm">Không có danh hiệu nào phù hợp với bộ lọc</p>
        </div>
      )}

      {/* Modal Detail */}
      <AnimatePresence>
        {selectedBadge && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
              onClick={() => setSelectedBadge(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 p-4 outline-none"
            >
              <div className="relative flex flex-col items-center overflow-hidden rounded-3xl border border-border/50 bg-card p-8 text-center shadow-2xl">
                <button
                  onClick={() => setSelectedBadge(null)}
                  className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
                
                <div className="mb-6 mt-4">
                  <BadgeIcon
                    badgeId={selectedBadge.badge.id}
                    tier={selectedBadge.badge.tier}
                    earned={true}
                    size={120}
                  />
                </div>

                <h2 className="mb-2 text-2xl font-black text-foreground">
                  {selectedBadge.badge.name}
                </h2>
                
                <p className="mb-6 text-sm text-muted-foreground">
                  {selectedBadge.badge.description}
                </p>

                <div className="flex w-full flex-col gap-3 rounded-2xl bg-muted/50 p-4 text-left">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-accent" />
                    <div className="flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Ngày mở khóa
                      </p>
                      <p className="text-sm font-medium text-foreground">
                        {new Date(selectedBadge.earned.earnedAt).toLocaleDateString('vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  
                  {selectedBadge.earned.courseName && (
                    <div className="flex items-center gap-3 border-t border-border/50 pt-3">
                      <BookOpen className="h-4 w-4 text-accent" />
                      <div className="flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Khóa học liên quan
                        </p>
                        <p className="text-sm font-medium text-foreground">
                          {selectedBadge.earned.courseName}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
