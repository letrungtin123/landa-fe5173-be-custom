// ============================================================
// Auth Store — Quản lý xác thực với Custom Backend
// JWT tokens lưu trong localStorage (mã hóa) + tự động refresh
// KHÔNG LOG TOKEN HOẶC DỮ LIỆU NHẠY CẢM
// ============================================================

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { loginApi, refreshTokenApi, logoutApi, getUserMe } from "@/api/auth";
import { queryClient } from "@/App";
import { useStudyTimeStore } from "@/stores/useStudyTimeStore";
import type { TenantBasic, PermissionsMap } from "@/api/types";

// ── Mã hóa/giải mã đơn giản cho token trong storage ──
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
  id: string;
  username: string;
  email: string;
  fullName: string;
  phone: string | null;
  avatar: string | null;
  role: 'learner' | 'staff' | 'superuser' | 'superadmin';
  tenantId: string | null;
  tenantName: string | null;
}

interface AuthState {
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  tokenType: string;
  tokenExpiresAt: number | null;
  user: AuthUser | null;
  permissions: PermissionsMap;
  tenantModules: string[];
  managedTenants: TenantBasic[];

  /** Đăng nhập bằng username/email + password. */
  login: (username: string, password: string) => Promise<void>;

  /** Đăng xuất — revoke token + xóa state. */
  logout: () => Promise<void>;

  /** Thực hiện refresh token — trả về true nếu thành công. */
  performTokenRefresh: () => Promise<boolean>;

  /** Lên lịch auto-refresh trước khi token hết hạn. */
  scheduleTokenRefresh: () => void;

  /** Cập nhật thông tin user trong store. */
  updateUser: (updates: Partial<AuthUser>) => void;

  /** Chuyển tenant (superuser/superadmin). */
  switchTenant: (tenantId: string) => void;
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
      permissions: {},
      tenantModules: [],
      managedTenants: [],

      login: async (username: string, password: string) => {
        const result = await loginApi(username, password);

        // Superadmin/superuser: tenant_id = null → tự chọn tenant đầu tiên
        let activeTenantId = result.user.tenant_id;
        let activeTenantName = result.user.tenant_name;
        if (!activeTenantId && result.managed_tenants?.length > 0) {
          activeTenantId = result.managed_tenants[0].id;
          activeTenantName = result.managed_tenants[0].name;
        }

        const expiresAt = Date.now() + result.expires_in * 1000;
        set({
          isAuthenticated: true,
          accessToken: result.access_token,
          refreshToken: result.refresh_token,
          tokenType: "Bearer",
          tokenExpiresAt: expiresAt,
          user: {
            id: result.user.id,
            username: result.user.username,
            email: result.user.email,
            fullName: result.user.full_name,
            phone: result.user.phone,
            avatar: result.user.avatar_url,
            role: result.user.role,
            tenantId: activeTenantId,
            tenantName: activeTenantName,
          },
          permissions: result.permissions,
          tenantModules: result.tenant_modules,
          managedTenants: result.managed_tenants,
        });

        // Lên lịch tự động refresh
        get().scheduleTokenRefresh();
      },

      logout: async () => {
        clearRefreshTimer();

        const currentRefreshToken = get().refreshToken;

        // 1. Xóa state local TRƯỚC
        set({
          user: null,
          isAuthenticated: false,
          accessToken: null,
          refreshToken: null,
          tokenExpiresAt: null,
          permissions: {},
          tenantModules: [],
          managedTenants: [],
        });

        // 2. Xóa toàn bộ cache React Query
        try { queryClient.clear(); } catch { /* App chưa mount */ }

        // 3. Xóa dữ liệu per-user trong localStorage
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

        // 4. Reset study time store
        useStudyTimeStore.getState().reset();

        // 5. Revoke refresh token phía server
        if (currentRefreshToken) {
          await logoutApi(currentRefreshToken);
        }
      },

      performTokenRefresh: async (): Promise<boolean> => {
        const { refreshToken: currentRefreshToken } = get();
        if (!currentRefreshToken) return false;

        try {
          const result = await refreshTokenApi(currentRefreshToken);

          // Giữ tenant đang chọn (nếu superadmin/superuser đã switchTenant)
          const currentUser = get().user;
          let activeTenantId = result.user.tenant_id || currentUser?.tenantId || null;
          let activeTenantName = result.user.tenant_name || currentUser?.tenantName || null;
          if (!activeTenantId && result.managed_tenants?.length > 0) {
            activeTenantId = result.managed_tenants[0].id;
            activeTenantName = result.managed_tenants[0].name;
          }

          const expiresAt = Date.now() + result.expires_in * 1000;
          set({
            accessToken: result.access_token,
            refreshToken: result.refresh_token,
            tokenType: "Bearer",
            tokenExpiresAt: expiresAt,
            user: {
              id: result.user.id,
              username: result.user.username,
              email: result.user.email,
              fullName: result.user.full_name,
              phone: result.user.phone,
              avatar: result.user.avatar_url,
              role: result.user.role,
              tenantId: activeTenantId,
              tenantName: activeTenantName,
            },
            permissions: result.permissions,
            tenantModules: result.tenant_modules,
            managedTenants: result.managed_tenants,
          });

          get().scheduleTokenRefresh();
          return true;
        } catch {
          return false;
        }
      },

      scheduleTokenRefresh: () => {
        clearRefreshTimer();

        const { tokenExpiresAt } = get();
        if (!tokenExpiresAt) return;

        const now = Date.now();
        const buffer = 300_000; // 5 phút trước khi hết hạn
        const delay = tokenExpiresAt - now - buffer;

        if (delay <= 0) {
          get().performTokenRefresh().then((success) => {
            if (!success) get().logout();
          });
          return;
        }

        refreshTimerId = setTimeout(() => {
          get().performTokenRefresh().then((success) => {
            if (!success) get().logout();
          });
        }, delay);
      },

      updateUser: (updates) => {
        const currentUser = get().user;
        if (currentUser) {
          set({ user: { ...currentUser, ...updates } });
        }
      },

      switchTenant: (tenantId: string) => {
        const { user, managedTenants } = get();
        if (!user) return;

        // Tìm tenant trong danh sách managed
        const tenant = managedTenants.find(t => t.id === tenantId);
        if (!tenant) return;

        // Cập nhật tenant trong store
        set({
          user: {
            ...user,
            tenantId: tenant.id,
            tenantName: tenant.name,
          },
        });

        // Invalidate tất cả queries để refetch data theo tenant mới
        try { queryClient.invalidateQueries(); } catch { /* ignore */ }
      },
    }),
    {
      name: STORAGE_KEY,
      storage: encryptedStorage,
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        tokenType: state.tokenType,
        tokenExpiresAt: state.tokenExpiresAt,
        user: state.user,
        permissions: state.permissions,
        tenantModules: state.tenantModules,
        managedTenants: state.managedTenants,
      }),
      onRehydrateStorage: () => {
        return (state) => {
          if (state?.isAuthenticated && state?.tokenExpiresAt) {
            if (Date.now() >= state.tokenExpiresAt) {
              state.performTokenRefresh().then((success) => {
                if (!success) state.logout();
              });
            } else {
              state.scheduleTokenRefresh();
            }
          }
        };
      },
    }
  )
);
