import { useMemo, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useThemeStore } from "@/stores/useThemeStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { cn } from "@/lib/utils";
import { CalendarDays, Check, Filter, RotateCcw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
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
import { getStudyTimeSeries, type StudyTimeGranularity, type StudyTimeQueryParams } from "@/api/studyTime";

type MomentumFilterMode = "week" | "day" | "month" | "year" | "custom";

interface MomentumFilterState {
  mode: MomentumFilterMode;
  date: string;
  month: string;
  year: string;
  from: string;
  to: string;
}

const toIsoDate = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const addDaysLocal = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const getCurrentWeekRange = () => {
  const today = new Date();
  const day = today.getDay();
  const mondayOffset = (day + 6) % 7;
  const monday = addDaysLocal(today, -mondayOffset);
  return { from: toIsoDate(monday), to: toIsoDate(addDaysLocal(monday, 6)) };
};

const countDaysInRange = (from: string, to: string) => {
  const start = new Date(`${from}T00:00:00`).getTime();
  const end = new Date(`${to}T00:00:00`).getTime();
  return Math.max(1, Math.floor((end - start) / 86400000) + 1);
};

const pickGranularityForRange = (from: string, to: string): StudyTimeGranularity => {
  const days = countDaysInRange(from, to);
  if (days <= 370) return "day";
  if (days <= 3650) return "month";
  return "year";
};

const getMonthRange = (month: string) => {
  const [year, monthIndex] = month.split("-").map(Number);
  const start = new Date(year, monthIndex - 1, 1);
  const end = new Date(year, monthIndex, 0);
  return { from: toIsoDate(start), to: toIsoDate(end) };
};

const createDefaultFilter = (): MomentumFilterState => {
  const now = new Date();
  const week = getCurrentWeekRange();
  return {
    mode: "week",
    date: toIsoDate(now),
    month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
    year: String(now.getFullYear()),
    from: week.from,
    to: week.to,
  };
};

const buildStudyTimeParams = (filter: MomentumFilterState): StudyTimeQueryParams | undefined => {
  if (filter.mode === "week") return undefined;
  if (filter.mode === "day") return { from: filter.date, to: filter.date, granularity: "day" };
  if (filter.mode === "month") {
    const range = getMonthRange(filter.month);
    return { ...range, granularity: "day" };
  }
  if (filter.mode === "year") {
    return { from: `${filter.year}-01-01`, to: `${filter.year}-12-31`, granularity: "month" };
  }
  const from = filter.from <= filter.to ? filter.from : filter.to;
  const to = filter.from <= filter.to ? filter.to : filter.from;
  return { from, to, granularity: pickGranularityForRange(from, to) };
};

const formatBucketLabel = (date: string, granularity: StudyTimeGranularity = "day") => {
  const [year, month, day] = date.split("-");
  if (granularity === "year") return year;
  if (granularity === "month") return `${month}/${year}`;
  return `${day}/${month}`;
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    if (data.name === "(day)") return null;

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
      <div className="relative bg-[#45FFCA] text-[#0a1628] px-3 py-2 rounded-[8px] shadow-lg text-center min-w-[110px] -mt-12 flex flex-col items-center justify-center">
        <span className="text-[13px] font-normal leading-[18px]">Bạn đã học</span>
        <span className="text-[15px] font-bold leading-[20px]">{timeText}</span>
        {/* Arrow pointer down */}
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#45FFCA] rotate-45 rounded-[1px]"></div>
      </div>
    );
  }
  return null;
};

interface WelcomeBannerProps {
  actionRight?: ReactNode;
}

