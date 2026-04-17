import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { useThemeStore } from "@/stores/useThemeStore";
import { cn } from "@/lib/utils";
import { mockUser } from "@/data/mock";

export function WelcomeBanner() {
  const { colorStyle } = useThemeStore();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      {/* Welcome Badge */}
      <Badge
        variant="outline"
        className="mb-3 border-transparent bg-success/20 text-success font-bold text-xs uppercase tracking-widest px-3 py-1.5 rounded-full"
      >
        Welcome back, {mockUser.name.split(" ")[0]}
      </Badge>

      {/* Main Heading */}
      <h1 className="mb-6 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
        Hành trình học tập của tôi
      </h1>

      {/* Weekly Momentum Card */}
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl p-6 md:p-8 text-white min-h-[220px]",
          colorStyle === "gradient"
            ? "bg-gradient-to-r from-primary to-primary/80"
            : "bg-primary"
        )}
      >
        <div className="relative z-10 max-w-[60%]">
          <h3 className="mb-2 text-xl font-bold">Weekly Momentum</h3>
          <p className="text-sm leading-relaxed text-white/90">
            Thật ấn tượng! Bạn đã đi được{" "}
            <strong>{mockUser.overallProgress}%</strong> chặng đường mục tiêu
            tuần này rồi. Giữ vững phong độ này nhé!
          </p>
        </div>

        {/* Background decoration */}
        <div className="absolute inset-x-0 bottom-0 top-1/2 opacity-100">
          {/* Stylized bar chart */}
          <div className="absolute bottom-[-10px] left-0 flex h-[120%] w-full items-end gap-2 px-4 md:px-8">
            {[30, 45, 35, 60, 45, 90, 40, 50, 45].map((h, i) => (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ duration: 0.6, delay: i * 0.05, ease: "easeOut" }}
                className={cn(
                  "flex-1 rounded-t-full w-full",
                  i === 5 ? "bg-success/80" : "bg-white/20"
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
