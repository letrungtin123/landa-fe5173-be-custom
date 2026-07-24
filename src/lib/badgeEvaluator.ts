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
  profile?: any;
}

export interface BadgeProgressInfo {
  current: number;
  target: number;
  percent: number;
  label: string;
}

export type BadgeProgressMap = Record<string, BadgeProgressInfo>;

const STORAGE_KEY = "la_badge_timestamps";
const transientTimestamps = new Map<string, string>();
const transientShown = new Map<string, Set<string>>();

export interface BadgeStorageOptions {
  transient?: boolean;
}

function scopedKey(base: string, username?: string): string {
  return username ? `${base}_${username}` : base;
}

function transientKey(username?: string): string {
  return username || "__anonymous__";
}

export function resetTransientBadgeStorage(): void {
  transientTimestamps.clear();
  transientShown.clear();
}

function toProgressInfo(current: number, target: number, unitLabel: string): BadgeProgressInfo {
  const safeTarget = Math.max(1, target);
  const clampedCurrent = Math.min(Math.max(0, current), safeTarget);

  return {
    current: clampedCurrent,
    target: safeTarget,
    percent: Math.round((clampedCurrent / safeTarget) * 100),
    label: `${clampedCurrent}/${safeTarget} ${unitLabel}`,
  };
}

/**
 * Build progress for badge rules that are based on completed course counts.
 * Badges with non-count logic (profile, completion speed, etc.) intentionally
 * return no progress so the locked-card back side stays clean.
 */
export function buildBadgeProgressMap(
  data: EvaluationData,
  activeBadgeIds?: string[]
): BadgeProgressMap {
  const activeSet = activeBadgeIds ? new Set(activeBadgeIds) : null;
  const shouldInclude = (badgeId: string) => !activeSet || activeSet.has(badgeId);
  const progressMap: BadgeProgressMap = {};
  const enrollmentById = new Map(data.enrollments.map((e) => [e.course_id, e]));

  let completedCount = 0;
  let onboardingCompletedCount = 0;
  let recruitmentCompletedCount = 0;
  let hasCompletedOnboarding = false;
  let hasCompletedOther = false;

  for (const [courseId, pct] of data.courseCompletions) {
    if (pct < 100) continue;

    completedCount++;

    const courseName = enrollmentById.get(courseId)?.display_name?.toLowerCase() || "";
    const isOnboarding = courseName.includes("onboarding");
    const isRecruitment = courseName.includes("tuy\u1ec3n d\u1ee5ng");

    if (isOnboarding) {
      onboardingCompletedCount++;
      hasCompletedOnboarding = true;
    } else {
      hasCompletedOther = true;
    }

    if (isRecruitment) {
      recruitmentCompletedCount++;
    }
  }

  const put = (badgeId: string, current: number, target: number, unitLabel = "kh\u00f3a") => {
    if (!shouldInclude(badgeId)) return;
    progressMap[badgeId] = toProgressInfo(current, target, unitLabel);
  };

  put("onboarding_warrior", onboardingCompletedCount, 1);
  put("value_holder", onboardingCompletedCount, 2);
  put("la_ambassador", Number(hasCompletedOnboarding) + Number(hasCompletedOther), 2);
  put("la_breakthrough", completedCount, 3);
  put("la_expert", completedCount, 5);
  put("recruitment_master", recruitmentCompletedCount, 1);
  put("otif_expert", recruitmentCompletedCount, 2);
  put("trusted_ambassador", recruitmentCompletedCount, 3);
  put("omnipotent_master", completedCount, 20);
  put("system_explorer", completedCount, 10);

  return progressMap;
}

/** Lưu timestamp earn badge vào localStorage */
function persistTimestamp(badgeId: string, username?: string, options?: BadgeStorageOptions): string {
  if (options?.transient) {
    const key = `${transientKey(username)}:${badgeId}`;
    const existing = transientTimestamps.get(key);
    if (existing) return existing;
    const now = new Date().toISOString();
    transientTimestamps.set(key, now);
    return now;
  }

  const key = scopedKey(STORAGE_KEY, username);
  const now = new Date().toISOString();
  try {
    const stored = JSON.parse(localStorage.getItem(key) || "{}");
    if (!stored[badgeId]) {
      stored[badgeId] = now;
      localStorage.setItem(key, JSON.stringify(stored));
    }
    return stored[badgeId];
  } catch {
    return now;
  }
}

/** Lấy timestamp đã lưu  */
function getTimestamp(badgeId: string, username?: string, options?: BadgeStorageOptions): string | null {
  if (options?.transient) {
    return transientTimestamps.get(`${transientKey(username)}:${badgeId}`) || null;
  }

  const key = scopedKey(STORAGE_KEY, username);
  try {
    const stored = JSON.parse(localStorage.getItem(key) || "{}");
    return stored[badgeId] || null;
  } catch {
    return null;
  }
}

