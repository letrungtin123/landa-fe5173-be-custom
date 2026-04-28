// ============================================================
// BadgeIcon — Animated SVG icons cho từng badge
//
// Mỗi badge có SVG icon riêng với CSS animation.
// Tier quyết định particle effects & glow intensity.
// ============================================================

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { BadgeTier } from "@/data/badgeConfig";

interface BadgeIconProps {
  badgeId: string;
  tier: BadgeTier;
  earned: boolean;
  size?: number;
  className?: string;
}

export function BadgeIcon({ badgeId, tier, earned, size = 64, className }: BadgeIconProps) {
  const iconContent = getIconSVG(badgeId, size);
  const tierColors = getTierColors(tier);

  return (
    <motion.div
      className={cn(
        "relative flex items-center justify-center rounded-full",
        earned ? "" : "grayscale opacity-40",
        className
      )}
      style={{ width: size, height: size }}
      whileHover={earned ? { scale: 1.12 } : undefined}
      transition={{ type: "spring", stiffness: 400, damping: 15 }}
    >
      {/* Outer glow ring */}
      {earned && (
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: `conic-gradient(${tierColors.ring1}, ${tierColors.ring2}, ${tierColors.ring1})`,
            filter: "blur(2px)",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        />
      )}

      {/* Background circle */}
      <div
        className={cn(
          "absolute rounded-full",
          earned ? "shadow-lg" : ""
        )}
        style={{
          inset: earned ? 3 : 0,
          background: earned
            ? `linear-gradient(135deg, ${tierColors.bg1}, ${tierColors.bg2})`
            : "hsl(var(--muted))",
          boxShadow: earned ? `0 0 20px ${tierColors.glow}` : "none",
        }}
      />

      {/* Sparkle particles (earned only) */}
      {earned && tier !== "bronze" && (
        <>
          <Sparkle delay={0} size={size} color={tierColors.sparkle} />
          <Sparkle delay={1.5} size={size} color={tierColors.sparkle} />
          {tier === "diamond" && <Sparkle delay={3} size={size} color={tierColors.sparkle} />}
        </>
      )}

      {/* Icon content */}
      <div className="relative z-10 flex items-center justify-center" style={{ width: size * 0.55, height: size * 0.55 }}>
        {iconContent}
      </div>
    </motion.div>
  );
}

/** Sparkle particle animation */
function Sparkle({ delay, size, color }: { delay: number; size: number; color: string }) {
  return (
    <motion.div
      className="absolute z-20 rounded-full"
      style={{
        width: 4,
        height: 4,
        backgroundColor: color,
      }}
      animate={{
        x: [0, (Math.random() - 0.5) * size * 0.8],
        y: [0, (Math.random() - 0.5) * size * 0.8],
        opacity: [0, 1, 0],
        scale: [0, 1.5, 0],
      }}
      transition={{
        duration: 2.5,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}

/** SVG icon cho mỗi badge ID */
function getIconSVG(badgeId: string, size: number) {
  const s = size * 0.45;
  const iconStyle = { width: s, height: s };

  switch (badgeId) {
    case "first_step":
      return (
        <motion.svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={iconStyle}
          animate={{ y: [0, -2, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
          <path d="M12 19V5M5 12l7-7 7 7" />
          <circle cx="12" cy="21" r="1" fill="white" />
        </motion.svg>
      );

    case "halfway_hero":
      return (
        <motion.svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={iconStyle}
          animate={{ rotate: [0, 5, -5, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="rgba(255,255,255,0.3)" />
        </motion.svg>
      );

    case "course_conqueror":
      return (
        <motion.svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={iconStyle}
          animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
          <path d="M6 9H4.5a2.5 2.5 0 010-5C7 4 6 9 6 9zM18 9h1.5a2.5 2.5 0 000-5C17 4 18 9 18 9z" />
          <path d="M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 1012 0V2z" fill="rgba(255,255,255,0.2)" />
        </motion.svg>
      );

    case "passing_grade":
      return (
        <motion.svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={iconStyle}
          animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}>
          <path d="M20 6L9 17l-5-5" />
        </motion.svg>
      );

    case "high_achiever":
      return (
        <motion.svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={iconStyle}
          animate={{ rotate: [0, 15, -15, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="rgba(255,255,255,0.3)" />
        </motion.svg>
      );

    case "perfect_score":
      return (
        <motion.svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.5} style={iconStyle}
          animate={{ rotate: [0, 360] }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }}>
          {/* Diamond shape */}
          <path d="M12 2L2 9l10 13L22 9z" fill="rgba(255,255,255,0.25)" stroke="white" strokeWidth={1.5} />
          <path d="M2 9h20M12 2l3 7M12 2L9 9M9 9l3 13M15 9l-3 13" stroke="white" strokeWidth={1} opacity={0.6} />
        </motion.svg>
      );

    case "certified":
      return (
        <motion.svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={iconStyle}
          animate={{ y: [0, -1, 0, 1, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
          <rect x="3" y="4" width="18" height="16" rx="2" fill="rgba(255,255,255,0.15)" />
          <path d="M7 8h10M7 12h6" />
          <circle cx="17" cy="17" r="3" fill="rgba(255,255,255,0.3)" />
          <path d="M15.5 17l1 1 2-2" strokeWidth={1.5} />
        </motion.svg>
      );

    case "explorer":
      return (
        <motion.svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={iconStyle}
          animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}>
          <circle cx="12" cy="12" r="10" fill="rgba(255,255,255,0.1)" />
          <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="rgba(255,255,255,0.3)" />
        </motion.svg>
      );

    case "dedicated_learner":
      return (
        <motion.svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={iconStyle}
          animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}>
          <circle cx="12" cy="12" r="10" fill="rgba(255,255,255,0.1)" />
          <circle cx="12" cy="12" r="4" fill="rgba(255,255,255,0.3)" />
          <line x1="12" y1="2" x2="12" y2="6" />
          <line x1="12" y1="18" x2="12" y2="22" />
          <line x1="2" y1="12" x2="6" y2="12" />
          <line x1="18" y1="12" x2="22" y2="12" />
        </motion.svg>
      );

    default:
      return (
        <motion.svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} style={iconStyle}>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4M12 16h.01" />
        </motion.svg>
      );
  }
}

/** Color palette cho mỗi tier */
function getTierColors(tier: BadgeTier) {
  switch (tier) {
    case "bronze":
      return {
        ring1: "#b45309",
        ring2: "#d97706",
        bg1: "#92400e",
        bg2: "#b45309",
        glow: "rgba(217, 119, 6, 0.3)",
        sparkle: "#fbbf24",
      };
    case "silver":
      return {
        ring1: "#64748b",
        ring2: "#94a3b8",
        bg1: "#475569",
        bg2: "#64748b",
        glow: "rgba(148, 163, 184, 0.3)",
        sparkle: "#e2e8f0",
      };
    case "gold":
      return {
        ring1: "#ca8a04",
        ring2: "#eab308",
        bg1: "#a16207",
        bg2: "#ca8a04",
        glow: "rgba(234, 179, 8, 0.4)",
        sparkle: "#fef08a",
      };
    case "diamond":
      return {
        ring1: "#0891b2",
        ring2: "#a855f7",
        bg1: "#0e7490",
        bg2: "#7c3aed",
        glow: "rgba(139, 92, 246, 0.4)",
        sparkle: "#c4b5fd",
      };
  }
}
