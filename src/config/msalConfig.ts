// ============================================================
// Microsoft Auth Config — OAuth2 popup flow thủ công
// Giống Google flow: popup → id_token → exchange → edX tokens
// Không cần MSAL library
// ============================================================

import { config } from "@/config/env";
import { generateRandomToken } from "@/utils/pkce";

/**
 * Scopes yêu cầu từ Microsoft.
 * openid + profile + email → nhận id_token chứa claims cần thiết.
 */
const MICROSOFT_SCOPES = ["openid", "profile", "email"];

/**
 * Tạo URL authorize cho Microsoft OAuth2.
 * response_type=id_token → lấy id_token (JWT chứa email, name).
 * social_core.backends.azuread.AzureADOAuth2 decode id_token để lấy user info.
 */
function buildMicrosoftAuthUrl(): string {
  const nonce = generateRandomToken();

  // Lưu nonce để verify sau (chống replay attack)
  sessionStorage.setItem("ms_auth_nonce", nonce);

  const params = new URLSearchParams({
    client_id: config.microsoftClientId,
    response_type: "id_token",
    redirect_uri: window.location.origin + "/auth-redirect.html",
    scope: MICROSOFT_SCOPES.join(" "),
    response_mode: "fragment",
    nonce: nonce,
  });

  return `${config.microsoftAuthority}/oauth2/v2.0/authorize?${params.toString()}`;
}

/**
 * Mở popup Microsoft Login và lấy id_token.
 * Flow giống hệt Google:
 *   1. Mở popup → Microsoft login page
 *   2. User đăng nhập → Microsoft redirect về auth-redirect.html#id_token=...
 *   3. Đọc id_token từ URL hash của popup
 *   4. Đóng popup → trả về token
 *
 * @returns id_token (JWT) từ Microsoft — chứa email, name, sub
 * @throws Error nếu user đóng popup hoặc lỗi
 */
export function microsoftPopupLogin(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!config.microsoftClientId) {
      reject(new Error("Microsoft Client ID chưa được cấu hình."));
      return;
    }

    const authUrl = buildMicrosoftAuthUrl();

    // Mở popup giữa màn hình
    const width = 500;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      authUrl,
      "microsoft-login",
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
    );

    if (!popup) {
      reject(new Error("Không thể mở popup. Vui lòng tắt trình chặn popup."));
      return;
    }

    // Poll popup URL mỗi 300ms để đọc id_token
    const pollInterval = setInterval(() => {
      try {
        // Popup đã đóng (user tự đóng)
        if (!popup || popup.closed) {
          clearInterval(pollInterval);
          reject(new Error("Đã hủy đăng nhập."));
          return;
        }

        // Kiểm tra popup đã redirect về origin chưa
        const popupUrl = popup.location.href;
        if (!popupUrl || !popupUrl.startsWith(window.location.origin)) {
          return; // Vẫn đang ở trang Microsoft → chờ tiếp
        }

        // Đọc id_token từ URL hash
        const hash = popup.location.hash;
        if (hash && hash.includes("id_token")) {
          clearInterval(pollInterval);
          popup.close();

          const params = new URLSearchParams(hash.substring(1));
          const idToken = params.get("id_token");

          if (idToken) {
            resolve(idToken);
          } else {
            reject(new Error("Không nhận được token từ Microsoft."));
          }
          return;
        }

        // Kiểm tra lỗi từ Microsoft
        if (hash && hash.includes("error")) {
          clearInterval(pollInterval);
          popup.close();

          const params = new URLSearchParams(hash.substring(1));
          const errorDesc = params.get("error_description") || "Lỗi xác thực Microsoft.";
          reject(new Error(decodeURIComponent(errorDesc)));
          return;
        }
      } catch {
        // Cross-origin error — popup vẫn ở trang Microsoft → bỏ qua, chờ tiếp
      }
    }, 300);

    // Timeout sau 2 phút
    setTimeout(() => {
      clearInterval(pollInterval);
      if (popup && !popup.closed) popup.close();
      reject(new Error("Đăng nhập đã hết thời gian."));
    }, 120_000);
  });
}
