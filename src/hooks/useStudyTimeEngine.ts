// ============================================================
// Study Time Engine — Timer + Sync logic
//
// Hook "fire-and-forget": chạy interval đếm phút, sync lên server.
// Mount 1 lần duy nhất trong ProtectedRoute → chạy suốt session.
// KHÔNG trả về UI data — WelcomeBanner đọc từ store.
// ============================================================

import { useEffect, useRef } from 'react';
import { useStudyTimeStore } from '@/stores/useStudyTimeStore';
import { syncStudyTime, getWeeklyStudyTime } from '@/api/studyTime';
import { useAuthStore } from '@/stores/useAuthStore';

const TICK_INTERVAL = 60000; // 1 phút
const SYNC_INTERVAL = 5 * 60 * 1000; // 5 phút
const LAST_SYNC_KEY = 'la_study_time_last_sync';

export function useStudyTimeEngine() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const addMinutesToToday = useStudyTimeStore((s) => s.addMinutesToToday);
  const mergeServerData = useStudyTimeStore((s) => s.mergeServerData);
  const serverSyncedRef = useRef(false);

  // ── Server fetch on mount (1 lần duy nhất) ──
  useEffect(() => {
    if (!isAuthenticated || serverSyncedRef.current) return;
    serverSyncedRef.current = true;

    getWeeklyStudyTime().then(serverEntries => {
      if (serverEntries.length > 0) {
        mergeServerData(serverEntries);
      }
    });
  }, [isAuthenticated, mergeServerData]);

  // ── Sync to server mỗi 5 phút + beforeunload ──
  useEffect(() => {
    if (!isAuthenticated) return;

    const syncToServer = () => {
      const current = useStudyTimeStore.getState().weeklyData;
      const entries = current
        .filter(d => d.minutes > 0)
        .map(d => ({ date: d.fullDate, minutes: d.minutes }));

      if (entries.length > 0) {
        syncStudyTime(entries).then(() => {
          localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
        });
      }
    };

    const syncInterval = setInterval(syncToServer, SYNC_INTERVAL);

    // Sync khi user rời trang
    const handleBeforeUnload = () => {
      syncToServer();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(syncInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isAuthenticated]);

  // ── Tracking interval — đếm phút hoạt động ──
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
}
