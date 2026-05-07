import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { useThemeStore } from "@/stores/useThemeStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { cn } from "@/lib/utils";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import { useStudyTimeTracker } from "@/hooks/useStudyTimeTracker";

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const mins = data.rawMinutes || 0;
    
    let timeText = "";
    if (mins < 60) {
      timeText = `${mins} phút`;
    } else {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      timeText = m > 0 ? `${h} tiếng ${m} phút` : `${h} tiếng`;
    }

    return (
      <div className="relative bg-[#34F8C5] text-[#0a1628] font-bold text-xs px-4 py-2 rounded-lg shadow-lg text-center min-w-[100px] -mt-10">
        <div>Bạn đã học</div>
        <div className="text-sm">{timeText}</div>
        {/* Arrow pointer down */}
        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#34F8C5] rotate-45"></div>
      </div>
    );
  }
  return null;
};

interface WelcomeBannerProps {
  actionRight?: React.ReactNode;
}

export function WelcomeBanner({ actionRight }: WelcomeBannerProps) {
  const { colorStyle } = useThemeStore();
  const userName = useAuthStore((s) => s.user?.name || "Learner");
  const { chartData, percentile } = useStudyTimeTracker();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="w-full"
    >
      <div className="flex justify-between items-start w-full">
        <div>
          {/* Welcome Badge */}
          <Badge
            variant="outline"
            className="mb-3 border-transparent bg-success/20 text-success font-bold text-xs uppercase tracking-widest px-3 py-1.5 rounded-full"
          >
            Welcome back, {userName.split(" ")[0]}
          </Badge>

          {/* Main Heading */}
          <h1 className="mb-6 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Hành trình học tập của tôi
          </h1>
        </div>
        
        {actionRight && (
          <div className="shrink-0 ml-4">
            {actionRight}
          </div>
        )}
      </div>

      {/* Weekly Momentum Card */}
      <div
        className={cn(
          "relative flex flex-col overflow-hidden rounded-3xl pt-6 md:pt-8 text-white min-h-[320px] shadow-sm",
          colorStyle === "gradient"
            ? "bg-gradient-to-r from-primary to-primary/80"
            : "bg-[#0b5de4]"
        )}
      >
        <div className="relative z-10 w-full px-6 md:px-8 md:max-w-[85%] mb-6">
          <h3 className="mb-2 text-2xl font-bold">Weekly Momentum</h3>
          <p className="text-sm leading-relaxed text-white/90">
            Thật ấn tượng! Thời gian học tập của bạn <span className="text-[#34F8C5] font-bold">cao hơn {percentile}%</span> người học
            trên hệ thống tuần qua. Giữ vững phong độ này nhé!
          </p>
        </div>

        {/* Chart decoration */}
        <div className="relative w-full flex-1 min-h-[220px] mt-auto">
          <div className="absolute top-0 left-6 md:left-8 text-[11px] text-white/80 z-10">(h)</div>
          <div className="absolute bottom-[10px] right-0 md:right-2 text-[11px] text-white/80 z-10">(day)</div>
          
          <div className="absolute inset-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
              data={chartData}
              margin={{ top: 40, right: 70, left: -20, bottom: 10 }}
            >
              <defs>
                <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34F8C5" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#34F8C5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid 
                strokeDasharray="4 4" 
                vertical={true} 
                horizontal={false} 
                stroke="rgba(255,255,255,0.25)" 
              />
              <XAxis 
                dataKey="name" 
                axisLine={{ stroke: 'rgba(255,255,255,0.4)', strokeWidth: 1 }}
                tickLine={true}
                tick={{ fill: 'rgba(255,255,255,0.9)', fontSize: 12 }}
                tickMargin={12}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'rgba(255,255,255,0.9)', fontSize: 12 }}
                tickFormatter={(val) => val === 0 ? '' : val}
                tickCount={5}
                domain={[0, 'auto']}
              />
              <RechartsTooltip 
                content={<CustomTooltip />} 
                cursor={{ stroke: 'rgba(255,255,255,0.3)', strokeWidth: 1, strokeDasharray: '4 4' }}
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="hours"
                stroke="#34F8C5"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorHours)"
                activeDot={{ r: 5, fill: '#34F8C5', stroke: '#fff', strokeWidth: 2 }}
              />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
