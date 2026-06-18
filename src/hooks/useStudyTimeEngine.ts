// ============================================================
// Study Time Engine — Timer + Sync logic
//
// Hook "fire-and-forget": chạy interval đếm phút, sync lên server.
// Mount 1 lần duy nhất trong ProtectedRoute → chạy suốt session.
// KHÔNG trả về UI data — WelcomeBanner đọc từ store.
// ============================================================

import { useEffect } from 'react';
import { useStudyTimeStore } from '@/stores/useStudyTimeStore';
import { syncStudyTime, getWeeklyStudyTime } from '@/api/studyTime';
import { useAuthStore } from '@/stores/useAuthStore';
import { useQuery } from '@tanstack/react-query';
import { config } from '@/config/env';

const TICK_INTERVAL = 60000; // 1 phút
const SYNC_INTERVAL = 5 * 60 * 1000; // 5 phút

export function useStudyTimeEngine() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const addMinutesToToday = useStudyTimeStore((s) => s.addMinutesToToday);
  const mergeServerData = useStudyTimeStore((s) => s.mergeServerData);

  // ── Fetch weekly data bằng useQuery — đáng tin cậy, có cache + dedup ──
  const { data: serverEntries } = useQuery({
    queryKey: ['weekly-study-time'],
    queryFn: getWeeklyStudyTime,
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Merge server data vào store khi fetch xong
  useEffect(() => {
    if (serverEntries && serverEntries.length > 0) {
      mergeServerData(serverEntries);
    }
  }, [serverEntries, mergeServerData]);

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

    // Sync lần đầu sau 15s — tránh tranh bandwidth với dashboard API calls lúc init
    const initialTimer = setTimeout(syncToServer, 15000);

    const syncInterval = setInterval(syncToServer, SYNC_INTERVAL);

    // Sync khi user rời trang — dùng fetch keepalive (thay sendBeacon)
    // sendBeacon không hỗ trợ custom headers → trước đây gắn token vào URL query string
    // → lộ token trong logs + BE authenticate chỉ đọc header → request bị 401 silently
    const handleBeforeUnload = () => {
      const current = useStudyTimeStore.getState().weeklyData;
      const entries = current
        .filter(d => d.minutes > 0)
        .map(d => ({
          date: d.fullDate,
          minutes: d.minutes,
        }));

      if (entries.length === 0) return;

      const { accessToken, tokenType } = useAuthStore.getState();
      const baseUrl = config.apiBaseUrl;

      // fetch keepalive đảm bảo request hoàn thành khi tab đóng (giống sendBeacon)
      // nhưng hỗ trợ custom Authorization header → token không lộ trong URL
      for (const entry of entries) {
        fetch(`${baseUrl}/api/enrollments/study-session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `${tokenType} ${accessToken}`,
          },
          body: JSON.stringify({
            duration_minutes: entry.minutes,
            started_at: new Date(`${entry.date}T00:00:00`).toISOString(),
          }),
          keepalive: true,
        }).catch(() => {}); // Fire-and-forget
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
