import { useState, useEffect, useRef, useCallback } from 'react';
import { startOfWeek, format, isSameWeek, addDays } from 'date-fns';
import { syncStudyTime, getWeeklyStudyTime } from '@/api/studyTime';
import { useAuthStore } from '@/stores/useAuthStore';

const STORAGE_KEY = 'la_study_time_weekly';
const LAST_SYNC_KEY = 'la_study_time_last_sync';
const TICK_INTERVAL = 60000; // 1 minute
const SYNC_INTERVAL = 5 * 60 * 1000; // 5 phút — sync lên server

export interface DailyStudyTime {
  date: string; // format 'dd/MM'
  fullDate: string; // format 'yyyy-MM-dd'
  minutes: number;
}

function getWeekBaseline(): DailyStudyTime[] {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  return Array.from({ length: 7 }).map((_, i) => {
    const day = addDays(weekStart, i);
    return {
      date: format(day, 'dd/MM'),
      fullDate: format(day, 'yyyy-MM-dd'),
      minutes: 0,
    };
  });
}

function loadStoredData(): DailyStudyTime[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: DailyStudyTime[] = JSON.parse(raw);
    if (parsed.length > 0 && isSameWeek(new Date(parsed[0].fullDate), new Date(), { weekStartsOn: 1 })) {
      return parsed;
    }
    // New week → clear old data
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Corrupted data → clear
    localStorage.removeItem(STORAGE_KEY);
  }
  return [];
}

function mergeWithBaseline(stored: DailyStudyTime[]): DailyStudyTime[] {
  const baseline = getWeekBaseline();
  return baseline.map(base => {
    const existing = stored.find(d => d.fullDate === base.fullDate);
    return existing || base;
  });
}

/**
 * Merge localStorage data với server data.
 * Dùng GREATEST() pattern: giữ minutes cao nhất từ 2 nguồn.
 */
function mergeWithServer(
  local: DailyStudyTime[],
  serverEntries: { date: string; minutes: number }[]
): DailyStudyTime[] {
  const serverMap = new Map(serverEntries.map(e => [e.date, e.minutes]));

  return local.map(day => {
    const serverMinutes = serverMap.get(day.fullDate) || 0;
    return {
      ...day,
      minutes: Math.max(day.minutes, serverMinutes),
    };
  });
}

function persistData(data: DailyStudyTime[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function useStudyTimeTracker() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [weeklyData, setWeeklyData] = useState<DailyStudyTime[]>(() => {
    const stored = loadStoredData();
    return mergeWithBaseline(stored);
  });

  const weeklyDataRef = useRef(weeklyData);
  const serverSyncedRef = useRef(false);

  // Keep ref in sync with state (avoids stale closures)
  useEffect(() => {
    weeklyDataRef.current = weeklyData;
  }, [weeklyData]);

  // Persist on every data change (restores even after manual localStorage.clear())
  useEffect(() => {
    if (weeklyData.length > 0) {
      persistData(weeklyData);
    }
  }, [weeklyData]);

  // ── Server fetch on mount (1 lần duy nhất) ──
  useEffect(() => {
    if (!isAuthenticated || serverSyncedRef.current) return;
    serverSyncedRef.current = true;

    getWeeklyStudyTime().then(serverEntries => {
      if (serverEntries.length > 0) {
        setWeeklyData(prev => mergeWithServer(prev, serverEntries));
      }
    });
  }, [isAuthenticated]);

  // Add minutes to today
  const addMinutesToToday = useCallback((minutesToAdd: number) => {
    if (minutesToAdd <= 0) return;
    const todayFullDate = format(new Date(), 'yyyy-MM-dd');

    setWeeklyData(prev =>
      prev.map(day =>
        day.fullDate === todayFullDate
          ? { ...day, minutes: day.minutes + minutesToAdd }
          : day
      )
    );
  }, []);

  // ── Sync to server function ──
  const syncToServer = useCallback(() => {
    if (!isAuthenticated) return;

    const current = weeklyDataRef.current;
    const entries = current
      .filter(d => d.minutes > 0)
      .map(d => ({ date: d.fullDate, minutes: d.minutes }));

    if (entries.length > 0) {
      syncStudyTime(entries).then(() => {
        localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
      });
    }
  }, [isAuthenticated]);

  // ── Periodic sync mỗi 5 phút ──
  useEffect(() => {
    if (!isAuthenticated) return;

    const syncInterval = setInterval(syncToServer, SYNC_INTERVAL);

    // Sync khi user rời trang (beforeunload)
    const handleBeforeUnload = () => {
      syncToServer();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(syncInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isAuthenticated, syncToServer]);

  // Tracking interval — stable effect, no dependency on weeklyData
  useEffect(() => {
    let lastTickTime = Date.now();

    const tick = () => {
      const now = Date.now();
      // Calculate actual elapsed minutes (handles tab sleep / throttling)
      const elapsedMs = now - lastTickTime;
      const elapsedMinutes = Math.round(elapsedMs / 60000);
      lastTickTime = now;

      if (elapsedMinutes > 0) {
        addMinutesToToday(elapsedMinutes);
      }
    };

    const interval = setInterval(tick, TICK_INTERVAL);

    // Handle tab visibility: when user returns from inactive tab,
    // calculate missed time and add it
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        tick(); // Immediately reconcile missed time
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [addMinutesToToday]);

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
