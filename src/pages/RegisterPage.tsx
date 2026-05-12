import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, ArrowLeft, CheckCircle2 } from "lucide-react";
import { registerAccount } from "@/api/register";
import whiteLogo from "@/assets/LoginPage/WhiteLogoLeftPanel.png";
import squareIcon from "@/assets/LoginPage/SquareIcon.png";
import registerBg from "@/assets/LoginPage/Register.png";
import person1 from "@/assets/LoginPage/Person1.jpg";
import person2 from "@/assets/LoginPage/Person2.jpg";
import person3 from "@/assets/LoginPage/Person3.jpg";
import person4 from "@/assets/LoginPage/Person4.jpg";

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
      <div className="flex h-screen w-full max-w-[1440px] mx-auto overflow-hidden bg-white">
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
    <div className="flex h-screen w-full max-w-[1440px] mx-auto overflow-hidden bg-white">
      {/* Left Panel */}
      <LeftPanel />

      {/* Right Panel — Form */}
      <div className="flex flex-1 h-full flex-col items-center justify-center bg-white px-6 relative overflow-hidden">
        
        <div className="w-full max-w-[429px] flex flex-col justify-center relative">
          
          {/* Back button */}
          <button
            onClick={() => navigate("/login")}
            className="flex items-center gap-2 text-sm font-normal text-[#8f8f8f] hover:text-neutral-600 transition-colors font-['SF_Pro',_sans-serif] mb-6 w-fit"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </button>

          <div className="w-full">
            {/* Logo mark */}
            <div className="flex flex-col items-start mb-4">
              <div className="w-14 h-14 bg-[#011b54] rounded-xl flex items-center justify-center mb-3">
                <img
                  src={squareIcon}
                  alt="E-learning"
                  className="w-[39px] object-contain"
                />
              </div>

              <div className="flex flex-col items-start gap-1 mb-6">
                <h2 className="text-[28px] font-semibold text-black tracking-[0] leading-[35px] font-['SF_Pro',_sans-serif]">
                  Đăng ký tài khoản
                </h2>
                <p className="text-sm font-normal text-[#8f8f8f] tracking-[0] leading-5 font-['SF_Pro',_sans-serif]">
                  Đăng ký ngay để bắt đầu hành trình học tập của bạn.
                </p>
              </div>
            </div>

          {/* Global error */}
          {errors.__all__ && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">
              {errors.__all__}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
            {/* Họ + Tên */}
            <div className="flex gap-[10px]">
              <div className="flex-1 flex flex-col gap-2">
                <label htmlFor="reg-lastname" className="flex items-center text-sm font-medium text-transparent tracking-[0] leading-[14px] font-['SF_Pro',_sans-serif]">
                  <span className="text-black">Họ</span><span className="text-[#e9252f]">*</span>
                </label>
                <div className="relative w-full h-[38px] rounded-[10px] border border-solid border-[#ebeaea] bg-white transition-colors focus-within:border-[#0052d0]">
                  <input
                    id="reg-lastname"
                    type="text"
                    placeholder="Tran"
                    value={lastName}
                    onChange={(e) => { setLastName(e.target.value); clearError("last_name"); }}
                    className={`absolute inset-0 w-full h-full px-[19px] text-sm font-normal text-black tracking-[0] leading-[14px] rounded-[10px] bg-transparent outline-none font-['SF_Pro',_sans-serif] ${errors.last_name ? "border-[#e9252f]" : ""}`}
                  />
                </div>
                {errors.last_name && <p className="text-[12px] text-red-600 font-['SF_Pro',_sans-serif]">{errors.last_name}</p>}
              </div>
              <div className="flex-1 flex flex-col gap-2">
                <label htmlFor="reg-firstname" className="flex items-center text-sm font-medium text-transparent tracking-[0] leading-[14px] font-['SF_Pro',_sans-serif]">
                  <span className="text-black">Tên</span><span className="text-[#e9252f]">*</span>
                </label>
                <div className="relative w-full h-[38px] rounded-[10px] border border-solid border-[#ebeaea] bg-white transition-colors focus-within:border-[#0052d0]">
                  <input
                    id="reg-firstname"
                    type="text"
                    placeholder="Nhut"
                    value={firstName}
                    onChange={(e) => { setFirstName(e.target.value); clearError("first_name"); }}
                    className={`absolute inset-0 w-full h-full px-[19px] text-sm font-normal text-black tracking-[0] leading-[14px] rounded-[10px] bg-transparent outline-none font-['SF_Pro',_sans-serif] ${errors.first_name ? "border-[#e9252f]" : ""}`}
                  />
                </div>
                {errors.first_name && <p className="text-[12px] text-red-600 font-['SF_Pro',_sans-serif]">{errors.first_name}</p>}
              </div>
            </div>

            {/* Email */}
            <div className="flex flex-col gap-2">
              <label htmlFor="reg-email" className="flex items-center text-sm font-medium text-transparent tracking-[0] leading-[14px] font-['SF_Pro',_sans-serif]">
                <span className="text-black">Địa chỉ email</span><span className="text-[#e9252f]">*</span>
              </label>
              <div className="relative w-full h-[38px] rounded-[10px] border border-solid border-[#ebeaea] bg-white transition-colors focus-within:border-[#0052d0]">
                <input
                  id="reg-email"
                  type="email"
                  placeholder="nhut.tran@hcm.nesso.vn"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); clearError("email"); }}
                  className={`absolute inset-0 w-full h-full px-[19px] text-sm font-normal text-black tracking-[0] leading-[14px] rounded-[10px] bg-transparent outline-none font-['SF_Pro',_sans-serif] ${errors.email ? "border-[#e9252f]" : ""}`}
                />
              </div>
              {errors.email && <p className="text-[12px] text-red-600 font-['SF_Pro',_sans-serif]">{errors.email}</p>}
            </div>

            {/* Mật khẩu */}
            <div className="flex flex-col gap-2">
              <label htmlFor="reg-password" className="flex items-center text-sm font-medium text-transparent tracking-[0] leading-[14px] font-['SF_Pro',_sans-serif]">
                <span className="text-black">Mật khẩu</span><span className="text-[#e9252f]">*</span>
              </label>
              <div className={`relative w-full flex items-center h-[38px] rounded-[10px] border border-solid bg-white transition-colors focus-within:border-[#0052d0] ${errors.password ? "border-[#e9252f]" : "border-[#ebeaea]"}`}>
                <input
                  id="reg-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); clearError("password"); }}
                  className="h-full flex-1 pl-[19px] pr-10 text-sm font-normal text-black placeholder:text-[#cdcdcd] tracking-[0] leading-[14px] rounded-[10px] bg-transparent outline-none font-['SF_Pro',_sans-serif]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-[11px] flex items-center justify-center w-4 h-4 text-stone-300 hover:text-stone-500 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-[12px] text-red-600 font-['SF_Pro',_sans-serif]">{errors.password}</p>}
            </div>

            {/* Xác nhận mật khẩu */}
            <div className="flex flex-col gap-2">
              <label htmlFor="reg-confirm" className="flex items-center text-sm font-medium text-transparent tracking-[0] leading-[14px] font-['SF_Pro',_sans-serif]">
                <span className="text-black">Xác nhận mật khẩu</span><span className="text-[#e9252f]">*</span>
              </label>
              <div className={`relative w-full flex items-center h-[38px] rounded-[10px] border border-solid bg-white transition-colors focus-within:border-[#0052d0] ${errors.confirm ? "border-[#e9252f]" : "border-[#ebeaea]"}`}>
                <input
                  id="reg-confirm"
                  type={showConfirm ? "text" : "password"}
                  placeholder="••••••••••••"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); clearError("confirm"); }}
                  className="h-full flex-1 pl-[19px] pr-10 text-sm font-normal text-black placeholder:text-[#cdcdcd] tracking-[0] leading-[14px] rounded-[10px] bg-transparent outline-none font-['SF_Pro',_sans-serif]"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-4 top-[11px] flex items-center justify-center w-4 h-4 text-stone-300 hover:text-stone-500 transition-colors"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirm && <p className="text-[12px] text-red-600 font-['SF_Pro',_sans-serif]">{errors.confirm}</p>}
            </div>

            {/* Submit */}
            <div className="flex flex-col w-full items-center mt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="relative self-stretch w-full h-[38px] bg-[#0052d0] rounded-[10px] disabled:opacity-70 disabled:cursor-not-allowed hover:bg-[#0047b3] transition-all"
              >
                {isSubmitting ? (
                <span className="flex items-center justify-center gap-2 text-white">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Đang đăng ký…
                </span>
                ) : (
                  <span className="flex items-center justify-center font-normal text-white text-sm text-center tracking-[0] leading-[14px] font-['SF_Pro',_sans-serif]">
                    Đăng ký
                  </span>
                )}
              </button>
            </div>
          </form>

          {/* Terms */}
          <div className="flex gap-[9px] mt-4">
            <div className="relative mt-0.5 w-3.5 h-3.5">
              <input
                id="reg-terms"
                type="checkbox"
                checked={agreedTerms}
                onChange={(e) => { setAgreedTerms(e.target.checked); clearError("terms"); }}
                className="peer absolute inset-0 w-3.5 h-3.5 rounded-[3px] border border-solid border-[#ebeaea] bg-white checked:bg-[#0052d0] checked:border-[#0052d0] cursor-pointer appearance-none focus:outline-none"
              />
              <svg className="pointer-events-none absolute left-0 top-[0px] hidden h-3.5 w-3.5 p-[2px] text-white peer-checked:block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            <label htmlFor="reg-terms" className="flex flex-wrap font-normal text-[#8f8f8f] text-xs tracking-[0] leading-4 cursor-pointer font-['SF_Pro',_sans-serif]">
              <span>Bằng việc đăng ký, bạn đã xác nhận đồng ý với các </span>
              <span className="underline hover:text-neutral-600 transition-colors mx-1">Điều khoản</span>
              <span> và </span>
              <span className="underline hover:text-neutral-600 transition-colors ml-1">Chính sách của công ty.</span>
            </label>
          </div>
          {errors.terms && <p className="mt-1 text-[12px] text-red-600 font-['SF_Pro',_sans-serif]">{errors.terms}</p>}
        </div>
      </div>
    </div>
  </div>
  );
}

// ── Left Panel Component (tái sử dụng layout từ LoginPage) ──
function LeftPanel() {
  return (
    <div className="hidden w-[48%] lg:flex p-8 pr-0 h-full">
      <div className="relative flex w-full h-full flex-col justify-between overflow-hidden rounded-[24px] p-10 select-none shadow-sm">
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${registerBg})` }}
        />

        {/* Logo */}
        <div className="relative z-10 pt-2 pl-2">
          <img src={whiteLogo} alt="Le & Associates" className="h-9 w-auto object-contain" />
        </div>

        {/* Bottom content */}
        <div className="relative z-10 flex flex-col justify-end mt-auto pl-2 mb-0">
          {/* Trust badge */}
          <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-[30px] border border-blue-200/30 bg-white/10 p-1 pr-4">
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
          <p className="mt-3 text-[14px] leading-relaxed text-white/90 font-normal whitespace-nowrap">
            Sign in to start your skill-building journey today
          </p>
        </div>


      </div>
    </div>
  );
}
