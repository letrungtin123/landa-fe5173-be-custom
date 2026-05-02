// ============================================================
// Password API — Đổi mật khẩu trực tiếp qua LANDA API
//
// POST /api/landa/v1/account/change-password/
//     → Đổi mật khẩu cho user đã login (current_password → new_password)
//
// Dùng apiClient (axios) — đi qua /api prefix → Vite proxy hoặc
// production apiBaseUrl. Tự gắn Bearer token + CSRF.
// ============================================================

import { apiClient } from "@/api/client";

/**
 * Đổi mật khẩu trực tiếp cho user đã login.
 *
 * Endpoint: POST /api/landa/v1/account/change-password/
 * Body JSON: { current_password, new_password }
 *
 * Không cần email — verify mật khẩu cũ + set mật khẩu mới.
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  try {
    const { data } = await apiClient.post("/api/landa/v1/account/change-password/", {
      current_password: currentPassword,
      new_password: newPassword,
    });
    return { success: true, message: data?.message || "Đổi mật khẩu thành công." };
  } catch (err: any) {
    const msg = err.response?.data?.message;
    if (err.response?.status === 403) {
      return { success: false, message: msg || "Mật khẩu hiện tại không đúng." };
    }
    if (err.response?.status === 400) {
      return { success: false, message: msg || "Mật khẩu mới không hợp lệ." };
    }
    return { success: false, message: "Có lỗi xảy ra. Vui lòng thử lại sau." };
  }
}
