// ============================================================
// Badge Definitions & Configuration
//
// Tất cả badge definitions được quản lý tập trung ở đây.
// Để thêm badge mới → thêm vào BADGE_DEFINITIONS array.
// Logic evaluate nằm ở lib/badgeEvaluator.ts
// ============================================================

export type BadgeCategory = "completion" | "grade" | "certificate" | "enrollment";
export type BadgeTier = "bronze" | "silver" | "gold" | "diamond";

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  category: BadgeCategory;
  tier: BadgeTier;
  requirement: string;
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  // ── Completion Milestones ──
  {
    id: "first_step",
    name: "Bước Đầu Tiên",
    description: "Bạn đã khởi đầu hành trình học tập!",
    category: "completion",
    tier: "bronze",
    requirement: "Hoàn thành ít nhất 1 bài học",
  },
  {
    id: "halfway_hero",
    name: "Chinh Phục Nửa Đường",
    description: "Bạn đã đi được nửa chặng đường — hãy tiếp tục!",
    category: "completion",
    tier: "silver",
    requirement: "Hoàn thành 50% bất kỳ khóa học nào",
  },
  {
    id: "course_conqueror",
    name: "Chinh Phục Khóa Học",
    description: "Bạn đã hoàn thành toàn bộ khóa học — thật tuyệt vời!",
    category: "completion",
    tier: "gold",
    requirement: "Hoàn thành 100% bất kỳ khóa học nào",
  },
  {
    id: "almost_there",
    name: "Sắp Về Đích",
    description: "Chỉ một chút nữa thôi!",
    category: "completion",
    tier: "silver",
    requirement: "Hoàn thành 90% khóa học",
  },

  // ── Grade Performance ──
  {
    id: "passing_grade",
    name: "Đạt Chuẩn",
    description: "Bạn đã vượt qua — kiến thức được công nhận!",
    category: "grade",
    tier: "bronze",
    requirement: "Đạt điểm Pass ở bất kỳ khóa nào",
  },
  {
    id: "high_achiever",
    name: "Thành Tích Cao",
    description: "Kết quả xuất sắc — bạn thuộc top 10%!",
    category: "grade",
    tier: "gold",
    requirement: "Đạt điểm ≥ 90% ở bất kỳ khóa nào",
  },
  {
    id: "perfect_score",
    name: "Điểm Tuyệt Đối",
    description: "Hoàn hảo đến từng chi tiết!",
    category: "grade",
    tier: "diamond",
    requirement: "Đạt điểm ≥ 98% ở bất kỳ khóa nào",
  },
  {
    id: "first_blood",
    name: "Điểm Số Đầu Tiên",
    description: "Mọi thứ đều bắt đầu từ bước nhỏ nhất!",
    category: "grade",
    tier: "bronze",
    requirement: "Nhận điểm số đầu tiên (>0%)",
  },

  // ── Certificate ──
  {
    id: "certified",
    name: "Được Chứng Nhận",
    description: "Bạn đã nhận chứng chỉ chính thức!",
    category: "certificate",
    tier: "gold",
    requirement: "Nhận ít nhất 1 chứng chỉ",
  },
  {
    id: "multi_certified",
    name: "Chuyên Gia",
    description: "Bằng cấp chứng minh năng lực!",
    category: "certificate",
    tier: "diamond",
    requirement: "Nhận ít nhất 3 chứng chỉ",
  },

  // ── Enrollment / Multi-course ──
  {
    id: "explorer",
    name: "Nhà Khám Phá",
    description: "Tò mò không giới hạn — bạn đã tham gia nhiều khóa!",
    category: "enrollment",
    tier: "silver",
    requirement: "Đăng ký ≥ 3 khóa học",
  },
  {
    id: "dedicated_learner",
    name: "Học Viên Tận Tâm",
    description: "Cam kết dài hạn — bạn là tấm gương học tập!",
    category: "enrollment",
    tier: "gold",
    requirement: "Hoàn thành ≥ 2 khóa học",
  },
  {
    id: "knowledge_seeker",
    name: "Người Tìm Kiến Thức",
    description: "Khởi đầu hành trình mới!",
    category: "enrollment",
    tier: "bronze",
    requirement: "Đăng ký ít nhất 1 khóa học",
  },
  {
    id: "bookworm",
    name: "Mọt Sách",
    description: "Niềm đam mê học tập bất tận!",
    category: "enrollment",
    tier: "gold",
    requirement: "Đăng ký ≥ 5 khóa học",
  },
  {
    id: "veteran",
    name: "Cựu Binh",
    description: "Người dày dặn kinh nghiệm thực chiến!",
    category: "enrollment",
    tier: "diamond",
    requirement: "Hoàn thành ≥ 5 khóa học",
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
  completion: "Hoàn thành",
  grade: "Thành tích",
  certificate: "Chứng chỉ",
  enrollment: "Tham gia",
};
