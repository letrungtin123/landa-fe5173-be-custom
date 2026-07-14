import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { BadgeCard } from "./BadgeCard";
import { BADGE_DEFINITIONS, CATEGORY_LABELS, type BadgeCategory, type BadgeDefinition } from "@/data/badgeConfig";
import type { EarnedBadge } from "@/lib/badgeEvaluator";
import { cn } from "@/lib/utils";
import { BADGE_CARD_IMAGES, BADGE_MOBILE_CARD_IMAGES } from "@/data/badgeImages";
import type { BadgeImageMap, BadgeProgressMap } from "@/hooks/useBadges";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface BadgeGridProps {
  earnedBadges: EarnedBadge[];
  activeBadgeIds?: string[];
  className?: string;
  /** Dynamic badge image map from API */
  badgeImageMap?: BadgeImageMap;
  badgeProgressMap?: BadgeProgressMap;
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

export function BadgeGrid({ earnedBadges, activeBadgeIds, className, badgeImageMap, badgeProgressMap }: BadgeGridProps) {
  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedBadge, setSelectedBadge] = useState<{ badge: BadgeDefinition; earned: EarnedBadge } | null>(null);

  const earnedMap = useMemo(() => {
    const map = new Map<string, EarnedBadge>();
    for (const eb of earnedBadges) {
      map.set(eb.badge.id, eb);
    }
    return map;
  }, [earnedBadges]);

  const activeBadgesDef = useMemo(() => {
    if (!activeBadgeIds) return [];
    const activeSet = new Set(activeBadgeIds);
    return BADGE_DEFINITIONS.filter(b => activeSet.has(b.id));
  }, [activeBadgeIds]);

  const filteredBadges = useMemo(() => {
    let badges = [...activeBadgesDef];

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
  }, [filter, earnedMap, activeBadgesDef]);

  // Resolve image URL for a badge (dynamic from API, fallback to hardcoded)
  const getCardUrl = (badgeId: string) => badgeImageMap?.[badgeId]?.cardUrl || null;
  const getIconUrl = (badgeId: string) => badgeImageMap?.[badgeId]?.iconUrl || null;
  const getMobileCardUrl = (badgeId: string) => badgeImageMap?.[badgeId]?.mobileCardUrl || null;

  // Selected badge card image — for detail modal
  const selectedImgSrc = selectedBadge
    ? (getCardUrl(selectedBadge.badge.id) || BADGE_CARD_IMAGES[selectedBadge.badge.id] || BADGE_CARD_IMAGES["onboarding_warrior"])
    : "";
  const selectedMobileImgSrc = selectedBadge
    ? (getMobileCardUrl(selectedBadge.badge.id) || BADGE_MOBILE_CARD_IMAGES[selectedBadge.badge.id] || BADGE_MOBILE_CARD_IMAGES["onboarding_warrior"])
    : "";
  const selectedFilterLabel = FILTER_OPTIONS.find(opt => opt.value === filter)?.label || FILTER_OPTIONS[0].label;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Filter tabs */}
      <div className="md:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex h-10 w-full items-center justify-between rounded-xl border border-border bg-card px-3.5 text-left text-[13px] font-semibold text-foreground shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5">
              <span className="flex min-w-0 items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate">{selectedFilterLabel}</span>
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[calc(100vw-2rem)] max-w-[360px] rounded-xl p-1.5">
            {FILTER_OPTIONS.map(opt => (
              <DropdownMenuItem
                key={opt.value}
                onSelect={() => setFilter(opt.value)}
                className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-[13px] font-semibold"
              >
                <span>
                  {opt.label}
                  {opt.value === "earned" && ` (${earnedBadges.length})`}
                  {opt.value === "locked" && ` (${activeBadgesDef.length - earnedBadges.length})`}
                </span>
                {filter === opt.value && <Check className="h-4 w-4 text-primary" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="hidden flex-wrap gap-2 md:flex">
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
            {opt.value === "locked" && ` (${activeBadgesDef.length - earnedBadges.length})`}
          </button>
        ))}
      </div>

      {/* Badge grid */}
      <div className="w-full min-h-[200px]">
        <AnimatePresence mode="popLayout">
          {filteredBadges.length > 0 ? (
            <motion.div
              className="grid grid-cols-2 gap-4 w-full md:grid-cols-3 lg:grid-cols-4"
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
                    cardImageUrl={getCardUrl(badge.id)}
                    iconImageUrl={getIconUrl(badge.id)}
                    mobileCardImageUrl={getMobileCardUrl(badge.id)}
                    progressInfo={badgeProgressMap?.[badge.id]}
                    useMobileCardOnMobile
                    enableLockedFlip
                    onClick={() => {
                      const earned = earnedMap.get(badge.id);
                      if (earned) setSelectedBadge({ badge, earned });
                    }}
                  />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="empty-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-12 text-muted-foreground w-full"
            >
              <p className="text-sm">Không có danh hiệu nào phù hợp với bộ lọc</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

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
                className="w-full max-w-[360px] outline-none pointer-events-auto relative flex flex-col items-center"
              >
                <div className="w-full aspect-[84/113] overflow-hidden rounded-xl shadow-2xl relative group md:aspect-[4/6.5] md:rounded-[2rem]">
                  <button
                    onClick={() => setSelectedBadge(null)}
                    className="absolute right-3 top-3 z-30 rounded-full p-2 bg-black/40 text-white/80 transition-colors hover:bg-black/60 hover:text-white backdrop-blur-sm"
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

                  {/* Shine effect applying to the whole card */}
                  <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden rounded-[20px]">
                    <motion.div 
                      className="absolute top-[-50%] w-[60%] h-[200%] bg-gradient-to-r from-transparent via-white/60 to-transparent skew-x-[-25deg]"
                      animate={{ left: ["-100%", "250%"] }}
                      transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 1.5, ease: "easeInOut" }}
                    />
                  </div>

                  {/* Absolute positioned button overlapping the image */}
                  {selectedBadge.badge.id !== "omnipotent_master" && (
                    <div className="absolute inset-x-0 bottom-[14%] z-20 hidden justify-center md:flex">
                      <motion.button
                        onClick={() => setSelectedBadge(null)}
                        className="w-[65%] max-w-[220px] rounded-full bg-[#0b5cff] px-6 py-3 text-[15px] font-bold text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:bg-blue-600 transition-all"
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                      >
                        Tuyệt vời! 🎉
                      </motion.button>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
