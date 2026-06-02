// ============================================================
// useCourseFiles — Fetch danh sách tài liệu của course
//
// Endpoint custom BE: GET /api/learner/courses/:courseId/files
// Tạm stub trả mảng rỗng — chờ BE implement endpoint
// ============================================================

import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/useAuthStore";
import { apiClient } from "@/api/client";

export interface CourseFile {
  id: string;
  display_name: string;
  url: string;
  fullUrl: string;
  extension: string;
  content_type: string;
  size: number;
  date_added: string;
}

async function fetchCourseFiles(courseId: string): Promise<CourseFile[]> {
  try {
    const encodedId = encodeURIComponent(courseId);
    const { data } = await apiClient.get<{ success: boolean; data: { files: any[]; total: number } }>(
      `/api/learner/courses/${encodedId}/files`
    );
    return (data.data?.files || []).map((f: any) => ({
      ...f,
      fullUrl: f.url,
    }));
  } catch {
    // Endpoint chưa tồn tại trên custom BE → trả mảng rỗng
    return [];
  }
}

export function useCourseFiles(courseId: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery<CourseFile[]>({
    queryKey: ["course-files", courseId],
    queryFn: () => fetchCourseFiles(courseId),
    enabled: isAuthenticated && !!courseId,
    staleTime: 5 * 60 * 1000,
    placeholderData: [],
    retry: false,
  });
}
