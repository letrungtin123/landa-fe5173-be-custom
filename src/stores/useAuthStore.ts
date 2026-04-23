// ============================================================
// Auth Store — Quản lý xác thực với Open edX
// Token lưu trong localStorage (mã hóa) + tự động refresh
// KHÔNG LOG TOKEN HOẶC DỮ LIỆU NHẠY CẢM
// ============================================================

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { loginApi, getUserMe, getUserAccount, refreshTokenApi } from "@/api/auth";
import { config } from "@/config/env";
import { updateStreak } from "@/hooks/useUser";
import { queryClient } from "@/App";

// ── Mã hóa/giải mã đơn giản cho token trong storage ──
// Không phải mã hóa cấp quân sự nhưng ngăn đọc token trực tiếp
const STORAGE_KEY = "la-auth-v2";
const OBFUSCATION_KEY = 42;

function obfuscate(text: string): string {
  return btoa(
    text
      .split("")
      .map((c) => String.fromCharCode(c.charCodeAt(0) ^ OBFUSCATION_KEY))
      .join("")
  );
}

function deobfuscate(encoded: string): string {
  try {
    return atob(encoded)
      .split("")
      .map((c) => String.fromCharCode(c.charCodeAt(0) ^ OBFUSCATION_KEY))
      .join("");
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

  /** Xóa toàn bộ auth state. */
  logout: () => void;

  /** Thực hiện refresh token — trả về true nếu thành công. */
  performTokenRefresh: () => Promise<boolean>;

  /** Lên lịch auto-refresh trước khi token hết hạn. */
  scheduleTokenRefresh: () => void;
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
        const tokenRes = await loginApi(username, password);

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
            profile_image: { has_image: false, image_url_medium: "" },
            date_joined: new Date().toISOString(),
          };
        }

        // 4) Cập nhật streak đăng nhập
        updateStreak();

        // 5) Lưu thông tin user
        set({
          isAuthenticated: true,
          user: {
            username: me.username,
            email: me.email,
            name: account.name || me.username,
            avatar: account.profile_image?.has_image
              ? account.profile_image.image_url_medium
              : null,
            dateJoined: account.date_joined,
            isStaff: me.is_staff,
          },
        });

        // 6) Lên lịch tự động refresh
        get().scheduleTokenRefresh();

        return me.is_staff ? "staff" : "learner";
      },

      logout: () => {
        clearRefreshTimer();
        // Xóa toàn bộ cache React Query — ngăn rò rỉ data giữa sessions
        try { queryClient.clear(); } catch { /* App chưa mount */ }
        set({
          isAuthenticated: false,
          accessToken: null,
          refreshToken: null,
          tokenType: "Bearer",
          tokenExpiresAt: null,
          user: null,
        });
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
            }
          }
        };
      },
    }
  )
);
