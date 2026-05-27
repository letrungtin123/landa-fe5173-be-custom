// ============================================================
// useStudyTimeTracker — Hook ĐỌC dữ liệu study time
//
// Chỉ đọc từ Zustand store → tính toán derived data cho UI.
// Timer + sync nằm trong useStudyTimeEngine (mount ở ProtectedRoute).
// ============================================================

import { format } from 'date-fns';
import { useStudyTimeStore } from '@/stores/useStudyTimeStore';

export type { DailyStudyTime } from '@/stores/useStudyTimeStore';

export function useStudyTimeTracker() {
  const weeklyData = useStudyTimeStore((s) => s.weeklyData);

  // Derived data for chart (hours)
  const chartData = weeklyData.map(d => ({
    name: d.date,
    hours: Number((d.minutes / 60).toFixed(1)),
    rawMinutes: d.minutes,
  }));

  // So sánh hôm nay vs trung bình cộng các ngày đã qua trong tuần
  const todayFullDate = format(new Date(), 'yyyy-MM-dd');
  const todayData = weeklyData.find(d => d.fullDate === todayFullDate);
  const todayMinutes = todayData?.minutes || 0;

  // Tính trung bình cộng các ngày ĐÃ QUA (không tính hôm nay, chỉ các ngày trước đó có data)
  const pastDays = weeklyData.filter(d => d.fullDate < todayFullDate);
  const pastDaysWithData = pastDays.filter(d => d.minutes > 0);
  const weeklyAvgMinutes = pastDaysWithData.length > 0
    ? Math.round(pastDaysWithData.reduce((acc, d) => acc + d.minutes, 0) / pastDaysWithData.length)
    : 0;

  // Tỉ lệ so sánh: hôm nay / trung bình tuần (%)
  const comparisonPercent = weeklyAvgMinutes > 0
    ? Math.round((todayMinutes / weeklyAvgMinutes) * 100)
    : 0;

  return { chartData, todayMinutes, weeklyAvgMinutes, comparisonPercent };
}
