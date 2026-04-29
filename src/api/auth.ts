// ============================================================
// Auth API — Đăng nhập, Refresh Token, Thông tin người dùng
// KHÔNG LOG BẤT KỲ DỮ LIỆU NHẠY CẢM NÀO (token, email, password)
// ============================================================

import axios from "axios";
import { config } from "@/config/env";
import { lmsUrl } from "@/config/openedx";
import { apiClient } from "./client";
import type { OAuthTokenResponse, UserMe, UserAccount } from "./types";

/**
 * Đăng nhập bằng OAuth2 password grant.
 * Trả về access_token + refresh_token.
 */
export async function loginApi(
  username: string,
  password: string
): Promise<OAuthTokenResponse> {
  const { data } = await axios.post<OAuthTokenResponse>(
    lmsUrl("/oauth2/access_token"),
    new URLSearchParams({
      grant_type: "password",
      client_id: config.clientId,
      client_secret: config.clientSecret,
      username,
      password,
    }),
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: config.apiTimeoutMs,
    }
  );
  return data;
}

/**
 * Refresh access token bằng refresh_token.
 * Open edX DOT sử dụng single-use refresh token — mỗi lần dùng
 * sẽ nhận refresh_token mới và cái cũ bị vô hiệu.
 */
export async function refreshTokenApi(
  refreshToken: string
): Promise<OAuthTokenResponse> {
  const { data } = await axios.post<OAuthTokenResponse>(
    lmsUrl("/oauth2/access_token"),
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    }),
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: config.apiTimeoutMs,
    }
  );
  return data;
}

/**
 * Lấy thông tin cơ bản user hiện tại.
 * /api/user/v1/me chỉ trả về { username } nên phải kết hợp thêm
 * accounts endpoint + staff check.
 */
export async function getUserMe(): Promise<UserMe> {
  const { data } = await apiClient.get("/api/user/v1/me");

  // Lấy email từ accounts endpoint (vì /me không trả về)
  let email = "";
  try {
    const acct = await apiClient.get(`/api/user/v1/accounts/${data.username}`);
    email = acct.data.email || "";
  } catch {
    // Bỏ qua lỗi — email không bắt buộc cho flow chính
  }

  // Kiểm tra quyền staff qua LMS endpoint
  const isStaff = await checkStaffAccess();

  return {
    username: data.username,
    email,
    is_staff: isStaff,
  };
}

/**
 * Kiểm tra user có quyền staff không.
 * Dùng LMS accounts list endpoint — chỉ staff mới truy cập được (200).
 * User thường bị 403 Forbidden.
 */
async function checkStaffAccess(): Promise<boolean> {
  try {
    const res = await apiClient.get("/api/user/v1/accounts", {
      params: { page_size: 1 },
      timeout: 5000,
    });
    return res.status === 200;
  } catch {
    return false;
  }
}

/**
 * Lấy thông tin chi tiết tài khoản người dùng.
 */
export async function getUserAccount(
  username: string
): Promise<UserAccount> {
  const { data } = await apiClient.get(
    `/api/user/v1/accounts/${username}`
  );
  return data;
}

/**
 * Cập nhật thông tin chi tiết tài khoản người dùng.
 */
export async function updateUserAccount(
  username: string,
  updateData: Partial<UserAccount>
): Promise<UserAccount> {
  const { data } = await apiClient.patch(
    `/api/user/v1/accounts/${username}`,
    updateData,
    {
      headers: {
        "Content-Type": "application/merge-patch+json",
      },
    }
  );
  return data;
}
