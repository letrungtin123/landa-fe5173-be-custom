// ============================================================
// Certificate API — Lấy thông tin chứng chỉ từ Open edX
// Endpoint: GET /api/certificates/v0/certificates/{username}/
// ============================================================

import { apiClient } from "./client";

export interface Certificate {
  username: string;
  course_id: string;
  certificate_type: string;
  status: string;
  grade: string;
  created_date: string;
  modified_date: string;
  download_url: string;
  /** URL xem chứng chỉ trên web — mở trong tab mới */
  is_passing: boolean;
}

/**
 * Lấy danh sách chứng chỉ đã nhận của user.
 */
export async function getUserCertificates(
  username: string
): Promise<Certificate[]> {
  const { data } = await apiClient.get(
    `/api/certificates/v0/certificates/${username}/`
  );
  return data;
}

/**
 * Lấy chứng chỉ cho một khóa học cụ thể.
 */
export async function getCourseCertificate(
  username: string,
  courseId: string
): Promise<Certificate | null> {
  try {
    const { data } = await apiClient.get(
      `/api/certificates/v0/certificates/${username}/courses/${courseId}/`
    );
    return data;
  } catch {
    // Chưa có chứng chỉ → trả về null
    return null;
  }
}
