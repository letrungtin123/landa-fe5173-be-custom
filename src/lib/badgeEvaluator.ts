// ============================================================
// Badge Evaluator — Pure logic xác định badges đã earn
//
// KHÔNG có side-effects, KHÔNG import React.
// Dễ unit-test với mock data.
// ============================================================

import { BADGE_DEFINITIONS, type BadgeDefinition } from "@/data/badgeConfig";
import type { Certificate } from "@/api/certificates";
import type { EnrollmentItem, CourseGradeResponse } from "@/api/types";

export interface EarnedBadge {
  badge: BadgeDefinition;
  earnedAt: string;
  courseId?: string;
  courseName?: string;
}

export interface EvaluationData {
  enrollments: EnrollmentItem[];
  certificates: Certificate[];
  courseCompletions: Map<string, number>;  // courseId → percent (0-100)
  courseGrades: Map<string, CourseGradeResponse>;
}

const STORAGE_KEY = "la_badge_timestamps";

/** Lưu timestamp earn badge vào localStorage */
function persistTimestamp(badgeId: string): string {
  const now = new Date().toISOString();
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    if (!stored[badgeId]) {
      stored[badgeId] = now;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    }
    return stored[badgeId];
  } catch {
    return now;
  }
}

/** Lấy timestamp đã lưu  */
function getTimestamp(badgeId: string): string | null {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return stored[badgeId] || null;
  } catch {
    return null;
  }
}

/** Lấy tất cả badge IDs đã hiển thị unlock modal */
export function getShownBadgeIds(): Set<string> {
  try {
    const shown = JSON.parse(localStorage.getItem("la_badge_shown") || "[]");
    return new Set(shown);
  } catch {
    return new Set();
  }
}

/** Đánh dấu badge đã hiển thị unlock modal */
export function markBadgeShown(badgeId: string): void {
  try {
    const shown = getShownBadgeIds();
    shown.add(badgeId);
    localStorage.setItem("la_badge_shown", JSON.stringify([...shown]));
  } catch {
    // silent fail
  }
}

/**
 * Core evaluation function — kiểm tra từng badge definition
 * dựa trên dữ liệu real-time từ API.
 */
export function evaluateBadges(data: EvaluationData): EarnedBadge[] {
  const earned: EarnedBadge[] = [];
  const { enrollments, certificates, courseCompletions, courseGrades } = data;

  for (const badge of BADGE_DEFINITIONS) {
    const result = checkBadge(badge, enrollments, certificates, courseCompletions, courseGrades);
    if (result) {
      const timestamp = getTimestamp(badge.id) || persistTimestamp(badge.id);
      earned.push({
        badge,
        earnedAt: timestamp,
        courseId: result.courseId,
        courseName: result.courseName,
      });
    }
  }

  return earned;
}

interface CheckResult {
  courseId?: string;
  courseName?: string;
}

function checkBadge(
  badge: BadgeDefinition,
  enrollments: EnrollmentItem[],
  certificates: Certificate[],
  completions: Map<string, number>,
  grades: Map<string, CourseGradeResponse>,
): CheckResult | null {
  switch (badge.id) {
    // ── Completion ──
    case "first_step": {
      for (const [courseId, pct] of completions) {
        if (pct > 0) {
          const name = enrollments.find(e => e.course_details.course_id === courseId)?.course_details.course_name;
          return { courseId, courseName: name };
        }
      }
      return null;
    }

    case "halfway_hero": {
      for (const [courseId, pct] of completions) {
        if (pct >= 50) {
          const name = enrollments.find(e => e.course_details.course_id === courseId)?.course_details.course_name;
          return { courseId, courseName: name };
        }
      }
      return null;
    }

    case "course_conqueror": {
      for (const [courseId, pct] of completions) {
        if (pct >= 100) {
          const name = enrollments.find(e => e.course_details.course_id === courseId)?.course_details.course_name;
          return { courseId, courseName: name };
        }
      }
      return null;
    }

    case "almost_there": {
      for (const [courseId, pct] of completions) {
        if (pct >= 90) {
          const name = enrollments.find(e => e.course_details.course_id === courseId)?.course_details.course_name;
          return { courseId, courseName: name };
        }
      }
      return null;
    }

    // ── Grade ──
    case "passing_grade": {
      for (const [courseId, grade] of grades) {
        if (grade.passed) {
          const name = enrollments.find(e => e.course_details.course_id === courseId)?.course_details.course_name;
          return { courseId, courseName: name };
        }
      }
      return null;
    }

    case "high_achiever": {
      for (const [courseId, grade] of grades) {
        if (grade.percent >= 0.9) {
          const name = enrollments.find(e => e.course_details.course_id === courseId)?.course_details.course_name;
          return { courseId, courseName: name };
        }
      }
      return null;
    }

    case "perfect_score": {
      for (const [courseId, grade] of grades) {
        if (grade.percent >= 0.98) {
          const name = enrollments.find(e => e.course_details.course_id === courseId)?.course_details.course_name;
          return { courseId, courseName: name };
        }
      }
      return null;
    }

    case "first_blood": {
      for (const [courseId, grade] of grades) {
        if (grade.percent > 0) {
          const name = enrollments.find(e => e.course_details.course_id === courseId)?.course_details.course_name;
          return { courseId, courseName: name };
        }
      }
      return null;
    }

    // ── Certificate ──
    case "certified": {
      const cert = certificates.find(c => c.status === "downloadable");
      if (cert) {
        const name = enrollments.find(e => e.course_details.course_id === cert.course_id)?.course_details.course_name;
        return { courseId: cert.course_id, courseName: name };
      }
      return null;
    }

    case "multi_certified": {
      const certs = certificates.filter(c => c.status === "downloadable");
      if (certs.length >= 3) return {};
      return null;
    }

    // ── Enrollment ──
    case "explorer": {
      if (enrollments.length >= 3) return {};
      return null;
    }

    case "dedicated_learner": {
      // 1 course tính là "hoàn thành" nếu completion 100% HOẶC grade.passed
      const completedCourseIds = new Set<string>();
      for (const [courseId, pct] of completions) {
        if (pct >= 100) completedCourseIds.add(courseId);
      }
      for (const [courseId, grade] of grades) {
        if (grade.passed) completedCourseIds.add(courseId);
      }
      if (completedCourseIds.size >= 2) return {};
      return null;
    }

    case "knowledge_seeker": {
      if (enrollments.length >= 1) return {};
      return null;
    }

    case "bookworm": {
      if (enrollments.length >= 5) return {};
      return null;
    }

    case "veteran": {
      const completedCourseIds = new Set<string>();
      for (const [courseId, pct] of completions) {
        if (pct >= 100) completedCourseIds.add(courseId);
      }
      for (const [courseId, grade] of grades) {
        if (grade.passed) completedCourseIds.add(courseId);
      }
      if (completedCourseIds.size >= 5) return {};
      return null;
    }

    default:
      return null;
  }
}
