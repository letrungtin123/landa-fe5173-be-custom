// ============================================================
// Google Callback Page
// Xử lý redirect từ LMS sau khi Google auth server-side flow
// hoàn thành (link account cho user đã tồn tại).
//
// Flow: LMS redirect về /google-callback → detect session → login → dashboard
// ============================================================

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/useAuthStore";
import { getUserMe, getUserAccount } from "@/api/auth";
import { establishLmsSessionFromToken } from "@/api/lmsSession";
import { updateStreak } from "@/hooks/useUser";
import { sanitizeUrlToRelative } from "@/transformers/staticUrlRewriter";

type CallbackState = "loading" | "success" | "error";

export function GoogleCallbackPage() {
  const navigate = useNavigate();
  const [state, setState] = useState<CallbackState>("loading");
  const [errorMsg, setErrorMsg] = useState("");

  const set = useAuthStore.setState;
  const scheduleTokenRefresh = useAuthStore((s) => s.scheduleTokenRefresh);

  useEffect(() => {
    async function handleCallback() {
      try {
        // LMS server-side flow đã tạo session cookie.
        // Thử lấy user info từ session.
        const me = await getUserMe();

        let account;
        try {
          account = await getUserAccount(me.username);
        } catch {
          account = {
            name: me.username,
            profile_image: { has_image: false, image_url_full: "" },
            date_joined: new Date().toISOString(),
          };
        }

        // Tạo LMS session từ cookie hiện có
        await establishLmsSessionFromToken();

        // Cập nhật streak
        updateStreak();

        // Lưu user info vào store (không có OAuth tokens vì flow là session-based)
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
          },
        });

        scheduleTokenRefresh();

        setState("success");
        // Redirect về dashboard sau 500ms
        setTimeout(() => navigate("/dashboard", { replace: true }), 500);
      } catch (err) {
        console.error("[google-callback] Failed to authenticate:", err);
        setState("error");
        setErrorMsg("Không thể hoàn tất đăng nhập. Vui lòng thử lại.");
        // Redirect về login sau 3s
        setTimeout(() => navigate("/login", { replace: true }), 3000);
      }
    }

    handleCallback();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#f8faff] to-[#e8f0fe]">
      <div className="flex flex-col items-center gap-4 rounded-2xl bg-white p-10 shadow-lg">
        {state === "loading" && (
          <>
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#4285F4]/30 border-t-[#4285F4]" />
            <p className="text-[15px] font-medium text-[#3c4043]">
              Đang hoàn tất đăng nhập...
            </p>
          </>
        )}
        {state === "success" && (
          <>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-[15px] font-medium text-green-700">
              Đăng nhập thành công!
            </p>
          </>
        )}
        {state === "error" && (
          <>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-[15px] font-medium text-red-700">{errorMsg}</p>
            <p className="text-[12px] text-[#999]">Đang chuyển về trang đăng nhập...</p>
          </>
        )}
      </div>
    </div>
  );
}
