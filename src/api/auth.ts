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
 * /api/user/v1/me trả về { username, is_staff }.
 * Email lấy thêm từ accounts endpoint.
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

  return {
    username: data.username,
    email,
    is_staff: data.is_staff === true,
  };
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
