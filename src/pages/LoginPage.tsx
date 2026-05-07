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
import leftPanelBg from "@/assets/LoginPage/LeftPanelLogin.jpg";
import person1 from "@/assets/LoginPage/Person1.jpg";
import person2 from "@/assets/LoginPage/Person2.jpg";
import person3 from "@/assets/LoginPage/Person3.jpg";
import carousel1 from "@/assets/LoginPage/Carousel1.png";
import carousel2 from "@/assets/LoginPage/Carousel2.png";
import carousel3 from "@/assets/LoginPage/Carousel3.png";
import carousel4 from "@/assets/LoginPage/Carousel4.png";
import carousel5 from "@/assets/LoginPage/Carousel5.png";
import carousel6 from "@/assets/LoginPage/Carousel6.png";

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
    <div className="flex h-screen overflow-hidden bg-white">
      {/* ─── Left Panel ─── */}
      <div className="hidden w-[48%] lg:flex p-3 pr-0">
        <div className="relative flex w-full flex-col justify-between overflow-hidden rounded-[32px] p-10 select-none">
          {/* Background image */}
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${leftPanelBg})` }}
          />

          {/* Logo */}
          <div className="relative z-10 pt-2 pl-2">
            <img
              src={logoImg}
              alt="Le & Associates"
              className="h-9 w-auto brightness-0 invert"
            />
            <p className="mt-1 text-[10px] font-semibold tracking-[0.15em] text-white/70 uppercase">
              In people we value
            </p>
          </div>

          {/* Bottom content */}
          <div className="relative z-10 flex flex-col justify-end mt-auto pl-2 mb-6">
            {/* Trust badge */}
            <div className="mb-6 flex items-center gap-3">
              <div className="flex -space-x-2">
                <img src={person1} alt="User 1" className="h-9 w-9 rounded-full border-2 border-white/20 object-cover" />
                <img src={person2} alt="User 2" className="h-9 w-9 rounded-full border-2 border-white/20 object-cover" />
                <img src={person3} alt="User 3" className="h-9 w-9 rounded-full border-2 border-white/20 object-cover" />
              </div>
              <span className="rounded-full border border-white/20 bg-white/10 backdrop-blur-md px-3.5 py-1.5 text-[12px] font-medium text-white">
                Trusted by 100+ companies
              </span>
            </div>

            <h1 className="text-[52px] font-extrabold leading-[1.05] tracking-tight text-white md:text-[64px]">
              READY TO
              <br />
              GROW?
            </h1>
            <p className="mt-4 max-w-[320px] text-[15px] leading-relaxed text-white/90 font-medium">
              Log in to start your skill-building journey today
            </p>
          </div>

          {/* Logo Carousel */}
          <div
            className="relative z-10 pt-4 pb-2 overflow-hidden w-full"
            style={{ WebkitMaskImage: "linear-gradient(to right, transparent, black 5%, black 95%, transparent)" }}
          >
            <div className="flex w-[200%] animate-marquee gap-8 items-center">
              {/* Original set */}
              <div className="flex min-w-[50%] justify-around items-center gap-8 px-4">
                <img src={carousel1} className="h-7 w-auto object-contain brightness-0 invert opacity-80" alt="Partner 1" />
                <img src={carousel2} className="h-7 w-auto object-contain brightness-0 invert opacity-80" alt="Partner 2" />
                <img src={carousel3} className="h-7 w-auto object-contain brightness-0 invert opacity-80" alt="Partner 3" />
                <img src={carousel4} className="h-7 w-auto object-contain brightness-0 invert opacity-80" alt="Partner 4" />
                <img src={carousel5} className="h-7 w-auto object-contain brightness-0 invert opacity-80" alt="Partner 5" />
                <img src={carousel6} className="h-7 w-auto object-contain brightness-0 invert opacity-80" alt="Partner 6" />
              </div>
              {/* Duplicated set for seamless loop */}
              <div className="flex min-w-[50%] justify-around items-center gap-8 px-4">
                <img src={carousel1} className="h-7 w-auto object-contain brightness-0 invert opacity-80" alt="Partner 1" />
                <img src={carousel2} className="h-7 w-auto object-contain brightness-0 invert opacity-80" alt="Partner 2" />
                <img src={carousel3} className="h-7 w-auto object-contain brightness-0 invert opacity-80" alt="Partner 3" />
                <img src={carousel4} className="h-7 w-auto object-contain brightness-0 invert opacity-80" alt="Partner 4" />
                <img src={carousel5} className="h-7 w-auto object-contain brightness-0 invert opacity-80" alt="Partner 5" />
                <img src={carousel6} className="h-7 w-auto object-contain brightness-0 invert opacity-80" alt="Partner 6" />
              </div>
            </div>
          </div>
        </div> {/* Close inner relative flex container */}
      </div>

      {/* ─── Right Panel (Form) ─── */}
      <div className="flex flex-1 flex-col overflow-y-auto items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-[420px] my-auto">
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
                className={`w-full rounded-lg border bg-white px-4 py-3 text-[14px] text-[#1a1a1a] outline-none transition-colors placeholder:text-[#bbb] focus:border-[#1877F2] focus:ring-2 focus:ring-[#1877F2]/20 ${errors.email ? "border-red-400" : "border-[#ddd]"
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
                  className={`w-full rounded-lg border bg-white px-4 py-3 pr-11 text-[14px] text-[#1a1a1a] outline-none transition-colors placeholder:text-[#bbb] focus:border-[#1877F2] focus:ring-2 focus:ring-[#1877F2]/20 ${errors.password ? "border-red-400" : "border-[#ddd]"
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
                "Đăng nhập"
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
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 48 48" fill="none" className="shrink-0">
                      <path d="M34.1423 7.32501C33.5634 5.35387 31.7547 4 29.7003 4L28.3488 4C26.1142 4 24.1985 5.59611 23.7952 7.79398L21.4805 20.4072L22.0549 18.4419C22.6319 16.4679 24.4419 15.1111 26.4986 15.1111H34.3524L37.6462 16.3942L40.8213 15.1111H39.8946C37.8401 15.1111 36.0315 13.7572 35.4525 11.7861L34.1423 7.32501Z" fill="url(#paint0_radial_56201_15503)"></path>
                      <path d="M14.3307 40.656C14.9032 42.6366 16.7165 44 18.7783 44H21.6486C24.1592 44 26.2122 41.999 26.2767 39.4893L26.5893 27.3271L25.9354 29.5602C25.3577 31.5332 23.5481 32.8889 21.4923 32.8889L13.5732 32.8889L10.7499 31.3573L7.69336 32.8889H8.60461C10.6663 32.8889 12.4796 34.2522 13.0521 36.2329L14.3307 40.656Z" fill="url(#paint1_radial_56201_15503)"></path>
                      <path d="M29.4993 4H13.46C8.87732 4 6.12772 10.0566 4.29466 16.1132C2.12296 23.2886 -0.718769 32.8852 7.50252 32.8852H14.4282C16.4978 32.8852 18.3147 31.5168 18.8835 29.5269C20.0876 25.3143 22.1978 17.9655 23.8554 12.3712C24.6977 9.52831 25.3993 7.08673 26.4762 5.56628C27.0799 4.71385 28.086 4 29.4993 4Z" fill="url(#paint2_linear_56201_15503)"></path>
                      <path d="M29.4993 4H13.46C8.87732 4 6.12772 10.0566 4.29466 16.1132C2.12296 23.2886 -0.718769 32.8852 7.50252 32.8852H14.4282C16.4978 32.8852 18.3147 31.5168 18.8835 29.5269C20.0876 25.3143 22.1978 17.9655 23.8554 12.3712C24.6977 9.52831 25.3993 7.08673 26.4762 5.56628C27.0799 4.71385 28.086 4 29.4993 4Z" fill="url(#paint3_linear_56201_15503)"></path>
                      <path d="M18.498 44H34.5374C39.12 44 41.8696 37.9424 43.7027 31.8848C45.8744 24.7081 48.7161 15.1098 40.4948 15.1098H33.5693C31.4996 15.1098 29.6827 16.4784 29.114 18.4684C27.9098 22.6817 25.7996 30.032 24.142 35.6273C23.2996 38.4708 22.598 40.9127 21.5212 42.4335C20.9175 43.286 19.9113 44 18.498 44Z" fill="url(#paint4_radial_56201_15503)"></path>
                      <path d="M18.498 44H34.5374C39.12 44 41.8696 37.9424 43.7027 31.8848C45.8744 24.7081 48.7161 15.1098 40.4948 15.1098H33.5693C31.4996 15.1098 29.6827 16.4784 29.114 18.4684C27.9098 22.6817 25.7996 30.032 24.142 35.6273C23.2996 38.4708 22.598 40.9127 21.5212 42.4335C20.9175 43.286 19.9113 44 18.498 44Z" fill="url(#paint5_linear_56201_15503)"></path>
                      <defs>
                        <radialGradient id="paint0_radial_56201_15503" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(38.005 20.5144) rotate(-129.304) scale(17.3033 16.2706)">
                          <stop offset="0.0955758" stopColor="#00AEFF"></stop>
                          <stop offset="0.773185" stopColor="#2253CE"></stop>
                          <stop offset="1" stopColor="#0736C4"></stop>
                        </radialGradient>
                        <radialGradient id="paint1_radial_56201_15503" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(11.1215 32.8171) rotate(51.84) scale(15.9912 15.5119)">
                          <stop offset="0" stopColor="#FFB657"></stop>
                          <stop offset="0.633728" stopColor="#FF5F3D"></stop>
                          <stop offset="0.923392" stopColor="#C02B3C"></stop>
                        </radialGradient>
                        <linearGradient id="paint2_linear_56201_15503" x1="12.5" y1="7.5" x2="14.7884" y2="33.9751" gradientUnits="userSpaceOnUse">
                          <stop offset="0.156162" stopColor="#0D91E1"></stop>
                          <stop offset="0.487484" stopColor="#52B471"></stop>
                          <stop offset="0.652394" stopColor="#98BD42"></stop>
                          <stop offset="0.937361" stopColor="#FFC800"></stop>
                        </linearGradient>
                        <linearGradient id="paint3_linear_56201_15503" x1="14.5" y1="4" x2="15.7496" y2="32.8852" gradientUnits="userSpaceOnUse">
                          <stop offset="0" stopColor="#3DCBFF"></stop>
                          <stop offset="0.246674" stopColor="#0588F7" stopOpacity="0"></stop>
                        </linearGradient>
                        <radialGradient id="paint4_radial_56201_15503" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(41.3187 12.2813) rotate(109.274) scale(38.3873 45.9867)">
                          <stop offset="0.0661714" stopColor="#8C48FF"></stop>
                          <stop offset="0.5" stopColor="#F2598A"></stop>
                          <stop offset="0.895833" stopColor="#FFB152"></stop>
                        </radialGradient>
                        <linearGradient id="paint5_linear_56201_15503" x1="42.5859" y1="13.346" x2="42.5695" y2="21.2147" gradientUnits="userSpaceOnUse">
                          <stop offset="0.0581535" stopColor="#F8ADFA"></stop>
                          <stop offset="0.708063" stopColor="#A86EDD" stopOpacity="0"></stop>
                        </linearGradient>
                      </defs>
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
