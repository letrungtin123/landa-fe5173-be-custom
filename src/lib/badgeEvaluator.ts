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

const STORAGE_KEY = "la_badge_timestamps";

/** Lưu timestamp earn badge vào localStorage */
function persistTimestamp(badgeId: string, username?: string): string {
  const key = username ? `${STORAGE_KEY}_${username}` : STORAGE_KEY;
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
function getTimestamp(badgeId: string, username?: string): string | null {
  const key = username ? `${STORAGE_KEY}_${username}` : STORAGE_KEY;
  try {
    const stored = JSON.parse(localStorage.getItem(key) || "{}");
    return stored[badgeId] || null;
  } catch {
    return null;
  }
}

/** Lấy tất cả badge IDs đã hiển thị unlock modal */
export function getShownBadgeIds(username?: string): Set<string> {
  const key = username ? `la_badge_shown_${username}` : "la_badge_shown";
  try {
    const shown = JSON.parse(localStorage.getItem(key) || "[]");
    return new Set(shown);
  } catch {
    return new Set();
  }
}

/** Đánh dấu badge đã hiển thị unlock modal */
export function markBadgeShown(badgeId: string, username?: string): void {
  const key = username ? `la_badge_shown_${username}` : "la_badge_shown";
  try {
    const shown = getShownBadgeIds(username);
    shown.add(badgeId);
    localStorage.setItem(key, JSON.stringify([...shown]));
  } catch {
    // silent fail
  }
}

/** Đồng bộ data từ Backend về LocalStorage */
export function syncBadgesToLocalStorage(beBadges: Array<{badge_id: string, is_shown: boolean, earned_at: string}>, username?: string): void {
  const tsKey = username ? `${STORAGE_KEY}_${username}` : STORAGE_KEY;
  const shownKey = username ? `la_badge_shown_${username}` : "la_badge_shown";
  
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
export function evaluateBadges(data: EvaluationData, username?: string): EarnedBadge[] {
  const earned: EarnedBadge[] = [];

  // ── HACK: Force unlock badges via localStorage ──
  // Cách dùng (trong Console):
  //   localStorage.setItem('la_badge_hack', JSON.stringify(['first_step','la_expert']))
  //   localStorage.setItem('la_badge_hack', '"all"')  ← unlock tất cả
  //   localStorage.removeItem('la_badge_hack')         ← tắt hack
  try {
    const hackRaw = localStorage.getItem('la_badge_hack');
    if (hackRaw) {
      const hackValue = JSON.parse(hackRaw);
      const hackIds: string[] = hackValue === 'all'
        ? BADGE_DEFINITIONS.map(b => b.id)
        : Array.isArray(hackValue) ? hackValue : [];

      for (const id of hackIds) {
        const badge = BADGE_DEFINITIONS.find(b => b.id === id);
        if (badge) {
          const timestamp = getTimestamp(badge.id, username) || persistTimestamp(badge.id, username);
          earned.push({ badge, earnedAt: timestamp, courseName: '🔓 Hacked' });
        }
      }
      if (earned.length > 0) return earned;
    }
  } catch { /* silent */ }

  for (const badge of BADGE_DEFINITIONS) {
    if (badge.id === "perfect_profile") continue;

    const result = checkBadge(badge, data, username);
    if (result) {
      // Clear legacy global key if present to prevent false positives
      if (localStorage.getItem("la_profile_updated")) {
        localStorage.removeItem("la_profile_updated");
      }
      
      const timestamp = getTimestamp(badge.id, username) || persistTimestamp(badge.id, username);
      earned.push({
        badge,
        earnedAt: timestamp,
        courseId: result.courseId,
        courseName: result.courseName,
      });
    }
  }

  // Kiểm tra "Mảnh ghép hoàn hảo"
  const profileUpdatedKey = username ? `la_profile_updated_${username}` : "la_profile_updated";
  const hasProfileUpdateInStorage = localStorage.getItem(profileUpdatedKey) === "true";
  
  // Kiểm tra trên object profile thực tế từ API (phòng khi mất localStorage)
  let hasProfileData = false;
  if (data.profile) {
    const p = data.profile;
    // Profile được coi là đã update nếu có bất kỳ trường thông tin nào ngoài mặc định
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
    const badge = BADGE_DEFINITIONS.find((b) => b.id === "perfect_profile");
    if (badge) {
      // Khôi phục lại cờ trong localStorage nếu API xác nhận đã update nhưng localStorage trống
      if (hasProfileData && !hasProfileUpdateInStorage) {
        localStorage.setItem(profileUpdatedKey, "true");
      }
      
      const timestamp = getTimestamp(badge.id, username) || persistTimestamp(badge.id, username);
      earned.push({
        badge,
        earnedAt: timestamp,
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
  data: EvaluationData,
  username?: string
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
      if (username && getTimestamp("speed_scholar", username)) {
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
