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

// ── Request Interceptor — gắn token vào header ──
apiClient.interceptors.request.use(
  (req) => {
    const { accessToken, tokenType } = useAuthStore.getState();
    if (accessToken) {
      req.headers.Authorization = `${tokenType} ${accessToken}`;
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
