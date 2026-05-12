import { useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BadgeIcon } from "./BadgeIcon";
import type { EarnedBadge } from "@/lib/badgeEvaluator";

import { cn } from "@/lib/utils";

import LeAndAssociatesLogo from "@/assets/leandassociate.webp";
import BacThayToanNangBg from "@/assets/badges/BacThayToanNang.png";
import HuyChuongIcon from "@/assets/badges/HuyChuong.png";

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

  return (
    <AnimatePresence>
      {badge && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0"
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

          {badge.badge.id === "omnipotent_master" ? (
            <motion.div
              className="relative z-10 w-full max-w-[360px] aspect-[4/6.5] overflow-hidden rounded-[2rem] shadow-2xl flex flex-col text-left border border-white/10"
              style={{ backgroundImage: `url(${BacThayToanNangBg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
              initial={{ scale: 0.8, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
            >
              <div className="relative z-10 flex w-full h-full flex-col p-8 pb-8 text-white bg-black/10">
                <div className="inline-flex items-center justify-center bg-white/20 backdrop-blur-md border border-white/30 text-white text-[11px] px-3.5 py-1 rounded-full w-fit mb-auto mt-2 shadow-sm">
                  Nhóm chuyên gia
                </div>

                <motion.p
                  className="text-[13px] font-medium text-white/80 mb-2 mt-auto"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  Bạn đã đạt huy hiệu đặc biệt
                </motion.p>

                <motion.h2
                  className="text-[32px] font-black uppercase tracking-tight leading-[1.1] text-white mb-3 drop-shadow-md"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  BẬC THẦY<br/>TOÀN NĂNG
                </motion.h2>

                <motion.p
                  className="text-[14px] text-white/90 italic mb-6 leading-relaxed pr-6 drop-shadow-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  “{badge.badge.description}”
                </motion.p>

                <motion.div
                  className="flex items-center gap-2.5 mt-auto w-full mb-8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  <img src={HuyChuongIcon} alt="Huy chương" className="h-[44px] w-[44px] object-contain drop-shadow-md shrink-0" />
                  <div className="flex flex-col items-start gap-1">
                    <span className="text-[12px] font-medium text-white/90 leading-none tracking-wide">Được công nhận bởi</span>
                    <img src={LeAndAssociatesLogo} alt="Le & Associates" className="h-[32px] object-contain opacity-100" />
                  </div>
                </motion.div>

                <motion.button
                  onClick={onDismiss}
                  className="w-full rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-white hover:bg-white/25 px-8 py-3.5 text-[15px] font-bold shadow-xl transition-all"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                >
                  Tuyệt vời! 🎉
                </motion.button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              className="relative z-10 w-full max-w-[360px] overflow-hidden rounded-[2rem] bg-card shadow-2xl flex flex-col items-center"
              initial={{ scale: 0.8, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
            >
              {/* Top Background Gradient */}
              <div className={cn(
                "absolute top-0 left-0 w-full h-[180px] overflow-hidden",
                badge.badge.bgGradient || "bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30"
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

              {/* Content */}
              <div className="relative z-10 flex w-full flex-col items-center pt-10 px-8 pb-8 text-center mt-6">
                
                {/* Badge Icon */}
                <motion.div
                  initial={{ scale: 0, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
                  className="mb-5"
                >
                  <BadgeIcon badgeId={badge.badge.id} tier={badge.badge.tier} earned size={150} />
                </motion.div>

                <motion.p
                  className="text-[15px] font-medium text-muted-foreground mb-1.5"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  Bạn đã đạt huy hiệu mới
                </motion.p>

                <motion.h2
                  className="text-[22px] font-extrabold uppercase tracking-wide text-foreground mb-5"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  {badge.badge.name}
                </motion.h2>

                <motion.p
                  className="text-[15px] text-muted-foreground italic mb-8 leading-relaxed px-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  “{badge.badge.description}”
                </motion.p>

                <motion.button
                  onClick={onDismiss}
                  className="rounded-full bg-[#0b5cff] px-9 py-3 text-[16px] font-semibold text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:bg-blue-600 transition-all mb-8"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  Tuyệt vời! 🎉
                </motion.button>

                {/* Footer Logo */}
                <motion.div
                  className="flex items-center justify-center gap-2.5 text-[12px] font-medium text-muted-foreground/80 w-full"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                >
                  <span>Được công nhận bởi</span>
                  <img src={LeAndAssociatesLogo} alt="Le & Associates" className="h-[32px] object-contain opacity-80" />
                </motion.div>
              </div>
            </motion.div>
          )}
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
