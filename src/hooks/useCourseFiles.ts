// ============================================================
// useCourseFiles — Fetch danh sách tài liệu của course
//
// Dùng LANDA custom API thay vì Handouts API vì:
//   - Admin chỉ cần upload file trên Studio + Unlock → xong
//   - Không cần viết HTML handouts
//
// Endpoint: GET /api/landa/v0/course_files/{courseId}/
// Auth: Bearer JWT, user phải enrolled (hoặc is_staff)
// ============================================================

import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/useAuthStore";
import { apiClient } from "@/api/client";
import { config } from "@/config/env";

export interface CourseFile {
  id: string;
  display_name: string;
  url: string;          // relative: /asset-v1:...
  fullUrl: string;      // absolute: http://local.openedx.io/asset-v1:...
  extension: string;    // "pdf" | "docx" | "pptx" | "xlsx" | ...
  content_type: string;
  size: number;
  date_added: string;
}

interface CourseFilesResponse {
  files: Array<{
    id: string;
    display_name: string;
    url: string;
    extension: string;
    content_type: string;
    size: number;
    date_added: string;
  }>;
  total: number;
}

async function fetchCourseFiles(courseId: string): Promise<CourseFile[]> {
  const encodedId = encodeURIComponent(courseId);
  const { data } = await apiClient.get<CourseFilesResponse>(
    `/api/landa/v0/course_files/${encodedId}/`
  );
  return data.files.map((f) => ({
    ...f,
    fullUrl: f.url.startsWith("http") ? f.url : `${config.lmsBaseUrl}${f.url}`,
  }));
}

export function useCourseFiles(courseId: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery<CourseFile[]>({
    queryKey: ["course-files", courseId],
    queryFn: () => fetchCourseFiles(courseId),
    enabled: isAuthenticated && !!courseId,
    staleTime: 5 * 60 * 1000,   // 5 phút
    placeholderData: [],
    retry: false, // Không retry nếu API chưa có (backend chưa restart)
  });
}
