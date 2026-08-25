// ============================================================
// GlobalBadgeWatcher — Theo dõi badges từ mọi route
//
// Được mount bên trong ProtectedRoute. Tự động poll badges
// và hiển thị BadgeUnlockModal khi user earn badge mới
// bất kể đang ở route nào.
// ============================================================

import { BadgeUnlockModal } from "@/components/badges/BadgeUnlockModal";
import { useBadges } from "@/hooks/useBackendBadges";
import { useAppStore } from "@/stores/useAppStore";

export function GlobalBadgeWatcher() {
  const { newlyEarned, dismissNewBadge, badgeImageMap } = useBadges();
  const isCourseModalActive = useAppStore((s) => s.isCourseModalActive);

  // Nếu đang có course modal, chặn hoàn toàn không cho render badge modal
  if (isCourseModalActive) return null;

  const cardUrl = newlyEarned ? badgeImageMap[newlyEarned.badge.id]?.cardUrl : null;

  return <BadgeUnlockModal badge={newlyEarned} onDismiss={dismissNewBadge} cardImageUrl={cardUrl} />;
}
