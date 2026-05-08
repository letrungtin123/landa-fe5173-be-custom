// ============================================================
// Register API — Đăng ký tài khoản learner (chờ duyệt)
//
// POST /api/landa/v1/public/register/
//     → Tạo account inactive, chờ admin duyệt
//
// Endpoint public — không cần Bearer token.
// ============================================================

import axios from "axios";
import { config } from "@/config/env";

interface RegisterPayload {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
}

interface RegisterResponse {
  success: boolean;
  message?: string;
  errors?: Record<string, string>;
}

/**
 * Đăng ký tài khoản learner mới.
 * Account sẽ ở trạng thái inactive cho đến khi admin duyệt.
 *
 * Không cần auth token — endpoint public.
 */
export async function registerAccount(
  payload: RegisterPayload
): Promise<RegisterResponse> {
  try {
    const { data } = await axios.post<RegisterResponse>(
      `${config.apiBaseUrl}/api/landa/v1/public/register/`,
      payload,
      {
        headers: { "Content-Type": "application/json" },
        timeout: config.apiTimeoutMs,
      }
    );
    return data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response?.data) {
      return err.response.data as RegisterResponse;
    }
    return {
      success: false,
      errors: { __all__: "Lỗi kết nối máy chủ. Vui lòng thử lại sau." },
    };
  }
}
