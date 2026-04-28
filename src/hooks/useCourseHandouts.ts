// ============================================================
// useCourseHandouts — Fetch + parse tài liệu tham khảo của course
// Dùng LMS Mobile API, accessible bởi enrolled user thường
// ============================================================

import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/useAuthStore";
import { getCourseHandoutsHtml, parseHandoutsToDocuments } from "@/api/courseAssets";
import { config } from "@/config/env";
import type { ParsedDocument } from "@/api/courseAssets";

export type { ParsedDocument };

export function useCourseHandouts(courseId: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery<ParsedDocument[]>({
    queryKey: ["course-handouts", courseId],
    queryFn: async () => {
      const { handouts_html } = await getCourseHandoutsHtml(courseId);
      if (!handouts_html) return [];
      return parseHandoutsToDocuments(handouts_html, config.lmsBaseUrl);
    },
    enabled: isAuthenticated && !!courseId,
    staleTime: 10 * 60 * 1000,   // 10 phút — tài liệu không thay đổi thường xuyên
    placeholderData: [],
  });
}
