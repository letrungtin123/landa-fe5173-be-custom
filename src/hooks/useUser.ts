// ============================================================
// useUser Hook — Fetches user profile data from Open edX
// ============================================================

import { useQuery } from "@tanstack/react-query";
import { getUserAccount } from "@/api/auth";
import { useCourseCompletion } from "@/hooks/useProgress";
import { useAuthStore } from "@/stores/useAuthStore";
import { transformUserAccount } from "@/transformers/userTransformer";
import type { User } from "@/data/types";

/**
 * Hook to get the current user's profile, transformed to the FE User type.
 * Optionally includes overall progress from a specific course.
 */
export function useUser(courseId?: string) {
  const username = useAuthStore((s) => s.user?.username);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const accountQuery = useQuery({
    queryKey: ["user-account", username],
    queryFn: () => getUserAccount(username!),
    enabled: isAuthenticated && !!username,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const { completionPercent } = useCourseCompletion(courseId);

  // Calculate streak from localStorage
  const streak = getStreak();

  const user: User | undefined = accountQuery.data
    ? transformUserAccount(accountQuery.data, {
        streak,
        overallProgress: completionPercent || 0,
      })
    : undefined;

  return {
    user,
    isLoading: accountQuery.isLoading,
    error: accountQuery.error,
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
