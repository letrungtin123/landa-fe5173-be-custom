// ============================================================
// Password API — Custom Backend
// POST /api/auth/change-password
// ============================================================

import { apiClient } from "@/api/client";
import type { ApiResponse } from "./types";

/**
 * Đổi mật khẩu trực tiếp cho user đã login.
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  try {
    const { data } = await apiClient.post<ApiResponse<null>>(
      "/api/auth/change-password",
      { current_password: currentPassword, new_password: newPassword }
    );
    return { success: true, message: data.message || "Đổi mật khẩu thành công." };
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
