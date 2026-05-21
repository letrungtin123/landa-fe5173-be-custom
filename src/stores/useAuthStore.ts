// ============================================================
// Auth Store — Quản lý xác thực với Open edX
// Token lưu trong localStorage (mã hóa) + tự động refresh
// KHÔNG LOG TOKEN HOẶC DỮ LIỆU NHẠY CẢM
// ============================================================

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { loginApi, getUserMe, getUserAccount, refreshTokenApi } from "@/api/auth";
import { apiClient } from "@/api/client";
import { establishLmsSession, establishLmsSessionFromToken, clearLmsSession } from "@/api/lmsSession";
import { config } from "@/config/env";
import { updateStreak } from "@/hooks/useUser";
import { queryClient } from "@/App";
import { sanitizeUrlToRelative } from "@/transformers/staticUrlRewriter";

// ── Mã hóa/giải mã đơn giản cho token trong storage ──
// Không phải mã hóa cấp quân sự nhưng ngăn đọc token trực tiếp
const STORAGE_KEY = "la-auth-v2";
const OBFUSCATION_KEY = 42;

function obfuscate(text: string): string {
  const bytes = new TextEncoder().encode(text);
  const xored = bytes.map((b) => b ^ OBFUSCATION_KEY);
  let binary = "";
  for (const b of xored) binary += String.fromCharCode(b);
  return btoa(binary);
}

function deobfuscate(encoded: string): string {
  try {
    const binary = atob(encoded);
    const xored = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      xored[i] = binary.charCodeAt(i) ^ OBFUSCATION_KEY;
    }
    return new TextDecoder().decode(xored);
  } catch {
    return "";
  }
}

// ── Custom storage sử dụng mã hóa ──
const encryptedStorage = createJSONStorage<AuthState>(() => ({
  getItem(key: string): string | null {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return deobfuscate(raw) || null;
  },
  setItem(key: string, value: string): void {
    localStorage.setItem(key, obfuscate(value));
  },
  removeItem(key: string): void {
    localStorage.removeItem(key);
  },
}));

// ── Kiểu dữ liệu ──
export interface AuthUser {
  username: string;
  email: string;
  name: string;
  avatar: string | null;
  dateJoined: string;
  isStaff: boolean;
  isLearnerPlus: boolean;
}

interface AuthState {
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  tokenType: string;
  tokenExpiresAt: number | null; // Unix timestamp (ms)
  user: AuthUser | null;

  /**
   * Đăng nhập qua OAuth2 password grant.
   * Trả về role để routing: 'staff' → Studio, 'learner' → FE.
   */
  login: (username: string, password: string) => Promise<"learner" | "staff">;

  /**
   * Đăng nhập bằng Google OAuth2.
   * Nhận edX tokens đã exchange sẵn → lưu + fetch user info.
   */
  loginWithGoogle: (edxTokens: import("@/api/types").OAuthTokenResponse) => Promise<"learner" | "staff">;

  /**
   * Đăng nhập bằng Microsoft 365 (Azure AD OAuth2).
   * Nhận edX tokens đã exchange sẵn → lưu + fetch user info.
   */
  loginWithMicrosoft: (edxTokens: import("@/api/types").OAuthTokenResponse) => Promise<"learner" | "staff">;

  /**
   * Đăng nhập bằng Keycloak SSO.
   * Nhận edX tokens đã exchange sẵn → lưu + fetch user info.
   */
  loginWithKeycloak: (edxTokens: import("@/api/types").OAuthTokenResponse) => Promise<"learner" | "staff">;

  /** Xóa toàn bộ auth state + hủy session LMS. */
  logout: () => Promise<void>;

  /** Thực hiện refresh token — trả về true nếu thành công. */
  performTokenRefresh: () => Promise<boolean>;

  /** Lên lịch auto-refresh trước khi token hết hạn. */
  scheduleTokenRefresh: () => void;

  /** Cập nhật thông tin user trong store (dùng khi edit profile). */
  updateUser: (updates: Partial<AuthUser>) => void;
}

