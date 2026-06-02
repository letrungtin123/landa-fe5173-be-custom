// ============================================================
// Google Callback Page — TODO: Implement SSO with Custom Backend
// Currently a placeholder that redirects to login.
// ============================================================

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

type CallbackState = "loading" | "error";

export function GoogleCallbackPage() {
  const navigate = useNavigate();
  const [state, setState] = useState<CallbackState>("loading");

  useEffect(() => {
    // TODO: Implement Google SSO callback with custom BE
    // For now, redirect to login
    setState("error");
    setTimeout(() => navigate("/login", { replace: true }), 2000);
  }, [navigate]);

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
        {state === "error" && (
          <>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
              <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <p className="text-[15px] font-medium text-amber-700">
              Tính năng đăng nhập Google chưa được hỗ trợ.
            </p>
            <p className="text-[12px] text-[#999]">Đang chuyển về trang đăng nhập...</p>
          </>
        )}
      </div>
    </div>
  );
}
