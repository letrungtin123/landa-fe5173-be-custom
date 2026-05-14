import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { BadgeIcon } from "./BadgeIcon";
import { TIER_CONFIG, type BadgeDefinition, type BadgeTier } from "@/data/badgeConfig";
import type { EarnedBadge } from "@/lib/badgeEvaluator";
import { cn } from "@/lib/utils";
import { BADGE_CARD_IMAGES } from "@/data/badgeImages";

interface BadgeCardProps {
  badge: BadgeDefinition;
  earned?: EarnedBadge;
  compact?: boolean;
  onClick?: () => void;
}

export function BadgeCard({ badge, earned, compact = false, onClick }: BadgeCardProps) {
  const isEarned = !!earned;
  const tierStyle = TIER_CONFIG[badge.tier];

  // We keep the compact mode as is for smaller lists
  if (compact) {
    return (
      <motion.div
        className={cn(
          "group relative flex items-center gap-3 rounded-2xl border p-3",
          isEarned
            ? `${tierStyle.bgColor} border-primary/60 hover:border-primary`
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

  const imgSrc = BADGE_CARD_IMAGES[badge.id] || BADGE_CARD_IMAGES["onboarding_warrior"];

  return (
    <motion.div
      onClick={onClick}
      className={cn(
        "w-full max-w-[219px] aspect-[4/6.5] mx-auto group relative rounded-[20px] shadow-sm border border-border/10 overflow-hidden",
        isEarned
          ? `cursor-pointer`
          : "opacity-95 grayscale"
      )}
      whileHover={isEarned ? { scale: 1.02, y: -4, boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)" } : { scale: 1.01 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <img 
        src={imgSrc} 
        alt={badge.name} 
        className={cn(
          "w-full h-full object-cover",
          // Bậc thầy toàn năng có viền trong ảnh gốc, cần scale lên một chút để che
          badge.id === "omnipotent_master" && "scale-[1.06]"
        )} 
      />

      {/* Shine effect applying to the whole card (continuous like the icon) */}
      {isEarned && (
        <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden rounded-[20px]">
          <motion.div 
            className="absolute top-[-50%] w-[60%] h-[200%] bg-gradient-to-r from-transparent via-white/60 to-transparent skew-x-[-25deg]"
            animate={{ left: ["-100%", "250%"] }}
            transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 1.5, ease: "easeInOut" }}
          />
        </div>
      )}

      {/* Lock overlay for unearned */}
      {!isEarned && (
        <div className="absolute inset-0 bg-black/40 z-20 flex items-center justify-center rounded-[20px]">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm border border-border/50 shadow-sm">
            <Lock className="h-5 w-5 text-foreground/80" />
          </div>
        </div>
      )}
    </motion.div>
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
