// ============================================================
// Microsoft Auth API — Đăng nhập/Đăng ký qua Azure AD OAuth2
//
// Flow an toàn, popup-based (giống Google flow):
//   1. MSAL popup → Microsoft access_token
//   2. Exchange token → POST /oauth2/exchange_access_token/azuread-oauth2/
//      → pipeline auto-link by email nếu user tồn tại
//   3. Nếu exchange fail (user mới hoàn toàn):
//      a. Lấy profile từ Microsoft Graph API
//      b. Đăng ký account mới (password tự sinh)
//      c. Exchange lại → pipeline auto-link by email → login
//
// KHÔNG LOG BẤT KỲ TOKEN HOẶC DỮ LIỆU NHẠY CẢM
// ============================================================

import axios from "axios";
import { config } from "@/config/env";

import type { OAuthTokenResponse } from "./types";

// ── Kiểu dữ liệu nội bộ ──

interface MicrosoftUserInfo {
  email: string;
  displayName: string;
  givenName?: string;
  surname?: string;
}

export interface MicrosoftLoginResult {
  tokens: OAuthTokenResponse;
  isNewUser: boolean;
}

// ── Lỗi tùy chỉnh cho flow Microsoft ──

export type MicrosoftAuthErrorCode =
  | "exchange_failed"
  | "graph_api_failed"
  | "registration_failed"
  | "duplicate_email"
  | "network_error"
  | "timeout"
  | "popup_cancelled"
  | "interaction_required";

export class MicrosoftAuthError extends Error {
  public readonly code: MicrosoftAuthErrorCode;
  public readonly originalError?: unknown;

  constructor(message: string, code: MicrosoftAuthErrorCode, originalError?: unknown) {
    super(message);
    this.name = "MicrosoftAuthError";
    this.code = code;
    this.originalError = originalError;
  }
}

// ── Timeout mặc định cho toàn bộ flow ──
const FLOW_TIMEOUT_MS = 30_000;

/**
 * Exchange Microsoft access token → edX OAuth2 tokens.
 *
 * Pipeline `associate_by_email_if_oauth` tự động link
 * Microsoft account vào user có cùng email trong DB.
 */
export async function exchangeMicrosoftToken(
  microsoftAccessToken: string,
  signal?: AbortSignal
): Promise<OAuthTokenResponse> {
  try {
    const { data } = await axios.post<OAuthTokenResponse>(
      "/oauth2/exchange_access_token/azuread-oauth2/",
      new URLSearchParams({
        access_token: microsoftAccessToken,
        client_id: config.clientId,
      }),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: config.apiTimeoutMs,
        signal,
      }
    );
    return data;
  } catch (err) {
    if (import.meta.env.DEV && axios.isAxiosError(err) && err.response) {
      console.error("[Exchange] Status:", err.response.status);
      console.error("[Exchange] Response:", JSON.stringify(err.response.data));
      console.error("[Exchange] client_id used:", config.clientId);
    }
    throw err;
  }
}

/**
 * Lấy thông tin user từ Microsoft id_token (JWT).
 * id_token chứa claims: email, name, preferred_username, etc.
 * Không cần gọi Graph API — decode JWT payload trực tiếp.
 */
function getMicrosoftUserInfoFromIdToken(
  idToken: string,
): MicrosoftUserInfo {
  try {
    // Decode JWT payload (phần giữa, base64url)
    const parts = idToken.split(".");
    if (parts.length !== 3) {
      throw new Error("Invalid JWT format");
    }

    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))
    );

    // id_token claims: email, preferred_username, name, given_name, family_name
    const email = payload.email || payload.preferred_username || payload.upn || "";

    if (!email) {
      throw new MicrosoftAuthError(
        "Không thể lấy email từ tài khoản Microsoft",
        "graph_api_failed"
      );
    }

    return {
      email,
      displayName: payload.name || email.split("@")[0],
      givenName: payload.given_name,
      surname: payload.family_name,
    };
  } catch (err) {
    if (err instanceof MicrosoftAuthError) throw err;
    throw new MicrosoftAuthError(
      "Không thể đọc thông tin từ Microsoft token",
      "graph_api_failed",
      err
    );
  }
}

/**
 * Sinh username an toàn từ email.
 * Lấy phần trước @ → sanitize → thêm suffix ngẫu nhiên.
 */
function generateUsername(email: string): string {
  const prefix = email
    .split("@")[0]
    .replace(/[^a-zA-Z0-9_]/g, "")
    .slice(0, 20);

  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `${prefix || "user"}_${suffix}`;
}

/**
 * Sinh password bảo mật — đủ mạnh để vượt qua validator Open edX.
 * Password này sẽ BỊ GHI ĐÈ bằng password random ở Backend (Signal).
 */
function generateSecurePassword(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz";
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const digits = "0123456789";
  const special = "!@#$%&*";

  const array = new Uint32Array(16);
  crypto.getRandomValues(array);

  let password = "";
  for (let i = 0; i < 8; i++) password += chars[array[i] % chars.length];
  for (let i = 8; i < 12; i++) password += upper[array[i] % upper.length];
  for (let i = 12; i < 14; i++) password += digits[array[i] % digits.length];
  for (let i = 14; i < 16; i++) password += special[array[i] % special.length];

  return password;
}

/**
 * Đăng ký account mới trên Open edX.
 */
