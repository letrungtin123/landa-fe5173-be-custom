// ============================================================
// useUser Hook — Fetches user profile data from Custom Backend
// ============================================================

import { useQuery } from "@tanstack/react-query";
import { useCourseCompletion } from "@/hooks/useProgress";
import { useAuthStore } from "@/stores/useAuthStore";
import type { User } from "@/data/types";

/**
 * Hook to get the current user's profile, transformed to the FE User type.
 * Optionally includes overall progress from a specific course.
 */
export function useUser(courseId?: string) {
  const storeUser = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const { completionPercent } = useCourseCompletion(courseId);

  // Calculate streak from localStorage
  const streak = getStreak();

  const user: User | undefined = storeUser
    ? {
        name: storeUser.fullName || storeUser.username,
        email: storeUser.email,
        avatar: storeUser.avatar || "",
        bio: "",
        role: storeUser.role === 'learner' ? 'Học viên' : storeUser.role,
        company: storeUser.tenantName || "",
        streak,
        overallProgress: completionPercent || 0,
        phone_number: storeUser.phone || "",
        gender: null,
        year_of_birth: null,
        level_of_education: null,
        country: null,
        language: null,
      }
    : undefined;

  return {
    user,
    isLoading: false,
    error: null,
  };
}

// ── Streak tracking (localStorage-based) ──

function getStreak(): number {
  try {
    const data = JSON.parse(localStorage.getItem("la-streak") || "{}");
    return data.count || 0;
  } catch {
    return 0;
  }
}

/**
 * Call this when user completes a lesson or logs in to update streak.
 */
export function updateStreak(): number {
  const today = new Date().toDateString();
  try {
    const data = JSON.parse(localStorage.getItem("la-streak") || "{}");

    if (data.lastDate === today) return data.count || 1;

    const yesterday = new Date(Date.now() - 86400000).toDateString();
    const newCount = data.lastDate === yesterday ? (data.count || 0) + 1 : 1;

    localStorage.setItem(
      "la-streak",
      JSON.stringify({ lastDate: today, count: newCount })
    );
    return newCount;
  } catch {
    localStorage.setItem(
      "la-streak",
      JSON.stringify({ lastDate: today, count: 1 })
    );
    return 1;
  }
}
