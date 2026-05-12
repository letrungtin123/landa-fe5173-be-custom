import { motion } from "framer-motion";

function getStreak(): number {
  try {
    const data = JSON.parse(localStorage.getItem("la-streak") || "{}");
    return data.count || 0;
  } catch {
    return 0;
  }
}

export function StreakCounter() {
  const streak = getStreak();

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.3 }}
      className="mb-5"
    >
      <div className="rounded-[18px] bg-orange-500/10 border border-orange-500/20 p-3 px-5 text-right w-fit ml-auto">
        <p className="text-xs font-semibold text-foreground/80 mb-1">Học liên tục</p>
        <div className="flex items-center justify-end gap-2">
          <span className="text-[20px] font-bold text-orange-600 dark:text-orange-500 leading-none">
            {streak} Ngày
          </span>
          <div className="relative flex items-center justify-center">
            <span className="text-[22px] leading-none">
              🔥
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