export function WelcomeBanner({ actionRight }: WelcomeBannerProps) {
  const { colorStyle } = useThemeStore();
  const userName = useAuthStore((s) => s.user?.fullName || s.user?.username || "Học viên");
  const { chartData, todayMinutes, weeklyAvgMinutes, comparisonPercent } = useStudyTimeTracker();
  const [filterOpen, setFilterOpen] = useState(false);
  const [momentumFilter, setMomentumFilter] = useState<MomentumFilterState>(() => createDefaultFilter());

  const queryParams = useMemo(() => buildStudyTimeParams(momentumFilter), [momentumFilter]);
  const isDefaultWeekly = !queryParams;

  const { data: filteredStudyTime } = useQuery({
    queryKey: ["study-time-series", queryParams],
    queryFn: () => getStudyTimeSeries(queryParams),
    enabled: !isDefaultWeekly,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const activeGranularity = filteredStudyTime?.meta?.granularity || queryParams?.granularity || "day";
  const activeChartData = isDefaultWeekly
    ? chartData
    : (filteredStudyTime?.entries || []).map((entry) => ({
      name: formatBucketLabel(entry.date, activeGranularity),
      hours: Number((entry.minutes / 60).toFixed(1)),
      rawMinutes: entry.minutes,
    }));
  const totalFilteredMinutes = isDefaultWeekly
    ? 0
    : (filteredStudyTime?.entries || []).reduce((sum, entry) => sum + entry.minutes, 0);

  // Format minutes thành text dễ đọc
  const formatTime = (mins: number) => {
    if (mins < 60) return `${mins} phút`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h} tiếng ${m} phút` : `${h} tiếng`;
  };

  const resetMomentumFilter = () => {
    setMomentumFilter(createDefaultFilter());
    setFilterOpen(false);
  };

  const renderRangeMessage = () => {
    if (isDefaultWeekly) return renderMomentumMessage();

    const meta = filteredStudyTime?.meta;
    const from = meta?.from || queryParams?.from || momentumFilter.from;
    const to = meta?.to || queryParams?.to || momentumFilter.to;
    const bucketText = activeGranularity === "day" ? "ngày" : activeGranularity === "month" ? "tháng" : "năm";

    return (
      <p className="text-[13px] font-normal leading-[18px] text-white/90 max-w-[90%]">
        Đang xem {from === to ? from : `${from} → ${to}`} theo {bucketText}.<br />
        Tổng thời gian học: <span className="text-[#45FFCA] font-semibold">{formatTime(totalFilteredMinutes)}</span>
        {meta?.reduced_granularity ? <span className="text-white/70"> - đã gộp bucket để biểu đồ nhẹ hơn.</span> : null}
      </p>
    );
  };

  const renderFilterPanel = () => (
    <div className="absolute left-4 right-4 top-[74px] z-30 rounded-xl border border-white/20 bg-[#071827]/95 p-3 shadow-2xl backdrop-blur md:left-auto md:right-6 md:w-[380px]">
      <div className="mb-3 grid grid-cols-2 gap-1 sm:grid-cols-5">
        {[
          ["week", "7 ngày"],
          ["day", "Ngày"],
          ["month", "Tháng"],
          ["year", "Năm"],
          ["custom", "Từ - đến"],
        ].map(([mode, label]) => (
          <button
            key={mode}
            type="button"
            onClick={() => setMomentumFilter((current) => ({ ...current, mode: mode as MomentumFilterMode }))}
            className={cn(
              "h-8 rounded-md px-2 text-[11px] font-semibold text-white/80 transition",
              momentumFilter.mode === mode ? "bg-[#45FFCA] text-[#071827]" : "bg-white/10 hover:bg-white/15"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-2 text-[11px] text-white/80">
        {momentumFilter.mode === "day" && (
          <input
            type="date"
            value={momentumFilter.date}
            onChange={(e) => setMomentumFilter((current) => ({ ...current, date: e.target.value }))}
            className="h-9 rounded-md border border-white/15 bg-white/10 px-3 text-sm text-white outline-none"
          />
        )}
        {momentumFilter.mode === "month" && (
          <input
            type="month"
            value={momentumFilter.month}
            onChange={(e) => setMomentumFilter((current) => ({ ...current, month: e.target.value }))}
            className="h-9 rounded-md border border-white/15 bg-white/10 px-3 text-sm text-white outline-none"
          />
        )}
        {momentumFilter.mode === "year" && (
          <input
            type="number"
            min="2000"
            max="2100"
            value={momentumFilter.year}
            onChange={(e) => setMomentumFilter((current) => ({ ...current, year: e.target.value }))}
            className="h-9 rounded-md border border-white/15 bg-white/10 px-3 text-sm text-white outline-none"
          />
        )}
        {momentumFilter.mode === "custom" && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input
              type="date"
              value={momentumFilter.from}
              onChange={(e) => setMomentumFilter((current) => ({ ...current, from: e.target.value }))}
              className="h-9 rounded-md border border-white/15 bg-white/10 px-3 text-sm text-white outline-none"
            />
            <input
              type="date"
              value={momentumFilter.to}
              onChange={(e) => setMomentumFilter((current) => ({ ...current, to: e.target.value }))}
              className="h-9 rounded-md border border-white/15 bg-white/10 px-3 text-sm text-white outline-none"
            />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={resetMomentumFilter}
          className="h-8 px-2 text-white hover:bg-white/10 hover:text-white"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => setFilterOpen(false)}
          className="h-8 bg-[#45FFCA] px-3 text-[#071827] hover:bg-[#45FFCA]/90"
        >
          <Check className="h-3.5 w-3.5" />
          Apply
        </Button>
      </div>
    </div>
  );

  // Dynamic message dựa trên so sánh hôm nay vs trung bình tuần
  const renderMomentumMessage = () => {
    if (todayMinutes === 0) {
      return (
        <p className="text-[13px] font-normal leading-[18px] text-white/90 max-w-[90%]">
          Hôm nay bạn chưa bắt đầu học.<br />
          Hãy dành chút thời gian để duy trì nhịp độ tuần này nhé!
        </p>
      );
    }

    if (weeklyAvgMinutes === 0) {
      return (
        <p className="text-[13px] font-normal leading-[18px] text-white/90 max-w-[90%]">
          Bạn đã học <span className="text-[#45FFCA] font-semibold">{formatTime(todayMinutes)}</span> hôm nay.<br />
          Khởi đầu tuần mới thật tuyệt vời!
        </p>
      );
    }

    if (comparisonPercent >= 100) {
      const overPercent = comparisonPercent - 100;
      return (
        <p className="text-[13px] font-normal leading-[18px] text-white/90 max-w-[90%]">
          Hôm nay bạn đã học <span className="text-[#45FFCA] font-semibold">{formatTime(todayMinutes)}</span>,{' '}
          {overPercent > 0 ? (
            <>cao hơn <span className="text-[#45FFCA] font-semibold">{overPercent}%</span> so với</>
          ) : (
            <>bằng với</>
          )}{' '}
          trung bình tuần ({formatTime(weeklyAvgMinutes)}/ngày).<br />
          Giữ vững nhịp độ này nhé!
        </p>
      );
    }

    return (
      <p className="text-[13px] font-normal leading-[18px] text-white/90 max-w-[90%]">
        Hôm nay bạn đã học <span className="text-[#45FFCA] font-semibold">{formatTime(todayMinutes)}</span>.<br />
        Trung bình tuần của bạn là {formatTime(weeklyAvgMinutes)}/ngày — cố thêm một chút nữa nhé!
      </p>
    );
  };

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
          <div
            className="mb-3 inline-flex w-fit whitespace-nowrap items-center justify-center h-[23px] rounded-[41px] px-3 py-1 text-[10px] font-bold uppercase tracking-widest font-['SF_Pro',_sans-serif]"
            style={{ backgroundColor: "#43FDD7", color: "#000" }}
          >
            Welcome back, {userName}
          </div>

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
          "relative flex flex-col overflow-hidden rounded-[14px] md:rounded-[32px] pt-6 shadow-sm text-primary-foreground w-full max-w-[840px] h-[300px]",
          colorStyle === "gradient"
            ? "bg-gradient-to-r from-primary to-primary/80"
            : "bg-primary"
        )}
      >
        <div className="relative z-10 w-full px-8 md:px-10 mb-1">
          <div className="mb-2 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-[22px] font-bold tracking-tight text-white">Weekly Momentum</h3>
              {!isDefaultWeekly && (
                <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/80">
                  <CalendarDays className="h-3 w-3" />
                  Filtered
                </div>
              )}
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setFilterOpen((open) => !open)}
              className="h-8 shrink-0 rounded-full bg-white/10 px-3 text-xs font-semibold text-white hover:bg-white/15 hover:text-white"
            >
              <Filter className="h-3.5 w-3.5" />
              Bộ lọc
            </Button>
          </div>
          {renderRangeMessage()}
        </div>
        {filterOpen && renderFilterPanel()}

        <div className="relative w-full flex-1 mt-auto">
          <div className="absolute top-[0px] left-[18px] text-[12px] text-white/90 z-10">(h)</div>
          <div className="absolute inset-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={[...activeChartData, { name: "(day)", hours: activeChartData[activeChartData.length - 1]?.hours ? activeChartData[activeChartData.length - 1].hours * 1.1 : 0 }]}
                margin={{ top: 35, right: 30, left: -5, bottom: 20 }}
              >
                <defs>
                  <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#45FFCA" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#45FFCA" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="4 4"
                  vertical={true}
                  horizontal={false}
                  stroke="rgba(255,255,255,0.2)"
                />
                <XAxis
                  dataKey="name"
                  axisLine={{ stroke: 'rgba(255,255,255,0.4)', strokeWidth: 1 }}
                  tickLine={{ stroke: 'rgba(255,255,255,0.4)', strokeWidth: 1 }}
                  tick={{ fill: 'rgba(255,255,255,0.85)', fontSize: 12 }}
                  tickMargin={12}
                />
                <YAxis
                  axisLine={{ stroke: 'rgba(255,255,255,0.4)', strokeWidth: 1 }}
                  tickLine={{ stroke: 'rgba(255,255,255,0.4)', strokeWidth: 1 }}
                  tick={{ fill: 'rgba(255,255,255,0.85)', fontSize: 12 }}
                  allowDecimals={false}
                  tickFormatter={(val) => val === 0 ? '' : val}
                  tickCount={5}
                  domain={[0, 'auto']}
                  width={40}
                />
                <RechartsTooltip
                  content={<CustomTooltip />}
                  cursor={{ stroke: 'rgba(255,255,255,0.3)', strokeWidth: 1, strokeDasharray: '4 4' }}
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="hours"
                  stroke="#45FFCA"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorHours)"
                  activeDot={{ r: 5, fill: '#45FFCA', stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
