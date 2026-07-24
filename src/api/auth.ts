// ============================================================
// Auth API — Đăng nhập, Refresh Token, Thông tin người dùng
// Gọi Custom Backend (Express/PostgreSQL)
// KHÔNG LOG BẤT KỲ DỮ LIỆU NHẠY CẢM NÀO (token, email, password)
// ============================================================

import { apiClient } from "./client";
import type { ApiResponse, LoginResponse, AuthUserInfo, PermissionsMap, TenantBasic, RoleLabelMap, SessionMode } from "./types";

export interface DemoQrAccount {
  id: string;
  label: string;
  avatar_url: string | null;
}

export interface DemoQrAccountsResponse {
  tenant: {
    id: string;
    name: string;
  };
  is_enabled: boolean;
  ttl_seconds: number;
  accounts: DemoQrAccount[];
  locked_count: number;
  next_reset_at: string | null;
  next_reset_in_seconds: number;
}

export interface DemoQrClaimResponse {
  redirect_url: string;
  expires_in: number;
  reserved_until: string | null;
  ttl_seconds: number;
}

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
    { username, password, client_app: "learner", origin: window.location.origin }
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
  refreshToken: string,
  tenantId?: string | null
): Promise<LoginResponse> {
  const axios = (await import("axios")).default;
  const { config } = await import("@/config/env");
  const baseURL = config.apiBaseUrl || "";

  const { data } = await axios.post<ApiResponse<LoginResponse>>(
    `${baseURL}/api/auth/refresh`,
    { refresh_token: refreshToken, ...(tenantId ? { tenant_id: tenantId } : {}) },
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
  role_labels?: RoleLabelMap;
  session_mode?: SessionMode;
}> {
  const { data } = await apiClient.get<ApiResponse<{
    user: AuthUserInfo;
    permissions: PermissionsMap;
    tenant_modules: string[];
    managed_tenants: TenantBasic[];
    role_labels?: RoleLabelMap;
    session_mode?: SessionMode;
  }>>("/api/auth/me");
  return data.data;
}

export async function getRoleLabelsApi(): Promise<RoleLabelMap> {
  const { data } = await apiClient.get<ApiResponse<{ role_labels: RoleLabelMap }>>("/api/auth/role-labels");
  return data.data.role_labels || {};
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

function currentDomain(): string {
  return window.location.hostname;
}

export async function getDemoQrAccountsApi(domain = currentDomain()): Promise<DemoQrAccountsResponse> {
  const { data } = await apiClient.get<ApiResponse<DemoQrAccountsResponse>>(
    `/api/demo-login/public/by-domain/${encodeURIComponent(domain)}/accounts`
  );
  return data.data;
}

export async function claimDemoQrAccountApi(accountId: string, domain = currentDomain()): Promise<DemoQrClaimResponse> {
  const { data } = await apiClient.post<ApiResponse<DemoQrClaimResponse>>(
    `/api/demo-login/public/by-domain/${encodeURIComponent(domain)}/claim`,
    { account_id: accountId }
  );
  return data.data;
}

export async function bootstrapDemoIframeApi(embedId: string, parentOrigin: string): Promise<LoginResponse> {
  const { data } = await apiClient.post<ApiResponse<LoginResponse>>(
    `/api/demo-login/public/iframe/${encodeURIComponent(embedId)}/bootstrap`,
    { parent_origin: parentOrigin }
  );
  return data.data;
}
