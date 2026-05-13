import { useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { EarnedBadge } from "@/lib/badgeEvaluator";
import { BADGE_CARD_IMAGES } from "@/data/badgeImages";
import { X } from "lucide-react";

interface BadgeUnlockModalProps {
  badge: EarnedBadge | null;
  onDismiss: () => void;
}

export function BadgeUnlockModal({ badge, onDismiss }: BadgeUnlockModalProps) {
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

  const imgSrc = badge ? (BADGE_CARD_IMAGES[badge.badge.id] || BADGE_CARD_IMAGES["onboarding_warrior"]) : "";

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
                    Tuyệt vời! 🎉
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
  const colors = ["#fbbf24", "#f59e0b", "#ef4444", "#ec4899", "#8b5cf6", "#3b82f6", "#10b981", "#f97316"];
  const particles = Array.from({ length: 80 }, (_, i) => ({
    id: i,
    color: colors[i % colors.length],
    x: Math.random() * 100, // percentage across screen width
    delay: Math.random() * 2,
    duration: 3 + Math.random() * 3,
    size: 6 + Math.random() * 6,
  }));

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-sm shadow-sm"
          style={{
            left: `${p.x}vw`,
            top: -20,
            width: p.size,
            height: p.size * 0.5,
            backgroundColor: p.color,
          }}
          animate={{
            y: ["0vh", "110vh"],
            rotate: [0, 360 + Math.random() * 360],
            x: [0, (Math.random() - 0.5) * 100],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            ease: "linear",
            delay: p.delay,
          }}
        />
      ))}
    </div>
  );
}
