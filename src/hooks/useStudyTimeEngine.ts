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
import { config } from '@/config/env';

const TICK_INTERVAL = 60000; // 1 phút
const SYNC_INTERVAL = 5 * 60 * 1000; // 5 phút

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

  // ── Sync to server mỗi 5 phút + beforeunload + ngay khi có data ──
  useEffect(() => {
    if (!isAuthenticated) return;

    const syncToServer = () => {
      const current = useStudyTimeStore.getState().weeklyData;
      const entries = current
        .filter(d => d.minutes > 0)
        .map(d => ({ date: d.fullDate, minutes: d.minutes }));

      if (entries.length > 0) {
        syncStudyTime(entries);
      }
    };

    // Sync ngay lập tức lần đầu (đẩy data localStorage lên server)
    const initialTimer = setTimeout(syncToServer, 3000);

    const syncInterval = setInterval(syncToServer, SYNC_INTERVAL);

    // Sync khi user rời trang — dùng sendBeacon để browser không kill request
    const handleBeforeUnload = () => {
      const current = useStudyTimeStore.getState().weeklyData;
      const entries = current
        .filter(d => d.minutes > 0)
        .map(d => ({ date: d.fullDate, minutes: d.minutes }));

      if (entries.length > 0) {
        const { accessToken, tokenType } = useAuthStore.getState();
        const baseUrl = config.apiBaseUrl;

        // Gửi từng entry qua sendBeacon (reliable, browser không kill)
        for (const entry of entries) {
          const blob = new Blob(
            [JSON.stringify({
              duration_minutes: entry.minutes,
              started_at: new Date(`${entry.date}T00:00:00`).toISOString(),
            })],
            { type: 'application/json' }
          );
          // sendBeacon không hỗ trợ custom headers → dùng query param fallback
          navigator.sendBeacon(
            `${baseUrl}/api/enrollments/study-session?_token=${encodeURIComponent(`${tokenType} ${accessToken}`)}`,
            blob
          );
        }
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearTimeout(initialTimer);
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
