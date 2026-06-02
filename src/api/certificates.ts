// ============================================================
// Certificate API — Tạm disable (chứng chỉ chưa cần)
// Trả về empty arrays để UI không crash
// ============================================================

export interface Certificate {
  username: string;
  course_id: string;
  certificate_type: string;
  status: string;
  grade: string;
  created_date: string;
  modified_date: string;
  download_url: string;
  is_passing: boolean;
}

/**
 * @deprecated Certificates chưa implement trên custom BE
 */
export async function getUserCertificates(
  _username: string
): Promise<Certificate[]> {
  return [];
}

/**
 * @deprecated Certificates chưa implement trên custom BE
 */
export async function getCourseCertificate(
  _username: string,
  _courseId: string
): Promise<Certificate | null> {
  return null;
}
