// ============================================================
// Axios API Client — Kết nối Custom Backend (Express/PostgreSQL)
// Xử lý Bearer auth (JWT), tự động refresh token, retry khi 401
// Concurrency limiter + 429 retry
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

// ── Concurrency limiter — giới hạn request đồng thời ──
// Production: 6 concurrent (= browser per-domain limit), không delay
const MAX_CONCURRENT = 6;
const REQUEST_DELAY_MS = 0;
let activeRequests = 0;
const requestQueue: Array<() => void> = [];

function dequeue() {
  if (requestQueue.length > 0 && activeRequests < MAX_CONCURRENT) {
    activeRequests++;
    const resolve = requestQueue.shift()!;
    // Delay nhỏ giữa các request để spread load
    setTimeout(resolve, REQUEST_DELAY_MS);
  }
}

apiClient.interceptors.request.use(async (req) => {
  if (activeRequests >= MAX_CONCURRENT) {
    await new Promise<void>((resolve) => {
      requestQueue.push(resolve);
    });
  } else {
    activeRequests++;
  }
  return req;
});

apiClient.interceptors.response.use(
  (res) => {
    activeRequests = Math.max(0, activeRequests - 1);
    dequeue();
    return res;
  },
  (error) => {
    activeRequests = Math.max(0, activeRequests - 1);
    dequeue();
    return Promise.reject(error);
  }
);

// ── 429 Retry — exponential backoff khi bị rate limit ──
apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const req = error.config as InternalAxiosRequestConfig & { _retryCount429?: number };
    if (error.response?.status === 429 && req && (req._retryCount429 ?? 0) < 3) {
      req._retryCount429 = (req._retryCount429 ?? 0) + 1;
      const delay = req._retryCount429 * 2000; // 2s, 4s, 6s — aggressive backoff
      await new Promise((r) => setTimeout(r, delay));
      return apiClient(req);
    }
    return Promise.reject(error);
  }
);

// ── Request Interceptor — gắn Bearer token + Tenant ID ──
apiClient.interceptors.request.use(
  (req) => {
    const { accessToken, tokenType, user } = useAuthStore.getState();

    // Bearer JWT auth
    if (accessToken) {
      req.headers.Authorization = `${tokenType} ${accessToken}`;
    }

    // Tenant ID — CHỈ superadmin mới cần header để switch tenant
    if (user?.role === 'superadmin' && user?.tenantId) {
      req.headers['X-Tenant-ID'] = user.tenantId;
    }

    return req;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor — xử lý 401 → refresh → retry ──
// KHÔNG có mutex riêng ở đây — dùng duy nhất refreshMutex trong useAuthStore.
// Tránh race condition giữa 2 lớp mutex riêng biệt.
apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retried?: boolean;
    };

    // Chỉ xử lý 401 và chưa retry
    if (error.response?.status !== 401 || originalRequest._retried) {
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

    // Single source of truth: store.performTokenRefresh() có mutex + cooldown
    const success = await useAuthStore.getState().performTokenRefresh();

    if (success) {
      // Retry request gốc với token mới
      const { accessToken, tokenType } = useAuthStore.getState();
      originalRequest.headers.Authorization = `${tokenType} ${accessToken}`;
      return apiClient(originalRequest);
    }

    // Refresh thất bại → logout
    useAuthStore.getState().logout();
    window.location.href = "/login?session=expired";
    return Promise.reject(error);
  }
);
