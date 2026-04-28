// ============================================================
// GlobalBadgeWatcher — Theo dõi badges từ mọi route
//
// Được mount bên trong ProtectedRoute. Tự động poll badges
// và hiển thị BadgeUnlockModal khi user earn badge mới
// bất kể đang ở route nào.
// ============================================================

import { BadgeUnlockModal } from "@/components/badges/BadgeUnlockModal";
import { useBadges } from "@/hooks/useBadges";

export function GlobalBadgeWatcher() {
  const { newlyEarned, dismissNewBadge } = useBadges();

  return <BadgeUnlockModal badge={newlyEarned} onDismiss={dismissNewBadge} />;
}
