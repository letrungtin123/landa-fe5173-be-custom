import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { BadgeCard } from "./BadgeCard";
import { BadgeIcon } from "./BadgeIcon";
import { BADGE_DEFINITIONS, CATEGORY_LABELS, type BadgeCategory, type BadgeDefinition } from "@/data/badgeConfig";
import type { EarnedBadge } from "@/lib/badgeEvaluator";
import { cn } from "@/lib/utils";
import LeAndAssociatesLogo from "@/assets/leandassociate.webp";
import BacThayToanNangBg from "@/assets/badges/BacThayToanNang.png";
import HuyChuongIcon from "@/assets/badges/HuyChuong.png";

interface BadgeGridProps {
  earnedBadges: EarnedBadge[];
  className?: string;
}

type FilterType = "all" | "earned" | "locked" | BadgeCategory;

const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "earned", label: "Đã đạt" },
  { value: "locked", label: "Chưa đạt" },
  { value: "introduction", label: CATEGORY_LABELS.introduction },
  { value: "expertise", label: CATEGORY_LABELS.expertise },
  { value: "innovation", label: CATEGORY_LABELS.innovation },
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
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
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
              className="fixed inset-0 z-50 bg-transparent"
              onClick={() => setSelectedBadge(null)}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="w-full max-w-[360px] outline-none pointer-events-auto relative"
              >
                {selectedBadge.badge.id === "omnipotent_master" ? (
                  <div 
                    className="relative flex flex-col overflow-hidden rounded-[2rem] shadow-2xl text-left border border-white/10 aspect-[4/6.5]"
                    style={{ backgroundImage: `url(${BacThayToanNangBg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                  >
                    <button
                      onClick={() => setSelectedBadge(null)}
                      className="absolute right-4 top-4 z-20 rounded-full p-2 text-white/50 transition-colors hover:bg-black/20 hover:text-white"
                    >
                      <X className="h-5 w-5" />
                    </button>
                    
                    <div className="relative z-10 flex w-full h-full flex-col p-8 pb-8 text-white bg-black/10">
                      <div className="inline-flex items-center justify-center bg-white/20 backdrop-blur-md border border-white/30 text-white text-[11px] px-3.5 py-1 rounded-full w-fit mb-auto shadow-sm">
                        Nhóm chuyên gia
                      </div>

                      <h2 className="text-[32px] font-black uppercase tracking-tight leading-[1.1] text-white mb-3 mt-auto drop-shadow-md">
                        BẬC THẦY<br/>TOÀN NĂNG
                      </h2>

                      <p className="text-[14px] text-white/90 italic mb-5 leading-relaxed pr-6 drop-shadow-sm">
                        “{selectedBadge.badge.description}”
                      </p>

                      <div className="flex items-center gap-2.5 mt-auto w-full pt-2">
                        <img src={HuyChuongIcon} alt="Huy chương" className="h-[40px] w-[40px] object-contain drop-shadow-md shrink-0" />
                        <div className="flex flex-col items-start gap-1">
                          <span className="text-[11px] font-medium text-white/90 leading-none tracking-wide">Được công nhận bởi</span>
                          <img src={LeAndAssociatesLogo} alt="Le & Associates" className="h-[16px] object-contain opacity-100" />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative flex flex-col items-center overflow-hidden rounded-[2rem] bg-card shadow-2xl">
                    {/* Top Background Gradient */}
                    <div className={cn(
                      "absolute top-0 left-0 w-full h-[180px] overflow-hidden",
                      selectedBadge.badge.bgGradient || "bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30"
                    )} />

                    {/* Curved divider */}
                    <svg
                      className="absolute top-[130px] left-0 w-full text-card fill-current drop-shadow-[0_-4px_4px_rgba(0,0,0,0.02)]"
                      viewBox="0 0 100 20"
                      preserveAspectRatio="none"
                      style={{ height: "55px" }}
                    >
                      <path d="M0 20 Q50 -10 100 20 L100 20 L0 20 Z" />
                    </svg>

                    <button
                      onClick={() => setSelectedBadge(null)}
                      className="absolute right-4 top-4 z-20 rounded-full p-2 text-foreground/50 transition-colors hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
                    >
                      <X className="h-5 w-5" />
                    </button>
                    
                    <div className="relative z-10 flex flex-col items-center pt-10 px-8 pb-8 text-center mt-6 w-full">
                      <div className="mb-5">
                        <BadgeIcon
                          badgeId={selectedBadge.badge.id}
                          tier={selectedBadge.badge.tier}
                          earned={true}
                          size={150}
                        />
                      </div>

                      <h2 className="mb-2 text-[22px] font-extrabold uppercase tracking-wide text-foreground">
                        {selectedBadge.badge.name}
                      </h2>
                      
                      <p className="mb-6 text-[15px] italic text-muted-foreground px-2">
                        “{selectedBadge.badge.description}”
                      </p>

                      {/* Footer Logo */}
                      <div className="flex items-center justify-center gap-2.5 text-[12px] font-medium text-muted-foreground/80 w-full mt-auto">
                        <span>Được công nhận bởi</span>
                        <img src={LeAndAssociatesLogo} alt="Le & Associates" className="h-[18px] object-contain opacity-80" />
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
