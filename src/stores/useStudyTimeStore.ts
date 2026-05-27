// ============================================================
// Study Time Store — Zustand store cho dữ liệu study time tuần
//
// State trung tâm để engine (timer+sync) và UI (WelcomeBanner)
// chia sẻ data mà không bị duplicate intervals.
// ============================================================

import { create } from 'zustand';
import { format, startOfWeek, addDays, isSameWeek } from 'date-fns';

const STORAGE_KEY = 'la_study_time_weekly';

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

interface StudyTimeState {
  weeklyData: DailyStudyTime[];

  /** Merge dữ liệu server vào (GREATEST pattern) */
  mergeServerData: (serverEntries: { date: string; minutes: number }[]) => void;

  /** Thêm phút học vào ngày hôm nay */
  addMinutesToToday: (minutesToAdd: number) => void;

  /** Reset toàn bộ data — gọi khi logout để user mới không dính data cũ */
  reset: () => void;
}

export const useStudyTimeStore = create<StudyTimeState>((set, get) => ({
  weeklyData: mergeWithBaseline(loadStoredData()),

  mergeServerData: (serverEntries) => {
    const serverMap = new Map(serverEntries.map(e => [e.date, e.minutes]));
    const current = get().weeklyData;
    const merged = current.map(day => {
      const serverMinutes = serverMap.get(day.fullDate) || 0;
      return {
        ...day,
        minutes: Math.max(day.minutes, serverMinutes),
      };
    });
    set({ weeklyData: merged });
    persistData(merged);
  },

  addMinutesToToday: (minutesToAdd) => {
    if (minutesToAdd <= 0) return;
    const todayFullDate = format(new Date(), 'yyyy-MM-dd');
    const current = get().weeklyData;
    const updated = current.map(day =>
      day.fullDate === todayFullDate
        ? { ...day, minutes: day.minutes + minutesToAdd }
        : day
    );
    set({ weeklyData: updated });
    persistData(updated);
  },

  reset: () => {
    set({ weeklyData: getWeekBaseline() });
  },
}));
