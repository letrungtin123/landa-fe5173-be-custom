import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { User, Mail, Save, ShieldCheck, Loader2, X, Camera, ChevronDown, MapPin, GraduationCap, Globe, Calendar, Phone, AtSign, FileText, Type, Users } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { useAuthStore } from "@/stores/useAuthStore";
import { getUserAccount } from "@/api/auth";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const GENDER_MAP: Record<string, string> = { m: "Nam", f: "Nữ", o: "Khác" };
const COUNTRY_MAP: Record<string, string> = { VN: "Việt Nam", US: "Hoa Kỳ", JP: "Nhật Bản", KR: "Hàn Quốc", GB: "Anh", OTHER: "Khác" };
const EDU_MAP: Record<string, string> = { p: "Tiến sĩ (Doctorate)", m: "Thạc sĩ (Master's)", b: "Cử nhân (Bachelor's)", a: "Cao đẳng (Associate)", hs: "Trung học phổ thông", jhs: "Trung học cơ sở", el: "Tiểu học", none: "Không có", other: "Khác" };
const LANG_MAP: Record<string, string> = { vi: "Tiếng Việt", en: "English", ja: "日本語 (Japanese)", ko: "한국어 (Korean)", zh: "中文 (Chinese)" };

export function ProfilePage() {
  const { data: profile, isLoading, error } = useProfile();
  const updateProfile = useUpdateProfile();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    bio: "",
    gender: "",
    country: "",
    level_of_education: "",
    language: "",
    year_of_birth: "",
    phone_number: "",
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  // Sync state when profile data loads
  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || "",
        bio: profile.bio || "",
        gender: profile.gender || "",
        country: profile.country || "",
        level_of_education: profile.level_of_education || "",
        language: profile.language_proficiencies?.[0]?.code || "",
        year_of_birth: profile.year_of_birth ? String(profile.year_of_birth) : "",
        phone_number: profile.phone_number || "",
      });
    }
  }, [profile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const MAX_AVATAR_SIZE_MB = 1;
  const MAX_AVATAR_SIZE_BYTES = MAX_AVATAR_SIZE_MB * 1024 * 1024;
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif"];

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Reset input value to allow re-selecting same file
    if (!e.target.files || !e.target.files[0]) return;

    const file = e.target.files[0];

    if (!ALLOWED_TYPES.includes(file.type)) {
      setToast({ message: "Chỉ chấp nhận ảnh JPG, PNG hoặc GIF.", type: "error" });
      setTimeout(() => setToast(null), 4000);
      e.target.value = "";
      return;
    }

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(1);
      setToast({
        message: `Ảnh quá lớn (${sizeMB}MB). Vui lòng chọn ảnh nhỏ hơn ${MAX_AVATAR_SIZE_MB}MB.`,
        type: "error",
      });
      setTimeout(() => setToast(null), 5000);
      e.target.value = "";
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Custom Validation
    if (formData.year_of_birth) {
      const year = parseInt(formData.year_of_birth, 10);
      const currentYear = new Date().getFullYear();
      if (isNaN(year) || year < 1900 || year > currentYear) {
        setToast({ message: `Năm sinh không hợp lệ. Vui lòng nhập từ 1900 đến ${currentYear}.`, type: "error" });
        setTimeout(() => setToast(null), 4000);
        return;
      }
    }

    if (formData.phone_number) {
      const phoneRegex = /^[0-9+\-\s()]+$/;
      if (!phoneRegex.test(formData.phone_number)) {
        setToast({ message: "Số điện thoại không hợp lệ (chỉ chấp nhận số và ký tự +, -, khoảng trắng).", type: "error" });
        setTimeout(() => setToast(null), 4000);
        return;
      }
    }

    try {
      // Chuẩn bị payload cho Open edX API
      const { language, year_of_birth, ...restData } = formData;
      const payload: Record<string, unknown> = {
        ...restData,
        // Open edX nhận language dạng language_proficiencies
        language_proficiencies: language ? [{ code: language }] : [],
      };
      // year_of_birth phải là number hoặc null
      if (year_of_birth) {
        payload.year_of_birth = parseInt(year_of_birth, 10);
      }

      // 1. Cập nhật profile data
      await updateProfile.mutateAsync(payload as any);

      // 2. Cập nhật Avatar nếu có thay đổi
      if (avatarFile && user?.username) {
        const formDataAvatar = new FormData();
        formDataAvatar.append("file", avatarFile);

        const { apiClient } = await import("@/api/client");
        try {
          await apiClient.post(
            `/api/profile_images/v1/${user.username}/upload`,
            formDataAvatar,
            { headers: { "Content-Type": "multipart/form-data" } }
          );

          // Sau upload thành công: refetch profile để lấy URL avatar mới
          const freshProfile = await getUserAccount(user.username);
          const newAvatarUrl = freshProfile?.profile_image?.has_image
            ? freshProfile.profile_image.image_url_full + "&_t=" + Date.now()
            : null;

          if (newAvatarUrl) {
            // Cập nhật auth store — avatar hiển thị ngay không cần reload
            updateUser({ avatar: newAvatarUrl });
          }
          // Invalidate cache để các component khác cũng cập nhật
          await queryClient.invalidateQueries({ queryKey: ["userProfile", user.username] });
          // Reset preview vì đã commit lên server
          setAvatarFile(null);
          setAvatarPreview(null);
        } catch (avatarErr: unknown) {
          // Kiểm tra lỗi từ axios response
          const status = (avatarErr as { response?: { status?: number } })?.response?.status;
          if (status === 413) {
            setToast({
              message: `Upload ảnh thất bại: File quá lớn. Server chỉ chấp nhận ảnh tối đa 1MB.`,
              type: "error",
            });
          } else {
            setToast({
              message: "Upload ảnh thất bại. Vui lòng thử lại với ảnh khác.",
              type: "error",
            });
          }
          // Reset avatar state
          setAvatarFile(null);
          setAvatarPreview(null);
          setTimeout(() => setToast(null), 5000);
          return;
        }
      }

      setToast({ message: "Cập nhật hồ sơ thành công!", type: "success" });
      setTimeout(() => setToast(null), 3000);
    } catch {
      setToast({ message: "Cập nhật thất bại. Vui lòng thử lại.", type: "error" });
      setTimeout(() => setToast(null), 3000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-muted-foreground">
        Không thể tải hồ sơ người dùng.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background/50 pb-12 pt-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="mx-auto max-w-[880px] px-4 md:px-6"
      >
        <div className="mb-8 flex flex-col gap-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Hồ Sơ Cá Nhân</h1>
          <p className="text-sm font-medium text-muted-foreground">Quản lý thông tin công khai và cài đặt tài khoản của bạn.</p>
        </div>

        {/* Single Unified Profile Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="overflow-hidden rounded-[2.5rem] border border-border/50 bg-card shadow-sm backdrop-blur-xl mb-8"
        >
          {/* Gradient Banner */}
          <div className="h-40 md:h-48 w-full bg-gradient-to-br from-primary/90 via-primary to-primary/50 relative">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 mix-blend-overlay"></div>
          </div>
          
          <div className="relative px-6 pb-10 md:px-12">
            {/* Header: Avatar & Quick Info */}
            <div className="flex flex-col md:flex-row items-center md:items-end gap-6 -mt-16 md:-mt-20 mb-10">
              {/* Avatar Circle */}
              <div
                className="flex h-32 w-32 md:h-40 md:w-40 shrink-0 items-center justify-center overflow-hidden rounded-full border-8 border-card bg-muted shadow-xl relative group cursor-pointer ring-1 ring-border/50 transition-transform hover:scale-[1.02]"
                onClick={() => setShowAvatarModal(true)}
              >
                {avatarPreview || user?.avatar ? (
                  <img src={avatarPreview || user?.avatar || ""} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-primary/10">
                    <User className="h-12 w-12 md:h-16 md:w-16 text-primary" />
                  </div>
                )}
                {/* Overlay hover */}
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none">
                  <span className="text-xs md:text-sm font-semibold tracking-wider">XEM ẢNH</span>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif"
                className="hidden"
                onChange={handleAvatarChange}
              />
              
              {/* User Info */}
              <div className="flex flex-col items-center md:items-start text-center md:text-left mb-2">
                <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">{profile?.name || user?.username}</h2>
                <p className="mt-1 flex items-center justify-center gap-2 text-sm md:text-base font-medium text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  {profile?.email}
                </p>
              </div>
              
              <div className="md:ml-auto flex items-center mb-2 md:mb-4">
                <div className="flex items-center gap-2 rounded-2xl bg-success/10 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-success border border-success/20">
                  <ShieldCheck className="h-4 w-4" />
                  Đã xác thực
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate className="space-y-8">
              
              <div className="grid gap-6 md:grid-cols-2">
                <div className="group space-y-2">
                  <label className="text-[13px] font-bold tracking-wide text-foreground flex items-center gap-1.5"><AtSign className="h-4 w-4" /> Tên đăng nhập (Username)</label>
                  <input
                    type="text"
                    value={profile?.username || ""}
                    disabled
                    className="w-full rounded-2xl border border-border/60 bg-muted/30 px-5 py-3.5 text-sm font-medium text-muted-foreground outline-none cursor-not-allowed"
                  />
                </div>
                <div className="group space-y-2">
                  <label className="text-[13px] font-bold tracking-wide text-foreground flex items-center gap-1.5"><Mail className="h-4 w-4" /> Địa chỉ Email</label>
                  <input
                    type="email"
                    value={profile?.email || ""}
                    disabled
                    className="w-full rounded-2xl border border-border/60 bg-muted/30 px-5 py-3.5 text-sm font-medium text-muted-foreground outline-none cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="group space-y-2">
                <label className="text-[13px] font-bold tracking-wide text-foreground flex items-center gap-1.5"><Type className="h-4 w-4" /> Tên hiển thị</label>
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Ví dụ: Nguyễn Văn A"
                  className="w-full rounded-2xl border border-border bg-background px-5 py-3.5 text-sm font-medium text-foreground outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10 hover:border-primary/50"
                />
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="group space-y-2 relative">
                  <label className="text-[13px] font-bold tracking-wide text-foreground flex items-center gap-1.5"><Users className="h-4 w-4" /> Giới tính</label>
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <button type="button" className="flex w-full h-[52px] items-center justify-between rounded-2xl border border-border bg-background px-5 text-sm font-medium focus:ring-4 focus:ring-primary/10 hover:border-primary/50 transition-all outline-none">
                        <span className={formData.gender ? "text-foreground" : "text-muted-foreground"}>{GENDER_MAP[formData.gender] || "-- Chọn giới tính --"}</span>
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-[calc(100vw-3rem)] sm:w-[350px] md:w-[380px] lg:w-[410px] rounded-2xl border-border shadow-xl">
                      {Object.entries(GENDER_MAP).map(([k, v]) => (
                        <DropdownMenuItem key={k} onClick={() => setFormData(prev => ({ ...prev, gender: k }))} className="rounded-xl cursor-pointer py-2.5">
                          {v}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="group space-y-2 relative">
                  <label className="text-[13px] font-bold tracking-wide text-foreground flex items-center gap-1.5"><MapPin className="h-4 w-4" /> Quốc gia</label>
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <button type="button" className="flex w-full h-[52px] items-center justify-between rounded-2xl border border-border bg-background px-5 text-sm font-medium focus:ring-4 focus:ring-primary/10 hover:border-primary/50 transition-all outline-none">
                        <span className={formData.country ? "text-foreground" : "text-muted-foreground"}>{COUNTRY_MAP[formData.country] || "-- Chọn quốc gia --"}</span>
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-[calc(100vw-3rem)] sm:w-[350px] md:w-[380px] lg:w-[410px] rounded-2xl border-border shadow-xl">
                      {Object.entries(COUNTRY_MAP).map(([k, v]) => (
                        <DropdownMenuItem key={k} onClick={() => setFormData(prev => ({ ...prev, country: k }))} className="rounded-xl cursor-pointer py-2.5">
                          {v}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="group space-y-2 relative">
                  <label className="text-[13px] font-bold tracking-wide text-foreground flex items-center gap-1.5"><GraduationCap className="h-4 w-4" /> Trình độ học vấn</label>
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <button type="button" className="flex w-full h-[52px] items-center justify-between rounded-2xl border border-border bg-background px-5 text-sm font-medium focus:ring-4 focus:ring-primary/10 hover:border-primary/50 transition-all outline-none">
                        <span className={formData.level_of_education ? "text-foreground" : "text-muted-foreground"}>{EDU_MAP[formData.level_of_education] || "-- Chọn trình độ --"}</span>
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-[calc(100vw-3rem)] sm:w-[350px] md:w-[380px] lg:w-[410px] rounded-2xl border-border shadow-xl">
                      {Object.entries(EDU_MAP).map(([k, v]) => (
                        <DropdownMenuItem key={k} onClick={() => setFormData(prev => ({ ...prev, level_of_education: k }))} className="rounded-xl cursor-pointer py-2.5">
                          {v}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="group space-y-2 relative">
                  <label className="text-[13px] font-bold tracking-wide text-foreground flex items-center gap-1.5"><Globe className="h-4 w-4" /> Ngôn ngữ</label>
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <button type="button" className="flex w-full h-[52px] items-center justify-between rounded-2xl border border-border bg-background px-5 text-sm font-medium focus:ring-4 focus:ring-primary/10 hover:border-primary/50 transition-all outline-none">
                        <span className={formData.language ? "text-foreground" : "text-muted-foreground"}>{LANG_MAP[formData.language] || "-- Chọn ngôn ngữ --"}</span>
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-[calc(100vw-3rem)] sm:w-[350px] md:w-[380px] lg:w-[410px] rounded-2xl border-border shadow-xl">
                      {Object.entries(LANG_MAP).map(([k, v]) => (
                        <DropdownMenuItem key={k} onClick={() => setFormData(prev => ({ ...prev, language: k }))} className="rounded-xl cursor-pointer py-2.5">
                          {v}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="group space-y-2">
                  <label className="text-[13px] font-bold tracking-wide text-foreground flex items-center gap-1.5"><Calendar className="h-4 w-4" /> Năm sinh</label>
                  <input
                    name="year_of_birth"
                    type="number"
                    min="1900"
                    max={new Date().getFullYear()}
                    value={formData.year_of_birth}
                    onChange={handleChange}
                    placeholder="VD: 2000"
                    className="w-full rounded-2xl border border-border bg-background px-5 py-3.5 text-sm font-medium text-foreground outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10 hover:border-primary/50"
                  />
                </div>
                <div className="group space-y-2">
                  <label className="text-[13px] font-bold tracking-wide text-foreground flex items-center gap-1.5"><Phone className="h-4 w-4" /> Số điện thoại</label>
                  <input
                    name="phone_number"
                    type="tel"
                    value={formData.phone_number}
                    onChange={handleChange}
                    placeholder="VD: 0901234567"
                    className="w-full rounded-2xl border border-border bg-background px-5 py-3.5 text-sm font-medium text-foreground outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10 hover:border-primary/50"
                  />
                </div>
              </div>
              <div className="group space-y-2">
                <label className="text-[13px] font-bold tracking-wide text-foreground flex items-center gap-1.5"><FileText className="h-4 w-4" /> Tiểu sử (Bio)</label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  placeholder="Chia sẻ một chút về bản thân, kỹ năng và mục tiêu học tập của bạn..."
                  rows={4}
                  className="w-full resize-none rounded-2xl border border-border bg-background px-5 py-4 text-sm font-medium text-foreground outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10 hover:border-primary/50 leading-relaxed"
                />
              </div>

              <div className="pt-6 flex flex-col sm:flex-row items-center justify-end gap-4 border-t border-border/40">
                {toast && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`text-sm font-medium ${toast.type === "success" ? "text-success" : "text-destructive"
                      }`}
                  >
                    {toast.message}
                  </motion.div>
                )}
                <Button
                  type="submit"
                  disabled={updateProfile.isPending}
                  className="w-full sm:w-auto h-12 rounded-2xl px-10 font-bold shadow-lg shadow-primary/20 transition-all hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0"
                >
                  {updateProfile.isPending ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-5 w-5" />
                  )}
                  LƯU THAY ĐỔI
                </Button>
              </div>
            </form>
          </div>
        </motion.div>
    </motion.div>

    {/* Avatar Lightbox Modal */}
    {showAvatarModal && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        onClick={() => setShowAvatarModal(false)}
      >
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative flex flex-col items-center gap-6"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={() => setShowAvatarModal(false)}
            className="absolute -top-2 -right-2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-card border border-border shadow-lg text-foreground hover:bg-destructive hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Full-size avatar */}
          <div className="h-64 w-64 md:h-80 md:w-80 overflow-hidden rounded-3xl border-4 border-card shadow-2xl bg-muted">
            {avatarPreview || profile?.profile_image?.has_image ? (
              <img
                src={avatarPreview || profile?.profile_image?.image_url_full || user?.avatar || ""}
                alt="Avatar"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-primary/10">
                <User className="h-24 w-24 text-primary/40" />
              </div>
            )}
          </div>

          {/* Change avatar action */}
          <div className="flex flex-col items-center gap-2 mt-2">
            <button
              onClick={() => {
                fileInputRef.current?.click();
                setShowAvatarModal(false);
              }}
              className="flex items-center gap-2.5 rounded-2xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:shadow-primary/50 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              <Camera className="h-5 w-5" />
              Đổi ảnh đại diện
            </button>
            <span className="text-[12px] font-medium text-white/80 bg-black/40 px-3 py-1 rounded-full">
              * Kích thước ảnh tối đa: 1MB
            </span>
          </div>
        </motion.div>
      </motion.div>
    )}
  </div>
);
}
