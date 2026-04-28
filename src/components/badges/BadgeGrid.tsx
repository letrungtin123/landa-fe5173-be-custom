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
import { BadgeCard } from "./BadgeCard";
import { BADGE_DEFINITIONS, CATEGORY_LABELS, type BadgeCategory } from "@/data/badgeConfig";
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
    </div>
  );
}
