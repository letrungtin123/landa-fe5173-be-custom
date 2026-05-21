// ============================================================
// Keycloak Auth API — Exchange authorization code for edX tokens
// Pattern giống googleAuth.ts / microsoftAuth.ts
// ============================================================

import axios from "axios";
import { config } from "@/config/env";
import type { OAuthTokenResponse } from "./types";

export interface KeycloakLoginResult {
  tokens: OAuthTokenResponse;
  isNewUser: boolean;
}

export type KeycloakAuthErrorCode =
  | "exchange_failed"
  | "registration_failed"
  | "duplicate_email"
  | "account_disabled"
  | "network_error"
  | "timeout"
  | "popup_cancelled";

export class KeycloakAuthError extends Error {
  public readonly code: KeycloakAuthErrorCode;
  public readonly originalError?: unknown;

  constructor(message: string, code: KeycloakAuthErrorCode, originalError?: unknown) {
    super(message);
    this.name = "KeycloakAuthError";
    this.code = code;
    this.originalError = originalError;
  }
}

const FLOW_TIMEOUT_MS = 30_000;

/**
 * Exchange Keycloak authorization code → edX OAuth2 tokens.
 * Gọi custom LMS endpoint — LMS exchange code server-side (confidential client).
 */
export async function exchangeKeycloakCode(
  code: string,
  redirectUri: string,
  codeVerifier: string,
  signal?: AbortSignal
): Promise<OAuthTokenResponse> {
  const { data } = await axios.post<OAuthTokenResponse>(
    "/api/landa/auth/keycloak/exchange/",
    new URLSearchParams({
      code,
      redirect_uri: redirectUri,
      client_id: config.clientId,
      code_verifier: codeVerifier,
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
 * Luồng chính: Keycloak Login.
 *
 * Flow đơn giản hơn Google/Microsoft vì LMS backend xử lý tất cả:
 *   1. FE gửi authorization code + code_verifier đến LMS
 *   2. LMS exchange code → Keycloak tokens (server-side, PKCE)
 *   3. LMS get userinfo → tìm/tạo user → trả edX tokens
 *
 * Không cần register fallback — LMS tự tạo user mới nếu chưa tồn tại.
 */
export async function keycloakLogin(
  code: string,
  redirectUri: string,
  codeVerifier: string
): Promise<KeycloakLoginResult> {
  const controller = new AbortController();
  const { signal } = controller;
  const timeoutId = setTimeout(() => controller.abort(), FLOW_TIMEOUT_MS);

  try {
    const tokens = await exchangeKeycloakCode(code, redirectUri, codeVerifier, signal);
    return { tokens, isNewUser: false };
  } catch (err) {
    if (err instanceof KeycloakAuthError) throw err;

    if (axios.isCancel(err) || signal.aborted) {
      throw new KeycloakAuthError("Đăng nhập đã hết thời gian.", "timeout");
    }

    if (axios.isAxiosError(err) && err.response) {
      const { status, data: errorData } = err.response;
      if (status === 403 && errorData?.error === "account_disabled") {
        throw new KeycloakAuthError(
          "Tài khoản đã bị vô hiệu hóa bởi Admin.",
          "account_disabled",
          err
        );
      }
      const desc = errorData?.error_description || "Đăng nhập thất bại.";
      throw new KeycloakAuthError(desc, "exchange_failed", err);
    }

    if (axios.isAxiosError(err) && !err.response) {
      throw new KeycloakAuthError(
        "Lỗi kết nối. Kiểm tra mạng và thử lại.",
        "network_error",
        err
      );
    }

    throw new KeycloakAuthError(
      "Lỗi không xác định. Vui lòng thử lại.",
      "exchange_failed",
      err
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
