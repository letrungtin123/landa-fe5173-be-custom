// ============================================================
// API Types — Kiểu dữ liệu response từ Custom Backend
// ============================================================

// ── Wrapper response ──

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
}

export type UserRole = 'learner' | 'learner_plus' | 'staff' | 'superuser' | 'superadmin';
export type RoleLabelMap = Partial<Record<UserRole, string>>;
export type SessionMode = 'normal' | 'demo_iframe';

// ── Xác thực ──

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number; // seconds
  session_mode?: SessionMode;
  user: AuthUserInfo;
  permissions: PermissionsMap;
  tenant_modules: string[];
  managed_tenants: TenantBasic[];
  role_labels?: RoleLabelMap;
}

export interface AuthUserInfo {
  id: string;
  username: string;
  email: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  tenant_id: string | null;
  tenant_name: string | null;
  session_mode?: SessionMode;
}

export interface TenantBasic {
  id: string;
  name: string;
}

export interface PermissionsMap {
  [moduleCode: string]: {
    can_view: boolean;
    can_add: boolean;
    can_edit: boolean;
    can_delete: boolean;
  };
}

// ── Khóa học ──

export interface CourseInfo {
  id: string;
  display_name: string;
  org: string;
  image_url: string;
  start_date: string | null;
  end_date: string | null;
  visible_to_staff_only: boolean;
  is_public: boolean;
  created_at: string;
  /** Categories — optional, chưa implement trên custom BE */
  categories?: Array<{ id: number; name: string; slug: string }>;
  mentors?: CourseMentorInfo[];
  mentor_section?: CourseMentorSectionInfo | null;
}

export interface CourseMentorSectionInfo {
  description: string | null;
  logo_light: string | null;
  logo_dark: string | null;
}

export interface CourseMentorInfo {
  id: string;
  username?: string;
  name: string;
  full_name?: string | null;
  role: string;
  company: string;
  avatar: string | null;
  email?: string;
  phone?: string | null;
  phone_number?: string | null;
  bio?: string | null;
  profile_image_url?: string | null;
  profile_image_url_full?: string | null;
}

export interface CourseCategoryInfo {
  id: string;
  name: string;
}

export interface CourseListResponse {
  data: CourseInfo[];
  categories: CourseCategoryInfo[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ── Course Blocks ──

export interface CourseBlock {
  id: string;
  parent_id: string | null;
  block_type: 'course' | 'chapter' | 'sequential' | 'vertical' | 'video' | 'html' | 'problem' | 'la_media_quiz' | 'la_image_choice_quiz' | 'la_scenario_chat' | 'la_crossword' | 'la_sortable' | 'la_diagram' | 'la_faq' | 'la_pdf';
  display_name: string;
  data: Record<string, unknown>;
  metadata: Record<string, unknown>;
  sort_order: number;
  completed: boolean;
}

export interface CourseBlocksResponse {
  root_id: string | null;
  blocks: CourseBlock[];
}

// ── Ghi danh ──

export interface EnrollmentItem {
  id: string;
  course_id: string;
  enrolled_at: string;
  is_active: boolean;
  display_name: string;
  image_url: string;
  org: string;
  progress: number;       // 0 - 100
  is_completed: boolean;
  completed_at: string | null;
  last_activity_at: string | null;
}

// ── Tiến độ ──

export interface CourseProgress {
  progress: number;
  is_completed: boolean;
  completed_at: string | null;
  last_activity_at: string | null;
}

// ── Badges ──

export interface UserBadge {
  badge_id: string;
  is_shown: boolean;
  earned_at: string;
}

/** Badge definition trả về từ API — kèm image URLs */
export interface BadgeDefinitionFromAPI {
  id: string;
  name?: string | null;
  title?: string | null;
  description?: string | null;
  desc?: string | null;
  image_key: string;
  sort_order: number;
  card_image_url: string | null;
  icon_image_url: string | null;
  mobile_card_image_url: string | null;
}

// ── Thông báo ──

export interface Notification {
  id: string;
  title: string;
  message: string;
  course_id: string | null;
  type?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  is_read: boolean;
  read_at: string | null;
  sent_by_name: string | null;
}

export interface NotificationListResponse {
  data: Notification[];
  total: number;
  unread_count: number;
}

// ── Backward compat — giữ để không lỗi import chỗ cũ ──

/** @deprecated */
export interface BlocksResponse {
  root: string;
  blocks: Record<string, Block>;
}

/** @deprecated */
export interface Block {
  id: string;
  type: string;
  display_name: string;
  lms_web_url?: string;
  student_view_url?: string;
  children?: string[];
  graded?: boolean;
  completion?: number;
  student_view_data?: VideoBlockData | Record<string, unknown>;
}

/** @deprecated */
export interface VideoBlockData {
  duration: number | null;
  transcripts: Record<string, string>;
  encoded_videos: Record<
    string,
    { url: string; file_size: number }
  >;
  only_on_web: boolean;
}
