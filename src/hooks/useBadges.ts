// ============================================================
// useBadges Hook — React hook kết nối badge evaluation
//
// Hỗ trợ tất cả courses (không giới hạn 3).
// Dùng useQueries để fetch N courses song song.
// ============================================================

import { useMemo, useEffect, useRef, useState } from "react";
import { useQueries, useQuery, useMutation } from "@tanstack/react-query";
import { useMyEnrollments } from "./useCourses";
import { useMyCertificates } from "./useCertificates";
import { getCourseBlocks } from "@/api/courses";
import { getCourseGrade } from "@/api/progress";
import { getUserAccount } from "@/api/auth";
import { getUserBadges, saveUserBadge, updateBadgeShown } from "@/api/badges";
import { transformBlocksToCourse } from "@/transformers/blockTransformer";
import { evaluateBadges, getShownBadgeIds, markBadgeShown, syncBadgesToLocalStorage, type EarnedBadge } from "@/lib/badgeEvaluator";
import { BADGE_DEFINITIONS, type BadgeDefinition } from "@/data/badgeConfig";
import { useAuthStore } from "@/stores/useAuthStore";
import type { CourseGradeResponse } from "@/api/types";

export interface UseBadgesResult {
  earnedBadges: EarnedBadge[];
  unearnedBadges: BadgeDefinition[];
  totalBadges: number;
  earnedCount: number;
  isLoading: boolean;
  newlyEarned: EarnedBadge | null;
  dismissNewBadge: () => void;
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
    queryKey: ["userProfile", username],
    queryFn: () => getUserAccount(username!),
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

  // Sync BE badges về localStorage để giữ lại flow hiển thị hiện tại
  useEffect(() => {
    if (isBeBadgesLoaded && beBadges) {
      syncBadgesToLocalStorage(beBadges, username);
    }
  }, [isBeBadgesLoaded, beBadges, username]);

  // Lấy tất cả course IDs từ enrollments
  const courseIds = useMemo(() => {
    if (!enrollments) return [];
    return enrollments.map((e) => e.course_details.course_id);
  }, [enrollments]);

  // ── useQueries: fetch blocks cho TẤT CẢ courses ──
  // React Query cho phép dynamic array — không vi phạm Rules of Hooks
  const blockQueries = useQueries({
    queries: courseIds.map((courseId) => ({
      queryKey: ["course-blocks", courseId, username],
      queryFn: () => getCourseBlocks(courseId, username),
      enabled: isAuthenticated && !!courseId && !!username,
      staleTime: 2 * 60 * 1000,
      select: transformBlocksToCourse,
    })),
  });

  // ── useQueries: fetch grades cho TẤT CẢ courses ──
  const gradeQueries = useQueries({
    queries: courseIds.map((courseId) => ({
      queryKey: ["course-grade", courseId, username],
      queryFn: () => getCourseGrade(courseId, username!),
      enabled: isAuthenticated && !!courseId && !!username,
      staleTime: 5 * 60 * 1000,
    })),
  });

  const isLoading = enrollLoading || certLoading;

  // Build completion map từ tất cả courses
  const courseCompletions = useMemo(() => {
    const map = new Map<string, number>();

    courseIds.forEach((id, idx) => {
      const courseData = blockQueries[idx]?.data;
      if (!courseData?.modules?.length) return;

      const totalModules = courseData.modules.length;
      let totalProgress = 0;

      for (const m of courseData.modules) {
        if (m.completed) {
          totalProgress += 100;
        } else {
          const p = parseInt(m.progress || "0", 10);
          totalProgress += isNaN(p) ? 0 : p;
        }
      }

      map.set(id, Math.round(totalProgress / totalModules));
    });

    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseIds, blockQueries.map((q) => q.data)]);

  const courseGrades = useMemo(() => {
    const map = new Map<string, CourseGradeResponse>();

    courseIds.forEach((id, idx) => {
      const gradeData = gradeQueries[idx]?.data;
      if (gradeData) map.set(id, gradeData);
    });

    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseIds, gradeQueries.map((q) => q.data)]);

  // Lắng nghe event khi user update profile
  const [profileUpdateTrigger, setProfileUpdateTrigger] = useState(0);
  useEffect(() => {
    const handleUpdate = () => setProfileUpdateTrigger(prev => prev + 1);
    window.addEventListener("la_profile_updated", handleUpdate);
    return () => window.removeEventListener("la_profile_updated", handleUpdate);
  }, []);

  // Evaluate badges
  const earnedBadges = useMemo(() => {
    if (!enrollments || !isBeBadgesLoaded) return []; // Phải đợi BE load xong để localStorage có date đúng, tránh ghi đè
    return evaluateBadges({
      enrollments,
      certificates: certificates || [],
      courseCompletions,
      courseGrades,
      profile,
    }, username);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enrollments, certificates, courseCompletions, courseGrades, profile, profileUpdateTrigger, username, isBeBadgesLoaded]);

  const unearnedBadges = useMemo(() => {
    const earnedIds = new Set(earnedBadges.map((b) => b.badge.id));
    return BADGE_DEFINITIONS.filter((b) => !earnedIds.has(b.id));
  }, [earnedBadges]);

  // Mutation to save badge lên BE
  const { mutate: saveBadge } = useMutation({
    mutationFn: ({ badgeId, markAsShown }: { badgeId: string, markAsShown: boolean }) => saveUserBadge(badgeId, markAsShown)
  });

  // Track trạng thái load toàn bộ data để chặn popup khi đang load dở dang
  const isFullyLoaded = 
    !!enrollments && 
    isBeBadgesLoaded && 
    blockQueries.every(q => q.isSuccess || q.isError) && 
    gradeQueries.every(q => q.isSuccess || q.isError);

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
    totalBadges: BADGE_DEFINITIONS.length,
    earnedCount: earnedBadges.length,
    isLoading,
    newlyEarned: currentBadge,
    dismissNewBadge,
  };
}
