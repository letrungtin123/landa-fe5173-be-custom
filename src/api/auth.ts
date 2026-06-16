// ============================================================
// Auth API — Đăng nhập, Refresh Token, Thông tin người dùng
// Gọi Custom Backend (Express/PostgreSQL)
// KHÔNG LOG BẤT KỲ DỮ LIỆU NHẠY CẢM NÀO (token, email, password)
// ============================================================

import { apiClient } from "./client";
import type { ApiResponse, LoginResponse, AuthUserInfo, PermissionsMap, TenantBasic } from "./types";

/**
 * Đăng nhập bằng username/email + password.
 * Trả về JWT access_token + refresh_token + user info.
 */
export async function loginApi(
  username: string,
  password: string
): Promise<LoginResponse> {
  const { data } = await apiClient.post<ApiResponse<LoginResponse>>(
    "/api/auth/login",
    { username, password, client_app: "learner" }
  );
  return data.data;
}

/**
 * Refresh access token bằng refresh_token.
 * Token rotation: refresh_token cũ bị revoke, trả về token mới.
 *
 * QUAN TRỌNG: Dùng axios trực tiếp, KHÔNG dùng apiClient.
 * apiClient interceptor sẽ gắn expired Bearer token → BE reject 401.
 */
export async function refreshTokenApi(
  refreshToken: string
): Promise<LoginResponse> {
  const axios = (await import("axios")).default;
  const { config } = await import("@/config/env");
  const baseURL = config.apiBaseUrl || "";

  const { data } = await axios.post<ApiResponse<LoginResponse>>(
    `${baseURL}/api/auth/refresh`,
    { refresh_token: refreshToken },
    { headers: { "Content-Type": "application/json" }, timeout: 10_000 }
  );
  return data.data;
}

/**
 * Lấy thông tin user hiện tại + permissions.
 */
export async function getUserMe(): Promise<{
  user: AuthUserInfo;
  permissions: PermissionsMap;
  tenant_modules: string[];
  managed_tenants: TenantBasic[];
}> {
  const { data } = await apiClient.get<ApiResponse<{
    user: AuthUserInfo;
    permissions: PermissionsMap;
    tenant_modules: string[];
    managed_tenants: TenantBasic[];
  }>>("/api/auth/me");
  return data.data;
}

/**
 * Đăng xuất — revoke refresh token phía server.
 */
export async function logoutApi(refreshToken: string): Promise<void> {
  try {
    await apiClient.post("/api/auth/logout", { refresh_token: refreshToken });
  } catch {
    // Best-effort — server có thể không phản hồi
  }
}

/**
 * Cập nhật thông tin cá nhân.
 */
export async function updateProfile(
  updates: Partial<{
    full_name: string;
    phone: string;
    bio: string;
    avatar_url: string;
    gender: string;
    country: string;
    language: string;
    level_of_education: string;
    year_of_birth: number;
  }>
): Promise<Record<string, unknown>> {
  const { data } = await apiClient.patch<ApiResponse<Record<string, unknown>>>(
    "/api/auth/profile",
    updates
  );
  return data.data;
}

/**
 * Exchange One-Time Token → full auth session.
 * Dùng cho cross-app SSO (Admin Dashboard → FE Learner).
 * KHÔNG cần auth header — OTT tự nó là proof of identity.
 */
export async function exchangeOttApi(ott: string): Promise<LoginResponse> {
  const axios = (await import("axios")).default;
  const { config: envConfig } = await import("@/config/env");
  const baseURL = envConfig.apiBaseUrl || "";

  const { data } = await axios.post<ApiResponse<LoginResponse>>(
    `${baseURL}/api/auth/ott/exchange`,
    { ott },
    { headers: { "Content-Type": "application/json" }, timeout: 10_000 }
  );
  return data.data;
}
