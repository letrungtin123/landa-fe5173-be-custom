import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useGoogleLogin } from "@react-oauth/google";
import { useAuthStore } from "@/stores/useAuthStore";
import { googleLoginOrRegister, GoogleAuthError } from "@/api/googleAuth";
import { microsoftLoginOrRegister, MicrosoftAuthError } from "@/api/microsoftAuth";
import { microsoftPopupLogin } from "@/config/msalConfig";
import { config } from "@/config/env";
import logoImg from "@/assets/leandassociate.webp";

export function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle);
  const loginWithMicrosoft = useAuthStore((s) => s.loginWithMicrosoft);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; google?: string; microsoft?: string }>(
    {}
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isMicrosoftLoading, setIsMicrosoftLoading] = useState(false);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get("error") === "account_disabled") {
      setErrors((prev) => ({
        ...prev,
        email: "Tài khoản của bạn đã bị vô hiệu hóa bởi Admin.",
      }));
    }
  }, [searchParams]);

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};
    if (!email.trim()) {
      newErrors.email = "Vui lòng nhập tên đăng nhập hoặc email";
    }
    if (!password.trim()) {
      newErrors.password = "Vui lòng nhập mật khẩu";
    } else if (password.length < 6) {
      newErrors.password = "Mật khẩu phải có ít nhất 6 ký tự";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      // FE này dành cho learner — luôn vào dashboard sau khi đăng nhập
      await login(email, password);
      navigate("/dashboard", { replace: true });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number } };
      if (axiosErr.response?.status === 401 || axiosErr.response?.status === 400) {
        setErrors({ email: "Tên đăng nhập hoặc mật khẩu không đúng" });
      } else {
        setErrors({ email: "Lỗi kết nối máy chủ. Vui lòng thử lại sau." });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Google Login handler ──
  // Flow hoàn toàn trên FE, không redirect:
  //   Popup Google → access_token → exchange (auto-link by email)
  //   → nếu user mới → register + exchange lại → login
  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsGoogleLoading(true);
      setErrors({});
      try {
        const result = await googleLoginOrRegister(tokenResponse.access_token);
        await loginWithGoogle(result.tokens);
        navigate("/dashboard", { replace: true });
      } catch (err) {
        if (err instanceof GoogleAuthError) {
          setErrors({ google: err.message });
        } else {
          setErrors({ google: "Lỗi không xác định. Vui lòng thử lại." });
        }
      } finally {
        setIsGoogleLoading(false);
      }
    },
    onError: () => {
      setErrors({ google: "Không thể kết nối với Google. Vui lòng thử lại." });
    },
    flow: "implicit",
  });

  // ── Microsoft Login handler ──
  // Flow giống Google: popup thủ công → access_token → exchange → edX tokens
  const handleMicrosoftLogin = async () => {
    setIsMicrosoftLoading(true);
    setErrors({});

    try {
      // Bước 1: Popup Microsoft login → lấy access_token
      const accessToken = await microsoftPopupLogin();

      // Bước 2: Exchange → edX tokens (auto-link by email nếu user tồn tại)
      const result = await microsoftLoginOrRegister(accessToken);
      await loginWithMicrosoft(result.tokens);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      if (err instanceof MicrosoftAuthError) {
        setErrors({ microsoft: err.message });
      } else {
        const msg = err instanceof Error ? err.message : "Không thể kết nối với Microsoft.";
        // "Đã hủy đăng nhập" = user tự đóng popup → không hiện lỗi
        if (!msg.includes("hủy")) {
          setErrors({ microsoft: msg });
        }
      }
    } finally {
      setIsMicrosoftLoading(false);
    }
  };

  // Kiểm tra xem có SSO nào đang loading không — disable tất cả nút
  const isSsoLoading = isGoogleLoading || isMicrosoftLoading;

  return (
    <div className="flex min-h-screen">
      {/* ─── Left Panel ─── */}
      <div className="relative hidden w-[48%] overflow-hidden lg:flex flex-col justify-between p-10 select-none">
        {/* Background layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a1628] via-[#0f2a5e] to-[#0a1628]" />
        {/* Decorative light sweep */}
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 50% 70%, rgba(56,140,255,0.35) 0%, transparent 70%), radial-gradient(ellipse 40% 30% at 30% 80%, rgba(100,180,255,0.2) 0%, transparent 60%)",
          }}
        />

        {/* Logo */}
        <div className="relative z-10">
          <img
            src={logoImg}
            alt="Le & Associates"
            className="h-10 w-auto brightness-0 invert"
          />
          <p className="mt-1 text-[11px] font-semibold tracking-[0.15em] text-white/60 uppercase">
            In people we value
          </p>
        </div>

        {/* Bottom content */}
        <div className="relative z-10">
          {/* Trust badge */}
          <div className="mb-6 flex items-center gap-3">
            <div className="flex -space-x-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white/20 bg-gradient-to-br from-blue-400 to-blue-600 text-[11px] font-bold text-white"
                >
                  {["NT", "TH", "LM"][i]}
                </div>
              ))}
            </div>
            <span className="rounded-full bg-white/10 backdrop-blur-sm px-3 py-1 text-[12px] font-medium text-white/80">
              Trusted by 100+ companies
            </span>
          </div>

          <h1 className="text-5xl font-extrabold leading-[1.1] tracking-tight text-white md:text-6xl">
            READY TO
            <br />
            GROW?
          </h1>
          <p className="mt-4 max-w-xs text-[15px] leading-relaxed text-white/60">
            Log in to start your skill-building journey today
          </p>
        </div>
      </div>

      {/* ─── Right Panel (Form) ─── */}
      <div className="flex flex-1 items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-[420px]">
          {/* Logo mark */}
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-[#0f2a5e] shadow-lg p-2">
            <img
              src={logoImg}
              alt="L&A E-learning"
              className="h-full w-full object-contain brightness-0 invert"
            />
          </div>

          <h2 className="mb-2 text-[28px] font-bold tracking-tight text-[#1a1a1a]">
            Đăng nhập vào L&A E-learning
          </h2>
          <p className="mb-8 text-[14px] text-[#888]">
            Vui lòng đăng nhập vào tài khoản đã được cung cấp để tiếp tục.
          </p>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Email */}
            <div>
              <label
                htmlFor="login-email"
                className="mb-1.5 block text-[13px] font-semibold text-[#1a1a1a]"
              >
                Tên đăng nhập / Email<span className="text-red-500">*</span>
              </label>
              <input
                id="login-email"
                type="text"
                placeholder="username hoặc email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
                }}
                className={`w-full rounded-lg border bg-white px-4 py-3 text-[14px] text-[#1a1a1a] outline-none transition-colors placeholder:text-[#bbb] focus:border-[#1877F2] focus:ring-2 focus:ring-[#1877F2]/20 ${
                  errors.email ? "border-red-400" : "border-[#ddd]"
                }`}
              />
              {errors.email && (
                <p className="mt-1 text-[12px] text-red-500">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label
                  htmlFor="login-password"
                  className="text-[13px] font-semibold text-[#1a1a1a]"
                >
                  Mật khẩu<span className="text-red-500">*</span>
                </label>
                {/* TODO: Quên mật khẩu — tạm ẩn, bật lại khi có SMTP
                <button
                  type="button"
                  className="text-[13px] font-medium text-[#1877F2] hover:underline"
                >
                  Quên mật khẩu?
                </button>
                */}
              </div>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password)
                      setErrors((p) => ({ ...p, password: undefined }));
                  }}
                  className={`w-full rounded-lg border bg-white px-4 py-3 pr-11 text-[14px] text-[#1a1a1a] outline-none transition-colors placeholder:text-[#bbb] focus:border-[#1877F2] focus:ring-2 focus:ring-[#1877F2]/20 ${
                    errors.password ? "border-red-400" : "border-[#ddd]"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#aaa] hover:text-[#666] transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-[18px] w-[18px]" />
                  ) : (
                    <Eye className="h-[18px] w-[18px]" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-[12px] text-red-500">
                  {errors.password}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-full bg-[#1877F2] py-3 text-[15px] font-semibold text-white shadow-md transition-all hover:bg-[#1466d8] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Đang đăng nhập…
                </span>
              ) : (
                "Log in"
              )}
            </button>
          </form>

          {/* ─── Divider ─── */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#e5e5e5]" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-[12px] font-medium text-[#999] uppercase tracking-wider">
                hoặc
              </span>
            </div>
          </div>

          {/* ─── SSO Buttons ─── */}
          <div className="space-y-3">
            {/* ─── Google Login Button ─── */}
            <button
              id="google-login-btn"
              type="button"
              onClick={() => googleLogin()}
              disabled={isSsoLoading || isSubmitting}
              className="group relative w-full flex items-center justify-center gap-3 rounded-full border border-[#dadce0] bg-white py-3 px-4 text-[15px] font-semibold text-[#3c4043] shadow-sm transition-all hover:border-[#d2e3fc] hover:bg-[#f8faff] hover:shadow-md active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isGoogleLoading ? (
                <svg
                  className="h-5 w-5 animate-spin text-[#4285F4]"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="20" height="20" className="shrink-0">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
              )}
              <span>{isGoogleLoading ? "Đang đăng nhập…" : "Đăng nhập bằng Google"}</span>
            </button>
            {errors.google && (
              <p className="mt-1 text-center text-[12px] text-red-500">{errors.google}</p>
            )}

            {/* ─── Microsoft 365 Login Button ─── */}
            {config.microsoftClientId && (
              <>
                <button
                  id="microsoft-login-btn"
                  type="button"
                  onClick={handleMicrosoftLogin}
                  disabled={isSsoLoading || isSubmitting}
                  className="group relative w-full flex items-center justify-center gap-3 rounded-full border border-[#dadce0] bg-white py-3 px-4 text-[15px] font-semibold text-[#3c4043] shadow-sm transition-all hover:border-[#0078d4]/40 hover:bg-[#f5faff] hover:shadow-md active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isMicrosoftLoading ? (
                    <svg
                      className="h-5 w-5 animate-spin text-[#0078d4]"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 21 21" width="20" height="20" className="shrink-0">
                      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
                      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
                      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
                      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
                    </svg>
                  )}
                  <span>{isMicrosoftLoading ? "Đang đăng nhập…" : "Đăng nhập bằng Microsoft 365"}</span>
                </button>
                {errors.microsoft && (
                  <p className="mt-1 text-center text-[12px] text-red-500">{errors.microsoft}</p>
                )}
              </>
            )}
          </div>

          {/* Terms */}
          <p className="mt-6 text-center text-[12px] leading-relaxed text-[#999]">
            Bằng việc đăng nhập, bạn đã xác nhận đồng ý với các{" "}
            <span className="font-medium text-[#1877F2] cursor-pointer hover:underline">
              Điều khoản
            </span>{" "}
            và{" "}
            <span className="font-medium text-[#1877F2] cursor-pointer hover:underline">
              Chính sách của công ty
            </span>
            .
          </p>
        </div>
      </div>
      {/* TODO: Forgot Password Modal — tạm ẩn, bật lại khi có SMTP */}
    </div>
  );
}
