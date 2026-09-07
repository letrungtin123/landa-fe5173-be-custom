import { useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import type { EarnedBadge } from "@/types/badges";
import { BADGE_CARD_IMAGES } from "@/data/badgeImages";
import { X } from "lucide-react";

interface BadgeUnlockModalProps {
  badge: EarnedBadge | null;
  onDismiss: () => void;
  /** Dynamic card image URL from API */
  cardImageUrl?: string | null;
}

const CONFETTI_COLORS = ["#fbbf24", "#f59e0b", "#ef4444", "#ec4899", "#8b5cf6", "#3b82f6", "#10b981", "#f97316"];

function deterministicUnit(index: number, salt: number): number {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453123;
  return value - Math.floor(value);
}

const CONFETTI_PARTICLES = Array.from({ length: 96 }, (_, index) => {
  const sideBias = index % 4;
  const startX = sideBias === 0
    ? 8 + deterministicUnit(index, 1) * 22
    : sideBias === 1
      ? 70 + deterministicUnit(index, 2) * 22
      : 18 + deterministicUnit(index, 3) * 64;
  const startY = -14 - deterministicUnit(index, 4) * 18;
  const midX = Math.max(4, Math.min(96, startX + (deterministicUnit(index, 5) - 0.5) * 44));
  const endX = Math.max(2, Math.min(98, startX + (deterministicUnit(index, 6) - 0.5) * 72));
  const size = 5 + deterministicUnit(index, 7) * 7;

  return {
    id: index,
    color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
    startX,
    startY,
    midX,
    midY: 24 + deterministicUnit(index, 8) * 34,
    endX,
    endY: 105 + deterministicUnit(index, 9) * 20,
    delay: deterministicUnit(index, 10) * 0.75,
    duration: 3.2 + deterministicUnit(index, 11) * 1.8,
    width: size,
    height: Math.max(3, size * (0.36 + deterministicUnit(index, 12) * 0.32)),
    rotateStart: deterministicUnit(index, 13) * 180,
    rotateMid: 220 + deterministicUnit(index, 14) * 420,
    rotateEnd: 620 + deterministicUnit(index, 15) * 520,
    borderRadius: deterministicUnit(index, 16) > 0.72 ? 999 : 2,
  };
});

export function BadgeUnlockModal({ badge, onDismiss, cardImageUrl }: BadgeUnlockModalProps) {
  const { t } = useTranslation();
  useEffect(() => {
    if (!badge) return;
    const timer = setTimeout(onDismiss, 8000);
    return () => clearTimeout(timer);
  }, [badge, onDismiss]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onDismiss();
  }, [onDismiss]);

  useEffect(() => {
    if (!badge) return;
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [badge, handleKeyDown]);

  // Dynamic image from API, fallback to hardcoded
  const imgSrc = badge
    ? (cardImageUrl || BADGE_CARD_IMAGES[badge.badge.id] || BADGE_CARD_IMAGES["onboarding_warrior"])
    : "";

  return (
    <AnimatePresence>
      {badge && (
        <motion.div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 sm:p-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onDismiss}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Confetti Effect spans the entire screen */}
          <ConfettiEffect />

          <div className="relative z-10 w-full max-w-[360px] flex flex-col items-center">
            <motion.div
              className="w-full aspect-[4/6.5] overflow-hidden rounded-[2rem] shadow-2xl relative group"
              initial={{ scale: 0.8, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
            >
              <img
                src={imgSrc}
                alt={badge.badge.name}
                className="w-full h-full object-cover"
              />

              {/* Shine effect applying to the whole card (continuous like the icon) */}
              <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden rounded-[20px]">
                <motion.div
                  className="absolute top-[-50%] w-[60%] h-[200%] bg-gradient-to-r from-transparent via-white/60 to-transparent skew-x-[-25deg]"
                  animate={{ left: ["-100%", "250%"] }}
                  transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 1.5, ease: "easeInOut" }}
                />
              </div>

              {/* Close button for omnipotent_master */}
              {badge.badge.id === "omnipotent_master" && (
                <button
                  onClick={onDismiss}
                  className="absolute right-3 top-3 z-30 rounded-full p-2 bg-black/40 text-white/80 transition-colors hover:bg-black/60 hover:text-white backdrop-blur-sm"
                >
                  <X className="h-5 w-5" />
                </button>
              )}

              {/* Absolute positioned button overlapping the image */}
              {badge.badge.id !== "omnipotent_master" && (
                <div className="absolute inset-x-0 bottom-[14%] z-20 flex justify-center">
                  <motion.button
                    onClick={onDismiss}
                    className="w-[65%] max-w-[220px] rounded-full bg-[#0b5cff] px-6 py-3 text-[15px] font-bold text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:bg-blue-600 transition-all"
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    {t("badge.unlockedConfirm")}
                  </motion.button>
                </div>
              )}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ConfettiEffect() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      {CONFETTI_PARTICLES.map((p) => (
        <motion.div
          key={p.id}
          className="absolute shadow-sm will-change-transform"
          style={{
            left: 0,
            top: 0,
            width: p.width,
            height: p.height,
            borderRadius: p.borderRadius,
            backgroundColor: p.color,
          }}
          initial={{
            x: `${p.startX}vw`,
            y: `${p.startY}vh`,
            rotate: p.rotateStart,
            opacity: 0,
            scale: 0.8,
          }}
          animate={{
            x: [`${p.startX}vw`, `${p.midX}vw`, `${p.endX}vw`],
            y: [`${p.startY}vh`, `${p.midY}vh`, `${p.endY}vh`],
            rotate: [p.rotateStart, p.rotateMid, p.rotateEnd],
            opacity: [0, 1, 1, 0],
            scale: [0.8, 1, 1, 0.75],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: "easeOut",
            times: [0, 0.18, 0.78, 1],
          }}
        />
      ))}
    </div>
  );
}
