// ============================================================
// BadgeUnlockModal — Modal popup khi user earn badge mới
//
// - Confetti particles animation
// - Badge icon lớn + tên + mô tả
// - Auto-dismiss sau 5 giây hoặc click đóng
// ============================================================

import { useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, PartyPopper } from "lucide-react";
import { BadgeIcon } from "./BadgeIcon";
import { TIER_CONFIG } from "@/data/badgeConfig";
import type { EarnedBadge } from "@/lib/badgeEvaluator";

interface BadgeUnlockModalProps {
  badge: EarnedBadge | null;
  onDismiss: () => void;
}

export function BadgeUnlockModal({ badge, onDismiss }: BadgeUnlockModalProps) {
  // Auto dismiss after 6 seconds
  useEffect(() => {
    if (!badge) return;
    const timer = setTimeout(onDismiss, 6000);
    return () => clearTimeout(timer);
  }, [badge, onDismiss]);

  // Close on Escape
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onDismiss();
  }, [onDismiss]);

  useEffect(() => {
    if (!badge) return;
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [badge, handleKeyDown]);

  return (
    <AnimatePresence>
      {badge && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onDismiss}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Confetti particles */}
          <ConfettiEffect />

          {/* Modal content */}
          <motion.div
            className="relative z-10 m-4 flex max-w-sm flex-col items-center rounded-3xl border-2 bg-background/95 backdrop-blur-lg p-8 text-center shadow-2xl"
            style={{ borderColor: `var(--badge-border)` }}
            initial={{ scale: 0.3, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.5, opacity: 0, y: 30 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            {/* Close button */}
            <button
              onClick={onDismiss}
              className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Celebration icon */}
            <motion.div
              initial={{ rotate: -20, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mb-2"
            >
              <PartyPopper className="h-8 w-8 text-amber-500" />
            </motion.div>

            {/* Title */}
            <motion.h2
              className="text-lg font-bold text-foreground mb-1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              Chúc mừng! 🎉
            </motion.h2>
            <motion.p
              className="text-sm text-muted-foreground mb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              Bạn đã đạt danh hiệu mới
            </motion.p>

            {/* Badge icon — large */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                type: "spring",
                stiffness: 200,
                damping: 15,
                delay: 0.5,
              }}
              className="mb-4"
            >
              <BadgeIcon
                badgeId={badge.badge.id}
                tier={badge.badge.tier}
                earned
                size={120}
              />
            </motion.div>

            {/* Badge name */}
            <motion.h3
              className="text-xl font-extrabold text-foreground mb-1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              {badge.badge.name}
            </motion.h3>

            {/* Badge description */}
            <motion.p
              className="text-sm text-muted-foreground mb-6 max-w-[250px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              {badge.badge.description}
            </motion.p>

            {/* Course name if applicable */}
            {badge.courseName && (
              <motion.p
                className="text-xs text-accent font-medium mb-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
              >
                📚 {badge.courseName}
              </motion.p>
            )}

            {/* Action button */}
            <motion.button
              onClick={onDismiss}
              className="rounded-full bg-accent px-8 py-2.5 text-sm font-semibold text-accent-foreground shadow-md hover:shadow-lg transition-shadow"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Tuyệt vời!
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Confetti particle effect */
function ConfettiEffect() {
  const colors = [
    "#fbbf24", "#f59e0b", "#ef4444", "#ec4899",
    "#8b5cf6", "#3b82f6", "#10b981", "#f97316",
  ];

  const particles = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    color: colors[i % colors.length],
    x: Math.random() * 100,
    delay: Math.random() * 0.8,
    duration: 2 + Math.random() * 2,
    size: 4 + Math.random() * 6,
    rotateEnd: Math.random() * 720 - 360,
  }));

  return (
    <div className="absolute inset-0 z-10 overflow-hidden pointer-events-none">
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-sm"
          style={{
            left: `${p.x}%`,
            top: -10,
            width: p.size,
            height: p.size * 0.6,
            backgroundColor: p.color,
          }}
          initial={{ y: -20, opacity: 1, rotate: 0 }}
          animate={{
            y: window.innerHeight + 20,
            opacity: [1, 1, 0],
            rotate: p.rotateEnd,
            x: (Math.random() - 0.5) * 200,
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: "easeIn",
          }}
        />
      ))}
    </div>
  );
}
