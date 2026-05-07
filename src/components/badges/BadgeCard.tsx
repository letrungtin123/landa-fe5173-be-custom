import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { BadgeIcon } from "./BadgeIcon";
import { TIER_CONFIG, type BadgeDefinition, type BadgeTier } from "@/data/badgeConfig";
import type { EarnedBadge } from "@/lib/badgeEvaluator";
import { cn } from "@/lib/utils";
import LeAndAssociatesLogo from "@/assets/leandassociate.webp";
import BacThayToanNangBg from "@/assets/badges/BacThayToanNang.png";
import HuyChuongIcon from "@/assets/badges/HuyChuong.png";

interface BadgeCardProps {
  badge: BadgeDefinition;
  earned?: EarnedBadge;
  compact?: boolean;
  onClick?: () => void;
}

export function BadgeCard({ badge, earned, compact = false, onClick }: BadgeCardProps) {
  const isEarned = !!earned;
  const tierStyle = TIER_CONFIG[badge.tier];

  const timeAgo = earned?.earnedAt ? getTimeAgo(earned.earnedAt) : null;

  if (badge.id === "omnipotent_master" && !compact) {
    return (
      <motion.div
        onClick={onClick}
        className={cn(
          "w-[219px] h-[356px] mx-auto group overflow-hidden relative flex flex-col rounded-[20px] text-left shadow-sm border border-border/10",
          isEarned
            ? `cursor-pointer hover:shadow-xl`
            : "opacity-95 grayscale"
        )}
        style={{ backgroundImage: `url(${BacThayToanNangBg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
        whileHover={isEarned ? { scale: 1.02, y: -4 } : { scale: 1.01 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <div className="relative z-10 p-5 flex flex-col h-full text-white">
          <div className="inline-flex items-center justify-center bg-white/20 backdrop-blur-md border border-white/20 text-white text-[9px] px-2.5 py-1 rounded-full w-fit mb-auto">
            Nhóm chuyên gia
          </div>
          
          <h3 className="text-[22px] font-black uppercase leading-[1.15] mb-2 text-white">
            BẬC THẦY<br/>TOÀN NĂNG
          </h3>
          <p className="text-[12px] italic text-white/90 mb-4 leading-snug">
            “{badge.description}”
          </p>
          
          <div className="flex items-center gap-2.5 mt-auto w-full pt-2">
            <img src={HuyChuongIcon} alt="Huy chương" className="h-[36px] w-[36px] object-contain drop-shadow-md shrink-0" />
            <div className="flex flex-col items-start gap-1">
              <span className="text-[10px] font-medium text-white/90 leading-none tracking-wide">Được công nhận bởi</span>
              <img src={LeAndAssociatesLogo} alt="Le & Associates" className="h-[14px] object-contain opacity-100" />
            </div>
          </div>
        </div>

        {/* Lock overlay for unearned */}
        {!isEarned && (
          <div className="absolute inset-0 bg-black/40 z-20 flex items-center justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm border border-border/50 shadow-sm">
              <Lock className="h-5 w-5 text-foreground/80" />
            </div>
          </div>
        )}
      </motion.div>
    );
  }

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

  return (
    <motion.div
      onClick={onClick}
      className={cn(
        "w-[219px] h-[356px] mx-auto group overflow-hidden relative flex flex-col items-center rounded-[20px] bg-card text-center border shadow-sm",
        isEarned
          ? `cursor-pointer border-primary/60 hover:border-primary hover:shadow-xl`
          : "border-border/30 hover:border-border/50 opacity-95"
      )}
      whileHover={isEarned ? { scale: 1.02, y: -4 } : { scale: 1.01 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {/* Top Background Gradient */}
      <div className={cn(
        "absolute top-0 left-0 w-full h-[120px] overflow-hidden",
        isEarned ? (badge.bgGradient || "bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30") : "bg-muted/50"
      )} />

      {/* Curved divider */}
      <svg
        className="absolute top-[90px] left-0 w-full text-card fill-current drop-shadow-[0_-4px_4px_rgba(0,0,0,0.02)]"
        viewBox="0 0 100 20"
        preserveAspectRatio="none"
        style={{ height: "35px" }}
      >
        <path d="M0 20 Q50 -10 100 20 L100 20 L0 20 Z" />
      </svg>

      {/* Content wrapper */}
      <div className="relative z-10 flex flex-col items-center p-4 pt-8 w-full h-full">
        {/* Badge Icon */}
        <div className="mb-3 mt-1">
          <BadgeIcon
            badgeId={badge.id}
            tier={badge.tier}
            earned={isEarned}
            size={85}
          />
        </div>

        {/* Lock overlay for unearned */}
        {!isEarned && (
          <div className="absolute top-[75px] right-1/2 translate-x-[35px] z-20">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-background border border-border/50 shadow-sm">
              <Lock className="h-3 w-3 text-muted-foreground/60" />
            </div>
          </div>
        )}

        {/* Subtitle */}
        <p className="mb-1 text-[11px] font-medium text-muted-foreground">
          {isEarned ? "Bạn đã đạt huy hiệu mới" : "Danh hiệu chưa mở khóa"}
        </p>

        {/* Badge name */}
        <h3 className={cn(
          "text-[15px] font-black mb-3 uppercase tracking-wide px-1 leading-tight",
          isEarned ? "text-foreground" : "text-muted-foreground/50"
        )}>
          {badge.name}
        </h3>

        {/* Description or requirement */}
        <p className={cn(
          "text-[12px] leading-relaxed mb-4 flex-1 px-1 italic line-clamp-3",
          isEarned ? "text-muted-foreground" : "text-muted-foreground/40"
        )}>
          {isEarned ? `“${badge.description}”` : badge.requirement}
        </p>

        {/* Footer Logo */}
        <div className="flex items-center justify-center gap-1.5 text-[10px] font-medium text-muted-foreground/70 w-full mt-auto pt-2 pb-1">
          <span>Được công nhận bởi</span>
          <img src={LeAndAssociatesLogo} alt="Le & Associates" className="h-[12px] object-contain opacity-75" />
        </div>
      </div>
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
      className="text-lg drop-shadow-sm inline-block"
      animate={{ y: [0, -3, 0] }}
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
