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
    >
      <div className="rounded-2xl bg-primary/10 dark:bg-card border border-transparent dark:border-border/50 p-4 text-center">
        <p className="text-xs font-medium text-muted-foreground mb-1">Học liên tục</p>
        <div className="flex items-center justify-center gap-1.5">
          <span className="text-2xl font-bold text-primary">
            {streak} Ngày
          </span>
          <span className="text-xl">🔥</span>
        </div>
      </div>
    </motion.div>
  );
}
