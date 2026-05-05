// ============================================================
// Axios API Client — Kết nối Open edX Backend
// Xử lý Bearer auth, tự động refresh token, retry khi 401
// KHÔNG LOG DỮ LIỆU NHẠY CẢM
// ============================================================

import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { config } from "@/config/env";
import { useAuthStore } from "@/stores/useAuthStore";

export const apiClient = axios.create({
  baseURL: config.apiBaseUrl,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: config.apiTimeoutMs,
});

// ── Flag ngăn refresh đồng thời ──
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

// ── Helper: Đọc csrftoken từ cookie ──
// Open edX set csrftoken cookie (không HttpOnly) → JS đọc được
function getCsrfToken(): string {
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? match[1] : "";
}

// ── Request Interceptor — gắn Bearer token + CSRF token ──
apiClient.interceptors.request.use(
  (req) => {
    // Bearer auth
    const { accessToken, tokenType } = useAuthStore.getState();
    if (accessToken) {
      req.headers.Authorization = `${tokenType} ${accessToken}`;
    }

    // CSRF token cho POST/PUT/PATCH/DELETE
    // Django yêu cầu X-CSRFToken header khớp với csrftoken cookie
    if (req.method && req.method !== "get") {
      const csrfToken = getCsrfToken();
      if (csrfToken) {
        req.headers["X-CSRFToken"] = csrfToken;
      }
    }

    return req;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor — xử lý 401 → refresh → retry ──
apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retried?: boolean;
    };

    // Chỉ xử lý 401 và chưa retry
    if (error.response?.status !== 401 || originalRequest._retried) {
      // Nếu 401 lần 2 sau retry → cũng phải logout
      if (error.response?.status === 401 && originalRequest._retried) {
        useAuthStore.getState().logout();
        window.location.href = "/login?error=account_disabled";
      }
      return Promise.reject(error);
    }

    // Tài khoản bị khóa bởi Admin → logout ngay, KHÔNG thử refresh
    const responseData = error.response?.data as Record<string, unknown> | undefined;
    if (responseData?.error === "account_disabled") {
      useAuthStore.getState().logout();
      window.location.href = "/login?error=account_disabled";
      return Promise.reject(error);
    }

    // Đánh dấu đã retry để tránh vòng lặp vô hạn
    originalRequest._retried = true;

    // Nếu đang refresh → chờ kết quả rồi retry
    if (isRefreshing && refreshPromise) {
      const success = await refreshPromise;
      if (success) {
        // Gắn token mới vào request gốc
        const { accessToken, tokenType } = useAuthStore.getState();
        originalRequest.headers.Authorization = `${tokenType} ${accessToken}`;
        return apiClient(originalRequest);
      }
      return Promise.reject(error);
    }

    // Thử refresh token
    isRefreshing = true;
    refreshPromise = useAuthStore
      .getState()
      .performTokenRefresh()
      .finally(() => {
        isRefreshing = false;
        refreshPromise = null;
      });

    const success = await refreshPromise;

    if (success) {
      // Retry request gốc với token mới
      const { accessToken, tokenType } = useAuthStore.getState();
      originalRequest.headers.Authorization = `${tokenType} ${accessToken}`;
      return apiClient(originalRequest);
    }

    // Refresh thất bại → logout
    useAuthStore.getState().logout();
    return Promise.reject(error);
  }
);
