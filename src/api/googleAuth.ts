// ============================================================
// Google Auth API — Đăng nhập/Đăng ký qua Google OAuth2
//
// Flow an toàn, không redirect:
//   1. Google popup → lấy access_token
//   2. Thử exchange token → pipeline auto-link by email nếu user tồn tại
//   3. Nếu exchange fail (user mới hoàn toàn):
//      a. Lấy profile từ Google API
//      b. Đăng ký account mới (password tự sinh)
//      c. Exchange lại → pipeline auto-link by email → login
//
// KHÔNG LOG BẤT KỲ TOKEN HOẶC DỮ LIỆU NHẠY CẢM
// ============================================================

import axios from "axios";
import { config } from "@/config/env";

import type { OAuthTokenResponse } from "./types";

// ── Kiểu dữ liệu nội bộ ──

interface GoogleUserInfo {
  email: string;
  name: string;
  given_name?: string;
  family_name?: string;
}

export interface GoogleLoginResult {
  tokens: OAuthTokenResponse;
  isNewUser: boolean;
}

// ── Lỗi tùy chỉnh cho flow Google ──

export type GoogleAuthErrorCode =
  | "exchange_failed"
  | "google_api_failed"
  | "registration_failed"
  | "duplicate_email"
  | "network_error"
  | "timeout"
  | "aborted";

export class GoogleAuthError extends Error {
  public readonly code: GoogleAuthErrorCode;
  public readonly originalError?: unknown;

  constructor(message: string, code: GoogleAuthErrorCode, originalError?: unknown) {
    super(message);
    this.name = "GoogleAuthError";
    this.code = code;
    this.originalError = originalError;
  }
}

// ── Timeout mặc định cho toàn bộ flow ──
const FLOW_TIMEOUT_MS = 30_000;

/**
 * Exchange Google access token → edX OAuth2 tokens.
 *
 * Pipeline `associate_by_email_if_login_api` tự động link
 * Google vào user có cùng email trong DB.
 */
export async function exchangeGoogleToken(
  googleAccessToken: string,
  signal?: AbortSignal
): Promise<OAuthTokenResponse> {
  const { data } = await axios.post<OAuthTokenResponse>(
    "/oauth2/exchange_access_token/google-oauth2/",
    new URLSearchParams({
      access_token: googleAccessToken,
      client_id: config.clientId,
    }),
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: config.apiTimeoutMs,
      signal,
    }
  );
  return data;
}

/**
 * Lấy thông tin user từ Google People API.
 * Chỉ gọi khi exchange thất bại (user mới) — tránh request thừa.
 */
async function getGoogleUserInfo(
  googleAccessToken: string,
  signal?: AbortSignal
): Promise<GoogleUserInfo> {
  const { data } = await axios.get<GoogleUserInfo>(
    "https://www.googleapis.com/oauth2/v3/userinfo",
    {
      headers: { Authorization: `Bearer ${googleAccessToken}` },
      timeout: 10_000,
      signal,
    }
  );

  if (!data.email) {
    throw new GoogleAuthError(
      "Không thể lấy email từ tài khoản Google",
      "google_api_failed"
    );
  }

  return data;
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
 * Đăng ký account mới trên Open edX.
 *
 * Flow:
 *   1. Gọi LANDA API sinh password + gửi welcome email
 *   2. Dùng password đó đăng ký account
 *   3. Sau registration, exchangeGoogleToken sẽ auto-link by email
 */
async function registerNewUser(
  userInfo: GoogleUserInfo,
  signal?: AbortSignal
): Promise<void> {
  const username = generateUsername(userInfo.email);
  const name = userInfo.name || userInfo.email.split("@")[0];

  // Sinh password tạm thời để vượt qua validator của Open edX.
  // Mật khẩu này sẽ BỊ GHI ĐÈ bằng password random thật sự ở Backend (thông qua Signal)
  // và gửi qua email cho user.
  const tempPassword =
    Math.random().toString(36).slice(-8) +
    Math.random().toString(36).slice(-8).toUpperCase() +
    "!@#";

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
      // Không gửi cookie session từ request trước — tránh conflict
      withCredentials: false,
    });

  } catch (err) {
    if (axios.isAxiosError(err) && err.response) {
      const status = err.response.status;
      const errorData = err.response.data;

      // 409 = email đã tồn tại
      if (status === 409 && errorData?.email) {
        throw new GoogleAuthError(
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

      throw new GoogleAuthError(
        "Không thể tạo tài khoản. Vui lòng thử lại.",
        "registration_failed",
        err
      );
    }
    throw err;
  }
}

/**
 * Luồng chính: Google Login hoặc Register.
 *
 * Flow an toàn, không redirect:
 *   1. Thử exchange → thành công nếu user tồn tại (pipeline auto-link by email)
 *   2. Nếu exchange fail → lấy Google profile → đăng ký → login bằng password
 *
 * @param googleAccessToken - Access token từ Google popup
 * @returns GoogleLoginResult với tokens + flag isNewUser
 */
export async function googleLoginOrRegister(
  googleAccessToken: string
): Promise<GoogleLoginResult> {
  const controller = new AbortController();
  const { signal } = controller;

  const timeoutId = setTimeout(() => controller.abort(), FLOW_TIMEOUT_MS);

  try {
    // ── Bước 1: Thử exchange (user đã tồn tại) ──
    try {
      const tokens = await exchangeGoogleToken(googleAccessToken, signal);
      return { tokens, isNewUser: false };
    } catch (exchangeErr) {
      if (signal.aborted) {
        throw new GoogleAuthError("Đăng nhập đã hết thời gian.", "timeout");
      }
      // Exchange fail = user chưa tồn tại → tiếp tục đăng ký
    }

    // ── Bước 2: Lấy profile từ Google ──
    let userInfo: GoogleUserInfo;
    try {
      userInfo = await getGoogleUserInfo(googleAccessToken, signal);
    } catch (err) {
      if (err instanceof GoogleAuthError) throw err;
      throw new GoogleAuthError(
        "Không thể lấy thông tin từ Google. Vui lòng thử lại.",
        "google_api_failed",
        err
      );
    }

    // ── Bước 3: Đăng ký account mới ──
    try {
      await registerNewUser(userInfo, signal);
    } catch (err) {
      if (err instanceof GoogleAuthError) throw err;
      throw new GoogleAuthError(
        "Không thể tạo tài khoản. Vui lòng thử lại.",
        "registration_failed",
        err
      );
    }

    // ── Bước 4: Exchange lại → pipeline auto-link by email ──
    // User đã active (Google provider có skip_email_verification=True)
    // Exchange sẽ tìm user có cùng email → link social auth → trả tokens
    try {
      const tokens = await exchangeGoogleToken(googleAccessToken, signal);
      return { tokens, isNewUser: true };
    } catch (err) {
      throw new GoogleAuthError(
        "Tạo tài khoản thành công nhưng không thể đăng nhập. Vui lòng thử đăng nhập lại.",
        "exchange_failed",
        err
      );
    }
  } catch (err) {
    if (err instanceof GoogleAuthError) throw err;

    if (axios.isCancel(err) || signal.aborted) {
      throw new GoogleAuthError("Đăng nhập đã hết thời gian.", "timeout");
    }
    if (axios.isAxiosError(err) && !err.response) {
      throw new GoogleAuthError(
        "Lỗi kết nối. Kiểm tra mạng và thử lại.",
        "network_error",
        err
      );
    }
    throw new GoogleAuthError(
      "Lỗi không xác định. Vui lòng thử lại.",
      "exchange_failed",
      err
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