// ── Timer ID cho auto-refresh ──
let refreshTimerId: ReturnType<typeof setTimeout> | null = null;

function clearRefreshTimer(): void {
  if (refreshTimerId !== null) {
    clearTimeout(refreshTimerId);
    refreshTimerId = null;
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      accessToken: null,
      refreshToken: null,
      tokenType: "Bearer",
      tokenExpiresAt: null,
      user: null,

      login: async (username: string, password: string) => {
        // 1) Lấy access_token + refresh_token
        // Song song: tạo LMS session cookie (cần cho /xblock/ quiz rendering)
        const [tokenRes] = await Promise.all([
          loginApi(username, password),
          establishLmsSession(username, password),
        ]);

        const expiresAt = Date.now() + tokenRes.expires_in * 1000;
        set({
          accessToken: tokenRes.access_token,
          refreshToken: tokenRes.refresh_token,
          tokenType: tokenRes.token_type || "Bearer",
          tokenExpiresAt: expiresAt,
        });

        // 2) Lấy thông tin user (bao gồm kiểm tra staff)
        const me = await getUserMe();

        // 3) Lấy chi tiết tài khoản
        let account;
        try {
          account = await getUserAccount(me.username);
        } catch {
          // User mới có thể chưa có đầy đủ profile
          account = {
            name: me.username,
            is_active: true, // Giả sử true nếu chưa fetch được profile
            profile_image: { has_image: false, image_url_medium: "" },
            date_joined: new Date().toISOString(),
          };
        }

        // 4) Kiểm tra cờ is_active
        if (account.is_active === false) {
          get().logout();
          throw new Error("Tài khoản của bạn đã bị khóa.");
        }

        // 5) Cập nhật streak đăng nhập
        updateStreak();

        // 6) Kiểm tra learner_plus role
        let isLearnerPlus = false;
        if (!me.is_staff) {
          try {
            const { data: roleData } = await apiClient.get("/api/landa/v0/my-role/");
            isLearnerPlus = roleData.role === "learner_plus";
          } catch {
            // Bỏ qua — learner thường không có role
          }
        }

        // 7) Lưu thông tin user
        set({
          isAuthenticated: true,
          user: {
            username: me.username,
            email: me.email,
            name: account.name || me.username,
            avatar: sanitizeUrlToRelative(account.profile_image?.has_image
              ? account.profile_image.image_url_full
              : null),
            dateJoined: account.date_joined,
            isStaff: me.is_staff,
            isLearnerPlus,
          },
        });

        // 6) Lên lịch tự động refresh
        get().scheduleTokenRefresh();

        return me.is_staff ? "staff" : "learner";
      },

      loginWithGoogle: async (edxTokens) => {
        // 1) Lưu tokens đã exchange sẵn
        const expiresAt = Date.now() + edxTokens.expires_in * 1000;
        set({
          accessToken: edxTokens.access_token,
          refreshToken: edxTokens.refresh_token,
          tokenType: edxTokens.token_type || "Bearer",
          tokenExpiresAt: expiresAt,
        });

        // 2) Tạo LMS session từ edX access token
        await establishLmsSessionFromToken();

        // 3) Lấy thông tin user
        const me = await getUserMe();

        let account;
        try {
          account = await getUserAccount(me.username);
        } catch {
          account = {
            name: me.username,
            profile_image: { has_image: false, image_url_medium: "" },
            date_joined: new Date().toISOString(),
          };
        }

        if (account.is_active === false) {
          get().logout();
          throw new Error("Tài khoản của bạn đã bị khóa.");
        }

        // 4) Cập nhật streak đăng nhập
        updateStreak();

        // 5) Kiểm tra learner_plus role
        let isLearnerPlus = false;
        if (!me.is_staff) {
          try {
            const { data: roleData } = await apiClient.get("/api/landa/v0/my-role/");
            isLearnerPlus = roleData.role === "learner_plus";
          } catch {
            // Bỏ qua
          }
        }

        // 6) Lưu thông tin user
        set({
          isAuthenticated: true,
          user: {
            username: me.username,
            email: me.email,
            name: account.name || me.username,
            avatar: sanitizeUrlToRelative(account.profile_image?.has_image
              ? account.profile_image.image_url_full
              : null),
            dateJoined: account.date_joined,
            isStaff: me.is_staff,
            isLearnerPlus,
          },
        });

        // 6) Lên lịch tự động refresh
        get().scheduleTokenRefresh();

        return me.is_staff ? "staff" : "learner";
      },

      loginWithMicrosoft: async (edxTokens) => {
        // Logic giống hệt loginWithGoogle — cùng flow exchange tokens
        const expiresAt = Date.now() + edxTokens.expires_in * 1000;
        set({
          accessToken: edxTokens.access_token,
          refreshToken: edxTokens.refresh_token,
          tokenType: edxTokens.token_type || "Bearer",
          tokenExpiresAt: expiresAt,
        });

        await establishLmsSessionFromToken();

        const me = await getUserMe();

        let account;
        try {
          account = await getUserAccount(me.username);
        } catch {
          account = {
            name: me.username,
            profile_image: { has_image: false, image_url_medium: "" },
            date_joined: new Date().toISOString(),
          };
        }

        if (account.is_active === false) {
          get().logout();
          throw new Error("Tài khoản của bạn đã bị khóa.");
        }

        updateStreak();

        // Kiểm tra learner_plus role
        let isLearnerPlus = false;
        if (!me.is_staff) {
          try {
            const { data: roleData } = await apiClient.get("/api/landa/v0/my-role/");
            isLearnerPlus = roleData.role === "learner_plus";
          } catch {
            // Bỏ qua
          }
        }

        set({
          isAuthenticated: true,
          user: {
            username: me.username,
            email: me.email,
            name: account.name || me.username,
            avatar: sanitizeUrlToRelative(account.profile_image?.has_image
              ? account.profile_image.image_url_full
              : null),
            dateJoined: account.date_joined,
            isStaff: me.is_staff,
            isLearnerPlus,
          },
        });

        get().scheduleTokenRefresh();

        return me.is_staff ? "staff" : "learner";
      },

      loginWithKeycloak: async (edxTokens) => {
        const expiresAt = Date.now() + edxTokens.expires_in * 1000;
        set({
          accessToken: edxTokens.access_token,
          refreshToken: edxTokens.refresh_token,
          tokenType: edxTokens.token_type || "Bearer",
          tokenExpiresAt: expiresAt,
        });

        await establishLmsSessionFromToken();

        const me = await getUserMe();

        let account;
        try {
          account = await getUserAccount(me.username);
        } catch {
          account = {
            name: me.username,
            profile_image: { has_image: false, image_url_medium: "" },
            date_joined: new Date().toISOString(),
          };
        }

        if (account.is_active === false) {
          get().logout();
          throw new Error("Tài khoản của bạn đã bị khóa.");
        }

        updateStreak();

        let isLearnerPlus = false;
        if (!me.is_staff) {
          try {
            const { data: roleData } = await apiClient.get("/api/landa/v0/my-role/");
            isLearnerPlus = roleData.role === "learner_plus";
          } catch {
            // Bỏ qua
          }
        }

        set({
          isAuthenticated: true,
          user: {
            username: me.username,
            email: me.email,
            name: account.name || me.username,
            avatar: sanitizeUrlToRelative(account.profile_image?.has_image
              ? account.profile_image.image_url_full
              : null),
            dateJoined: account.date_joined,
            isStaff: me.is_staff,
            isLearnerPlus,
          },
        });

        get().scheduleTokenRefresh();

        return me.is_staff ? "staff" : "learner";
      },

      logout: async () => {
        clearRefreshTimer();
        
        // 1. Xóa state local TRƯỚC để đảm bảo FE luôn đăng xuất
        // Dù API logout có bị lỗi 401 (do bị blacklist) thì app vẫn thoát
        set({
          user: null,
          isAuthenticated: false,
          accessToken: null,
          refreshToken: null,
          tokenExpiresAt: null,
        });

        // 2. Xóa toàn bộ cache React Query
        try { queryClient.clear(); } catch { /* App chưa mount */ }

        // 2.5 Xóa các dữ liệu per-user trong localStorage
        // để user khác đăng nhập không bị dính data cũ
        Object.keys(localStorage).forEach((key) => {
          if (
            key.startsWith("course_welcome_shown_") ||
            key.startsWith("course_confirmed_") ||
            key.startsWith("course_100_shown_")
          ) {
            localStorage.removeItem(key);
          }
        });
        localStorage.removeItem("la-streak");
        localStorage.removeItem("la_study_time_weekly");
        localStorage.removeItem("la_study_time_last_sync");

        // 3. Xóa LMS session cookie + gọi server logout
        try {
          await clearLmsSession();
        } catch (e) {
          console.warn("Lỗi khi clear LMS session (có thể do token hết hạn hoặc bị khoá):", e);
        }
      },

      performTokenRefresh: async (): Promise<boolean> => {
        const { refreshToken: currentRefreshToken } = get();
        if (!currentRefreshToken) {
          return false;
        }

        try {
          const tokenRes = await refreshTokenApi(currentRefreshToken);

          const expiresAt = Date.now() + tokenRes.expires_in * 1000;
          set({
            accessToken: tokenRes.access_token,
            refreshToken: tokenRes.refresh_token,
            tokenType: tokenRes.token_type || "Bearer",
            tokenExpiresAt: expiresAt,
          });

          // Lên lịch refresh tiếp theo
          get().scheduleTokenRefresh();
          return true;
        } catch {
          // Refresh thất bại → phải đăng nhập lại
          return false;
        }
      },

      scheduleTokenRefresh: () => {
        clearRefreshTimer();

        const { tokenExpiresAt } = get();
        if (!tokenExpiresAt) return;

        // Tính thời gian còn lại trước khi refresh
        const now = Date.now();
        const buffer = config.tokenRefreshBufferMs;
        const delay = tokenExpiresAt - now - buffer;

        if (delay <= 0) {
          // Token đã gần hết hạn hoặc hết hạn rồi → refresh ngay
          get().performTokenRefresh().then((success) => {
            if (!success) get().logout();
          });
          return;
        }

        // Đặt timer refresh trước khi hết hạn
        refreshTimerId = setTimeout(() => {
          get().performTokenRefresh().then((success) => {
            if (!success) get().logout();
          });
        }, delay);
      },

      updateUser: (updates) => {
        const currentUser = get().user;
        if (currentUser) {
          set({
            user: { ...currentUser, ...updates },
          });
        }
      },
    }),
    {
      name: STORAGE_KEY,
      storage: encryptedStorage,
      partialize: (state) => ({
        // Chỉ lưu các field cần thiết — không lưu methods
        isAuthenticated: state.isAuthenticated,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        tokenType: state.tokenType,
        tokenExpiresAt: state.tokenExpiresAt,
        user: state.user,
      }),
      onRehydrateStorage: () => {
        // Callback sau khi khôi phục state từ storage
        return (state) => {
          if (state?.isAuthenticated && state?.tokenExpiresAt) {
            // Kiểm tra token còn hiệu lực không
            if (Date.now() >= state.tokenExpiresAt) {
              // Token đã hết hạn → thử refresh
              state.performTokenRefresh().then((success) => {
                if (!success) state.logout();
              });
            } else {
              // Token còn hiệu lực → lên lịch refresh
              state.scheduleTokenRefresh();
              // Tạo LMS session từ access token (cần cho /xblock/ quiz rendering)
              // Vite proxy capture sessionid từ response server-side
              establishLmsSessionFromToken();
            }
          }
        };
      },
    }
  )
);
