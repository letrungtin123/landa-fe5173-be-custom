// ============================================================
// useCertificates Hook — Quản lý chứng chỉ Open edX
// ============================================================

import { useQuery } from "@tanstack/react-query";
import { getUserCertificates, getCourseCertificate } from "@/api/certificates";
import { useAuthStore } from "@/stores/useAuthStore";

/**
 * Lấy tất cả chứng chỉ của user hiện tại.
 */
export function useMyCertificates() {
  const username = useAuthStore((s) => s.user?.username);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery({
    queryKey: ["certificates", username],
    queryFn: () => getUserCertificates(username!),
    enabled: isAuthenticated && !!username,
    staleTime: 10 * 60 * 1000, // 10 phút — certificates ít thay đổi
  });
}

/**
 * Lấy chứng chỉ cho một khóa học cụ thể.
 */
export function useCourseCertificate(courseId?: string) {
  const username = useAuthStore((s) => s.user?.username);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery({
    queryKey: ["certificate", courseId, username],
    queryFn: () => getCourseCertificate(username!, courseId!),
    enabled: isAuthenticated && !!username && !!courseId,
    staleTime: 10 * 60 * 1000,
  });
}
