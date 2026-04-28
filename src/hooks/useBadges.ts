// ============================================================
// useBadges Hook — React hook kết nối badge evaluation
//
// Hỗ trợ tất cả courses (không giới hạn 3).
// Dùng useQueries để fetch N courses song song.
// ============================================================

import { useMemo, useEffect, useRef, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { useMyEnrollments } from "./useCourses";
import { useMyCertificates } from "./useCertificates";
import { getCourseBlocks } from "@/api/courses";
import { getCourseGrade } from "@/api/progress";
import { transformBlocksToCourse } from "@/transformers/blockTransformer";
import { evaluateBadges, getShownBadgeIds, markBadgeShown, type EarnedBadge } from "@/lib/badgeEvaluator";
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

  // Build grades map
  const courseGrades = useMemo(() => {
    const map = new Map<string, CourseGradeResponse>();

    courseIds.forEach((id, idx) => {
      const gradeData = gradeQueries[idx]?.data;
      if (gradeData) map.set(id, gradeData);
    });

    return map;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseIds, gradeQueries.map((q) => q.data)]);

  // Evaluate badges
  const earnedBadges = useMemo(() => {
    if (!enrollments) return [];
    return evaluateBadges({
      enrollments,
      certificates: certificates || [],
      courseCompletions,
      courseGrades,
    });
  }, [enrollments, certificates, courseCompletions, courseGrades]);

  const unearnedBadges = useMemo(() => {
    const earnedIds = new Set(earnedBadges.map((b) => b.badge.id));
    return BADGE_DEFINITIONS.filter((b) => !earnedIds.has(b.id));
  }, [earnedBadges]);

  // Track newly earned badge cho unlock modal
  const [newlyEarned, setNewlyEarned] = useState<EarnedBadge | null>(null);
  const prevEarnedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (earnedBadges.length === 0) return;

    const shownIds = getShownBadgeIds();
    const currentIds = new Set(earnedBadges.map((b) => b.badge.id));

    // Tìm badge mới chưa từng hiển thị modal
    for (const earned of earnedBadges) {
      if (!shownIds.has(earned.badge.id) && !prevEarnedRef.current.has(earned.badge.id)) {
        setNewlyEarned(earned);
        break;
      }
    }

    prevEarnedRef.current = currentIds;
  }, [earnedBadges]);

  const dismissNewBadge = () => {
    if (newlyEarned) {
      markBadgeShown(newlyEarned.badge.id);
      setNewlyEarned(null);
    }
  };

  return {
    earnedBadges,
    unearnedBadges,
    totalBadges: BADGE_DEFINITIONS.length,
    earnedCount: earnedBadges.length,
    isLoading,
    newlyEarned,
    dismissNewBadge,
  };
}