async function registerNewUser(
  userInfo: MicrosoftUserInfo,
  signal?: AbortSignal
): Promise<void> {
  const username = generateUsername(userInfo.email);
  const name = userInfo.displayName || userInfo.email.split("@")[0];
  const tempPassword = generateSecurePassword();

  const formData = new URLSearchParams({
    email: userInfo.email,
    name,
    username,
    password: tempPassword,
    honor_code: "true",
    terms_of_service: "true",
  });

  try {
    await axios.post("/api/user/v2/account/registration/", formData, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: config.apiTimeoutMs,
      signal,
      withCredentials: false,
    });
  } catch (err) {
    if (axios.isAxiosError(err) && err.response) {
      const status = err.response.status;
      const errorData = err.response.data;

      // 409 = email đã tồn tại
      if (status === 409 && errorData?.email) {
        throw new MicrosoftAuthError(
          "Email này đã được sử dụng. Vui lòng đăng nhập bằng mật khẩu.",
          "duplicate_email",
          err
        );
      }

      // 409 duplicate username → thử lại 1 lần với username khác
      if (status === 409 && errorData?.username && !errorData?.email) {
        formData.set("username", generateUsername(userInfo.email));
        await axios.post("/api/user/v2/account/registration/", formData, {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          timeout: config.apiTimeoutMs,
          signal,
          withCredentials: false,
        });
        return;
      }

      throw new MicrosoftAuthError(
        "Không thể tạo tài khoản. Vui lòng thử lại.",
        "registration_failed",
        err
      );
    }
    throw err;
  }
}

/**
 * Luồng chính: Microsoft Login hoặc Register.
 *
 * Flow an toàn, không redirect:
 *   1. Thử exchange → thành công nếu user tồn tại (pipeline auto-link by email)
 *   2. Nếu exchange fail → decode id_token → đăng ký → exchange lại
 *
 * @param microsoftIdToken - id_token (JWT) từ Microsoft popup — chứa email, name
 * @returns MicrosoftLoginResult với tokens + flag isNewUser
 */
export async function microsoftLoginOrRegister(
  microsoftIdToken: string
): Promise<MicrosoftLoginResult> {
  const controller = new AbortController();
  const { signal } = controller;

  const timeoutId = setTimeout(() => controller.abort(), FLOW_TIMEOUT_MS);

  try {
    // ── Bước 1: Thử exchange (user đã tồn tại + đã link Azure AD) ──
    let firstExchangeError: unknown;
    try {
      const tokens = await exchangeMicrosoftToken(microsoftIdToken, signal);
      return { tokens, isNewUser: false };
    } catch (exchangeErr) {
      if (signal.aborted) {
        throw new MicrosoftAuthError("Đăng nhập đã hết thời gian.", "timeout");
      }
      firstExchangeError = exchangeErr;
      if (import.meta.env.DEV) {
        console.warn("[Microsoft Auth] Exchange lần 1 thất bại:", exchangeErr);
      }
      // Exchange fail → thử đăng ký hoặc link
    }

    // ── Bước 2: Lấy profile từ id_token (decode JWT, không cần Graph API) ──
    const userInfo = getMicrosoftUserInfoFromIdToken(microsoftIdToken);

    // ── Bước 3: Đăng ký account mới ──
    let isDuplicateEmail = false;
    try {
      await registerNewUser(userInfo, signal);
    } catch (err) {
      if (err instanceof MicrosoftAuthError && err.code === "duplicate_email") {
        // User đã tồn tại (đăng ký qua Google/password) → bỏ qua, thử exchange lại
        isDuplicateEmail = true;
      } else if (err instanceof MicrosoftAuthError) {
        throw err;
      } else {
        throw new MicrosoftAuthError(
          "Không thể tạo tài khoản. Vui lòng thử lại.",
          "registration_failed",
          err
        );
      }
    }

    // ── Bước 4: Exchange lại → pipeline auto-link by email ──
    try {
      const tokens = await exchangeMicrosoftToken(microsoftIdToken, signal);
      return { tokens, isNewUser: !isDuplicateEmail };
    } catch (err) {
      // Nếu user tồn tại nhưng exchange vẫn fail → pipeline chưa link
      if (isDuplicateEmail) {
        if (import.meta.env.DEV) {
          console.error("[Microsoft Auth] Exchange lần 2 thất bại (duplicate email):", err);
          console.error("[Microsoft Auth] Exchange lần 1 error:", firstExchangeError);
        }
        throw new MicrosoftAuthError(
          "Tài khoản đã tồn tại nhưng chưa liên kết Microsoft. Liên hệ admin hoặc đăng nhập bằng mật khẩu.",
          "duplicate_email",
          err
        );
      }
      throw new MicrosoftAuthError(
        "Tạo tài khoản thành công nhưng không thể đăng nhập. Vui lòng thử đăng nhập lại.",
        "exchange_failed",
        err
      );
    }
  } catch (err) {
    if (err instanceof MicrosoftAuthError) throw err;

    if (axios.isCancel(err) || signal.aborted) {
      throw new MicrosoftAuthError("Đăng nhập đã hết thời gian.", "timeout");
    }
    if (axios.isAxiosError(err) && !err.response) {
      throw new MicrosoftAuthError(
        "Lỗi kết nối. Kiểm tra mạng và thử lại.",
        "network_error",
        err
      );
    }
    throw new MicrosoftAuthError(
      "Lỗi không xác định. Vui lòng thử lại.",
      "exchange_failed",
      err
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
