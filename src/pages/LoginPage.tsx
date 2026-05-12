import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Eye, EyeOff, ArrowLeft, Info } from "lucide-react";
import { useGoogleLogin } from "@react-oauth/google";
import { useAuthStore } from "@/stores/useAuthStore";
import { googleLoginOrRegister, GoogleAuthError } from "@/api/googleAuth";
import { microsoftLoginOrRegister, MicrosoftAuthError } from "@/api/microsoftAuth";
import { microsoftPopupLogin } from "@/config/msalConfig";
import { config } from "@/config/env";
import whiteLogo from "@/assets/LoginPage/WhiteLogoLeftPanel.png";
import squareIcon from "@/assets/LoginPage/SquareIcon.png";
import leftPanelBg from "@/assets/LoginPage/LeftPanelLogin.jpg";
import person1 from "@/assets/LoginPage/Person1.jpg";
import person2 from "@/assets/LoginPage/Person2.jpg";
import person3 from "@/assets/LoginPage/Person3.jpg";
import person4 from "@/assets/LoginPage/Person4.jpg";
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
  const [showForgotPassword, setShowForgotPassword] = useState(false);
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
    <div className="flex h-screen w-full max-w-[1440px] mx-auto overflow-hidden bg-white">
      {/* ─── Left Panel ─── */}
      <div className="hidden w-[48%] lg:flex p-8 pr-0 h-full">
          <div className="relative flex w-full h-full flex-col justify-between overflow-hidden rounded-[24px] p-10 select-none shadow-sm">
          {/* Background image */}
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${leftPanelBg})` }}
          />

          {/* Logo */}
          <div className="relative z-10 pt-2 pl-2">
            <img
              src={whiteLogo}
              alt="Le & Associates"
              className="h-9 w-auto object-contain"
            />
          </div>

          {/* Bottom content */}
          <div className="relative z-10 flex flex-col justify-end mt-auto pl-2 mb-6">
            <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-[30px] border border-white/30 bg-white/5 backdrop-blur-md p-1 pr-4 shadow-sm">
              <div className="flex -space-x-2 pl-0.5">
                <img src={person1} alt="User 1" className="relative z-[4] h-6 w-6 rounded-full border-[1.5px] border-white object-cover" />
                <img src={person2} alt="User 2" className="relative z-[3] h-6 w-6 rounded-full border-[1.5px] border-white object-cover" />
                <img src={person3} alt="User 3" className="relative z-[2] h-6 w-6 rounded-full border-[1.5px] border-white object-cover" />
                <img src={person4} alt="User 4" className="relative z-[1] h-6 w-6 rounded-full border-[1.5px] border-white object-cover" />
              </div>
              <span className="text-[11px] font-normal text-white">
                Trusted by 100+ companies
              </span>
            </div>

            <h1 className="text-[65px] font-bold leading-[60px] text-white uppercase font-['SF_Pro',_sans-serif]">
              READY TO
              <br />
              GROW?
            </h1>
            <p className="mt-4 text-[15px] leading-relaxed text-white/90 font-normal whitespace-nowrap">
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
      <div className="flex flex-1 h-full flex-col overflow-y-auto items-center bg-white px-6 py-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

        {/* Nội dung form căn giữa dọc */}
        {showForgotPassword ? (
          <div className="w-full max-w-[384px] mt-auto mb-auto text-center flex flex-col items-center">
            <div className="mb-6 flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-blue-50">
              <Info className="h-8 w-8 text-[#1d4ed8]" />
            </div>
            <h2 className="mb-3 text-[24px] font-bold tracking-tight text-[#1a1a1a] font-['SF_Pro',_sans-serif]">
              Quên mật khẩu?
            </h2>
            <p className="mb-8 text-[14px] text-[#888] leading-relaxed max-w-[340px] mx-auto font-['SF_Pro',_sans-serif]">
              Vui lòng liên hệ quản trị viên để được hỗ trợ cấp lại mật khẩu cho tài khoản của bạn.
            </p>
            <button
              onClick={() => setShowForgotPassword(false)}
              className="flex items-center justify-center gap-2 w-full rounded-[10px] bg-[#f3f4f6] py-3 text-[14px] font-semibold text-[#4b5563] transition-all hover:bg-[#e5e7eb] active:scale-[0.98] font-['SF_Pro',_sans-serif]"
            >
              <ArrowLeft className="h-4 w-4" />
              Quay lại đăng nhập
            </button>
          </div>
        ) : (
          <div className="w-full max-w-[384px] mt-auto mb-auto">
          <div className="flex flex-col gap-7 w-full">
          {/* Header (Logo + Title) */}
          <div className="flex flex-col items-start gap-2.5">
            {/* Logo mark */}
            <div className="size-14 relative bg-sky-950 rounded-xl flex items-center justify-center mb-0">
               <img
                src={squareIcon}
                alt="L&A E-learning"
                className="w-10 h-10 object-contain"
               />
            </div>

            <div className="flex flex-col items-start gap-[3px]">
              <h2 className="text-3xl font-semibold leading-9 text-black whitespace-nowrap font-['SF_Pro',_sans-serif]">
                Đăng nhập vào L&A E-learning
              </h2>
              <p className="text-[14px] font-normal leading-[20px] text-neutral-400 font-['SF_Pro',_sans-serif]">
                Vui lòng đăng nhập vào tài khoản đã được cung cấp để tiếp tục.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
            <div className="flex flex-col gap-4">
              {/* Email */}
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="login-email"
                  className="text-[14px] font-normal leading-[16px] text-black"
                >
                  Địa chỉ email<span className="text-red-600">*</span>
                </label>
                <input
                  id="login-email"
                  type="text"
                  placeholder="nhut.tran@hcm.nesso.vn"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
                  }}
                  className={`w-full h-9 rounded-[10px] border bg-white px-[19px] text-[14px] font-normal leading-[16px] text-black font-['SF_Pro',_sans-serif] outline-none transition-colors placeholder:text-stone-300 focus:border-[#1d4ed8] focus:ring-1 focus:ring-[#1d4ed8] ${errors.email ? "border-[#dc2626]" : "border-gray-200"
                    }`}
                />
                {errors.email && (
                  <p className="text-[12px] text-[#dc2626]">{errors.email}</p>
                )}
              </div>

              {/* Password */}
              <div className="relative h-14 w-full">
                <div className="flex items-center justify-between w-full absolute top-0">
                  <label
                    htmlFor="login-password"
                    className="text-[14px] font-normal leading-[16px] text-black font-['SF_Pro',_sans-serif]"
                  >
                    Mật khẩu<span className="text-red-600">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-[14px] font-normal leading-[16px] text-[#1d4ed8] hover:underline font-['SF_Pro',_sans-serif]"
                  >
                    Quên mật khẩu?
                  </button>
                </div>
                <div className="absolute w-full top-[22px]">
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
                    className={`w-full h-9 rounded-[10px] border bg-white px-[19px] pr-10 text-[14px] font-normal leading-[16px] text-black font-['SF_Pro',_sans-serif] outline-none transition-colors placeholder:text-stone-300 focus:border-[#1d4ed8] focus:ring-1 focus:ring-[#1d4ed8] ${errors.password ? "border-[#dc2626]" : "border-gray-200"
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
                  <p className="absolute top-[60px] text-[12px] text-[#dc2626] font-['SF_Pro',_sans-serif]">
                    {errors.password}
                  </p>
                )}
              </div>
            </div>

            {/* Submit */}
            <div className="flex flex-col items-center gap-2.5">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-9 rounded-[29px] bg-[#1d4ed8] text-[14px] font-normal leading-[16px] text-white shadow-sm transition-all font-['SF_Pro',_sans-serif] hover:bg-[#1e40af] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
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
            </div>
          </form>
          </div>

          {/* ─── Divider ─── */}
          <div className="w-full h-3.5 relative mt-[15px] mb-[25px]">
            <div className="absolute inset-0 top-[7px] w-full flex items-center justify-between">
              <div className="w-[45%] h-px bg-[#e5e5e5]" />
              <div className="w-[45%] h-px bg-[#e5e5e5]" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="bg-white px-2 text-[14px] font-normal leading-[16px] text-neutral-400">
                hoặc
              </span>
            </div>
          </div>

          {/* ─── SSO Buttons ─── */}
          <div className="flex flex-col gap-2 w-full">
            {/* ─── Google Login Button ─── */}
            <button
              id="google-login-btn"
              type="button"
              onClick={() => googleLogin()}
              disabled={isSsoLoading || isSubmitting}
              className="w-full flex items-center justify-center gap-2.5 bg-white rounded-3xl border border-gray-200 py-2.5 px-4 text-[14px] font-normal leading-[16px] text-black shadow-sm transition-all hover:bg-[#f9fafb] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
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
              <span>{isGoogleLoading ? "Đang đăng nhập…" : <>Đăng nhập bằng <span>Google</span></>}</span>
            </button>
            {errors.google && (
              <p className="text-center text-[12px] text-[#dc2626] mt-1">{errors.google}</p>
            )}

            {/* ─── Microsoft 365 Login Button ─── */}
            {config.microsoftClientId && (
              <>
                <button
                  id="microsoft-login-btn"
                  type="button"
                  onClick={handleMicrosoftLogin}
                  disabled={isSsoLoading || isSubmitting}
                  className="w-full flex items-center justify-center gap-2.5 bg-white rounded-3xl border border-gray-200 py-2.5 px-4 text-[14px] font-normal leading-[16px] text-black shadow-sm transition-all hover:bg-[#f9fafb] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
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
                  <span>{isMicrosoftLoading ? "Đang đăng nhập…" : <>Đăng nhập bằng <span>Microsoft 365</span></>}</span>
                </button>
                {errors.microsoft && (
                  <p className="text-center text-[12px] text-[#dc2626] mt-1">{errors.microsoft}</p>
                )}
              </>
            )}
          </div>

          <div className="w-full flex justify-center mt-[13px]">
            <p className="max-w-[320px] text-center text-[12px] font-normal leading-[16px] text-neutral-400 font-['SF_Pro',_sans-serif]">
              Bằng việc đăng nhập, bạn đã xác nhận đồng ý với các{" "}
              <span className="underline hover:text-neutral-600 transition-colors">Điều khoản</span>
              {" "}và{" "}
              <span className="underline hover:text-neutral-600 transition-colors">Chính sách của công ty.</span>
            </p>
          </div>
          </div>
        )}

        {/* Register link (bottom) */}
        <div className="mt-auto pt-6">
          <p className="text-center text-[12px] font-normal leading-[16px] text-neutral-400">
            Bạn chưa có tài khoản?{" "}
            <Link to="/register" className="text-blue-700 hover:underline font-normal font-['SF_Pro',_sans-serif]">
              Đăng ký ngay
            </Link>
          </p>
        </div>
      </div>
      {/* TODO: Forgot Password Modal — tạm ẩn, bật lại khi có SMTP */}
    </div>
  );
}
