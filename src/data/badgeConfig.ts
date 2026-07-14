// ============================================================
// Badge Definitions & Configuration
//
// Tất cả badge definitions được quản lý tập trung ở đây.
// Để thêm badge mới → thêm vào BADGE_DEFINITIONS array.
// Logic evaluate nằm ở lib/badgeEvaluator.ts
// ============================================================

export type BadgeCategory = "introduction" | "expertise" | "innovation";
export type BadgeTier = "bronze" | "silver" | "gold" | "diamond";

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  category: BadgeCategory;
  tier: BadgeTier;
  requirement: string;
  bgGradient?: string;
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  // ── Nhóm nhập môn ──
  {
    id: "perfect_profile",
    name: "Mảnh Ghép Hoàn Hảo",
    description: "Hoàn thiện hồ sơ cá nhân và giới thiệu bản thân trên hệ thống",
    category: "introduction",
    tier: "diamond",
    requirement: "Cập nhật hồ sơ thành công",
  },
  {
    id: "onboarding_warrior",
    name: "Chiến Binh Onboarding",
    description: "Nhân viên hoàn thành khóa Onboarding đầu tiên",
    category: "introduction",
    tier: "diamond",
    requirement: "Hoàn thành 100% khóa Onboarding",
    bgGradient: "bg-gradient-to-b from-blue-400 to-[#0b5cff]",
  },
  {
    id: "value_holder",
    name: "Người Nắm Giữ Giá Trị",
    description: "Hoàn thành 2 khóa học Onboarding bất kỳ.",
    category: "introduction",
    tier: "diamond",
    requirement: "Hoàn thành 100% 2 khóa học Onboarding bất kỳ",
    bgGradient: "bg-gradient-to-b from-[#67e8f9] to-[#06b6d4]",
  },
  {
    id: "la_ambassador",
    name: "Đại Sứ L&A",
    description: "Hoàn thành khóa Onboarding và 1 khóa học kỹ năng khác",
    category: "introduction",
    tier: "diamond",
    requirement: "Hoàn thành khóa Onboarding và 1 khóa học khác",
    bgGradient: "bg-gradient-to-b from-[#e0f2fe] to-[#38bdf8]",
  },
  {
    id: "la_breakthrough",
    name: "Người Bức Phá L&A",
    description: "Hoàn thành 3 khóa học khác nhau trên hệ thống",
    category: "introduction",
    tier: "diamond",
    requirement: "Hoàn thành 100% 3 khóa học bất kỳ",
    bgGradient: "bg-gradient-to-b from-yellow-300 to-amber-500",
  },
  {
    id: "la_expert",
    name: "Chuyên Gia L&A",
    description: "Hoàn thành 5 khóa học khác nhau trên hệ thống",
    category: "introduction",
    tier: "diamond",
    requirement: "Hoàn thành 100% 5 khóa học bất kỳ",
    bgGradient: "bg-gradient-to-b from-pink-400 to-pink-500",
  },

  // ── Nhóm Chuyên môn & hiệu suất ──
  {
    id: "recruitment_master",
    name: "Bậc Thầy Tuyển Dụng",
    description: "Hoàn thành 1 khóa học chuyên sâu về Tuyển Dụng",
    category: "expertise",
    tier: "diamond",
    requirement: "Hoàn thành 100% 1 khóa học Tuyển dụng",
    bgGradient: "bg-gradient-to-b from-orange-300 to-orange-100",
  },
  {
    id: "otif_expert",
    name: "Chuyên Gia OTIF",
    description: "Hoàn thành 2 khóa học chuyên sâu về Tuyển Dụng",
    category: "expertise",
    tier: "diamond",
    requirement: "Hoàn thành 100% 2 khóa học Tuyển dụng",
    bgGradient: "bg-gradient-to-b from-yellow-200 to-yellow-50",
  },
  {
    id: "trusted_ambassador",
    name: "Đại Sứ Tin Cậy",
    description: "Hoàn thành 3 khóa học chuyên sâu về Tuyển Dụng",
    category: "expertise",
    tier: "diamond",
    requirement: "Hoàn thành 3 khóa học chuyên sâu về Tuyển Dụng",
    bgGradient: "bg-gradient-to-b from-indigo-300 to-indigo-500",
  },
  {
    id: "omnipotent_master",
    name: "Bậc Thầy Toàn Năng",
    description: "Hoàn thành 20 khóa học bất kỳ trên hệ thống",
    category: "expertise",
    tier: "diamond",
    requirement: "Hoàn thành 100% 20 khóa học bất kỳ",
    bgGradient: "",
  },

  // ── Nhóm sáng tạo & công nghệ ──
  // {
  //   id: "first_step",
  //   name: "Người Dẫn Đầu Công Nghệ",
  //   description: "Học viên đầu tiên trải nghiệm hệ thống E-learning mới",
  //   category: "innovation",
  //   tier: "diamond",
  //   requirement: "Hoàn thành ít nhất 1 bài học",
  //   bgGradient: "bg-gradient-to-b from-[#bbf7d0] to-[#22c55e]",
  // },
  {
    id: "speed_scholar",
    name: "Học Giả Tốc Độ",
    description: "Hoàn thành bài giảng với thời gian nhanh kỷ lục trên hệ thống",
    category: "innovation",
    tier: "diamond",
    requirement: "Hoàn thành 1 khóa học bất kỳ dưới 10 phút",
    bgGradient: "bg-gradient-to-b from-rose-400 to-[#e12a36]",
  },
  {
    id: "system_explorer",
    name: "Nhà Thám Hiểm Hệ Thống",
    description: "Hoàn thành 10 khóa học bất kỳ trên hệ thống",
    category: "innovation",
    tier: "diamond",
    requirement: "Hoàn thành 100% 10 khóa học bất kỳ",
    bgGradient: "bg-gradient-to-b from-pink-300 to-pink-100",
  },
];

/** Tier visual config — dùng cho styling */
export const TIER_CONFIG: Record<BadgeTier, {
  gradient: string;
  glow: string;
  borderColor: string;
  bgColor: string;
}> = {
  bronze: {
    gradient: "from-amber-600 via-orange-500 to-yellow-600",
    glow: "shadow-amber-500/30",
    borderColor: "border-amber-500/40",
    bgColor: "bg-amber-50 dark:bg-amber-950/30",
  },
  silver: {
    gradient: "from-slate-400 via-gray-300 to-slate-500",
    glow: "shadow-slate-400/30",
    borderColor: "border-slate-400/40",
    bgColor: "bg-slate-50 dark:bg-slate-900/30",
  },
  gold: {
    gradient: "from-yellow-400 via-amber-300 to-yellow-500",
    glow: "shadow-yellow-400/40",
    borderColor: "border-yellow-400/50",
    bgColor: "bg-yellow-50 dark:bg-yellow-950/20",
  },
  diamond: {
    gradient: "from-cyan-400 via-blue-300 to-purple-400",
    glow: "shadow-cyan-400/40",
    borderColor: "border-cyan-400/50",
    bgColor: "bg-cyan-50 dark:bg-cyan-950/20",
  },
};

export const CATEGORY_LABELS: Record<BadgeCategory, string> = {
  introduction: "Nhóm nhập môn",
  expertise: "Chuyên môn & hiệu suất",
  innovation: "Sáng tạo & công nghệ",
};
