// ============================================================
// useModalConfig Hook — Fetch cấu hình modal cho course
// ============================================================

import { useQuery } from "@tanstack/react-query";
import { getCourseModalConfig, type CourseModalConfigData } from "@/api/modalConfig";
import { useAuthStore } from "@/stores/useAuthStore";

export function useCourseModalConfig(courseId?: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery<CourseModalConfigData>({
    queryKey: ["course-modal-config", courseId],
    queryFn: () => getCourseModalConfig(courseId!),
    enabled: isAuthenticated && !!courseId,
    staleTime: 10 * 60 * 1000, // cache 10 phút
  });
}
