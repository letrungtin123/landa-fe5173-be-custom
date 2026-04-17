import { useState, useEffect } from "react";

/**
 * Simulates a loading delay to show skeleton UI.
 * In production, replace with actual data fetching state from TanStack Query.
 *
 * @param delayMs - Duration of the simulated loading in milliseconds
 * @param depKey  - A dependency key (e.g. lessonId). When it changes the
 *                  loading state resets so the skeleton shows again.
 */
export function usePageLoading(
  delayMs: number = 1000,
  depKey?: string
): { isLoading: boolean } {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, delayMs);

    return () => clearTimeout(timer);
  }, [delayMs, depKey]);

  return { isLoading };
}
