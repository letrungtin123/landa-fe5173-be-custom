import { useEffect, useState, type KeyboardEvent } from "react";
import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { BadgeIcon } from "./BadgeIcon";
import { TIER_CONFIG, type BadgeDefinition } from "@/data/badgeConfig";
import type { EarnedBadge } from "@/lib/badgeEvaluator";
import { cn } from "@/lib/utils";
import { BADGE_CARD_IMAGES, BADGE_MOBILE_CARD_IMAGES } from "@/data/badgeImages";

interface BadgeCardProps {
  badge: BadgeDefinition;
  earned?: EarnedBadge;
  compact?: boolean;
  onClick?: () => void;
  cardImageUrl?: string | null;
  iconImageUrl?: string | null;
  mobileCardImageUrl?: string | null;
  useMobileCardOnMobile?: boolean;
  enableLockedFlip?: boolean;
}

export function BadgeCard({
  badge,
  earned,
  compact = false,
  onClick,
  cardImageUrl,
  iconImageUrl,
  mobileCardImageUrl,
  useMobileCardOnMobile = false,
  enableLockedFlip = false,
}: BadgeCardProps) {
  const isEarned = !!earned;
  const tierStyle = TIER_CONFIG[badge.tier];
  const canFlipLocked = !isEarned && !compact && enableLockedFlip;
  const isInteractive = canFlipLocked || !!onClick;
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    setIsFlipped(false);
  }, [badge.id, isEarned]);

  const handleCardClick = () => {
    if (canFlipLocked) {
      setIsFlipped(prev => !prev);
      return;
    }

    onClick?.();
  };

  const handleCardKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!isInteractive) return;
    if (event.key !== "Enter" && event.key !== " ") return;

    event.preventDefault();
    handleCardClick();
  };

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
          iconImageUrl={iconImageUrl}
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

  const imgSrc = cardImageUrl || BADGE_CARD_IMAGES[badge.id] || BADGE_CARD_IMAGES["onboarding_warrior"];
  const mobileImgSrc = mobileCardImageUrl || BADGE_MOBILE_CARD_IMAGES[badge.id] || BADGE_MOBILE_CARD_IMAGES["onboarding_warrior"];
  const roundedClass = useMobileCardOnMobile ? "rounded-[12px] md:rounded-[20px]" : "rounded-[20px]";

  return (
    <motion.div
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      aria-label={
        canFlipLocked
          ? `${isFlipped ? "Ẩn" : "Xem"} mô tả danh hiệu ${badge.name}`
          : undefined
      }
      className={cn(
        "mx-auto group relative shadow-sm border border-border/10 overflow-hidden bg-card outline-none [perspective:1200px] focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
        useMobileCardOnMobile
          ? "w-full max-w-[256px] aspect-[84/113] rounded-[12px] md:max-w-[219px] md:aspect-[4/6.5] md:rounded-[20px]"
          : "w-full max-w-[219px] aspect-[4/6.5] rounded-[20px]",
        isInteractive ? "cursor-pointer" : "opacity-95"
      )}
      whileHover={isEarned ? { scale: 1.02, y: -4, boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)" } : { scale: 1.01 }}
      whileTap={isInteractive ? { scale: 0.98 } : undefined}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <motion.div
        className="relative h-full w-full [transform-style:preserve-3d]"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="absolute inset-0 [backface-visibility:hidden]">
          <picture className="block h-full w-full">
            {useMobileCardOnMobile && (
              <source media="(max-width: 767px)" srcSet={mobileImgSrc} />
            )}
            <img
              src={imgSrc}
              alt={badge.name}
              loading="lazy"
              decoding="async"
              className={cn(
                "block w-full h-full object-cover",
                !isEarned && "grayscale",
                badge.id === "omnipotent_master" && "md:scale-[1.06]"
              )}
            />
          </picture>

          {isEarned && (
            <div className={cn("absolute inset-0 z-10 pointer-events-none overflow-hidden", roundedClass)}>
              <motion.div
                className="absolute top-[-50%] w-[60%] h-[200%] bg-gradient-to-r from-transparent via-white/60 to-transparent skew-x-[-25deg]"
                animate={{ left: ["-100%", "250%"] }}
                transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 1.5, ease: "easeInOut" }}
              />
            </div>
          )}

          {!isEarned && (
            <div className={cn("absolute inset-0 bg-black/40 z-20 flex items-center justify-center", roundedClass)}>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm border border-border/50 shadow-sm">
                <Lock className="h-5 w-5 text-foreground/80" />
              </div>
            </div>
          )}
        </div>

        {canFlipLocked && (
          <div
            className={cn(
              "absolute inset-0 flex flex-col items-center justify-center bg-neutral-100/95 p-3 text-center [backface-visibility:hidden] [transform:rotateY(180deg)] dark:bg-neutral-800/85 md:p-4",
              roundedClass
            )}
          >
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-muted/70 shadow-sm md:mb-3 md:h-10 md:w-10">
              <Lock className="h-4 w-4 text-muted-foreground md:h-5 md:w-5" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/80 md:text-[11px]">
              Chưa đạt
            </p>
            <h3 className="mt-1 line-clamp-2 text-sm font-extrabold leading-tight text-foreground md:text-base">
              {badge.name}
            </h3>
            <p className="mt-2 line-clamp-5 text-xs font-medium leading-relaxed text-muted-foreground md:mt-3 md:line-clamp-6 md:text-sm">
              {badge.description}
            </p>
            <span className="mt-2 text-[10px] font-semibold text-muted-foreground/60 md:mt-3">
              Chạm để quay lại
            </span>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
