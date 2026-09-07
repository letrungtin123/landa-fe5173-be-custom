import { useState, useEffect, useRef } from "react";
import { storageUrl, avatarUrl } from "@/utils/storageUrl";
import { motion } from "framer-motion";
import { User, Mail, Save, ShieldCheck, Loader2, X, Camera, ChevronDown, MapPin, GraduationCap, Globe, Calendar, Phone, AtSign, FileText, Type, Users } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { useAuthStore } from "@/stores/useAuthStore";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { sanitizeUrlToRelative } from "@/transformers/staticUrlRewriter";
import { useTranslation } from "react-i18next";

const LANG_MAP: Record<string, string> = { vi: "Tiếng Việt", en: "English", ja: "日本語 (Japanese)", ko: "한국어 (Korean)", zh: "中文 (Chinese)" };

export function ProfilePage() {
  const { t, i18n } = useTranslation();
  const GENDER_MAP: Record<string, string> = { male: t("profile.male"), female: t("profile.female"), other: t("profile.other") };
  const countryNames = new Intl.DisplayNames([i18n.language], { type: "region" });
  const COUNTRY_MAP: Record<string, string> = { VN: countryNames.of("VN") || "VN", US: countryNames.of("US") || "US", JP: countryNames.of("JP") || "JP", KR: countryNames.of("KR") || "KR", GB: countryNames.of("GB") || "GB", OTHER: t("profile.other") };
  const EDU_MAP: Record<string, string> = {
    doctorate: t("profile.educationDoctorate"),
    master: t("profile.educationMaster"),
    bachelor: t("profile.educationBachelor"),
    associate: t("profile.educationAssociate"),
    high_school: t("profile.educationHighSchool"),
    junior_high: t("profile.educationJuniorHigh"),
    primary: t("profile.educationPrimary"),
    none: t("profile.educationNone"),
    other: t("profile.other"),
  };
  const { data: profile, isLoading, error } = useProfile();
  const updateProfile = useUpdateProfile();
  const user = useAuthStore((s) => s.user);
  const sessionMode = useAuthStore((s) => s.sessionMode);
  const updateUser = useAuthStore((s) => s.updateUser);
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDemoIframe = sessionMode === "demo_iframe";

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
        name: (profile as any).full_name || "",
        bio: (profile as any).bio || "",
        gender: (profile as any).gender || "",
        country: (profile as any).country || "",
        level_of_education: (profile as any).level_of_education || "",
        language: (profile as any).language || "",
        year_of_birth: (profile as any).year_of_birth ? String((profile as any).year_of_birth) : "",
        phone_number: (profile as any).phone || "",
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
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;

    const file = e.target.files[0];

    if (!ALLOWED_TYPES.includes(file.type)) {
      setToast({ message: t("profile.imageTypeError"), type: "error" });
      setTimeout(() => setToast(null), 4000);
      e.target.value = "";
      return;
    }

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(1);
      setToast({
        message: t("profile.imageTooLarge", { size: sizeMB, max: MAX_AVATAR_SIZE_MB }),
        type: "error",
      });
      setTimeout(() => setToast(null), 5000);
      e.target.value = "";
      return;
    }

    // Preview ngay lập tức
    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);

    // Upload ngay, không cần nhấn LƯU
    setIsUploadingAvatar(true);
    try {
      const { apiClient } = await import("@/api/client");
      const fd = new FormData();
      fd.append("file", file);
      const avatarRes = await apiClient.post("/api/users/profile/avatar", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const newAvatarUrl = avatarRes.data?.data?.avatar_url;
      if (newAvatarUrl) {
        updateUser({ avatar: avatarUrl(newAvatarUrl) });
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["userProfile"] }),
        queryClient.invalidateQueries({ queryKey: ["badge-overview"] }),
      ]);
      setToast({ message: t("profile.avatarUpdated"), type: "success" });
      setTimeout(() => setToast(null), 3000);
    } catch {
      setToast({ message: t("profile.avatarUpdateFailed"), type: "error" });
      setTimeout(() => setToast(null), 4000);
      setAvatarPreview(null);
    } finally {
      setIsUploadingAvatar(false);
      setAvatarFile(null);
      e.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isDemoIframe) {
      setToast({ message: t("profile.saveDisabledDemo"), type: "error" });
      setTimeout(() => setToast(null), 3000);
      return;
    }

    // Tên hiển thị là bắt buộc
    if (!formData.name.trim()) {
      setToast({ message: t("profile.displayNameRequired"), type: "error" });
      setTimeout(() => setToast(null), 4000);
      return;
    }

    // Custom Validation
    if (formData.year_of_birth) {
      const year = parseInt(formData.year_of_birth, 10);
      const currentYear = new Date().getFullYear();
      if (isNaN(year) || year < 1900 || year > currentYear) {
        setToast({ message: t("profile.invalidBirthYear", { year: currentYear }), type: "error" });
        setTimeout(() => setToast(null), 4000);
        return;
      }
    }

    if (formData.phone_number) {
      const phoneRegex = /^[0-9+\-\s()]+$/;
      if (!phoneRegex.test(formData.phone_number)) {
        setToast({ message: t("profile.invalidPhone"), type: "error" });
        setTimeout(() => setToast(null), 4000);
        return;
      }
    }

    try {
      // Chuẩn bị payload cho Open edX API
      const payload: Record<string, unknown> = {
        full_name: formData.name,
        bio: formData.bio,
        gender: formData.gender,
        country: formData.country,
        level_of_education: formData.level_of_education,
        language: formData.language,
        phone: formData.phone_number,
      };
      if (formData.year_of_birth) {
        payload.year_of_birth = parseInt(formData.year_of_birth, 10);
      }

      // Cập nhật profile data (avatar tự upload riêng khi chọn file)
      await updateProfile.mutateAsync(payload as any);

      // Refetch profile to get latest data
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });

      setToast({ message: t("profile.profileUpdated"), type: "success" });
      setTimeout(() => setToast(null), 3000);
    } catch {
      setToast({ message: t("profile.profileUpdateFailed"), type: "error" });
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
        {t("profile.profileLoadFailed")}
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
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">{t("profile.title")}</h1>
          <p className="text-sm font-medium text-muted-foreground">{t("profile.subtitle")}</p>
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
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-60 mix-blend-overlay"></div>
          </div>
          
          <div className="relative px-6 pb-10 md:px-12">
            {/* Header: Avatar & Quick Info */}
            <div className="flex flex-col md:flex-row items-center md:items-end gap-6 -mt-16 md:-mt-20 mb-10">
              {/* Avatar Circle */}
              <div
                className="flex h-32 w-32 md:h-40 md:w-40 shrink-0 items-center justify-center overflow-hidden rounded-full border-8 border-card bg-muted shadow-xl relative group cursor-pointer ring-1 ring-border/50 transition-transform hover:scale-[1.02]"
                onClick={() => setShowAvatarModal(true)}
              >
                {avatarPreview || storageUrl((profile as any)?.avatar_url) || user?.avatar ? (
                  <img src={avatarPreview || storageUrl((profile as any)?.avatar_url) || user?.avatar || ""} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-primary/10">
                    <User className="h-12 w-12 md:h-16 md:w-16 text-primary" />
                  </div>
                )}
                {/* Upload loading overlay */}
                {isUploadingAvatar && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20">
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                  </div>
                )}
                {/* Hover overlay */}
                {!isUploadingAvatar && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none">
                    <span className="text-xs md:text-sm font-semibold tracking-wider">{t("profile.viewPhoto")}</span>
                  </div>
                )}
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
                <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">{(profile as any)?.full_name || user?.username}</h2>
                <p className="mt-1 flex items-center justify-center gap-2 text-sm md:text-base font-medium text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  {(profile as any)?.email || user?.email}
                </p>
              </div>
              
              <div className="md:ml-auto flex items-center mb-2 md:mb-4">
                <div className="flex items-center gap-2 rounded-2xl bg-success/10 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-success border border-success/20">
                  <ShieldCheck className="h-4 w-4" />
                  {t("profile.verified")}
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate className="space-y-8">
              
              <div className="grid gap-6 md:grid-cols-2">
                <div className="group space-y-2">
                  <label className="text-[13px] font-bold tracking-wide text-foreground flex items-center gap-1.5"><AtSign className="h-4 w-4" /> {t("profile.username")}</label>
                  <input
                    type="text"
                    value={(profile as any)?.username || ""}
                    disabled
                    className="w-full rounded-2xl border border-border/60 bg-muted/30 px-5 py-3.5 text-sm font-medium text-muted-foreground outline-none cursor-not-allowed"
                  />
                </div>
                <div className="group space-y-2">
                  <label className="text-[13px] font-bold tracking-wide text-foreground flex items-center gap-1.5"><Mail className="h-4 w-4" /> {t("auth.emailAddress")}</label>
                  <input
                    type="email"
                    value={(profile as any)?.email || ""}
                    disabled
                    className="w-full rounded-2xl border border-border/60 bg-muted/30 px-5 py-3.5 text-sm font-medium text-muted-foreground outline-none cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="group space-y-2">
                <label className="text-[13px] font-bold tracking-wide text-foreground flex items-center gap-1.5"><Type className="h-4 w-4" /> {t("profile.displayName")} <span className="text-red-500">*</span></label>
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder={t("profile.displayNameExample")}
                  className="w-full rounded-2xl border border-border bg-background px-5 py-3.5 text-sm font-medium text-foreground outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10 hover:border-primary/50"
                />
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="group space-y-2 relative">
                  <label className="text-[13px] font-bold tracking-wide text-foreground flex items-center gap-1.5"><Users className="h-4 w-4" /> {t("profile.gender")}</label>
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <button type="button" className="flex w-full h-[52px] items-center justify-between rounded-2xl border border-border bg-background px-5 text-sm font-medium focus:ring-4 focus:ring-primary/10 hover:border-primary/50 transition-all outline-none">
                        <span className={formData.gender ? "text-foreground" : "text-muted-foreground"}>{GENDER_MAP[formData.gender] || t("profile.selectGender")}</span>
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
                  <label className="text-[13px] font-bold tracking-wide text-foreground flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {t("profile.country")}</label>
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <button type="button" className="flex w-full h-[52px] items-center justify-between rounded-2xl border border-border bg-background px-5 text-sm font-medium focus:ring-4 focus:ring-primary/10 hover:border-primary/50 transition-all outline-none">
                        <span className={formData.country ? "text-foreground" : "text-muted-foreground"}>{COUNTRY_MAP[formData.country] || t("profile.selectCountry")}</span>
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
                  <label className="text-[13px] font-bold tracking-wide text-foreground flex items-center gap-1.5"><GraduationCap className="h-4 w-4" /> {t("profile.education")}</label>
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <button type="button" className="flex w-full h-[52px] items-center justify-between rounded-2xl border border-border bg-background px-5 text-sm font-medium focus:ring-4 focus:ring-primary/10 hover:border-primary/50 transition-all outline-none">
                        <span className={formData.level_of_education ? "text-foreground" : "text-muted-foreground"}>{EDU_MAP[formData.level_of_education] || t("profile.selectEducation")}</span>
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
                  <label className="text-[13px] font-bold tracking-wide text-foreground flex items-center gap-1.5"><Globe className="h-4 w-4" /> {t("profile.language")}</label>
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <button type="button" className="flex w-full h-[52px] items-center justify-between rounded-2xl border border-border bg-background px-5 text-sm font-medium focus:ring-4 focus:ring-primary/10 hover:border-primary/50 transition-all outline-none">
                        <span className={formData.language ? "text-foreground" : "text-muted-foreground"}>{LANG_MAP[formData.language] || t("profile.selectLanguage")}</span>
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
                  <label className="text-[13px] font-bold tracking-wide text-foreground flex items-center gap-1.5"><Calendar className="h-4 w-4" /> {t("profile.birthYear")}</label>
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
                  <label className="text-[13px] font-bold tracking-wide text-foreground flex items-center gap-1.5"><Phone className="h-4 w-4" /> {t("profile.phone")}</label>
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
                <label className="text-[13px] font-bold tracking-wide text-foreground flex items-center gap-1.5"><FileText className="h-4 w-4" /> {t("profile.bio")}</label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  placeholder={t("profile.bioPlaceholder")}
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
                  disabled={updateProfile.isPending || isDemoIframe}
                  title={isDemoIframe ? t("profile.saveDisabledDemo") : undefined}
                  className="w-full sm:w-auto h-12 rounded-2xl px-10 font-bold shadow-lg shadow-primary/20 transition-all hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0"
                >
                  {updateProfile.isPending ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-5 w-5" />
                  )}
                  {t("profile.save")}
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
            {avatarPreview || storageUrl((profile as any)?.avatar_url) ? (
              <img
                src={avatarPreview || storageUrl((profile as any)?.avatar_url) || user?.avatar || ""}
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
              {t("profile.changeAvatar")}
            </button>
            <span className="text-[12px] font-medium text-white/80 bg-black/40 px-3 py-1 rounded-full">
              {t("profile.maxImageSize")}
            </span>
          </div>
        </motion.div>
      </motion.div>
    )}
  </div>
);
}
