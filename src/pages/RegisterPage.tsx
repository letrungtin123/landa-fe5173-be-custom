import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, ArrowLeft, CheckCircle2 } from "lucide-react";
import { registerAccount } from "@/api/register";
import logoImg from "@/assets/leandassociate.webp";
import registerBg from "@/assets/LoginPage/Register.png";
import person1 from "@/assets/LoginPage/Person1.jpg";
import person2 from "@/assets/LoginPage/Person2.jpg";
import person3 from "@/assets/LoginPage/Person3.jpg";
import carousel1 from "@/assets/LoginPage/Carousel1.png";
import carousel2 from "@/assets/LoginPage/Carousel2.png";
import carousel3 from "@/assets/LoginPage/Carousel3.png";
import carousel4 from "@/assets/LoginPage/Carousel4.png";
import carousel5 from "@/assets/LoginPage/Carousel5.png";
import carousel6 from "@/assets/LoginPage/Carousel6.png";

export function RegisterPage() {
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!lastName.trim()) newErrors.last_name = "Vui lòng nhập họ";
    if (!firstName.trim()) newErrors.first_name = "Vui lòng nhập tên";
    if (!email.trim()) {
      newErrors.email = "Vui lòng nhập email";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Email không hợp lệ";
    }
    if (!password) {
      newErrors.password = "Vui lòng nhập mật khẩu";
    } else if (password.length < 8) {
      newErrors.password = "Mật khẩu phải có ít nhất 8 ký tự";
    }
    if (!confirmPassword) {
      newErrors.confirm = "Vui lòng xác nhận mật khẩu";
    } else if (password !== confirmPassword) {
      newErrors.confirm = "Mật khẩu xác nhận không khớp";
    }
    if (!agreedTerms) {
      newErrors.terms = "Bạn cần đồng ý với điều khoản";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const clearError = (field: string) => {
    if (errors[field]) setErrors((p) => { const n = { ...p }; delete n[field]; return n; });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setErrors({});

    const result = await registerAccount({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim(),
      password,
    });

    setIsSubmitting(false);

    if (result.success) {
      setIsSuccess(true);
    } else if (result.errors) {
      setErrors(result.errors);
    }
  };

  // ── Màn hình thành công ──
  if (isSuccess) {
    return (
      <div className="flex h-screen overflow-hidden bg-white">
        {/* Left Panel */}
        <LeftPanel />

        {/* Right Panel — Success */}
        <div className="flex flex-1 flex-col overflow-y-auto items-center justify-center bg-white px-6 py-12 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="w-full max-w-[420px] my-auto text-center">
            <div className="mb-6 flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
            <h2 className="mb-3 text-[24px] font-bold tracking-tight text-[#1a1a1a]">
              Đăng ký thành công!
            </h2>
            <p className="mb-8 text-[14px] text-[#888] leading-relaxed max-w-[340px] mx-auto">
              Tài khoản của bạn đã được tạo và đang chờ quản trị viên duyệt.
              Bạn sẽ có thể đăng nhập sau khi tài khoản được phê duyệt.
            </p>
            <button
              onClick={() => navigate("/login")}
              className="w-full rounded-full bg-[#1877F2] py-3 text-[15px] font-semibold text-white shadow-md transition-all hover:bg-[#1466d8] active:scale-[0.98]"
            >
              Quay về đăng nhập
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Form đăng ký ──
  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* Left Panel */}
      <LeftPanel />

      {/* Right Panel — Form */}
      <div className="flex flex-1 flex-col overflow-y-auto items-center justify-center bg-white px-6 py-12 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="w-full max-w-[420px] my-auto">
          {/* Back button */}
          <button
            onClick={() => navigate("/login")}
            className="mb-6 flex items-center gap-1.5 text-[13px] font-medium text-[#888] hover:text-[#555] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </button>

          {/* Logo mark */}
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-[#0f2a5e] shadow-lg p-2">
            <img
              src={logoImg}
              alt="L&A E-learning"
              className="h-full w-full object-contain brightness-0 invert"
            />
          </div>

          <h2 className="mb-2 text-[28px] font-bold tracking-tight text-[#1a1a1a]">
            Đăng ký tài khoản
          </h2>
          <p className="mb-8 text-[14px] text-[#888]">
            Đăng ký ngay để bắt đầu hành trình học tập của bạn.
          </p>

          {/* Global error */}
          {errors.__all__ && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">
              {errors.__all__}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Họ + Tên */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="reg-lastname" className="mb-1.5 block text-[13px] font-semibold text-[#1a1a1a]">
                  Họ<span className="text-red-500">*</span>
                </label>
                <input
                  id="reg-lastname"
                  type="text"
                  placeholder="Tran"
                  value={lastName}
                  onChange={(e) => { setLastName(e.target.value); clearError("last_name"); }}
                  className={`w-full rounded-lg border bg-white px-4 py-3 text-[14px] text-[#1a1a1a] outline-none transition-colors placeholder:text-[#bbb] focus:border-[#1877F2] focus:ring-2 focus:ring-[#1877F2]/20 ${errors.last_name ? "border-red-400" : "border-[#ddd]"}`}
                />
                {errors.last_name && <p className="mt-1 text-[12px] text-red-500">{errors.last_name}</p>}
              </div>
              <div>
                <label htmlFor="reg-firstname" className="mb-1.5 block text-[13px] font-semibold text-[#1a1a1a]">
                  Tên<span className="text-red-500">*</span>
                </label>
                <input
                  id="reg-firstname"
                  type="text"
                  placeholder="Nhut"
                  value={firstName}
                  onChange={(e) => { setFirstName(e.target.value); clearError("first_name"); }}
                  className={`w-full rounded-lg border bg-white px-4 py-3 text-[14px] text-[#1a1a1a] outline-none transition-colors placeholder:text-[#bbb] focus:border-[#1877F2] focus:ring-2 focus:ring-[#1877F2]/20 ${errors.first_name ? "border-red-400" : "border-[#ddd]"}`}
                />
                {errors.first_name && <p className="mt-1 text-[12px] text-red-500">{errors.first_name}</p>}
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="reg-email" className="mb-1.5 block text-[13px] font-semibold text-[#1a1a1a]">
                Địa chỉ email<span className="text-red-500">*</span>
              </label>
              <input
                id="reg-email"
                type="email"
                placeholder="nhut.tran@hcm.nesso.vn"
                value={email}
                onChange={(e) => { setEmail(e.target.value); clearError("email"); }}
                className={`w-full rounded-lg border bg-white px-4 py-3 text-[14px] text-[#1a1a1a] outline-none transition-colors placeholder:text-[#bbb] focus:border-[#1877F2] focus:ring-2 focus:ring-[#1877F2]/20 ${errors.email ? "border-red-400" : "border-[#ddd]"}`}
              />
              {errors.email && <p className="mt-1 text-[12px] text-red-500">{errors.email}</p>}
            </div>

            {/* Mật khẩu */}
            <div>
              <label htmlFor="reg-password" className="mb-1.5 block text-[13px] font-semibold text-[#1a1a1a]">
                Mật khẩu<span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="reg-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); clearError("password"); }}
                  className={`w-full rounded-lg border bg-white px-4 py-3 pr-11 text-[14px] text-[#1a1a1a] outline-none transition-colors placeholder:text-[#bbb] focus:border-[#1877F2] focus:ring-2 focus:ring-[#1877F2]/20 ${errors.password ? "border-red-400" : "border-[#ddd]"}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#aaa] hover:text-[#666] transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-[12px] text-red-500">{errors.password}</p>}
            </div>

            {/* Xác nhận mật khẩu */}
            <div>
              <label htmlFor="reg-confirm" className="mb-1.5 block text-[13px] font-semibold text-[#1a1a1a]">
                Xác nhận mật khẩu<span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="reg-confirm"
                  type={showConfirm ? "text" : "password"}
                  placeholder="••••••••••••"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); clearError("confirm"); }}
                  className={`w-full rounded-lg border bg-white px-4 py-3 pr-11 text-[14px] text-[#1a1a1a] outline-none transition-colors placeholder:text-[#bbb] focus:border-[#1877F2] focus:ring-2 focus:ring-[#1877F2]/20 ${errors.confirm ? "border-red-400" : "border-[#ddd]"}`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#aaa] hover:text-[#666] transition-colors"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                </button>
              </div>
              {errors.confirm && <p className="mt-1 text-[12px] text-red-500">{errors.confirm}</p>}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-full bg-[#1877F2] py-3 text-[15px] font-semibold text-white shadow-md transition-all hover:bg-[#1466d8] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Đang đăng ký…
                </span>
              ) : (
                "Đăng ký"
              )}
            </button>
          </form>

          {/* Terms */}
          <div className="mt-5 flex items-start gap-2.5">
            <input
              id="reg-terms"
              type="checkbox"
              checked={agreedTerms}
              onChange={(e) => { setAgreedTerms(e.target.checked); clearError("terms"); }}
              className="mt-0.5 h-4 w-4 rounded border-[#ddd] text-[#1877F2] focus:ring-[#1877F2]/20 cursor-pointer accent-[#1877F2]"
            />
            <label htmlFor="reg-terms" className="text-[12px] leading-relaxed text-[#999] cursor-pointer">
              Bằng việc đăng ký, bạn đã xác nhận đồng ý với các{" "}
              <span className="font-medium text-[#1877F2] cursor-pointer hover:underline">Điều khoản</span>{" "}
              và{" "}
              <span className="font-medium text-[#1877F2] cursor-pointer hover:underline">Chính sách của công ty</span>.
            </label>
          </div>
          {errors.terms && <p className="mt-1 text-[12px] text-red-500">{errors.terms}</p>}
        </div>
      </div>
    </div>
  );
}

// ── Left Panel Component (tái sử dụng layout từ LoginPage) ──
function LeftPanel() {
  return (
    <div className="hidden w-[48%] lg:flex p-3 pr-0">
      <div className="relative flex w-full flex-col justify-between overflow-hidden rounded-[32px] p-10 select-none">
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${registerBg})` }}
        />

        {/* Logo */}
        <div className="relative z-10 pt-2 pl-2">
          <img src={logoImg} alt="Le & Associates" className="h-9 w-auto brightness-0 invert" />
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
            Sign in to start your skill-building journey today
          </p>
        </div>

        {/* Logo Carousel */}
        <div
          className="relative z-10 pt-4 pb-2 overflow-hidden w-full"
          style={{ WebkitMaskImage: "linear-gradient(to right, transparent, black 5%, black 95%, transparent)" }}
        >
          <div className="flex w-[200%] animate-marquee gap-8 items-center">
            <div className="flex min-w-[50%] justify-around items-center gap-8 px-4">
              <img src={carousel1} className="h-7 w-auto object-contain brightness-0 invert opacity-80" alt="Partner 1" />
              <img src={carousel2} className="h-7 w-auto object-contain brightness-0 invert opacity-80" alt="Partner 2" />
              <img src={carousel3} className="h-7 w-auto object-contain brightness-0 invert opacity-80" alt="Partner 3" />
              <img src={carousel4} className="h-7 w-auto object-contain brightness-0 invert opacity-80" alt="Partner 4" />
              <img src={carousel5} className="h-7 w-auto object-contain brightness-0 invert opacity-80" alt="Partner 5" />
              <img src={carousel6} className="h-7 w-auto object-contain brightness-0 invert opacity-80" alt="Partner 6" />
            </div>
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
      </div>
    </div>
  );
}
