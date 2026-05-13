// ============================================================
// GlobalBadgeWatcher — Theo dõi badges từ mọi route
//
// Được mount bên trong ProtectedRoute. Tự động poll badges
// và hiển thị BadgeUnlockModal khi user earn badge mới
// bất kể đang ở route nào.
// ============================================================

import { useState, useEffect } from "react";
import { BadgeUnlockModal } from "@/components/badges/BadgeUnlockModal";
import { useBadges } from "@/hooks/useBadges";
import { useAppStore } from "@/stores/useAppStore";

export function GlobalBadgeWatcher() {
  const { newlyEarned, dismissNewBadge } = useBadges();
  const isCourseModalActive = useAppStore((s) => s.isCourseModalActive);
  const [debouncedActive, setDebouncedActive] = useState(isCourseModalActive);

  useEffect(() => {
    if (isCourseModalActive) {
      setDebouncedActive(true);
    } else {
      const t = setTimeout(() => setDebouncedActive(false), 1000); // Đợi 1s để chắc chắn không có modal course nào khác nối tiếp
      return () => clearTimeout(t);
    }
  }, [isCourseModalActive]);

  // Nếu đang có course modal, chặn hoàn toàn không cho render badge modal
  if (debouncedActive) return null;

  return <BadgeUnlockModal badge={newlyEarned} onDismiss={dismissNewBadge} />;
}