/** Lấy tất cả badge IDs đã hiển thị unlock modal */
export function getShownBadgeIds(username?: string, options?: BadgeStorageOptions): Set<string> {
  if (options?.transient) {
    return new Set(transientShown.get(transientKey(username)) || []);
  }

  const key = scopedKey("la_badge_shown", username);
  try {
    const shown = JSON.parse(localStorage.getItem(key) || "[]");
    return new Set(shown);
  } catch {
    return new Set();
  }
}

/** Đánh dấu badge đã hiển thị unlock modal */
export function markBadgeShown(badgeId: string, username?: string, options?: BadgeStorageOptions): void {
  if (options?.transient) {
    const key = transientKey(username);
    const shown = transientShown.get(key) || new Set<string>();
    shown.add(badgeId);
    transientShown.set(key, shown);
    return;
  }

  const key = scopedKey("la_badge_shown", username);
  try {
    const shown = getShownBadgeIds(username, options);
    shown.add(badgeId);
    localStorage.setItem(key, JSON.stringify([...shown]));
  } catch {
    // silent fail
  }
}

/** Đồng bộ data từ Backend về LocalStorage */
export function syncBadgesToLocalStorage(beBadges: Array<{badge_id: string, is_shown: boolean, earned_at: string}>, username?: string, options?: BadgeStorageOptions): void {
  if (options?.transient) return;

  const tsKey = scopedKey(STORAGE_KEY, username);
  const shownKey = scopedKey("la_badge_shown", username);
  
  try {
    const timestamps = JSON.parse(localStorage.getItem(tsKey) || "{}");
    const shownList = new Set<string>(JSON.parse(localStorage.getItem(shownKey) || "[]"));
    
    let updatedTs = false;
    let updatedShown = false;
    
    for (const b of beBadges) {
      if (!timestamps[b.badge_id]) {
        timestamps[b.badge_id] = b.earned_at;
        updatedTs = true;
      }
      if (b.is_shown && !shownList.has(b.badge_id)) {
        shownList.add(b.badge_id);
        updatedShown = true;
      }
    }
    
    if (updatedTs) {
      localStorage.setItem(tsKey, JSON.stringify(timestamps));
    }
    if (updatedShown) {
      localStorage.setItem(shownKey, JSON.stringify([...shownList]));
    }
  } catch {
    // silent fail
  }
}

/**
 * Core evaluation function — kiểm tra từng badge definition
 * dựa trên dữ liệu real-time từ API.
 */
