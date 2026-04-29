// ============================================================
// LMS Session — Tạo session cookie trên LMS qua Vite proxy
//
// Open edX /xblock/ endpoint yêu cầu session auth (cookie),
// không chấp nhận Bearer token.
//
// Có 2 cách tạo session:
// 1) POST /login_ajax (cần username + password) — dùng lúc login
// 2) POST /oauth2/login/ (cần access_token) — dùng khi refresh page
//
// Cả 2 đều được Vite proxy capture sessionid server-side
// (vì Open edX set Secure cookie → browser không lưu trên HTTP).
// ============================================================

import { useAuthStore } from "@/stores/useAuthStore";
import { lmsUrl } from "@/config/openedx";

/**
 * Tạo LMS session bằng access token (LoginWithAccessTokenView).
 *
 * Endpoint: POST /oauth2/login/
 * Header: Authorization: Bearer {access_token}
 *
 * Dùng khi:
 * - App load lại (refresh page) mà user vẫn authenticated
 * - Vite dev server restart → proxy mất sessionid
 * - Bất kỳ lúc nào cần đảm bảo session tồn tại
 *
 * Vite proxy sẽ capture sessionid từ response (server-side).
 */
export async function establishLmsSessionFromToken(): Promise<void> {
  try {
    const { accessToken, tokenType } = useAuthStore.getState();
    if (!accessToken) {
      console.warn("[lms-session] No access token, skipping session");
      return;
    }

    const res = await fetch(lmsUrl("/oauth2/login/"), {
      method: "POST",
      credentials: "include",
      headers: {
        Authorization: `${tokenType} ${accessToken}`,
      },
    });

    if (res.ok || res.status === 204) {
      console.log("[lms-session] ✅ LMS session established via access token");
    } else {
      console.warn("[lms-session] ⚠️ /oauth2/login/ returned", res.status);
    }
  } catch (err) {
    console.warn("[lms-session] Token-based session failed:", err);
  }
}

/**
 * Tạo LMS session bằng username/password (legacy approach).
 *
 * Flow:
 *   1) GET /csrf/api/v1/token → lấy csrftoken cookie
 *   2) POST /login_ajax → LMS tạo sessionid cookie
 *
 * Dùng khi user login lần đầu.
 */
export async function establishLmsSession(
  username: string,
  password: string
): Promise<void> {
  try {
    // Bước 1: Lấy CSRF token — endpoint này set csrftoken cookie
    const csrfRes = await fetch(lmsUrl("/csrf/api/v1/token"), {
      credentials: "include",
    });

    // Đọc csrftoken từ cookie
    const csrfToken = getCookie("csrftoken");
    if (!csrfRes.ok || !csrfToken) {
      console.warn("[lms-session] Could not get CSRF token, trying token-based approach");
      // Fallback to token-based session
      await establishLmsSessionFromToken();
      return;
    }

    // Bước 2: POST /login_ajax với credentials
    const res = await fetch(lmsUrl("/login_ajax"), {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-CSRFToken": csrfToken,
      },
      body: new URLSearchParams({
        email_or_username: username,
        password,
      }),
    });

    if (res.ok) {
      console.log("[lms-session] ✅ LMS session established via login_ajax");
    } else {
      console.warn("[lms-session] ⚠️ /login_ajax returned", res.status, "— trying token-based");
      // Fallback to token-based session
      await establishLmsSessionFromToken();
    }
  } catch (err) {
    console.warn("[lms-session] login_ajax failed, trying token-based:", err);
    await establishLmsSessionFromToken();
  }
}

/**
 * Xóa LMS session (gọi khi user logout).
 */
export async function clearLmsSession(): Promise<void> {
  try {
    // 1) Gọi LMS logout endpoint để hủy session phía server
    await fetch(lmsUrl("/logout"), {
      method: "POST",
      credentials: "include",
      headers: {
        "X-CSRFToken": getCookie("csrftoken") || "",
      },
    });
  } catch {
    // Best-effort — server có thể không phản hồi
  }

  // 2) Xóa sạch tất cả cookies phía client
  const cookiesToClear = [
    "sessionid",
    "csrftoken",
    "openedx-language-preference",
  ];
  for (const name of cookiesToClear) {
    document.cookie = `${name}=; Max-Age=0; path=/`;
    document.cookie = `${name}=; Max-Age=0; path=/; domain=${window.location.hostname}`;
  }
}

/** Đọc cookie theo tên */
function getCookie(name: string): string | null {
  const match = document.cookie.match(
    new RegExp("(^|;\\s*)" + name + "=([^;]*)")
  );
  return match ? decodeURIComponent(match[2]) : null;
}
