// ============================================================
// useBadges Hook — React hook kết nối badge evaluation
//
// Hỗ trợ tất cả courses (không giới hạn 3).
// Dùng 1 batch progress API thay vì N×blocks requests.
// ============================================================

import { useMemo, useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useMyEnrollments } from "./useCourses";
import { useMyCertificates } from "./useCertificates";
import { getBatchCourseProgress } from "@/api/progress";
import { getUserBadges, saveUserBadge, updateBadgeShown, getActiveBadges } from "@/api/badges";
import { evaluateBadges, getShownBadgeIds, markBadgeShown, syncBadgesToLocalStorage, type EarnedBadge } from "@/lib/badgeEvaluator";
import { BADGE_DEFINITIONS, type BadgeDefinition } from "@/data/badgeConfig";
import { useAuthStore } from "@/stores/useAuthStore";
import type { BadgeDefinitionFromAPI } from "@/api/types";
import { storageUrl } from "@/utils/storageUrl";

/** Badge image URLs map — badge_id → { cardUrl, iconUrl } */
export interface BadgeImageMap {
  [badgeId: string]: {
    cardUrl: string | null;
    iconUrl: string | null;
    mobileCardUrl: string | null;
  };
}

export interface UseBadgesResult {
  earnedBadges: EarnedBadge[];
  unearnedBadges: BadgeDefinition[];
  totalBadges: number;
  earnedCount: number;
  isLoading: boolean;
  newlyEarned: EarnedBadge | null;
  dismissNewBadge: () => void;
  activeBadgeIds?: string[];
  /** Map badge_id → { cardUrl, iconUrl } — dynamic images from API */
  badgeImageMap: BadgeImageMap;
}

/**
 * Hook chính — tổng hợp data và evaluate badges.
 *
 * Dùng useQueries để fetch TẤT CẢ courses mà user enrolled.
 * React cho phép dynamic queries qua useQueries (không vi phạm Rules of Hooks).
 */