export function evaluateBadges(data: EvaluationData, username?: string, activeBadgeIds?: string[], options?: BadgeStorageOptions): EarnedBadge[] {
  const earned: EarnedBadge[] = [];
  const activeSet = activeBadgeIds ? new Set(activeBadgeIds) : null;

  for (const badge of BADGE_DEFINITIONS) {
    if (activeSet && !activeSet.has(badge.id)) continue;
    if (badge.id === "perfect_profile") continue;

    // Nếu đã đạt được từ trước (hoặc backend trả về), luôn luôn tính là đã đạt
    const existingTimestamp = getTimestamp(badge.id, username, options);
    if (existingTimestamp) {
      earned.push({
        badge,
        earnedAt: existingTimestamp,
      });
      continue;
    }

    const result = checkBadge(badge, data, username, options);
    if (result) {
      // Clear legacy global key if present to prevent false positives
      if (!options?.transient && localStorage.getItem("la_profile_updated")) {
        localStorage.removeItem("la_profile_updated");
      }
      
      const newTimestamp = persistTimestamp(badge.id, username, options);
      earned.push({
        badge,
        earnedAt: newTimestamp,
        courseId: result.courseId,
        courseName: result.courseName,
      });
    }
  }

  // Kiểm tra "Mảnh ghép hoàn hảo"
  const ppBadge = BADGE_DEFINITIONS.find((b) => b.id === "perfect_profile");
  if (ppBadge && (!activeSet || activeSet.has(ppBadge.id))) {
    const ppTimestamp = getTimestamp(ppBadge.id, username, options);
    if (ppTimestamp) {
      earned.push({
        badge: ppBadge,
        earnedAt: ppTimestamp,
      });
    } else {
      const profileUpdatedKey = username ? `la_profile_updated_${username}` : "la_profile_updated";
      const hasProfileUpdateInStorage = !options?.transient && localStorage.getItem(profileUpdatedKey) === "true";
      
      // Kiểm tra trên object profile thực tế từ API (phòng khi mất localStorage)
      let hasProfileData = false;
      if (data.profile) {
        const p = data.profile;
        if (
          p.year_of_birth || 
          p.gender || 
          p.level_of_education || 
          p.country || 
          p.goals || 
          p.bio || 
          (p.language_proficiencies && p.language_proficiencies.length > 0) ||
          (p.profile_image && p.profile_image.has_image)
        ) {
          hasProfileData = true;
        }
      }

      if (hasProfileUpdateInStorage || hasProfileData) {
        if (!options?.transient && hasProfileData && !hasProfileUpdateInStorage) {
          localStorage.setItem(profileUpdatedKey, "true");
        }
        
        const newTs = persistTimestamp(ppBadge.id, username, options);
        earned.push({
          badge: ppBadge,
          earnedAt: newTs,
        });
      }
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
  data: EvaluationData,
  username?: string,
  options?: BadgeStorageOptions,
): CheckResult | null {
  const { enrollments, certificates, courseCompletions: completions, courseGrades: grades } = data;

  switch (badge.id) {
    // ── Completion ──
    case "first_step": {
      for (const [courseId, pct] of completions) {
        if (pct > 0) {
          const name = enrollments.find(e => e.course_id === courseId)?.display_name;
          return { courseId, courseName: name };
        }
      }
      return null;
    }

    case "onboarding_warrior": {
      for (const [courseId, pct] of completions) {
        if (pct >= 100) {
          const name = enrollments.find(e => e.course_id === courseId)?.display_name;
          if (name && name.toLowerCase().includes("onboarding")) {
            return { courseId, courseName: name };
          }
        }
      }
      return null;
    }

    case "speed_scholar": {
      if (username && getTimestamp("speed_scholar", username, options)) {
         return {}; // Đã đạt được thì giữ nguyên vĩnh viễn
      }
      for (const [courseId, pct] of completions) {
        if (pct >= 100) {
          const enrollment = enrollments.find(e => e.course_id === courseId);
          if (enrollment && enrollment.enrolled_at) {
            const enrolledAt = new Date(enrollment.enrolled_at).getTime();
            const now = Date.now();
            const diffMinutes = (now - enrolledAt) / (1000 * 60);
            if (diffMinutes <= 10) {
              return { courseId, courseName: enrollment.display_name };
            }
          }
        }
      }
      return null;
    }

    case "value_holder": {
      let onboardingCount = 0;
      for (const [courseId, pct] of completions) {
        if (pct >= 100) {
          const name = enrollments.find(e => e.course_id === courseId)?.display_name;
          if (name && name.toLowerCase().includes("onboarding")) {
            onboardingCount++;
          }
        }
      }
      if (onboardingCount >= 2) {
        return { courseName: "Nhiều khóa Onboarding" };
      }
      return null;
    }

    case "la_breakthrough": {
      let count = 0;
      for (const pct of completions.values()) {
        if (pct >= 100) count++;
      }
      if (count >= 3) {
        return { courseName: "3 khóa học bất kỳ" };
      }
      return null;
    }

    case "la_expert": {
      let count = 0;
      for (const pct of completions.values()) {
        if (pct >= 100) count++;
      }
      if (count >= 5) {
        return { courseName: "5 khóa học bất kỳ" };
      }
      return null;
    }

    case "la_ambassador": {
      let hasOnboarding = false;
      let hasOther = false;
      for (const [courseId, pct] of completions) {
        if (pct >= 100) {
          const name = enrollments.find(e => e.course_id === courseId)?.display_name;
          if (name && name.toLowerCase().includes("onboarding")) {
            hasOnboarding = true;
          } else if (name) {
            hasOther = true;
          }
        }
      }
      if (hasOnboarding && hasOther) {
        return { courseName: "Nhiều khóa học" };
      }
      return null;
    }

    case "system_explorer": {
      let count = 0;
      for (const pct of completions.values()) {
        if (pct >= 100) count++;
      }
      if (count >= 10) {
        return { courseName: "10 khóa học bất kỳ" };
      }
      return null;
    }

    case "recruitment_master": {
      for (const [courseId, pct] of completions) {
        if (pct >= 100) {
          const name = enrollments.find(e => e.course_id === courseId)?.display_name;
          if (name && name.toLowerCase().includes("tuyển dụng")) {
            return { courseId, courseName: name };
          }
        }
      }
      return null;
    }

    case "otif_expert": {
      let count = 0;
      for (const [courseId, pct] of completions) {
        if (pct >= 100) {
          const name = enrollments.find(e => e.course_id === courseId)?.display_name;
          if (name && name.toLowerCase().includes("tuyển dụng")) {
            count++;
          }
        }
      }
      if (count >= 2) {
        return { courseName: "Nhiều khóa học Tuyển dụng" };
      }
      return null;
    }

    case "trusted_ambassador": {
      let count = 0;
      for (const [courseId, pct] of completions) {
        if (pct >= 100) {
          const name = enrollments.find(e => e.course_id === courseId)?.display_name;
          if (name && name.toLowerCase().includes("tuyển dụng")) {
            count++;
          }
        }
      }
      if (count >= 3) {
        return { courseName: "Nhiều khóa học Tuyển dụng" };
      }
      return null;
    }

    case "omnipotent_master": {
      let count = 0;
      for (const pct of completions.values()) {
        if (pct >= 100) count++;
      }
      if (count >= 20) {
        return { courseName: "20 khóa học bất kỳ" };
      }
      return null;
    }

    // ── Profile ──
    // perfect_profile được xử lý riêng bên ngoài loop
    
    default:
      return null;
  }
}
