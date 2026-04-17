import { motion } from "framer-motion";
import { mockUser } from "@/data/mock";

export function StreakCounter() {
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.3 }}
    >
      <div className="rounded-2xl bg-[#FFF2EB] p-4 text-center">
        <p className="text-xs font-medium text-muted-foreground mb-1">Học liên tục</p>
        <div className="flex items-center justify-center gap-1.5">
          <span className="text-2xl font-bold text-[#1877F2]">
            {mockUser.streak} Ngày
          </span>
          <span className="text-xl">🔥</span>
        </div>
      </div>
    </motion.div>
  );
}