export function useBadges(): UseBadgesResult {
  const username = useAuthStore((s) => s.user?.username);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const { data: enrollments, isLoading: enrollLoading } = useMyEnrollments();
  const { data: certificates, isLoading: certLoading } = useMyCertificates();

  const { data: profile } = useQuery({
    queryKey: ["badgeProfile", username],
    queryFn: async () => {
      const user = useAuthStore.getState().user;
      return user ? {
        username: user.username,
        name: user.fullName,
        bio: null,
        date_joined: '',
      } : null;
    },
    enabled: isAuthenticated && !!username,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch badges từ BE
  const { data: beBadges, isSuccess: isBeBadgesLoaded } = useQuery({
    queryKey: ["user-badges", username],
    queryFn: getUserBadges,
    enabled: isAuthenticated && !!username,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch active badges (cấu hình bật/tắt từ tenant) — bây giờ trả full definition objects kèm image URLs
  const { data: activeBadgeDefs, isSuccess: isActiveBadgesLoaded } = useQuery({
    queryKey: ["active-badges", username],
    queryFn: getActiveBadges,
    enabled: isAuthenticated && !!username,
    staleTime: 10 * 60 * 1000,
  });

  // Tính activeBadgeIds từ activeBadgeDefs (backward compat)
  const activeBadgeIds = useMemo(() => {
    if (!activeBadgeDefs) return undefined;
    return activeBadgeDefs.map((b: BadgeDefinitionFromAPI) => b.id);
  }, [activeBadgeDefs]);

  // Build badge image map — memoized, chỉ tính lại khi activeBadgeDefs thay đổi
  const badgeImageMap = useMemo<BadgeImageMap>(() => {
    const map: BadgeImageMap = {};
    if (!activeBadgeDefs) return map;
    for (const b of activeBadgeDefs) {
      map[b.id] = {
        cardUrl: b.card_image_url ? storageUrl(b.card_image_url) : null,
        iconUrl: b.icon_image_url ? storageUrl(b.icon_image_url) : null,
        mobileCardUrl: b.mobile_card_image_url ? storageUrl(b.mobile_card_image_url) : null,
      };
    }
    return map;
  }, [activeBadgeDefs]);

  // Sync BE badges về localStorage để giữ lại flow hiển thị hiện tại
  useEffect(() => {
    if (isBeBadgesLoaded && beBadges) {
      syncBadgesToLocalStorage(beBadges, username);
    }
  }, [isBeBadgesLoaded, beBadges, username]);

  // Lấy tất cả course IDs từ enrollments
  const courseIds = useMemo(() => {
    if (!enrollments) return [];
    return enrollments.map((e: any) => e.course_id);
  }, [enrollments]);

  // ── 1 batch request thay vì N×blocks + N×progress ──
  // Trước đây: useQueries gọi getCourseBlocks() cho MỖI course (N recursive CTE queries)
  // Bây giờ: 1 getBatchCourseProgress() → 1 lightweight SQL query
  const { data: batchProgress, isSuccess: isBatchLoaded } = useQuery({
    queryKey: ["badge-progress-batch", ...courseIds],
    queryFn: () => getBatchCourseProgress(courseIds),
    enabled: isAuthenticated && courseIds.length > 0,
    staleTime: 10 * 60 * 1000, // 10 phút — badges không cần real-time
    gcTime: 30 * 60 * 1000,
  });

  const isLoading = enrollLoading || certLoading;

  // Build completion map từ batch progress result
  const courseCompletions = useMemo(() => {
    const map = new Map<string, number>();
    if (!batchProgress) return map;

    for (const [courseId, data] of Object.entries(batchProgress)) {
      map.set(courseId, data.progress);
    }
    return map;
  }, [batchProgress]);

  // courseGrades — giữ interface cho evaluator (dù hiện tại không badge nào dùng)
  const courseGrades = useMemo(() => {
    const map = new Map<string, any>();
    if (!batchProgress) return map;

    for (const [courseId, data] of Object.entries(batchProgress)) {
      map.set(courseId, {
        percent: data.progress / 100,
        passed: data.is_completed,
        letter_grade: null,
        section_breakdown: [],
      });
    }
    return map;
  }, [batchProgress]);

  // Lắng nghe event khi user update profile
  const [profileUpdateTrigger, setProfileUpdateTrigger] = useState(0);
  useEffect(() => {
    const handleUpdate = () => setProfileUpdateTrigger(prev => prev + 1);
    window.addEventListener("la_profile_updated", handleUpdate);
    return () => window.removeEventListener("la_profile_updated", handleUpdate);
  }, []);

  // Evaluate badges
  const earnedBadges = useMemo(() => {
    if (!enrollments || !isBeBadgesLoaded || !isActiveBadgesLoaded) return []; // Phải đợi BE load xong để localStorage có date đúng, tránh ghi đè
    return evaluateBadges({
      enrollments,
      certificates: certificates || [],
      courseCompletions,
      courseGrades,
      profile,
    }, username, activeBadgeIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enrollments, certificates, courseCompletions, courseGrades, profile, profileUpdateTrigger, username, isBeBadgesLoaded, isActiveBadgesLoaded, activeBadgeIds]);

  const unearnedBadges = useMemo(() => {
    if (!activeBadgeIds) return [];
    const earnedIds = new Set(earnedBadges.map((b) => b.badge.id));
    const activeSet = new Set(activeBadgeIds);
    return BADGE_DEFINITIONS.filter((b) => !earnedIds.has(b.id) && activeSet.has(b.id));
  }, [earnedBadges, activeBadgeIds]);

  // Mutation to save badge lên BE
  const { mutate: saveBadge } = useMutation({
    mutationFn: ({ badgeId, markAsShown }: { badgeId: string, markAsShown: boolean }) => saveUserBadge(badgeId, markAsShown)
  });

  // Track trạng thái load toàn bộ data để chặn popup khi đang load dở dang
  const isFullyLoaded = 
    !!enrollments && 
    isBeBadgesLoaded && 
    isBatchLoaded;

  const [allowPopups, setAllowPopups] = useState(false);

  useEffect(() => {
    if (isFullyLoaded) {
      const t = setTimeout(() => setAllowPopups(true), 1500); // Đợi 1.5s cho chắc ăn mọi logic render đã xong
      return () => clearTimeout(t);
    }
  }, [isFullyLoaded]);

  // Dùng Set để track các badge đã post lên BE (tránh lặp vô tận)
  const syncedRef = useRef<Set<string>>(new Set());

  // Auto-sync những danh hiệu FE vừa tính toán mà BE chưa có
  useEffect(() => {
    if (!beBadges || earnedBadges.length === 0) return;
    
    const beBadgeIds = new Set(beBadges.map((b: any) => b.badge_id));
    
    for (const earned of earnedBadges) {
      const id = earned.badge.id;
      // Nếu FE chấm là đạt (do logic progress), nhưng BE chưa có thì tự động đẩy lên BE
      if (!beBadgeIds.has(id) && !syncedRef.current.has(id)) {
        syncedRef.current.add(id);
        // Nếu đang trong quá trình load data ban đầu (!allowPopups), ta bảo BE đánh dấu is_shown = true
        saveBadge({ badgeId: id, markAsShown: !allowPopups });
      }
    }
  }, [earnedBadges, beBadges, saveBadge, allowPopups]);

  // Track newly earned badges qua hàng đợi (queue) để hiển thị lần lượt
  const [newBadgeQueue, setNewBadgeQueue] = useState<EarnedBadge[]>([]);
  const [currentBadge, setCurrentBadge] = useState<EarnedBadge | null>(null);
  const prevEarnedRef = useRef<Set<string>>(new Set());
  // Track badges đã bị dismiss nhưng animation chưa xong để tránh re-queue
  const dismissedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (earnedBadges.length === 0) return;

    // Xử lý triệt để: Trong giai đoạn đang load data dần dần từ API,
    // tuyệt đối không cho phép popup. Ép ghi vào LocalStorage là đã xem.
    if (!allowPopups) {
      earnedBadges.forEach(earned => {
        markBadgeShown(earned.badge.id, username);
      });
    }

    const shownIds = getShownBadgeIds(username);
    const currentIds = new Set(earnedBadges.map((b) => b.badge.id));

    // Lọc ra các badge mới hoàn toàn (chưa show + chưa trong dismissed buffer)
    // Nếu chưa allowPopups thì tuyệt đối không đẩy vào queue
    const newBadges = !allowPopups ? [] : earnedBadges.filter(
      (earned) =>
        !shownIds.has(earned.badge.id) &&
        !prevEarnedRef.current.has(earned.badge.id) &&
        !dismissedRef.current.has(earned.badge.id)
    );

    if (newBadges.length > 0) {
      setNewBadgeQueue((prev) => {
        const existingIds = new Set(prev.map((b) => b.badge.id));
        const toAdd = newBadges.filter((b) => !existingIds.has(b.badge.id));
        return [...prev, ...toAdd];
      });
    }

    prevEarnedRef.current = currentIds;
  }, [earnedBadges, username, allowPopups]);

  // Lấy badge từ queue ra hiển thị
  useEffect(() => {
    if (!currentBadge && newBadgeQueue.length > 0) {
      setCurrentBadge(newBadgeQueue[0]);
    }
  }, [currentBadge, newBadgeQueue]);

  const { mutate: updateShown } = useMutation({
    mutationFn: (badgeId: string) => updateBadgeShown(badgeId, true)
  });

  const dismissNewBadge = () => {
    if (!currentBadge) return;

    const badgeId = currentBadge.badge.id;
    markBadgeShown(badgeId, username);
    // Đánh dấu vào dismissed buffer ngay lập tức
    dismissedRef.current.add(badgeId);

    // Call API cập nhật trạng thái is_shown lên BE
    updateShown(badgeId);

    // Gỡ badge hiện tại để trigger exit animation của modal
    setCurrentBadge(null);

    // Chờ modal đóng hoàn toàn (500ms) trước khi pop queue
    setTimeout(() => {
      setNewBadgeQueue((prev) => prev.slice(1));
      // Sau khi queue pop xong thì mới xóa khỏi dismissed buffer
      dismissedRef.current.delete(badgeId);
    }, 500);
  };

  return {
    earnedBadges,
    unearnedBadges,
    totalBadges: activeBadgeIds ? activeBadgeIds.length : BADGE_DEFINITIONS.length,
    earnedCount: earnedBadges.length,
    isLoading,
    newlyEarned: currentBadge,
    dismissNewBadge,
    activeBadgeIds,
    badgeImageMap,
  };
}
