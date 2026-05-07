import { useState, useEffect, useRef, useCallback } from 'react';
import { startOfWeek, format, isSameWeek, addDays } from 'date-fns';

const STORAGE_KEY = 'la_study_time_weekly';
const SESSION_START_KEY = 'la_session_start';
const TICK_INTERVAL = 60000; // 1 minute

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

function persistData(data: DailyStudyTime[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function useStudyTimeTracker() {
  const [weeklyData, setWeeklyData] = useState<DailyStudyTime[]>(() => {
    const stored = loadStoredData();
    return mergeWithBaseline(stored);
  });

  const weeklyDataRef = useRef(weeklyData);

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

  // Tracking interval — stable effect, no dependency on weeklyData
  useEffect(() => {
    // Record session start timestamp
    const sessionStartStr = sessionStorage.getItem(SESSION_START_KEY);
    if (!sessionStartStr) {
      sessionStorage.setItem(SESSION_START_KEY, Date.now().toString());
    }

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

  // Percentile (mock: based on total time, 10h = 100%)
  const totalMinutes = weeklyData.reduce((acc, curr) => acc + curr.minutes, 0);
  const rawPercentile = Math.min(99, Math.max(10, Math.floor((totalMinutes / 600) * 100)));
  const percentile = rawPercentile < 85 ? 85 : rawPercentile;

  return { chartData, percentile };
}
